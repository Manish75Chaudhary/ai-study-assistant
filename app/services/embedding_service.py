from dataclasses import dataclass

from app.services.ai_service import gemini_summary_service


class GeminiEmbeddingError(RuntimeError):
    def __init__(self, status_code: int, detail: str, error_type: str | None = None):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.error_type = error_type


@dataclass(frozen=True)
class EmbeddedChunk:
    text: str
    embedding: list[float]


class EmbeddingService:
    def embed_text(
        self,
        text: str,
        title: str | None = None,
        task_type: str = "retrieval_document",
        endpoint: str | None = None,
        user_id: int | None = None,
    ) -> list[float]:
        result = gemini_summary_service.generate_embedding(
            text,
            title=title,
            task_type=task_type,
            endpoint=endpoint,
            user_id=user_id,
        )
        if not result.success or not result.embedding:
            raise GeminiEmbeddingError(
                status_code=result.status_code,
                detail=result.error or "Embedding generation failed.",
                error_type=result.error_type,
            )

        return result.embedding

    def embed_texts(
        self,
        texts: list[str],
        title: str | None = None,
        task_type: str = "retrieval_document",
        endpoint: str | None = None,
        user_id: int | None = None,
    ) -> list[list[float]]:
        return [
            self.embed_text(
                text,
                title=title,
                task_type=task_type,
                endpoint=endpoint,
                user_id=user_id,
            )
            for text in texts
        ]


embedding_service = EmbeddingService()