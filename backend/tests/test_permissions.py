import unittest
from types import SimpleNamespace
from uuid import uuid4

from fastapi import HTTPException

from app.api.permissions import (
    ensure_authenticated_user_matches,
    ensure_matching_organization,
    ensure_superuser,
)


class PermissionHelpersTestCase(unittest.TestCase):
    def test_ensure_superuser_allows_superuser(self) -> None:
        ensure_superuser(SimpleNamespace(is_superuser=True))

    def test_ensure_superuser_rejects_non_superuser(self) -> None:
        with self.assertRaises(HTTPException) as context:
            ensure_superuser(SimpleNamespace(is_superuser=False))

        self.assertEqual(context.exception.status_code, 403)

    def test_ensure_matching_organization_allows_owner(self) -> None:
        organization_id = uuid4()
        ensure_matching_organization(
            SimpleNamespace(organization_id=organization_id),
            organization_id,
        )

    def test_ensure_matching_organization_rejects_other_org(self) -> None:
        with self.assertRaises(HTTPException) as context:
            ensure_matching_organization(
                SimpleNamespace(organization_id=uuid4()),
                uuid4(),
            )

        self.assertEqual(context.exception.status_code, 403)

    def test_ensure_authenticated_user_matches_allows_anonymous_when_no_subject(self) -> None:
        ensure_authenticated_user_matches(
            None,
            None,
            auth_detail="auth required",
            mismatch_detail="mismatch",
        )

    def test_ensure_authenticated_user_matches_requires_auth_for_linked_user(self) -> None:
        with self.assertRaises(HTTPException) as context:
            ensure_authenticated_user_matches(
                None,
                uuid4(),
                auth_detail="auth required",
                mismatch_detail="mismatch",
            )

        self.assertEqual(context.exception.status_code, 401)

    def test_ensure_authenticated_user_matches_rejects_mismatched_user(self) -> None:
        with self.assertRaises(HTTPException) as context:
            ensure_authenticated_user_matches(
                SimpleNamespace(id=uuid4()),
                uuid4(),
                auth_detail="auth required",
                mismatch_detail="mismatch",
            )

        self.assertEqual(context.exception.status_code, 403)

    def test_ensure_authenticated_user_matches_allows_same_user(self) -> None:
        user_id = uuid4()
        ensure_authenticated_user_matches(
            SimpleNamespace(id=user_id),
            user_id,
            auth_detail="auth required",
            mismatch_detail="mismatch",
        )


if __name__ == "__main__":
    unittest.main()
