from __future__ import annotations

import logging
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import cloudinary
from cloudinary import uploader

from app.core.config import settings


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CloudinaryValidationResult:
    success: bool
    error: str | None = None
    error_type: str | None = None
    status_code: int = 200


@dataclass(frozen=True)
class CloudinaryUploadResult:
    success: bool
    secure_url: str | None = None
    public_id: str | None = None
    file_size: int | None = None
    error: str | None = None
    error_type: str | None = None
    status_code: int = 200


@dataclass(frozen=True)
class CloudinaryDeleteResult:
    success: bool
    deleted: bool = False
    public_id: str | None = None
    error: str | None = None
    error_type: str | None = None
    status_code: int = 200


class CloudinaryService:
    def __init__(self) -> None:
        self._configured = all(
            [
                settings.cloudinary_cloud_name,
                settings.cloudinary_api_key,
                settings.cloudinary_api_secret,
            ]
        )

        if self._configured:
            cloudinary.config(
                cloud_name=settings.cloudinary_cloud_name,
                api_key=settings.cloudinary_api_key,
                api_secret=settings.cloudinary_api_secret,
                secure=True,
            )

    def is_configured(self) -> bool:
        return self._configured

    def validate_pdf_upload(
        self,
        file_name: str | None,
        content: bytes,
        max_upload_bytes: int,
    ) -> CloudinaryValidationResult:
        original_name = Path(file_name or "").name
        if not original_name:
            return CloudinaryValidationResult(
                success=False,
                error="Uploaded file must have a filename",
                error_type="validation_error",
                status_code=400,
            )

        if Path(original_name).suffix.lower() != ".pdf":
            return CloudinaryValidationResult(
                success=False,
                error="Only PDF uploads are supported",
                error_type="validation_error",
                status_code=400,
            )

        if len(content) > max_upload_bytes:
            return CloudinaryValidationResult(
                success=False,
                error="PDF upload exceeds the 25 MB limit",
                error_type="validation_error",
                status_code=413,
            )

        if not content.startswith(b"%PDF"):
            return CloudinaryValidationResult(
                success=False,
                error="Uploaded file is not a valid PDF",
                error_type="validation_error",
                status_code=400,
            )

        return CloudinaryValidationResult(success=True)

    def upload_pdf(
        self,
        file_name: str | None,
        content: bytes,
        max_upload_bytes: int,
    ) -> CloudinaryUploadResult:
        validation_result = self.validate_pdf_upload(file_name, content, max_upload_bytes)
        if not validation_result.success:
            return CloudinaryUploadResult(
                success=False,
                error=validation_result.error,
                error_type=validation_result.error_type,
                status_code=validation_result.status_code,
            )

        if not self._configured:
            return CloudinaryUploadResult(
                success=False,
                error="Cloudinary is not configured",
                error_type="configuration_error",
                status_code=500,
            )

        try:
            original_name = Path(file_name or f"{uuid4().hex}.pdf").name
            pdf_stream = BytesIO(content)
            pdf_stream.name = original_name

            result = uploader.upload(
                pdf_stream,
                resource_type="raw",
                folder="ai-study-assistant/documents",
            )

            return CloudinaryUploadResult(
                success=True,
                secure_url=result.get("secure_url"),
                public_id=result.get("public_id"),
                file_size=result.get("bytes"),
            )
        except Exception as exc:
            logger.exception("Failed to upload PDF to Cloudinary", extra={"error_type": type(exc).__name__})
            return CloudinaryUploadResult(
                success=False,
                error="Failed to upload PDF to Cloudinary",
                error_type=type(exc).__name__,
                status_code=502,
            )

    def delete_pdf(self, public_id: str | None) -> CloudinaryDeleteResult:
        if not public_id:
            return CloudinaryDeleteResult(
                success=False,
                error="Cloudinary public_id is required",
                error_type="validation_error",
                status_code=400,
            )

        if not self._configured:
            return CloudinaryDeleteResult(
                success=False,
                error="Cloudinary is not configured",
                error_type="configuration_error",
                status_code=500,
            )

        try:
            result = uploader.destroy(public_id, resource_type="raw")
            delete_result = result.get("result")
            if delete_result not in {"ok", "not found"}:
                return CloudinaryDeleteResult(
                    success=False,
                    public_id=public_id,
                    error="Failed to delete PDF from Cloudinary",
                    error_type="delete_error",
                    status_code=502,
                )

            return CloudinaryDeleteResult(
                success=True,
                deleted=delete_result == "ok",
                public_id=public_id,
            )
        except Exception as exc:
            logger.exception("Failed to delete PDF from Cloudinary", extra={"public_id": public_id, "error_type": type(exc).__name__})
            return CloudinaryDeleteResult(
                success=False,
                public_id=public_id,
                error="Failed to delete PDF from Cloudinary",
                error_type=type(exc).__name__,
                status_code=502,
            )


cloudinary_service = CloudinaryService()