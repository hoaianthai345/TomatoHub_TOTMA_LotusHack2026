from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OrganizationBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    website: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=120)
    logo_url: str | None = Field(default=None, max_length=500)


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    website: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=120)
    logo_url: str | None = Field(default=None, max_length=500)


class OrganizationRead(OrganizationBase):
    id: UUID
    verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
