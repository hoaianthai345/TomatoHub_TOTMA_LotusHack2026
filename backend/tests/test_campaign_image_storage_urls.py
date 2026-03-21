import unittest
from contextlib import ExitStack
from datetime import datetime, timezone
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException

from app.core.config import settings
from app.schemas.campaign import CampaignRead
from app.services.campaign_image_storage import (
    build_public_upload_url,
    normalize_upload_url_if_needed,
)


class CampaignImageStorageUrlTestCase(unittest.TestCase):
    def _build_url_with_settings(self, **overrides: str | None) -> str:
        base_overrides: dict[str, str | None] = {
            "STORAGE_BACKEND": "s3",
            "S3_BUCKET": "tomato_storage",
            "S3_ENDPOINT_URL": "https://pyndwaoydkfjmcjqmcba.supabase.co/storage/v1/s3",
            "S3_PUBLIC_BASE_URL": "https://pyndwaoydkfjmcjqmcba.supabase.co/storage/v1/object/public/tomato_storage",
        }
        base_overrides.update(overrides)
        with ExitStack() as stack:
            for key, value in base_overrides.items():
                stack.enter_context(patch.object(settings, key, value))
            return build_public_upload_url(
                "campaigns/5aecae08-b951-4188-b243-e43cedb84555/617d563f963441d4bd680b15abef0408.jpg"
            )

    def test_uses_configured_supabase_public_url(self) -> None:
        url = self._build_url_with_settings()
        self.assertEqual(
            url,
            "https://pyndwaoydkfjmcjqmcba.supabase.co/storage/v1/object/public/tomato_storage/campaigns/5aecae08-b951-4188-b243-e43cedb84555/617d563f963441d4bd680b15abef0408.jpg",
        )

    def test_normalizes_wrong_supabase_s3_public_base(self) -> None:
        url = self._build_url_with_settings(
            S3_PUBLIC_BASE_URL="https://pyndwaoydkfjmcjqmcba.storage.supabase.co/storage/v1/s3"
        )
        self.assertEqual(
            url,
            "https://pyndwaoydkfjmcjqmcba.supabase.co/storage/v1/object/public/tomato_storage/campaigns/5aecae08-b951-4188-b243-e43cedb84555/617d563f963441d4bd680b15abef0408.jpg",
        )

    def test_derives_public_base_from_supabase_s3_endpoint_when_missing(self) -> None:
        url = self._build_url_with_settings(S3_PUBLIC_BASE_URL="")
        self.assertEqual(
            url,
            "https://pyndwaoydkfjmcjqmcba.supabase.co/storage/v1/object/public/tomato_storage/campaigns/5aecae08-b951-4188-b243-e43cedb84555/617d563f963441d4bd680b15abef0408.jpg",
        )

    def test_raises_when_missing_public_base_for_non_supabase_endpoint(self) -> None:
        with self.assertRaises(HTTPException) as context:
            self._build_url_with_settings(
                S3_ENDPOINT_URL="https://s3.ap-southeast-1.amazonaws.com",
                S3_PUBLIC_BASE_URL="",
            )
        self.assertEqual(context.exception.status_code, 500)
        self.assertEqual(
            context.exception.detail,
            "S3 storage misconfigured: missing S3_PUBLIC_BASE_URL",
        )

    def test_keeps_non_supabase_public_base_when_explicitly_configured(self) -> None:
        url = self._build_url_with_settings(
            S3_ENDPOINT_URL="https://s3.ap-southeast-1.amazonaws.com",
            S3_PUBLIC_BASE_URL="https://cdn.example.com/tomato_storage",
        )
        self.assertEqual(
            url,
            "https://cdn.example.com/tomato_storage/campaigns/5aecae08-b951-4188-b243-e43cedb84555/617d563f963441d4bd680b15abef0408.jpg",
        )

    def test_normalize_upload_url_if_needed_fixes_legacy_supabase_s3_url(self) -> None:
        legacy_url = (
            "https://pyndwaoydkfjmcjqmcba.storage.supabase.co/storage/v1/s3/"
            "campaigns/5aecae08-b951-4188-b243-e43cedb84555/617d563f963441d4bd680b15abef0408.jpg"
        )
        with patch.object(settings, "S3_BUCKET", "tomato_storage"):
            normalized = normalize_upload_url_if_needed(legacy_url)
        self.assertEqual(
            normalized,
            "https://pyndwaoydkfjmcjqmcba.supabase.co/storage/v1/object/public/tomato_storage/campaigns/5aecae08-b951-4188-b243-e43cedb84555/617d563f963441d4bd680b15abef0408.jpg",
        )

    def test_campaign_read_normalizes_legacy_supabase_urls(self) -> None:
        legacy_url = (
            "https://pyndwaoydkfjmcjqmcba.storage.supabase.co/storage/v1/s3/"
            "campaigns/5aecae08-b951-4188-b243-e43cedb84555/617d563f963441d4bd680b15abef0408.jpg"
        )
        with patch.object(settings, "S3_BUCKET", "tomato_storage"):
            payload = CampaignRead.model_validate(
                {
                    "id": str(uuid4()),
                    "organization_id": str(uuid4()),
                    "title": "Campaign",
                    "slug": "campaign",
                    "short_description": None,
                    "description": None,
                    "tags": [],
                    "cover_image_url": legacy_url,
                    "support_types": ["money"],
                    "goal_amount": "1000.00",
                    "raised_amount": "0.00",
                    "province": None,
                    "district": None,
                    "address_line": None,
                    "latitude": None,
                    "longitude": None,
                    "media_urls": [legacy_url],
                    "starts_at": datetime.now(timezone.utc).isoformat(),
                    "ends_at": None,
                    "is_active": True,
                    "status": "published",
                    "published_at": None,
                    "closed_at": None,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )
        self.assertEqual(
            payload.cover_image_url,
            "https://pyndwaoydkfjmcjqmcba.supabase.co/storage/v1/object/public/tomato_storage/campaigns/5aecae08-b951-4188-b243-e43cedb84555/617d563f963441d4bd680b15abef0408.jpg",
        )
        self.assertEqual(
            payload.media_urls,
            [
                "https://pyndwaoydkfjmcjqmcba.supabase.co/storage/v1/object/public/tomato_storage/campaigns/5aecae08-b951-4188-b243-e43cedb84555/617d563f963441d4bd680b15abef0408.jpg"
            ],
        )


if __name__ == "__main__":
    unittest.main()
