from __future__ import annotations

import os
import logging
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.chat_history import ChatHistory
from app.models.document import Document
from app.models.user import User
from app.services.vector_store import vector_store


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DocumentSummaryItem:
    id: int
    title: str
    upload_date: str
    file_size: int
    extracted_text_length: int
    summary_exists: bool


@dataclass(frozen=True)
class DocumentDetailItem:
    id: int
    title: str
    file_path: str
    upload_date: str
    summary: str | None
    text_length: int
    number_of_chunks: int


@dataclass(frozen=True)
class DashboardUploadItem:
    id: int
    title: str
    upload_date: str


@dataclass(frozen=True)
class DashboardItem:
    total_documents: int
    total_chats: int
    total_summaries: int
    latest_uploads: list[DashboardUploadItem]


class DocumentService:
    def _ensure_document_owned(self, document: Document | None, user: User) -> Document:
        if not document:
            raise ValueError("Document not found")

        if document.user_id != user.id:
            raise PermissionError("You do not have access to this document")

        return document

    def list_user_documents(self, db: Session, user: User, search: str | None = None) -> list[DocumentSummaryItem]:
        documents_query = db.query(Document).filter(Document.user_id == user.id)

        search_term = search.strip() if search else ""
        if search_term:
            documents_query = documents_query.filter(func.lower(Document.title).contains(search_term.lower()))

        documents = documents_query.order_by(Document.uploaded_at.desc()).all()

        items: list[DocumentSummaryItem] = []
        for document in documents:
            file_size = os.path.getsize(document.file_path) if os.path.exists(document.file_path) else 0
            items.append(
                DocumentSummaryItem(
                    id=document.id,
                    title=document.title,
                    upload_date=document.uploaded_at.isoformat() if document.uploaded_at else "",
                    file_size=file_size,
                    extracted_text_length=len(document.extracted_text or ""),
                    summary_exists=bool(document.summary and document.summary.strip()),
                )
            )

        return items

    def get_document(self, db: Session, user: User, document_id: int) -> DocumentDetailItem:
        document = self._ensure_document_owned(
            db.query(Document).filter(Document.id == document_id).first(),
            user,
        )

        return DocumentDetailItem(
            id=document.id,
            title=document.title,
            file_path=document.file_path,
            upload_date=document.uploaded_at.isoformat() if document.uploaded_at else "",
            summary=document.summary,
            text_length=len(document.extracted_text or ""),
            number_of_chunks=vector_store.count_document_chunks(document.id),
        )

    def delete_document(self, db: Session, user: User, document_id: int) -> None:
        document = self._ensure_document_owned(
            db.query(Document).filter(Document.id == document_id).first(),
            user,
        )

        vector_store.delete_document_chunks(document.id)
        db.query(ChatHistory).filter(ChatHistory.document_id == document.id).delete(synchronize_session=False)

        if document.file_path and os.path.exists(document.file_path):
            try:
                os.remove(document.file_path)
            except OSError:
                logger.warning("Failed to remove uploaded PDF", extra={"document_id": document.id, "path": document.file_path})

        db.delete(document)
        db.commit()

    def get_history(self, db: Session, user: User, document_id: int) -> list[ChatHistory]:
        document = self._ensure_document_owned(
            db.query(Document).filter(Document.id == document_id).first(),
            user,
        )

        return (
            db.query(ChatHistory)
            .filter(ChatHistory.document_id == document.id, ChatHistory.user_id == user.id)
            .order_by(ChatHistory.created_at.desc())
            .all()
        )

    def get_dashboard(self, db: Session, user: User) -> DashboardItem:
        total_documents = db.query(func.count(Document.id)).filter(Document.user_id == user.id).scalar() or 0
        total_chats = db.query(func.count(ChatHistory.id)).filter(ChatHistory.user_id == user.id).scalar() or 0
        total_summaries = (
            db.query(func.count(Document.id))
            .filter(Document.user_id == user.id, Document.summary.isnot(None))
            .filter(func.length(func.trim(Document.summary)) > 0)
            .scalar()
            or 0
        )

        latest_documents = (
            db.query(Document)
            .filter(Document.user_id == user.id)
            .order_by(Document.uploaded_at.desc())
            .limit(5)
            .all()
        )

        latest_uploads = [
            DashboardUploadItem(
                id=document.id,
                title=document.title,
                upload_date=document.uploaded_at.isoformat() if document.uploaded_at else "",
            )
            for document in latest_documents
        ]

        return DashboardItem(
            total_documents=total_documents,
            total_chats=total_chats,
            total_summaries=total_summaries,
            latest_uploads=latest_uploads,
        )


document_service = DocumentService()