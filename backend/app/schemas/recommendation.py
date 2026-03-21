from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.campaign import SupportType


class CampaignDraftRecommendationRequest(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    campaign_goal: str = Field(min_length=20, max_length=3000)
    beneficiary_context: str | None = Field(default=None, max_length=2000)
    location_hint: str | None = Field(default=None, max_length=255)
    support_types_hint: list[SupportType] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    tone: str = Field(default="clear, transparent, community-driven", max_length=255)


class CampaignDraftRecommendationResponse(BaseModel):
    short_description: str
    description: str
    suggested_tags: list[str] = Field(default_factory=list)
    suggested_support_types: list[SupportType] = Field(default_factory=list)
    volunteer_tasks: list[str] = Field(default_factory=list)
    donation_suggestions: list[str] = Field(default_factory=list)
    risk_notes: list[str] = Field(default_factory=list)
    transparency_notes: list[str] = Field(default_factory=list)
    generated_by: str
    model: str | None = None


class SupporterCampaignRecommendationItem(BaseModel):
    campaign_id: UUID
    campaign_slug: str
    campaign_title: str
    short_description: str | None = None
    location: str | None = None
    support_types: list[SupportType] = Field(default_factory=list)
    goal_amount: Decimal
    raised_amount: Decimal
    progress_percent: int
    ends_at: datetime | None = None
    match_score: float
    match_reasons: list[str] = Field(default_factory=list)
    suggested_actions: list[str] = Field(default_factory=list)


class SupporterCampaignRecommendationResponse(BaseModel):
    user_id: UUID
    generated_by: str
    model: str | None = None
    items: list[SupporterCampaignRecommendationItem] = Field(default_factory=list)
