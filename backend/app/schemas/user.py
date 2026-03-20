from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str
    organization_id: UUID | None = None


class UserRead(UserBase):
    id: UUID
    is_active: bool
    is_superuser: bool
    organization_id: UUID | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
