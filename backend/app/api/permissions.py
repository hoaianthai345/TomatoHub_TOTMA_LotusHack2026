from uuid import UUID

from fastapi import HTTPException, status

from app.models.user import User


def ensure_superuser(current_user: User) -> None:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser privileges required",
        )


def ensure_matching_organization(
    current_user: User,
    organization_id: UUID,
    detail: str = "Cannot manage resources for another organization",
) -> None:
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


def ensure_authenticated_user_matches(
    current_user: User | None,
    subject_user_id: UUID | None,
    *,
    auth_detail: str,
    mismatch_detail: str,
) -> None:
    if subject_user_id is None:
        return

    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=auth_detail,
        )

    if current_user.id != subject_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=mismatch_detail,
        )
