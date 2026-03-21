import unittest
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException

from app.api.endpoints.campaigns import (
    create_campaign,
    list_campaigns,
    publish_campaign_endpoint,
)
from app.models.campaign import CampaignStatus, SupportType
from app.schemas.campaign import CampaignCreate


def build_campaign_stub(
    organization_id,
    *,
    campaign_id=None,
    title="Clean Water Drive",
    slug="clean-water-drive",
    status=CampaignStatus.draft,
    is_active=False,
    published_at=None,
):
    now = datetime.now(timezone.utc)
    return SimpleNamespace(
        id=campaign_id or uuid4(),
        organization_id=organization_id,
        title=title,
        slug=slug,
        short_description="Short description",
        description="Long description",
        tags=["water"],
        cover_image_url="https://example.com/cover.jpg",
        support_types=["money"],
        goal_amount=Decimal("5000.00"),
        raised_amount=Decimal("0.00"),
        province="Ho Chi Minh City",
        district="District 1",
        address_line="123 Example Street",
        latitude=None,
        longitude=None,
        media_urls=[],
        starts_at=now,
        ends_at=None,
        is_active=is_active,
        status=status,
        published_at=published_at,
        closed_at=None,
        created_at=now,
        updated_at=now,
    )


class CampaignEndpointTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.db = SimpleNamespace(name="db", commit=lambda: None)
        self.organization_id = uuid4()
        self.current_user = SimpleNamespace(
            id=uuid4(),
            organization_id=self.organization_id,
        )

    def build_payload(self, organization_id=None) -> CampaignCreate:
        return CampaignCreate(
            organization_id=organization_id or self.organization_id,
            title="Clean Water Drive",
            short_description="Short description",
            description="Long description",
            tags=["water"],
            support_types=[SupportType.money],
            goal_amount=Decimal("5000.00"),
            province="Ho Chi Minh City",
            district="District 1",
            address_line="123 Example Street",
            media_urls=[],
            starts_at=datetime(2026, 3, 22, 8, 0, tzinfo=timezone.utc),
            ends_at=datetime(2026, 3, 23, 8, 0, tzinfo=timezone.utc),
        )

    @patch("app.api.endpoints.campaigns.create_manual_campaign")
    def test_create_campaign_allows_matching_organization(self, mock_create) -> None:
        campaign = build_campaign_stub(self.organization_id)
        mock_create.return_value = campaign

        response = create_campaign(
            payload=self.build_payload(),
            db=self.db,
            current_user=self.current_user,
        )

        self.assertEqual(response.title, campaign.title)
        mock_create.assert_called_once()

    @patch("app.api.endpoints.campaigns.create_manual_campaign")
    def test_create_campaign_rejects_other_organization(self, mock_create) -> None:
        with self.assertRaises(HTTPException) as context:
            create_campaign(
                payload=self.build_payload(uuid4()),
                db=self.db,
                current_user=self.current_user,
            )

        self.assertEqual(context.exception.status_code, 403)
        self.assertEqual(
            context.exception.detail,
            "Cannot create campaign for another organization",
        )
        mock_create.assert_not_called()

    @patch("app.api.endpoints.campaigns.apply_credit_event")
    @patch("app.api.endpoints.campaigns.publish_campaign")
    @patch("app.api.endpoints.campaigns.get_campaign_or_404")
    def test_publish_campaign_allows_owner(
        self,
        mock_get_campaign,
        mock_publish,
        mock_apply_credit_event,
    ) -> None:
        campaign_id = uuid4()
        mock_get_campaign.return_value = build_campaign_stub(
            self.organization_id,
            campaign_id=campaign_id,
        )
        mock_publish.return_value = build_campaign_stub(
            self.organization_id,
            campaign_id=campaign_id,
            status=CampaignStatus.published,
            is_active=True,
            published_at=datetime.now(timezone.utc),
        )

        response = publish_campaign_endpoint(
            campaign_id=campaign_id,
            db=self.db,
            current_user=self.current_user,
        )

        self.assertEqual(response.message, "Campaign published successfully")
        self.assertEqual(response.campaign.status, CampaignStatus.published)
        mock_publish.assert_called_once_with(self.db, campaign_id)
        mock_apply_credit_event.assert_called_once()

    @patch("app.api.endpoints.campaigns.publish_campaign")
    @patch("app.api.endpoints.campaigns.get_campaign_or_404")
    def test_publish_campaign_rejects_other_organization(
        self, mock_get_campaign, mock_publish
    ) -> None:
        campaign_id = uuid4()
        mock_get_campaign.return_value = build_campaign_stub(
            uuid4(),
            campaign_id=campaign_id,
        )

        with self.assertRaises(HTTPException) as context:
            publish_campaign_endpoint(
                campaign_id=campaign_id,
                db=self.db,
                current_user=self.current_user,
            )

        self.assertEqual(context.exception.status_code, 403)
        self.assertEqual(
            context.exception.detail,
            "Cannot publish campaign from another organization",
        )
        mock_publish.assert_not_called()

    def test_list_campaigns_allows_location_and_support_type_filters(self) -> None:
        captured_stmt = {}

        class _FakeScalarResult:
            def all(self):
                return []

        class _FakeDb:
            def scalars(self, stmt):
                captured_stmt["value"] = stmt
                return _FakeScalarResult()

        response = list_campaigns(
            limit=20,
            campaign_status=CampaignStatus.published,
            organization_id=self.organization_id,
            province="Can Tho",
            district="Ninh Kieu",
            support_type=SupportType.volunteer,
            db=_FakeDb(),
        )

        self.assertEqual(response, [])
        self.assertIn("value", captured_stmt)

        stmt = captured_stmt["value"]
        compiled = stmt.compile()
        params = list(compiled.params.values())

        self.assertTrue(any(value == "%Can Tho%" for value in params))
        self.assertTrue(any(value == "%Ninh Kieu%" for value in params))
        self.assertTrue(any(value == ["volunteer"] for value in params))


if __name__ == "__main__":
    unittest.main()
