from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BeneficiaryBase(BaseModel):
    organization_id: UUID
    campaign_id: UUID | None = None
    full_name: str
    category: str
    story: str | None = None
    target_support_amount: Decimal


class BeneficiaryCreate(BeneficiaryBase):
    is_verified: bool = False


class BeneficiaryRead(BeneficiaryBase):
    id: UUID
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
