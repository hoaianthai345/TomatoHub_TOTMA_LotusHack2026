from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MonetaryDonationBase(BaseModel):
    campaign_id: UUID
    donor_user_id: UUID | None = None
    donor_name: str
    amount: Decimal = Field(gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    payment_method: str = "bank_transfer"
    note: str | None = None


class MonetaryDonationCreate(MonetaryDonationBase):
    pass


class MonetaryDonationRead(MonetaryDonationBase):
    id: UUID
    donated_at: datetime

    model_config = ConfigDict(from_attributes=True)
