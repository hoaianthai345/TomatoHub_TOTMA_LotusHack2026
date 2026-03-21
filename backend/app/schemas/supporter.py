from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.user import UserSupportType


class SupporterRead(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    location: str | None
    support_types: list[UserSupportType] = Field(default_factory=list)
    joined_campaign_ids: list[UUID] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class SupporterUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    location: str | None = Field(default=None, max_length=120)
    support_types: list[UserSupportType] | None = None
