from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from app.core.config import settings
from app.services.embedding_service import embedding_service
from app.services.vector_store import vector_store


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DocumentPage:
    page_number: int
    text: str


@dataclass(frozen=True)
class DocumentChunk:
    id: str
    document_id: int
    page_number: int
    chunk_index: int
    chunk_text: str


class RagService:
    def _split_paragraphs(self, text: str) -> list[str]:
        parts = [part.strip() for part in re.split(r"\n\s*\n+", text.strip())]
        return [part for part in parts if part]

    def _split_long_paragraph(self, paragraph: str, max_size: int) -> list[str]:
        if len(paragraph) <= max_size:
            return [paragraph]

        sentence_parts = re.split(r"(?<=[.!?])\s+", paragraph)
        if len(sentence_parts) > 1:
            chunks: list[str] = []
            current = ""
            for sentence in sentence_parts:
                candidate = f"{current} {sentence}".strip() if current else sentence
                if len(candidate) <= max_size:
                    current = candidate
                else:
                    if current:
                        chunks.append(current)
                    if len(sentence) > max_size:
                        start = 0
                        while start < len(sentence):
                            chunks.append(sentence[start:start + max_size])
                            start += max_size
                        current = ""
                    else:
                        current = sentence
            if current:
                chunks.append(current)
            return chunks

        chunks = []
        start = 0
        while start < len(paragraph):
            chunks.append(paragraph[start:start + max_size])
            start += max_size
        return chunks

    def _build_page_chunks(self, page: DocumentPage) -> list[str]:
        max_size = settings.rag_chunk_size
        overlap = settings.rag_chunk_overlap
        paragraphs = self._split_paragraphs(page.text)
        chunks: list[str] = []
        current_paragraphs: list[str] = []
        current_length = 0

        def flush_current() -> None:
            nonlocal current_paragraphs, current_length
            if current_paragraphs:
                chunks.append("\n\n".join(current_paragraphs))
                current_paragraphs = []
                current_length = 0

        for paragraph in paragraphs:
            for segment in self._split_long_paragraph(paragraph, max_size):
                segment_length = len(segment)
                separator_cost = 2 if current_paragraphs else 0
                if current_length + segment_length + separator_cost > max_size and current_paragraphs:
                    previous_chunk = "\n\n".join(current_paragraphs)
                    flush_current()

                    if overlap > 0:
                        overlap_text = previous_chunk[-overlap:].strip()
                        if overlap_text:
                            current_paragraphs = [overlap_text]
                            current_length = len(overlap_text)

                current_paragraphs.append(segment)
                current_length += segment_length + (2 if len(current_paragraphs) > 1 else 0)

        flush_current()
        return chunks

    def chunk_document(self, pages: list[DocumentPage], document_id: int) -> list[DocumentChunk]:
        chunks: list[DocumentChunk] = []
        for page in pages:
            page_chunks = self._build_page_chunks(page)
            for index, chunk_text in enumerate(page_chunks):
                chunks.append(
                    DocumentChunk(
                        id=f"{document_id}:{page.page_number}:{index}",
                        document_id=document_id,
                        page_number=page.page_number,
                        chunk_index=index,
                        chunk_text=chunk_text,
                    )
                )
        return chunks

    def index_document(
        self,
        document_id: int,
        document_title: str,
        pages: list[DocumentPage],
        user_id: int | None = None,
    ) -> int:
        if vector_store.has_document_chunks(document_id):
            logger.info("Reusing existing embeddings for document %s", document_id)
            return 0

        chunks = self.chunk_document(pages, document_id)
        if not chunks:
            return 0

        indexed_chunks: list[dict] = []
        for chunk in chunks:
            embedding_result = embedding_service.embed_text(
                chunk.chunk_text,
                title=document_title,
                task_type="retrieval_document",
                endpoint="POST /documents/upload",
                user_id=user_id,
            )
            indexed_chunks.append(
                {
                    "id": chunk.id,
                    "embedding": embedding_result,
                    "chunk_text": chunk.chunk_text,
                    "metadata": {
                        "document_id": document_id,
                        "page_number": chunk.page_number,
                        "chunk_index": chunk.chunk_index,
                    },
                }
            )

        vector_store.add_chunks(indexed_chunks)
        logger.info("Indexed %s chunks for document %s", len(indexed_chunks), document_id)
        return len(indexed_chunks)

    def retrieve_relevant_chunks(
        self,
        document_id: int,
        question: str,
        top_k: int | None = None,
        user_id: int | None = None,
    ) -> list[dict]:
        query_embedding = embedding_service.embed_text(
            question,
            task_type="retrieval_query",
            endpoint="POST /documents/{document_id}/chat",
            user_id=user_id,
        )
        return vector_store.query_document_chunks(
            document_id=document_id,
            query_embedding=query_embedding,
            top_k=top_k or settings.rag_top_k,
        )


rag_service = RagService()