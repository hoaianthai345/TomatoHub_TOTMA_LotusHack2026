from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, get_user_role
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_password_reset_token,
    decode_refresh_token,
    get_password_hash,
    verify_and_update_password,
)
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    CurrentUserRead,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    OrganizationProfileUpdateRequest,
    OrganizationSignupRequest,
    RefreshTokenRequest,
    ResetPasswordRequest,
    SupporterSignupRequest,
    TokenResponse,
    UserProfileUpdateRequest,
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
        refresh_token=create_refresh_token(user.id, user.refresh_token_version),
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
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    is_valid_password, updated_hash = verify_and_update_password(
        payload.password,
        user.hashed_password,
    )
    if not is_valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if updated_hash is not None:
        user.hashed_password = updated_hash
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )
    return _build_token_response(user)


@router.get("/me", response_model=CurrentUserRead)
def get_me(current_user: User = Depends(get_current_active_user)) -> CurrentUserRead:
    return _to_current_user_read(current_user)


@router.patch("/me/profile", response_model=CurrentUserRead)
def update_my_profile(
    payload: UserProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CurrentUserRead:
    update_data = payload.model_dump(exclude_unset=True)
    if "support_types" in update_data:
        if current_user.organization_id is not None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Organization account cannot set supporter support types",
            )
        support_types = update_data.get("support_types")
        if support_types is not None:
            current_user.support_types = [support_type.value for support_type in support_types]

    if "full_name" in update_data:
        full_name = (update_data.get("full_name") or "").strip()
        if not full_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="full_name cannot be empty",
            )
        current_user.full_name = full_name

    if "location" in update_data:
        location = update_data.get("location")
        current_user.location = location.strip() if isinstance(location, str) else None

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return _to_current_user_read(current_user)


@router.post("/refresh", response_model=TokenResponse)
def refresh_tokens(
    payload: RefreshTokenRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    try:
        decoded_refresh = decode_refresh_token(payload.refresh_token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        ) from None

    user = db.get(User, decoded_refresh.subject)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    if user.refresh_token_version != decoded_refresh.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )
    return _build_token_response(user)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict[str, str]:
    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="new_password must be different from current_password",
        )

    is_valid_password, _ = verify_and_update_password(
        payload.current_password,
        current_user.hashed_password,
    )
    if not is_valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    current_user.hashed_password = get_password_hash(payload.new_password)
    current_user.refresh_token_version += 1
    db.add(current_user)
    db.commit()
    return {"message": "Password changed successfully"}


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    reset_token: str | None = None
    if user is not None and user.is_active:
        generated_token = create_password_reset_token(user.id, user.refresh_token_version)
        if settings.PASSWORD_RESET_DEBUG_RETURN_TOKEN or settings.APP_ENV != "production":
            reset_token = generated_token

    return ForgotPasswordResponse(
        message="If this email exists, a password reset instruction has been generated.",
        reset_token=reset_token,
    )


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    try:
        decoded = decode_password_reset_token(payload.reset_token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        ) from None

    user = db.get(User, decoded.subject)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    if user.refresh_token_version != decoded.token_version:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has been revoked",
        )

    user.hashed_password = get_password_hash(payload.new_password)
    user.refresh_token_version += 1
    db.add(user)
    db.commit()
    return {"message": "Password reset successfully"}


@router.post("/logout")
def logout() -> dict[str, str]:
    # Stateless token auth: frontend removes token locally.
    return {"message": "Logged out"}


@router.post("/logout-all")
def logout_all_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict[str, str]:
    current_user.refresh_token_version += 1
    db.add(current_user)
    db.commit()
    return {"message": "Logged out from all sessions"}
