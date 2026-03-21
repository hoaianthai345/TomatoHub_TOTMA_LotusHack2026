import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import patch

from app.models.campaign import CampaignStatus
from app.services.campaign_service import close_campaign


class CampaignServiceCloseTestCase(unittest.TestCase):
    @patch("app.services.campaign_service.get_campaign_or_404")
    def test_close_campaign_allows_future_start_time(self, mock_get_campaign) -> None:
        campaign = SimpleNamespace(
            id=uuid4(),
            status=CampaignStatus.published,
            starts_at=datetime.now(timezone.utc) + timedelta(days=2),
            is_active=True,
            closed_at=None,
        )
        mock_get_campaign.return_value = campaign

        db = SimpleNamespace(commit=lambda: None, refresh=lambda _obj: None)

        response = close_campaign(db=db, campaign_id=campaign.id, payload=None)

        self.assertEqual(response.status, CampaignStatus.closed)
        self.assertFalse(response.is_active)
        self.assertIsNotNone(response.closed_at)


if __name__ == "__main__":
    unittest.main()
