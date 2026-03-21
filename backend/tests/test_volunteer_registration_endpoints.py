import unittest
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException

from app.api.endpoints.volunteer_registrations import (
    create_volunteer_registration,
    quick_join_volunteer_registration,
)
from app.models.campaign import CampaignStatus
from app.schemas.volunteer_registration import (
    VolunteerQuickJoinCreate,
    VolunteerRegistrationCreate,
)


class VolunteerRegistrationEndpointTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.db = SimpleNamespace(name="db")

    @patch("app.api.endpoints.volunteer_registrations.create_volunteer_registration")
    def test_quick_join_calls_create_for_supporter(self, mock_create) -> None:
        campaign_id = uuid4()
        current_user = SimpleNamespace(
            id=uuid4(),
            full_name="Supporter User",
            email="supporter@example.com",
            organization_id=None,
            is_superuser=False,
        )
        expected_registration = SimpleNamespace(id=uuid4())
        mock_create.return_value = expected_registration

        response = quick_join_volunteer_registration(
            payload=VolunteerQuickJoinCreate(campaign_id=campaign_id),
            db=self.db,
            current_user=current_user,
        )

        self.assertIs(response, expected_registration)
        mock_create.assert_called_once()
        create_payload = mock_create.call_args.kwargs["payload"]
        self.assertEqual(create_payload.campaign_id, campaign_id)
        self.assertEqual(create_payload.user_id, current_user.id)
        self.assertEqual(create_payload.full_name, current_user.full_name)
        self.assertEqual(create_payload.email, current_user.email)

    def test_quick_join_rejects_organization_user(self) -> None:
        current_user = SimpleNamespace(
            id=uuid4(),
            full_name="Organization User",
            email="organization@example.com",
            organization_id=uuid4(),
            is_superuser=False,
        )

        with self.assertRaises(HTTPException) as context:
            quick_join_volunteer_registration(
                payload=VolunteerQuickJoinCreate(campaign_id=uuid4()),
                db=self.db,
                current_user=current_user,
            )

        self.assertEqual(context.exception.status_code, 403)
        self.assertEqual(
            context.exception.detail,
            "Organization account cannot register as volunteer",
        )

    def test_create_registration_rejects_campaign_without_volunteer_mode(self) -> None:
        campaign_id = uuid4()
        current_user = SimpleNamespace(
            id=uuid4(),
            full_name="Supporter User",
            email="supporter@example.com",
            organization_id=None,
            is_superuser=False,
        )

        campaign_stub = SimpleNamespace(
            id=campaign_id,
            status=CampaignStatus.published,
            is_active=True,
            support_types=["money"],
        )

        class _FakeDb:
            def get(self, model, obj_id):
                if obj_id == campaign_id:
                    return campaign_stub
                return None

        with self.assertRaises(HTTPException) as context:
            create_volunteer_registration(
                payload=VolunteerRegistrationCreate(
                    campaign_id=campaign_id,
                    user_id=current_user.id,
                    full_name=current_user.full_name,
                    email=current_user.email,
                ),
                db=_FakeDb(),
                current_user=current_user,
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(
            context.exception.detail,
            "Campaign does not accept volunteer registration",
        )


if __name__ == "__main__":
    unittest.main()
