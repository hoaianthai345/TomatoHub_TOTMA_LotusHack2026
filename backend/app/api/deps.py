from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.permissions import ensure_superuser
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserRole

bearer_scheme = HTTPBearer(auto_error=False)


def _resolve_user(
    credentials: HTTPAuthorizationCredentials | None,
    db: Session,
) -> User | None:
    if credentials is None:
        return None

    try:
        user_id = decode_access_token(credentials.credentials)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from None

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    user = _resolve_user(credentials, db)
    if user is None:
        return None
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    user = _resolve_user(credentials, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user


def get_current_organization_user(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization account required",
        )
    return current_user


def get_current_superuser(current_user: User = Depends(get_current_active_user)) -> User:
    ensure_superuser(current_user)
    return current_user


def get_user_role(user: User) -> UserRole:
    if user.organization_id is not None:
        return UserRole.organization
    return UserRole.supporter


__all__ = [
    "get_db",
    "get_current_user",
    "get_optional_current_user",
    "get_current_active_user",
    "get_current_organization_user",
    "get_current_superuser",
    "get_user_role",
]
