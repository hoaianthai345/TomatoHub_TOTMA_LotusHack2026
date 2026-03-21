from __future__ import annotations

import os
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

_ALLOWED_IMAGE_MIME_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def _normalize_relative_path(value: str) -> Path:
    path = Path(value)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError("Invalid relative upload path")
    return path


def build_public_upload_url(relative_path: str) -> str:
    prefix = settings.UPLOAD_URL_PREFIX.rstrip("/")
    normalized = str(_normalize_relative_path(relative_path)).replace(os.sep, "/")
    return f"{prefix}/{normalized}"


def save_campaign_image_file(
    *,
    campaign_id: UUID,
    upload_file: UploadFile,
) -> tuple[str, int, str, str]:
    content_type = (upload_file.content_type or "").lower().strip()
    if content_type not in _ALLOWED_IMAGE_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG, PNG, WEBP, GIF files are supported",
        )

    max_size_bytes = settings.CAMPAIGN_IMAGE_MAX_SIZE_MB * 1024 * 1024
    payload = upload_file.file.read(max_size_bytes + 1)
    size_bytes = len(payload)
    if size_bytes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )
    if size_bytes > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image exceeds {settings.CAMPAIGN_IMAGE_MAX_SIZE_MB}MB limit",
        )

    upload_root = settings.upload_root_path()
    campaign_folder = upload_root / "campaigns" / str(campaign_id)
    campaign_folder.mkdir(parents=True, exist_ok=True)

    extension = _ALLOWED_IMAGE_MIME_TYPES[content_type]
    stored_filename = f"{uuid4().hex}{extension}"
    absolute_path = campaign_folder / stored_filename
    absolute_path.write_bytes(payload)

    relative_path = str(absolute_path.relative_to(upload_root)).replace(os.sep, "/")
    original_filename = Path(upload_file.filename or "").name or stored_filename
    return relative_path, size_bytes, content_type, original_filename


def delete_stored_upload(relative_path: str) -> None:
    try:
        normalized = _normalize_relative_path(relative_path)
    except ValueError:
        return

    absolute_path = settings.upload_root_path() / normalized
    if absolute_path.exists() and absolute_path.is_file():
        absolute_path.unlink()
