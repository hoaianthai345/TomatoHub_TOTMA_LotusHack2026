from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class OrganizationDashboardRead(BaseModel):
    organization_id: UUID
    campaigns: int
    beneficiaries: int
    supporters: int
    donations: int
    total_raised: Decimal


class SupporterDashboardRead(BaseModel):
    user_id: UUID
    active_campaigns: int
    total_contributions: int
    total_donated_amount: Decimal
    my_registrations: int
    tasks_completed: int
