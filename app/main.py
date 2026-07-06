import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.database.db import Base, engine
from app.models import ChatHistory, Document, User
from app.routes.auth import router as auth_router
from app.routes.documents import router as documents_router
from app.services.ai_service import gemini_summary_service

logger = logging.getLogger(__name__)


def ensure_document_schema():
    inspector = inspect(engine)
    if "documents" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("documents")}
    required_columns = {
        "cloudinary_url": "VARCHAR",
        "cloudinary_public_id": "VARCHAR",
        "file_size": "INTEGER",
    }

    with engine.begin() as connection:
        for column_name, ddl_type in required_columns.items():
            if column_name not in existing_columns:
                connection.execute(text(f"ALTER TABLE documents ADD COLUMN {column_name} {ddl_type}"))

# Create database tables
Base.metadata.create_all(bind=engine)
ensure_document_schema()

app = FastAPI(
    title="AI Study Assistant",
    version="1.0.0"
)

# -----------------------------
# CORS Configuration
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(auth_router)
app.include_router(documents_router)


@app.on_event("startup")
def validate_gemini_configuration():
    if not gemini_summary_service.is_configured():
        logger.warning(
            "GEMINI_API_KEY is missing; document summarization will return a configuration error until it is set."
        )
    else:
        logger.info(
            "Gemini summarization is configured for model %s",
            gemini_summary_service.settings.model_name,
        )


@app.get("/")
def root():
    return {
        "message": "API Running"
    }