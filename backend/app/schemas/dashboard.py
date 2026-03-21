from decimal import Decimal
from typing import Literal
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.campaign import SupportType


class SupporterParticipationCardRead(BaseModel):
    id: str
    campaign_id: UUID
    campaign_title: str
    campaign_location: str
    cover_image_url: str | None = None
    role_label: str
    status_label: str
    next_step: str
    date_label: str


class SupporterContributionItemRead(BaseModel):
    id: str
    campaign_id: UUID
    campaign_title: str
    contribution_type: SupportType
    summary: str
    status_label: str
    date_label: str


class SupporterTaskItemRead(BaseModel):
    id: str
    campaign_id: UUID
    campaign_title: str
    title: str
    status_label: str
    due_label: str


class OrganizationCampaignSnapshotRead(BaseModel):
    id: str
    campaign_id: UUID
    campaign_title: str
    location: str
    status_label: str
    support_label: str
    progress_percent: int
    note: str


class OrganizationActivityItemRead(BaseModel):
    id: str
    actor: str
    title: str
    detail: str
    time_label: str


class OrganizationDashboardRead(BaseModel):
    organization_id: UUID
    campaigns: int
    beneficiaries: int
    supporters: int
    donations: int
    total_raised: Decimal
    campaign_snapshots: list[OrganizationCampaignSnapshotRead] = Field(default_factory=list)
    recent_activities: list[OrganizationActivityItemRead] = Field(default_factory=list)


class SupporterDashboardRead(BaseModel):
    user_id: UUID
    active_campaigns: int
    total_contributions: int
    total_donated_amount: Decimal
    my_registrations: int
    tasks_completed: int


class OrganizationCampaignPipelineItemRead(BaseModel):
    id: str
    campaign_id: UUID
    campaign_title: str
    location: str | None
    status_label: str
    support_label: str
    progress_percent: int
    note: str
    updated_at: datetime


class OrganizationActivityItemRead(BaseModel):
    id: str
    actor: str
    title: str
    detail: str
    time_label: str
    created_at: datetime


class SupporterParticipationItemRead(BaseModel):
    id: str
    campaign_id: UUID
    campaign_title: str
    campaign_location: str | None
    role_label: str
    status_label: str
    next_step: str
    date_label: str
    created_at: datetime


class SupporterTaskItemRead(BaseModel):
    id: str
    campaign_id: UUID
    campaign_title: str
    title: str
    status_label: str
    due_label: str
    created_at: datetime


class SupporterContributionItemRead(BaseModel):
    id: str
    campaign_id: UUID
    campaign_title: str
    contribution_type: Literal["money", "goods", "volunteer"]
    summary: str
    status_label: str
    date_label: str
    created_at: datetime
