from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CampaignBase(BaseModel):
    organization_id: UUID
    title: str
    slug: str
    description: str | None = None
    goal_amount: Decimal
    starts_at: datetime
    ends_at: datetime | None = None


class CampaignCreate(CampaignBase):
    pass


class CampaignRead(CampaignBase):
    id: UUID
    raised_amount: Decimal
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
