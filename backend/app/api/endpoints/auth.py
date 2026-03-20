from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, get_user_role
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import (
    CurrentUserRead,
    LoginRequest,
    OrganizationSignupRequest,
    SupporterSignupRequest,
    TokenResponse,
)
from app.schemas.user import UserSupportType

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_current_user_read(user: User) -> CurrentUserRead:
    support_types: list[UserSupportType] = []
    for raw_type in user.support_types:
        try:
            support_types.append(UserSupportType(raw_type))
        except ValueError:
            continue

    organization_name = user.organization.name if user.organization is not None else None
    return CurrentUserRead(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=get_user_role(user),
        organization_id=user.organization_id,
        organization_name=organization_name,
        location=user.location,
        support_types=support_types,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
    )


def _build_token_response(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id),
        user=_to_current_user_read(user),
    )


@router.post("/signup/supporter", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup_supporter(
    payload: SupporterSignupRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    existing = db.scalar(select(User.id).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        location=payload.location,
        support_types=[support_type.value for support_type in payload.support_types],
        is_active=True,
        is_superuser=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _build_token_response(user)


@router.post("/signup/organization", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup_organization(
    payload: OrganizationSignupRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    existing_user = db.scalar(select(User.id).where(User.email == payload.email))
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    existing_org = db.scalar(select(Organization.id).where(Organization.name == payload.organization_name))
    if existing_org is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization name already exists",
        )

    organization = Organization(
        name=payload.organization_name,
        description=payload.description,
        website=payload.website,
        location=payload.location,
        logo_url=payload.logo_url,
        verified=False,
    )
    user = User(
        email=payload.email,
        full_name=payload.representative_name,
        hashed_password=get_password_hash(payload.password),
        location=payload.location,
        support_types=[],
        is_active=True,
        is_superuser=False,
        organization=organization,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Failed to create organization account",
        ) from None
    db.refresh(user)
    return _build_token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )
    return _build_token_response(user)


@router.get("/me", response_model=CurrentUserRead)
def get_me(current_user: User = Depends(get_current_active_user)) -> CurrentUserRead:
    return _to_current_user_read(current_user)


@router.post("/logout")
def logout() -> dict[str, str]:
    # Stateless token auth: frontend removes token locally.
    return {"message": "Logged out"}
