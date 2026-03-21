from collections.abc import Callable
from typing import TypeVar

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, get_user_role
from app.api.rate_limit import InMemorySlidingWindowRateLimiter, enforce_rate_limit, get_client_ip
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
from app.db.resilience import is_transient_db_error, run_with_db_retry
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
    SupporterProfileUpdateRequest,
    SupporterSignupRequest,
    TokenResponse,
    UserProfileUpdateRequest,
)
from app.schemas.user import UserSupportType

router = APIRouter(prefix="/auth", tags=["auth"])
T = TypeVar("T")

_login_ip_limiter = InMemorySlidingWindowRateLimiter(
    window_seconds=settings.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    max_requests=settings.AUTH_LOGIN_RATE_LIMIT_PER_IP,
)
_login_email_limiter = InMemorySlidingWindowRateLimiter(
    window_seconds=settings.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    max_requests=settings.AUTH_LOGIN_RATE_LIMIT_PER_EMAIL,
)
_signup_ip_limiter = InMemorySlidingWindowRateLimiter(
    window_seconds=settings.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    max_requests=settings.AUTH_SIGNUP_RATE_LIMIT_PER_IP,
)
_refresh_ip_limiter = InMemorySlidingWindowRateLimiter(
    window_seconds=settings.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    max_requests=settings.AUTH_REFRESH_RATE_LIMIT_PER_IP,
)
_forgot_password_ip_limiter = InMemorySlidingWindowRateLimiter(
    window_seconds=settings.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    max_requests=settings.AUTH_FORGOT_PASSWORD_RATE_LIMIT_PER_IP,
)


def _service_unavailable() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Authentication service is temporarily unavailable. Please retry.",
    )


def _run_auth_db_read_with_retry(db: Session, operation: Callable[[], T]) -> T:
    try:
        return run_with_db_retry(
            operation,
            max_attempts=settings.DB_RETRY_MAX_ATTEMPTS,
            base_delay_seconds=max(0.01, settings.DB_RETRY_BASE_DELAY_MS / 1000),
            max_delay_seconds=max(0.05, settings.DB_RETRY_MAX_DELAY_MS / 1000),
            on_retry=lambda _attempt, _exc: db.rollback(),
        )
    except Exception as exc:  # noqa: BLE001
        if is_transient_db_error(exc):
            raise _service_unavailable() from None
        raise


def _run_auth_db_write(db: Session, operation: Callable[[], T]) -> T:
    try:
        return operation()
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        if is_transient_db_error(exc):
            raise _service_unavailable() from None
        raise


def _enforce_login_rate_limit(request: Request, email: str) -> None:
    ip = get_client_ip(request)
    enforce_rate_limit(
        limiter=_login_ip_limiter,
        key=f"login-ip:{ip}",
        detail="Too many login requests from this IP. Please retry later.",
    )
    enforce_rate_limit(
        limiter=_login_email_limiter,
        key=f"login-email:{email.strip().lower()}",
        detail="Too many login attempts for this email. Please retry later.",
    )


def _enforce_signup_rate_limit(request: Request) -> None:
    ip = get_client_ip(request)
    enforce_rate_limit(
        limiter=_signup_ip_limiter,
        key=f"signup-ip:{ip}",
        detail="Too many signup requests from this IP. Please retry later.",
    )


def _enforce_refresh_rate_limit(request: Request) -> None:
    ip = get_client_ip(request)
    enforce_rate_limit(
        limiter=_refresh_ip_limiter,
        key=f"refresh-ip:{ip}",
        detail="Too many refresh requests from this IP. Please retry later.",
    )


def _enforce_forgot_password_rate_limit(request: Request) -> None:
    ip = get_client_ip(request)
    enforce_rate_limit(
        limiter=_forgot_password_ip_limiter,
        key=f"forgot-password-ip:{ip}",
        detail="Too many forgot-password requests from this IP. Please retry later.",
    )


def _to_current_user_read(user: User) -> CurrentUserRead:
    support_types: list[UserSupportType] = []
    for raw_type in user.support_types:
        try:
            support_types.append(UserSupportType(raw_type))
        except ValueError:
            continue

    organization_name = user.organization.name if user.organization is not None else None
    organization_credit_score = (
        user.organization.credit_score if user.organization is not None else None
    )
    return CurrentUserRead(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=get_user_role(user),
        organization_id=user.organization_id,
        organization_name=organization_name,
        organization_credit_score=organization_credit_score,
        credit_score=user.credit_score,
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
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    _enforce_signup_rate_limit(request)

    existing = _run_auth_db_read_with_retry(
        db,
        lambda: db.scalar(select(User.id).where(User.email == payload.email)),
    )
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
    def _persist_supporter() -> None:
        db.add(user)
        db.commit()
        db.refresh(user)

    try:
        _run_auth_db_write(db, _persist_supporter)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        ) from None
    return _build_token_response(user)


@router.post("/signup/organization", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup_organization(
    payload: OrganizationSignupRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    _enforce_signup_rate_limit(request)

    existing_user = _run_auth_db_read_with_retry(
        db,
        lambda: db.scalar(select(User.id).where(User.email == payload.email)),
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    existing_org = _run_auth_db_read_with_retry(
        db,
        lambda: db.scalar(select(Organization.id).where(Organization.name == payload.organization_name)),
    )
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
        _run_auth_db_write(db, db.commit)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Failed to create organization account",
        ) from None
    _run_auth_db_write(db, lambda: db.refresh(user))
    return _build_token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    _enforce_login_rate_limit(request, payload.email)

    user = _run_auth_db_read_with_retry(
        db,
        lambda: db.scalar(select(User).where(User.email == payload.email)),
    )
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
        def _persist_password_upgrade() -> None:
            db.add(user)
            db.commit()
            db.refresh(user)

        _run_auth_db_write(db, _persist_password_upgrade)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )
    return _build_token_response(user)


@router.get("/me", response_model=CurrentUserRead)
def get_me(current_user: User = Depends(get_current_active_user)) -> CurrentUserRead:
    return _to_current_user_read(current_user)


@router.patch("/me/supporter-profile", response_model=CurrentUserRead)
def update_my_supporter_profile(
    payload: SupporterProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CurrentUserRead:
    if current_user.organization_id is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Supporter account required",
        )

    full_name = payload.full_name.strip()
    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="full_name cannot be empty",
        )

    current_user.full_name = full_name
    current_user.location = payload.location.strip() if payload.location else None
    current_user.support_types = [support_type.value for support_type in payload.support_types]

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return _to_current_user_read(current_user)


@router.patch("/me/organization-profile", response_model=CurrentUserRead)
def update_my_organization_profile(
    payload: OrganizationProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CurrentUserRead:
    if current_user.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Organization account required",
        )

    organization = db.get(Organization, current_user.organization_id)
    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    organization_name = payload.organization_name.strip()
    representative_name = payload.representative_name.strip()
    if not organization_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="organization_name cannot be empty",
        )
    if not representative_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="representative_name cannot be empty",
        )

    current_user.full_name = representative_name
    current_user.location = payload.location.strip() if payload.location else None

    organization.name = organization_name
    organization.location = payload.location.strip() if payload.location else None
    organization.description = payload.description
    organization.website = payload.website
    organization.logo_url = payload.logo_url

    db.add(current_user)
    db.add(organization)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization name already exists",
        ) from None
    db.refresh(current_user)
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
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    _enforce_refresh_rate_limit(request)

    try:
        decoded_refresh = decode_refresh_token(payload.refresh_token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        ) from None

    user = _run_auth_db_read_with_retry(
        db,
        lambda: db.get(User, decoded_refresh.subject),
    )
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
    def _persist_changed_password() -> None:
        db.add(current_user)
        db.commit()

    _run_auth_db_write(db, _persist_changed_password)
    return {"message": "Password changed successfully"}


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    _enforce_forgot_password_rate_limit(request)
    user = _run_auth_db_read_with_retry(
        db,
        lambda: db.scalar(select(User).where(User.email == payload.email)),
    )
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

    user = _run_auth_db_read_with_retry(
        db,
        lambda: db.get(User, decoded.subject),
    )
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
    def _persist_reset_password() -> None:
        db.add(user)
        db.commit()

    _run_auth_db_write(db, _persist_reset_password)
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
    def _persist_logout_all() -> None:
        db.add(current_user)
        db.commit()

    _run_auth_db_write(db, _persist_logout_all)
    return {"message": "Logged out from all sessions"}
