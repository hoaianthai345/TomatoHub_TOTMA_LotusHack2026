import unittest
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

from app.models.campaign import Campaign, CampaignStatus, SupportType
from app.schemas.campaign import CampaignCreate, CampaignUpdate
from app.services.campaign_geocoding_service import geocode_campaign_location
from app.services.campaign_service import create_manual_campaign, update_manual_campaign


class _FakeDb:
    def __init__(self) -> None:
        self.added: list[Campaign] = []

    def add(self, campaign: Campaign) -> None:
        self.added.append(campaign)

    def commit(self) -> None:
        return

    def refresh(self, _: Campaign) -> None:
        return


class CampaignGeocodingServiceTestCase(unittest.TestCase):
    def _build_create_payload(self) -> CampaignCreate:
        return CampaignCreate(
            organization_id=uuid4(),
            title="District Relief",
            short_description="Relief support",
            description="Support households in district area.",
            tags=["relief"],
            support_types=[SupportType.money, SupportType.volunteer],
            goal_amount=Decimal("5000"),
            province="Ho Chi Minh City",
            district="District 1",
            address_line="Nguyen Hue",
            media_urls=[],
            starts_at=datetime(2026, 3, 23, 8, 0, tzinfo=timezone.utc),
            ends_at=datetime(2026, 4, 23, 8, 0, tzinfo=timezone.utc),
        )

    @patch("app.services.campaign_service._resolve_slug", return_value="district-relief")
    @patch("app.services.campaign_service._organization_exists", return_value=True)
    @patch(
        "app.services.campaign_service.geocode_campaign_location",
        return_value=(Decimal("10.772000"), Decimal("106.698000")),
    )
    def test_create_campaign_uses_geocoding_when_coordinates_missing(
        self,
        _mock_geocode,
        _mock_org_exists,
        _mock_resolve_slug,
    ) -> None:
        db = _FakeDb()
        campaign = create_manual_campaign(db, self._build_create_payload())

        self.assertEqual(campaign.latitude, Decimal("10.772000"))
        self.assertEqual(campaign.longitude, Decimal("106.698000"))

    @patch(
        "app.services.campaign_service.geocode_campaign_location",
        return_value=(Decimal("10.780000"), Decimal("106.700000")),
    )
    def test_update_campaign_regeocodes_when_location_changed_without_explicit_coordinates(
        self,
        _mock_geocode,
    ) -> None:
        campaign = Campaign(
            id=uuid4(),
            organization_id=uuid4(),
            title="Current campaign",
            slug="current-campaign",
            short_description="desc",
            description="desc",
            tags=["tag"],
            support_types=["money"],
            goal_amount=Decimal("1000"),
            raised_amount=Decimal("100"),
            province="Ho Chi Minh City",
            district="District 3",
            address_line="Old address",
            latitude=Decimal("10.700000"),
            longitude=Decimal("106.600000"),
            media_urls=[],
            starts_at=datetime(2026, 3, 23, 8, 0, tzinfo=timezone.utc),
            ends_at=None,
            is_active=False,
            status=CampaignStatus.draft,
        )

        db = _FakeDb()
        payload = CampaignUpdate(
            district="District 1",
            address_line="Nguyen Hue",
        )

        with patch("app.services.campaign_service.get_campaign_or_404", return_value=campaign):
            updated = update_manual_campaign(db, campaign.id, payload)

        self.assertEqual(updated.latitude, Decimal("10.780000"))
        self.assertEqual(updated.longitude, Decimal("106.700000"))

    @patch(
        "app.services.campaign_service.geocode_campaign_location",
        return_value=(Decimal("10.780000"), Decimal("106.700000")),
    )
    def test_update_campaign_keeps_explicit_coordinates_over_geocoding(
        self,
        _mock_geocode,
    ) -> None:
        campaign = Campaign(
            id=uuid4(),
            organization_id=uuid4(),
            title="Current campaign",
            slug="current-campaign",
            short_description="desc",
            description="desc",
            tags=["tag"],
            support_types=["money"],
            goal_amount=Decimal("1000"),
            raised_amount=Decimal("100"),
            province="Ho Chi Minh City",
            district="District 3",
            address_line="Old address",
            latitude=Decimal("10.700000"),
            longitude=Decimal("106.600000"),
            media_urls=[],
            starts_at=datetime(2026, 3, 23, 8, 0, tzinfo=timezone.utc),
            ends_at=None,
            is_active=False,
            status=CampaignStatus.draft,
        )

        db = _FakeDb()
        payload = CampaignUpdate(
            district="District 1",
            latitude=Decimal("10.799999"),
            longitude=Decimal("106.711111"),
        )

        with patch("app.services.campaign_service.get_campaign_or_404", return_value=campaign):
            updated = update_manual_campaign(db, campaign.id, payload)

        self.assertEqual(updated.latitude, Decimal("10.799999"))
        self.assertEqual(updated.longitude, Decimal("106.711111"))

    @patch("app.services.campaign_geocoding_service._geocode_query")
    def test_geocode_location_falls_back_to_district_province_when_full_address_fails(
        self,
        mock_geocode_query,
    ) -> None:
        mock_geocode_query.side_effect = [
            None,
            (Decimal("10.775394"), Decimal("106.699625")),
        ]

        latitude, longitude = geocode_campaign_location(
            address_line="Nguyễn Huệ",
            district="Quận 1",
            province="Thành phố Hồ Chí Minh",
        )

        self.assertEqual(latitude, Decimal("10.775394"))
        self.assertEqual(longitude, Decimal("106.699625"))
        self.assertEqual(mock_geocode_query.call_count, 2)
        first_query = mock_geocode_query.call_args_list[0].args[0]
        second_query = mock_geocode_query.call_args_list[1].args[0]
        self.assertEqual(
            first_query,
            "Nguyễn Huệ, Quận 1, Thành phố Hồ Chí Minh, Vietnam",
        )
        self.assertEqual(
            second_query,
            "Quận 1, Thành phố Hồ Chí Minh, Vietnam",
        )


if __name__ == "__main__":
    unittest.main()
