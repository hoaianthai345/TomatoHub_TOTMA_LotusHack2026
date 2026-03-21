from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.core.config import settings
from app.models.checkpoint_scan_log import CheckpointScanType

QR_TOKEN_SALT = "campaign-checkpoint-qr"
QR_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24  # 24h hard cap


@dataclass(frozen=True, slots=True)
class DecodedCheckpointQrToken:
    checkpoint_id: UUID
    campaign_id: UUID
    organization_id: UUID
    scan_type: CheckpointScanType
    nonce: str
    expires_at: datetime


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.SECRET_KEY, salt=QR_TOKEN_SALT)


def generate_checkpoint_qr_token(
    *,
    checkpoint_id: UUID,
    campaign_id: UUID,
    organization_id: UUID,
    scan_type: CheckpointScanType,
    expires_in_minutes: int,
) -> tuple[str, datetime, str]:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=expires_in_minutes)
    nonce = uuid4().hex
    payload = {
        "typ": "checkpoint_scan",
        "checkpoint_id": str(checkpoint_id),
        "campaign_id": str(campaign_id),
        "organization_id": str(organization_id),
        "scan_type": scan_type.value,
        "nonce": nonce,
        "exp": int(expires_at.timestamp()),
    }
    token = _serializer().dumps(payload)
    return token, expires_at, nonce


def decode_checkpoint_qr_token(token: str) -> DecodedCheckpointQrToken:
    serializer = _serializer()
    try:
        payload = serializer.loads(token, max_age=QR_TOKEN_MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired) as exc:
        raise ValueError("Invalid or expired QR token") from exc

    try:
        if payload.get("typ") != "checkpoint_scan":
            raise ValueError("Invalid token type")

        exp_epoch = int(payload["exp"])
        expires_at = datetime.fromtimestamp(exp_epoch, tz=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            raise ValueError("QR token expired")

        return DecodedCheckpointQrToken(
            checkpoint_id=UUID(payload["checkpoint_id"]),
            campaign_id=UUID(payload["campaign_id"]),
            organization_id=UUID(payload["organization_id"]),
            scan_type=CheckpointScanType(payload["scan_type"]),
            nonce=str(payload["nonce"]),
            expires_at=expires_at,
        )
    except (KeyError, TypeError) as exc:
        raise ValueError("Malformed QR token payload") from exc
    except ValueError as exc:
        raise ValueError(str(exc)) from exc
