from __future__ import annotations

from pathlib import Path

import chromadb

from app.core.config import settings


class ChromaVectorStore:
    def __init__(self):
        self.persist_directory = Path(settings.rag_persist_directory)
        self.persist_directory.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(path=str(self.persist_directory))
        self.collection = self.client.get_or_create_collection("document_chunks")

    def has_document_chunks(self, document_id: int) -> bool:
        results = self.collection.get(
            where={"document_id": document_id},
            limit=1,
            include=[],
        )
        return bool(results.get("ids"))

    def count_document_chunks(self, document_id: int) -> int:
        results = self.collection.get(
            where={"document_id": document_id},
            include=[],
        )
        return len(results.get("ids") or [])

    def add_chunks(self, chunks: list[dict]) -> None:
        if not chunks:
            return

        self.collection.add(
            ids=[chunk["id"] for chunk in chunks],
            embeddings=[chunk["embedding"] for chunk in chunks],
            documents=[chunk["chunk_text"] for chunk in chunks],
            metadatas=[chunk["metadata"] for chunk in chunks],
        )

    def delete_document_chunks(self, document_id: int) -> None:
        self.collection.delete(where={"document_id": document_id})

    def query_document_chunks(self, document_id: int, query_embedding: list[float], top_k: int) -> list[dict]:
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where={"document_id": document_id},
            include=["documents", "metadatas", "distances"],
        )

        documents = (results.get("documents") or [[]])[0]
        metadatas = (results.get("metadatas") or [[]])[0]
        distances = (results.get("distances") or [[]])[0]

        chunks: list[dict] = []
        for index, chunk_text in enumerate(documents):
            metadata = metadatas[index] if index < len(metadatas) else {}
            distance = distances[index] if index < len(distances) else None
            chunks.append(
                {
                    "chunk_text": chunk_text,
                    "page_number": metadata.get("page_number"),
                    "chunk_index": metadata.get("chunk_index"),
                    "distance": distance,
                }
            )

        return chunks


vector_store = ChromaVectorStore()
