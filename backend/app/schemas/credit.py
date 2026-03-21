from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.credit_event import CreditTargetType


class CreditEventRead(BaseModel):
    id: UUID
    target_type: CreditTargetType
    target_user_id: UUID | None
    target_organization_id: UUID | None
    actor_user_id: UUID | None
    event_type: str
    points: int
    note: str | None
    context: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CreditProfileRead(BaseModel):
    target_type: CreditTargetType
    target_user_id: UUID | None = None
    target_organization_id: UUID | None = None
    credit_score: int
    credit_level: str
    recent_events: list[CreditEventRead] = Field(default_factory=list)


class MyCreditRead(BaseModel):
    supporter: CreditProfileRead | None = None
    organization: CreditProfileRead | None = None


class CreditAdjustRequest(BaseModel):
    target_type: CreditTargetType
    target_user_id: UUID | None = None
    target_organization_id: UUID | None = None
    points: int = Field(ge=-500, le=500)
    event_type: str = Field(default="manual_adjustment", min_length=3, max_length=80)
    note: str | None = Field(default=None, max_length=500)
    context: dict = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_target(self) -> "CreditAdjustRequest":
        if self.points == 0:
            raise ValueError("points must not be zero")

        if self.target_type == CreditTargetType.supporter:
            if self.target_user_id is None or self.target_organization_id is not None:
                raise ValueError("supporter adjustment must include only target_user_id")

        if self.target_type == CreditTargetType.organization:
            if self.target_organization_id is None or self.target_user_id is not None:
                raise ValueError("organization adjustment must include only target_organization_id")

        return self
