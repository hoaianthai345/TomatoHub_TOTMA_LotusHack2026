from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class OrganizationBase(BaseModel):
    name: str
    description: str | None = None
    website: str | None = None
    location: str | None = None
    logo_url: str | None = None


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationRead(OrganizationBase):
    id: UUID
    verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
