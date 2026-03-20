import hashlib
from uuid import UUID

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _normalize_password(password: str) -> str:
    # bcrypt accepts at most 72 bytes. Pre-hash long input to keep behavior deterministic.
    if len(password.encode("utf-8")) > 72:
        return hashlib.sha256(password.encode("utf-8")).hexdigest()
    return password


def get_password_hash(password: str) -> str:
    return pwd_context.hash(_normalize_password(password))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(_normalize_password(plain_password), hashed_password)


def _token_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.SECRET_KEY, salt="auth-token")


def create_access_token(subject: UUID) -> str:
    serializer = _token_serializer()
    return serializer.dumps({"sub": str(subject)})


def decode_access_token(token: str) -> UUID:
    serializer = _token_serializer()
    max_age_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    try:
        payload = serializer.loads(token, max_age=max_age_seconds)
        subject = payload.get("sub")
        if not isinstance(subject, str):
            raise ValueError("Invalid token payload")
        return UUID(subject)
    except (BadSignature, SignatureExpired, ValueError) as exc:
        raise ValueError("Invalid or expired token") from exc
