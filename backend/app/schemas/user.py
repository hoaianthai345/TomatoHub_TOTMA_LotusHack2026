import enum
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class UserRole(str, enum.Enum):
    supporter = "supporter"
    organization = "organization"


class UserSupportType(str, enum.Enum):
    donor_money = "donor_money"
    donor_goods = "donor_goods"
    volunteer = "volunteer"
    shipper = "shipper"
    coordinator = "coordinator"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    location: str | None = None
    support_types: list[UserSupportType] = Field(default_factory=list)


class UserCreate(UserBase):
    password: str
    organization_id: UUID | None = None


class UserRead(UserBase):
    id: UUID
    role: UserRole = UserRole.supporter
    is_active: bool
    is_superuser: bool
    organization_id: UUID | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def sync_role(self) -> "UserRead":
        self.role = (
            UserRole.organization if self.organization_id is not None else UserRole.supporter
        )
        return self
