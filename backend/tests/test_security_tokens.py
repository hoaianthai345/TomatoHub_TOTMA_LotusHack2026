import unittest
from uuid import uuid4

from app.core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_access_token,
    decode_password_reset_token,
    decode_refresh_token,
    get_password_hash,
    verify_password,
)


class SecurityTokensTestCase(unittest.TestCase):
    def test_access_token_round_trip(self) -> None:
        user_id = uuid4()
        token = create_access_token(user_id)
        self.assertEqual(decode_access_token(token), user_id)

    def test_access_token_rejects_refresh_token_payload(self) -> None:
        user_id = uuid4()
        refresh_token = create_refresh_token(user_id, token_version=3)
        with self.assertRaises(ValueError):
            decode_access_token(refresh_token)

    def test_refresh_token_round_trip(self) -> None:
        user_id = uuid4()
        token = create_refresh_token(user_id, token_version=7)
        decoded = decode_refresh_token(token)
        self.assertEqual(decoded.subject, user_id)
        self.assertEqual(decoded.token_version, 7)

    def test_password_reset_token_round_trip(self) -> None:
        user_id = uuid4()
        token = create_password_reset_token(user_id, token_version=5)
        decoded = decode_password_reset_token(token)
        self.assertEqual(decoded.subject, user_id)
        self.assertEqual(decoded.token_version, 5)

    def test_password_hash_verify(self) -> None:
        password = "Supporter@123456"
        hashed = get_password_hash(password)
        self.assertTrue(verify_password(password, hashed))
        self.assertFalse(verify_password("wrong-password", hashed))


if __name__ == "__main__":
    unittest.main()
