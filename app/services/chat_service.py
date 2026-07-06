from __future__ import annotations

import logging
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.chat_history import ChatHistory
from app.models.document import Document
from app.models.user import User
from app.services.ai_service import gemini_summary_service
from app.services.rag_service import rag_service


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ChatChunkPreview:
    page_number: int | None
    chunk_preview: str
    distance: float | None = None


@dataclass(frozen=True)
class ChatResult:
    success: bool
    answer: str | None = None
    source_pages: list[int] | None = None
    retrieved_chunks: list[ChatChunkPreview] | None = None
    error: str | None = None
    error_type: str | None = None
    status_code: int = 200


class ChatService:
    def answer_question(
        self,
        document: Document | None,
        current_user: User,
        question: str,
        db: Session | None = None,
    ) -> ChatResult:
        if not document:
            return ChatResult(success=False, error="Document not found", error_type="not_found", status_code=404)

        if document.user_id != current_user.id:
            return ChatResult(success=False, error="You do not have access to this document", error_type="forbidden", status_code=403)

        if not question or not question.strip():
            return ChatResult(success=False, error="Question is empty", error_type="validation_error", status_code=400)

        if not document.extracted_text or not document.extracted_text.strip():
            return ChatResult(success=False, error="Document does not contain extracted text", error_type="validation_error", status_code=400)

        try:
            context_chunks = rag_service.retrieve_relevant_chunks(document.id, question)
        except Exception as exc:
            logger.exception("Failed to retrieve RAG context", extra={"document_id": document.id, "error_type": type(exc).__name__})
            return ChatResult(success=False, error="Failed to retrieve relevant document chunks", error_type="retrieval_error", status_code=502)

        previews = [
            ChatChunkPreview(
                page_number=chunk.get("page_number"),
                chunk_preview=(chunk.get("chunk_text") or "")[:300],
                distance=chunk.get("distance"),
            )
            for chunk in context_chunks
        ]

        result = gemini_summary_service.answer_from_context(
            question=question,
            document_title=document.title,
            context_blocks=context_chunks,
        )

        if not result.success or not result.answer:
            return ChatResult(
                success=False,
                error=result.error,
                error_type=result.error_type,
                status_code=result.status_code,
            )

        source_pages = sorted({preview.page_number for preview in previews if preview.page_number is not None})

        if db is not None:
            db.add(
                ChatHistory(
                    user_id=current_user.id,
                    document_id=document.id,
                    question=question.strip(),
                    answer=result.answer,
                )
            )
            db.commit()

        return ChatResult(
            success=True,
            answer=result.answer,
            source_pages=source_pages,
            retrieved_chunks=previews,
        )


chat_service = ChatService()