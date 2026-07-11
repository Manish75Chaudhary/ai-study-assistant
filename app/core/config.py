from dataclasses import dataclass
import os

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    database_url: str | None = os.getenv("DATABASE_URL")
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY")
    gemini_model_name: str = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")
    gemini_embedding_model: str = os.getenv("GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-001")
    gemini_timeout_seconds: int = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "60"))
    rag_chunk_size: int = int(os.getenv("RAG_CHUNK_SIZE", "1200"))
    rag_chunk_overlap: int = int(os.getenv("RAG_CHUNK_OVERLAP", "200"))
    rag_max_document_chunks: int = int(os.getenv("RAG_MAX_DOCUMENT_CHUNKS", "200"))
    rag_max_document_text_length: int = int(
        os.getenv(
            "RAG_MAX_DOCUMENT_TEXT_LENGTH",
            str(rag_chunk_size * rag_max_document_chunks),
        )
    )
    rag_top_k: int = int(os.getenv("RAG_TOP_K", "4"))
    rag_persist_directory: str = os.getenv("CHROMA_PERSIST_DIR", ".chroma")
    cloudinary_cloud_name: str | None = os.getenv("CLOUDINARY_CLOUD_NAME")
    cloudinary_api_key: str | None = os.getenv("CLOUDINARY_API_KEY")
    cloudinary_api_secret: str | None = os.getenv("CLOUDINARY_API_SECRET")


settings = Settings()