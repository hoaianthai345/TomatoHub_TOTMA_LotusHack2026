from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.beneficiary import BeneficiaryStatus


class BeneficiaryBase(BaseModel):
    organization_id: UUID
    campaign_id: UUID | None = None
    full_name: str
    location: str | None = None
    category: str
    story: str | None = None
    target_support_amount: Decimal
    status: BeneficiaryStatus = BeneficiaryStatus.added


class BeneficiaryCreate(BeneficiaryBase):
    is_verified: bool = False


class BeneficiaryUpdate(BaseModel):
    campaign_id: UUID | None = None
    full_name: str | None = None
    location: str | None = None
    category: str | None = None
    story: str | None = None
    target_support_amount: Decimal | None = None
    status: BeneficiaryStatus | None = None
    is_verified: bool | None = None


class BeneficiaryRead(BeneficiaryBase):
    id: UUID
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
