from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserRole, UserSupportType


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class SupporterSignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    location: str | None = Field(default=None, max_length=120)
    support_types: list[UserSupportType] = Field(default_factory=list)


class OrganizationSignupRequest(BaseModel):
    organization_name: str = Field(min_length=2, max_length=255)
    representative_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    location: str | None = Field(default=None, max_length=120)
    description: str | None = None
    website: str | None = Field(default=None, max_length=255)
    logo_url: str | None = Field(default=None, max_length=500)


class SupporterProfileUpdateRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    location: str | None = Field(default=None, max_length=120)
    support_types: list[UserSupportType] = Field(default_factory=list)


class OrganizationProfileUpdateRequest(BaseModel):
    organization_name: str = Field(min_length=2, max_length=255)
    representative_name: str = Field(min_length=2, max_length=255)
    location: str | None = Field(default=None, max_length=120)
    description: str | None = None
    website: str | None = Field(default=None, max_length=255)
    logo_url: str | None = Field(default=None, max_length=500)


class CurrentUserRead(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    organization_id: UUID | None
    organization_name: str | None = None
    organization_credit_score: int | None = None
    credit_score: int
    location: str | None = None
    support_types: list[UserSupportType] = Field(default_factory=list)
    is_active: bool
    is_superuser: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    user: CurrentUserRead


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=20)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: str | None = None


class ResetPasswordRequest(BaseModel):
    reset_token: str = Field(min_length=20)
    new_password: str = Field(min_length=8, max_length=128)


class UserProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    location: str | None = Field(default=None, max_length=120)
    support_types: list[UserSupportType] | None = None
