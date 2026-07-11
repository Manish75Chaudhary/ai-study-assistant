import logging
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Path as ApiPath, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.db import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.chat_schema import ChatRequest, ChatHistoryResponse
from app.schemas.document_schema import (
    DashboardResponse,
    DashboardLatestUpload,
    DocumentDeleteResponse,
    DocumentDetailResponse,
    DocumentListItem,
)
from app.services.cloudinary_service import cloudinary_service
from app.services.chat_service import chat_service
from app.services.ai_service import gemini_summary_service
from app.services.embedding_service import GeminiEmbeddingError
from app.services.document_service import document_service
from app.services.pdf_service import extract_pages_from_pdf
from app.services.rag_service import DocumentPage, rag_service

router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)

logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 25 * 1024 * 1024
GEMINI_ERROR_TYPES = {
    "quota_exhausted",
    "timeout_error",
    "network_error",
    "gemini_api_error",
    "empty_response",
}


@router.get("", response_model=list[DocumentListItem])
def list_documents(
    search: str | None = Query(default=None, description="Filter documents by title"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return document_service.list_user_documents(db, current_user, search=search)


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dashboard_data = document_service.get_dashboard(db, current_user)
    return DashboardResponse(
        total_documents=dashboard_data.total_documents,
        total_chats=dashboard_data.total_chats,
        total_summaries=dashboard_data.total_summaries,
        latest_uploads=[
            DashboardLatestUpload(
                id=upload.id,
                title=upload.title,
                upload_date=upload.upload_date,
            )
            for upload in dashboard_data.latest_uploads
        ],
    )


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document_details(
    document_id: int = ApiPath(..., gt=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return document_service.get_document(db, current_user, document_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    content = await file.read()

    validation_result = cloudinary_service.validate_pdf_upload(file.filename, content, MAX_UPLOAD_BYTES)
    if not validation_result.success:
        raise HTTPException(
            status_code=validation_result.status_code,
            detail={
                "error": validation_result.error,
                "error_type": validation_result.error_type,
            },
        )

    upload_result = cloudinary_service.upload_pdf(file.filename, content, MAX_UPLOAD_BYTES)
    if not upload_result.success:
        raise HTTPException(
            status_code=upload_result.status_code,
            detail={
                "error": upload_result.error,
                "error_type": upload_result.error_type,
            },
        )

    try:
        pages = extract_pages_from_pdf(content)
    except Exception as exc:
        if upload_result.public_id:
            cloudinary_service.delete_pdf(upload_result.public_id)
        raise HTTPException(status_code=400, detail="Could not extract text from PDF") from exc

    text = "\n".join(page.text for page in pages)
    if not text.strip():
        if upload_result.public_id:
            cloudinary_service.delete_pdf(upload_result.public_id)
        raise HTTPException(status_code=400, detail="PDF does not contain extractable text")

    document = Document(
        title=Path(file.filename or upload_result.secure_url or "document.pdf").name,
        file_path=upload_result.secure_url or "",
        cloudinary_url=upload_result.secure_url,
        cloudinary_public_id=upload_result.public_id,
        file_size=upload_result.file_size,
        extracted_text=text,
        user_id=current_user.id
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    try:
        rag_service.index_document(
            document_id=document.id,
            document_title=document.title,
            pages=[
                DocumentPage(
                    page_number=page.page_number,
                    text=page.text,
                )
                for page in pages
            ],
            user_id=current_user.id,
        )
    except GeminiEmbeddingError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.detail,
        ) from exc
    except Exception as exc:
        vector_error_type = type(exc).__name__
        try:
            document_service.delete_document(db, current_user, document.id)
        except Exception:
            db.rollback()
            if upload_result.public_id:
                cloudinary_service.delete_pdf(upload_result.public_id)
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Failed to index document for chat retrieval.",
                "error_type": vector_error_type,
            }
        ) from exc

    return {
        "message": "Upload successful",
        "document_id": document.id
    }


@router.post("/{document_id}/summarize")
def summarize_document(
    document_id: int = ApiPath(..., gt=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id
    ).first()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    if document.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this document"
        )

    if not document.extracted_text or not document.extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Document does not contain extracted text"
        )

    if document.summary and document.summary.strip():
        logger.info(
            "Returning cached summary",
            extra={
                "document_id": document.id,
                "user_id": current_user.id,
            },
        )
        return {
            "message": "Summary generated successfully",
            "document_id": document.id,
            "summary": document.summary,
        }

    logger.info(
        "Generating new summary",
        extra={
            "document_id": document.id,
            "user_id": current_user.id,
        },
    )

    result = gemini_summary_service.generate_summary(
        document.extracted_text,
        document.title,
        endpoint="POST /documents/{document_id}/summarize",
        user_id=current_user.id,
    )

    if not result.success:
        detail = result.error if result.error_type in GEMINI_ERROR_TYPES else {
            "error": result.error,
            "error_type": result.error_type,
        }
        raise HTTPException(
            status_code=result.status_code,
            detail=detail,
        )

    logger.info(
        "Saving summary to database",
        extra={
            "document_id": document.id,
            "user_id": current_user.id,
        },
    )
    document.summary = result.summary
    db.add(document)
    db.commit()
    db.refresh(document)

    return {
        "message": "Summary generated successfully",
        "document_id": document.id,
        "summary": document.summary
    }


@router.post("/{document_id}/chat")
def chat_with_document(
    payload: ChatRequest,
    document_id: int = ApiPath(..., gt=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id
    ).first()

    result = chat_service.answer_question(
        document=document,
        current_user=current_user,
        question=payload.question,
        db=db,
    )

    if not result.success:
        detail = result.error if result.error_type in GEMINI_ERROR_TYPES else {
            "error": result.error,
            "error_type": result.error_type,
        }
        raise HTTPException(
            status_code=result.status_code,
            detail=detail,
        )

    return {
        "answer": result.answer,
        "source_pages": result.source_pages or [],
        "retrieved_chunks": [
            {
                "page_number": chunk.page_number,
                "chunk_preview": chunk.chunk_preview,
                "distance": chunk.distance,
            }
            for chunk in (result.retrieved_chunks or [])
        ],
        "citations": [f"p. {page}" for page in (result.source_pages or [])],
    }


@router.get("/{document_id}/history", response_model=list[ChatHistoryResponse])
def get_document_history(
    document_id: int = ApiPath(..., gt=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        history = document_service.get_history(db, current_user, document_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    return [
        ChatHistoryResponse(
            id=item.id,
            document_id=item.document_id,
            question=item.question,
            answer=item.answer,
            created_at=item.created_at.isoformat() if item.created_at else "",
        )
        for item in history
    ]


@router.delete("/{document_id}", response_model=DocumentDeleteResponse)
def delete_document(
    document_id: int = ApiPath(..., gt=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        document_service.delete_document(db, current_user, document_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    return {"message": "Document deleted successfully"}

