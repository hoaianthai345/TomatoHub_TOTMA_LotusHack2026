from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

try:
    import boto3
    from botocore.client import Config as BotocoreConfig
except Exception:  # pragma: no cover - handled at runtime for misconfigured env
    boto3 = None
    BotocoreConfig = None

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


def _normalize_storage_key(value: str) -> str:
    return str(_normalize_relative_path(value)).replace(os.sep, "/").lstrip("/")


def _required_s3_setting(name: str, value: str | None) -> str:
    if value is None or not value.strip():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"S3 storage misconfigured: missing {name}",
        )
    return value.strip()


def _normalize_supabase_host(hostname: str | None) -> str | None:
    if hostname is None:
        return None
    lower = hostname.strip().lower()
    if not lower:
        return None
    if lower.endswith(".storage.supabase.co"):
        return f"{lower[:-len('.storage.supabase.co')]}.supabase.co"
    return lower


def _normalize_supabase_public_base_url(value: str, *, bucket: str) -> str:
    parsed = urlsplit(value)
    scheme = parsed.scheme or "https"
    original_host = (parsed.hostname or "").strip().lower()
    if not original_host.endswith("supabase.co"):
        return value.rstrip("/")
    host = _normalize_supabase_host(original_host)
    if not host:
        return value.rstrip("/")

    path = parsed.path.rstrip("/")
    if path.endswith("/storage/v1/s3"):
        path = f"/storage/v1/object/public/{bucket}"
    elif path.endswith("/storage/v1/object/public"):
        path = f"/storage/v1/object/public/{bucket}"
    elif "/storage/v1/object/public/" not in path:
        path = f"/storage/v1/object/public/{bucket}"

    normalized = urlunsplit((scheme, host, path, "", ""))
    return normalized.rstrip("/")


def _resolve_s3_public_base_url() -> str:
    bucket = _required_s3_setting("S3_BUCKET", settings.S3_BUCKET)
    configured_public_base = (settings.S3_PUBLIC_BASE_URL or "").strip()
    if configured_public_base:
        return _normalize_supabase_public_base_url(
            configured_public_base,
            bucket=bucket,
        )

    endpoint = _required_s3_setting("S3_ENDPOINT_URL", settings.S3_ENDPOINT_URL)
    endpoint_host = (urlsplit(endpoint).hostname or "").strip().lower()
    if not endpoint_host.endswith("supabase.co"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="S3 storage misconfigured: missing S3_PUBLIC_BASE_URL",
        )
    return _normalize_supabase_public_base_url(
        endpoint,
        bucket=bucket,
    )


def normalize_upload_url_if_needed(value: str) -> str:
    trimmed = value.strip()
    if not trimmed:
        return trimmed

    parsed = urlsplit(trimmed)
    host = (parsed.hostname or "").strip().lower()
    path = parsed.path or ""

    if not host.endswith("supabase.co"):
        return trimmed

    if "/storage/v1/s3/" not in path:
        return trimmed

    bucket = _required_s3_setting("S3_BUCKET", settings.S3_BUCKET)
    normalized_host = _normalize_supabase_host(host) or host
    rest = path.split("/storage/v1/s3/", maxsplit=1)[1].lstrip("/")
    normalized_path = f"/storage/v1/object/public/{bucket}/{rest}"
    return urlunsplit((parsed.scheme or "https", normalized_host, normalized_path, "", ""))


def _build_s3_client():
    if boto3 is None or BotocoreConfig is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="S3 storage misconfigured: boto3 is not installed",
        )

    endpoint_url = _required_s3_setting("S3_ENDPOINT_URL", settings.S3_ENDPOINT_URL)
    access_key = _required_s3_setting("S3_ACCESS_KEY_ID", settings.S3_ACCESS_KEY_ID)
    secret_key = _required_s3_setting("S3_SECRET_ACCESS_KEY", settings.S3_SECRET_ACCESS_KEY)
    _required_s3_setting("S3_BUCKET", settings.S3_BUCKET)

    addressing_style = "path" if settings.S3_FORCE_PATH_STYLE else "auto"
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=settings.S3_REGION,
        config=BotocoreConfig(
            signature_version="s3v4",
            s3={"addressing_style": addressing_style},
        ),
    )


def _build_s3_storage_key(*, campaign_id: UUID, stored_filename: str) -> str:
    prefix = settings.S3_KEY_PREFIX.strip().strip("/")
    key_segments = [segment for segment in [prefix, "campaigns", str(campaign_id), stored_filename] if segment]
    return "/".join(key_segments)


def build_public_upload_url(relative_path: str) -> str:
    normalized = _normalize_storage_key(relative_path)
    if settings.is_s3_storage():
        base_url = _resolve_s3_public_base_url()
        return f"{base_url}/{normalized}"

    prefix = settings.UPLOAD_URL_PREFIX.rstrip("/")
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

    extension = _ALLOWED_IMAGE_MIME_TYPES[content_type]
    stored_filename = f"{uuid4().hex}{extension}"
    original_filename = Path(upload_file.filename or "").name or stored_filename

    if settings.is_s3_storage():
        object_key = _build_s3_storage_key(
            campaign_id=campaign_id,
            stored_filename=stored_filename,
        )
        client = _build_s3_client()
        try:
            client.put_object(
                Bucket=_required_s3_setting("S3_BUCKET", settings.S3_BUCKET),
                Key=object_key,
                Body=payload,
                ContentType=content_type,
            )
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to upload image to S3 storage",
            ) from exc
        return object_key, size_bytes, content_type, original_filename

    upload_root = settings.upload_root_path()
    campaign_folder = upload_root / "campaigns" / str(campaign_id)
    campaign_folder.mkdir(parents=True, exist_ok=True)
    absolute_path = campaign_folder / stored_filename
    absolute_path.write_bytes(payload)
    relative_path = str(absolute_path.relative_to(upload_root)).replace(os.sep, "/")
    return relative_path, size_bytes, content_type, original_filename


def delete_stored_upload(relative_path: str) -> None:
    try:
        normalized = _normalize_storage_key(relative_path)
    except ValueError:
        return

    if settings.is_s3_storage():
        try:
            client = _build_s3_client()
            client.delete_object(
                Bucket=_required_s3_setting("S3_BUCKET", settings.S3_BUCKET),
                Key=normalized,
            )
        except Exception:  # noqa: BLE001
            return
        return

    absolute_path = settings.upload_root_path() / normalized
    if absolute_path.exists() and absolute_path.is_file():
        absolute_path.unlink()
