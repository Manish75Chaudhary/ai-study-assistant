import logging
from pathlib import Path

import fitz
from fastapi import APIRouter, Depends, File, HTTPException, Path as ApiPath, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
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
from app.services.rag_service import DocumentPage, rag_service

router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)

logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 25 * 1024 * 1024
UNSUPPORTED_PDF_MESSAGE = "This PDF is damaged or unsupported."
PASSWORD_PROTECTED_PDF_MESSAGE = "This PDF is password protected."
EMPTY_PDF_MESSAGE = "This PDF contains no readable text."
SCANNED_PDF_MESSAGE = "This PDF appears to be scanned or image-based. Please upload a text-based PDF."
TOO_LARGE_PDF_MESSAGE = "This document is too large to process. Please upload a smaller PDF."
GEMINI_ERROR_TYPES = {
    "quota_exhausted",
    "timeout_error",
    "network_error",
    "gemini_api_error",
    "empty_response",
}


def _cleanup_uploaded_pdf(public_id: str | None) -> None:
    if public_id:
        cloudinary_service.delete_pdf(public_id)


def _is_truthy_document_flag(document: fitz.Document, attribute_name: str) -> bool:
    flag = getattr(document, attribute_name, False)
    return bool(flag() if callable(flag) else flag)


def _extract_validated_pdf_pages(content: bytes) -> list[DocumentPage]:
    try:
        document = fitz.open(stream=content, filetype="pdf")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=UNSUPPORTED_PDF_MESSAGE) from exc

    try:
        if _is_truthy_document_flag(document, "needs_pass") or _is_truthy_document_flag(document, "is_encrypted"):
            authenticate = getattr(document, "authenticate", None)
            if not callable(authenticate) or not authenticate(""):
                raise HTTPException(status_code=400, detail=PASSWORD_PROTECTED_PDF_MESSAGE)

        pages: list[DocumentPage] = []
        has_text = False
        has_images = False

        for page_index, page in enumerate(document, start=1):
            page_text = page.get_text().strip()
            page_images = page.get_images(full=True)
            pages.append(
                DocumentPage(
                    page_number=page_index,
                    text=page_text,
                )
            )
            has_text = has_text or bool(page_text)
            has_images = has_images or bool(page_images)

        if not pages or not has_text:
            raise HTTPException(
                status_code=400,
                detail=SCANNED_PDF_MESSAGE if has_images else EMPTY_PDF_MESSAGE,
            )

        return pages
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=UNSUPPORTED_PDF_MESSAGE) from exc
    finally:
        document.close()


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
    upload_result = None
    document = None

    try:
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

        pages = _extract_validated_pdf_pages(content)
        text = "\n".join(page.text for page in pages).strip()

        if len(text) > settings.rag_max_document_text_length:
            _cleanup_uploaded_pdf(upload_result.public_id)
            raise HTTPException(status_code=400, detail=TOO_LARGE_PDF_MESSAGE)

        chunk_count = len(rag_service.chunk_document(pages, document_id=0))
        if chunk_count > settings.rag_max_document_chunks:
            _cleanup_uploaded_pdf(upload_result.public_id)
            raise HTTPException(status_code=400, detail=TOO_LARGE_PDF_MESSAGE)

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
    except HTTPException:
        if document is None and upload_result and upload_result.public_id:
            _cleanup_uploaded_pdf(upload_result.public_id)
        raise
    except Exception as exc:
        try:
            if document is not None:
                document_service.delete_document(db, current_user, document.id)
        except Exception:
            db.rollback()
        finally:
            if upload_result and upload_result.public_id:
                _cleanup_uploaded_pdf(upload_result.public_id)
        raise HTTPException(
            status_code=500,
            detail="Something went wrong. Please try again.",
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

