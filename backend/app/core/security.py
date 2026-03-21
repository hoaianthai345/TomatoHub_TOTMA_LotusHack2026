import hashlib
from dataclasses import dataclass
from uuid import UUID

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated="auto",
)


@dataclass(frozen=True, slots=True)
class DecodedRefreshToken:
    subject: UUID
    token_version: int


@dataclass(frozen=True, slots=True)
class DecodedPasswordResetToken:
    subject: UUID
    token_version: int


def _is_bcrypt_password_length_error(exc: Exception) -> bool:
    return "password cannot be longer than 72 bytes" in str(exc)


def _legacy_prehashed_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _safe_hash_password(password: str) -> str:
    try:
        return pwd_context.hash(password)
    except ValueError as exc:
        if not _is_bcrypt_password_length_error(exc):
            raise
        # Fallback for environments that still route through strict bcrypt behavior.
        fallback = _legacy_prehashed_password(password)
        return pwd_context.hash(fallback)


def _safe_verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError as exc:
        if not _is_bcrypt_password_length_error(exc):
            raise
        fallback = _legacy_prehashed_password(plain_password)
        return pwd_context.verify(fallback, hashed_password)


def get_password_hash(password: str) -> str:
    return _safe_hash_password(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    is_valid, _ = verify_and_update_password(plain_password, hashed_password)
    return is_valid


def verify_and_update_password(
    plain_password: str,
    hashed_password: str,
) -> tuple[bool, str | None]:
    """
    Verify password and return optional new hash when algorithm migration is needed.

    Supports legacy hashes created from SHA-256 pre-hashed input (old workaround for
    bcrypt length limit). When legacy verification succeeds, rehashes original plain
    password with current default algorithm.
    """
    try:
        is_valid, new_hash = pwd_context.verify_and_update(plain_password, hashed_password)
    except ValueError as exc:
        if not _is_bcrypt_password_length_error(exc):
            raise
        is_valid, new_hash = False, None

    if is_valid:
        return True, new_hash

    legacy_password = _legacy_prehashed_password(plain_password)
    try:
        legacy_valid = _safe_verify_password(legacy_password, hashed_password)
    except ValueError:
        legacy_valid = False

    if legacy_valid:
        # Migrate legacy hash to current default (argon2) using original password.
        return True, get_password_hash(plain_password)

    return False, None


def _token_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.SECRET_KEY, salt="auth-token")


def create_access_token(subject: UUID) -> str:
    serializer = _token_serializer()
    return serializer.dumps({"sub": str(subject), "typ": "access"})


def decode_access_token(token: str) -> UUID:
    serializer = _token_serializer()
    max_age_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    try:
        payload = serializer.loads(token, max_age=max_age_seconds)
        token_type = payload.get("typ")
        if token_type not in (None, "access"):
            raise ValueError("Invalid token type")
        subject = payload.get("sub")
        if not isinstance(subject, str):
            raise ValueError("Invalid token payload")
        return UUID(subject)
    except (BadSignature, SignatureExpired, ValueError) as exc:
        raise ValueError("Invalid or expired token") from exc


def _refresh_token_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.SECRET_KEY, salt="refresh-token")


def create_refresh_token(subject: UUID, token_version: int) -> str:
    serializer = _refresh_token_serializer()
    return serializer.dumps(
        {
            "sub": str(subject),
            "typ": "refresh",
            "v": int(token_version),
        }
    )


def decode_refresh_token(token: str) -> DecodedRefreshToken:
    serializer = _refresh_token_serializer()
    max_age_seconds = settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60
    try:
        payload = serializer.loads(token, max_age=max_age_seconds)
        if payload.get("typ") != "refresh":
            raise ValueError("Invalid token type")

        subject = payload.get("sub")
        token_version = payload.get("v")
        if not isinstance(subject, str):
            raise ValueError("Invalid token payload")
        if not isinstance(token_version, int) or token_version < 0:
            raise ValueError("Invalid token payload")
        return DecodedRefreshToken(subject=UUID(subject), token_version=token_version)
    except (BadSignature, SignatureExpired, ValueError) as exc:
        raise ValueError("Invalid or expired token") from exc


def _password_reset_token_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.SECRET_KEY, salt="password-reset-token")


def create_password_reset_token(subject: UUID, token_version: int) -> str:
    serializer = _password_reset_token_serializer()
    return serializer.dumps(
        {
            "sub": str(subject),
            "typ": "password_reset",
            "v": int(token_version),
        }
    )


def decode_password_reset_token(token: str) -> DecodedPasswordResetToken:
    serializer = _password_reset_token_serializer()
    max_age_seconds = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES * 60
    try:
        payload = serializer.loads(token, max_age=max_age_seconds)
        if payload.get("typ") != "password_reset":
            raise ValueError("Invalid token type")

        subject = payload.get("sub")
        token_version = payload.get("v")
        if not isinstance(subject, str):
            raise ValueError("Invalid token payload")
        if not isinstance(token_version, int) or token_version < 0:
            raise ValueError("Invalid token payload")
        return DecodedPasswordResetToken(subject=UUID(subject), token_version=token_version)
    except (BadSignature, SignatureExpired, ValueError) as exc:
        raise ValueError("Invalid or expired token") from exc
