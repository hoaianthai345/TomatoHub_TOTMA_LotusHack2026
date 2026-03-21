from datetime import datetime
from decimal import Decimal
from uuid import UUID
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.campaign import CampaignStatus, SupportType


def _coerce_raw_to_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple | set):
        return list(value)
    if isinstance(value, dict):
        return []
    return [value]


class CampaignCreate(BaseModel):
    organization_id: UUID
    title: str = Field(min_length=3, max_length=255)
    slug: str | None = None
    short_description: str | None = Field(default=None, max_length=500)
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    cover_image_url: str | None = Field(default=None, max_length=500)
    support_types: list[SupportType] = Field(
        default_factory=lambda: [SupportType.money],
        min_length=1,
    )
    goal_amount: Decimal = Field(gt=0)

    province: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=120)
    address_line: str | None = Field(default=None, max_length=255)
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    media_urls: list[str] = Field(default_factory=list)

    starts_at: datetime
    ends_at: datetime | None = None

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip().lower()
        return normalized or None

    @field_validator("media_urls")
    @classmethod
    def normalize_media_urls(cls, values: list[str]) -> list[str]:
        return [value.strip() for value in values if value.strip()]

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, values: list[str]) -> list[str]:
        normalized: list[str] = []
        for value in values:
            clean = value.strip().lower()
            if clean and clean not in normalized:
                normalized.append(clean)
        return normalized

    @model_validator(mode="after")
    def validate_time_window(self) -> "CampaignCreate":
        if self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be greater than starts_at")
        return self


class CampaignUpdate(BaseModel):
    organization_id: UUID | None = None
    title: str | None = Field(default=None, min_length=3, max_length=255)
    slug: str | None = None
    short_description: str | None = Field(default=None, max_length=500)
    description: str | None = None
    tags: list[str] | None = None
    cover_image_url: str | None = Field(default=None, max_length=500)
    support_types: list[SupportType] | None = Field(default=None, min_length=1)
    goal_amount: Decimal | None = Field(default=None, gt=0)

    province: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=120)
    address_line: str | None = Field(default=None, max_length=255)
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    media_urls: list[str] | None = None

    starts_at: datetime | None = None
    ends_at: datetime | None = None

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip().lower()
        return normalized or None

    @field_validator("media_urls")
    @classmethod
    def normalize_media_urls(cls, values: list[str] | None) -> list[str] | None:
        if values is None:
            return values
        return [value.strip() for value in values if value.strip()]

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, values: list[str] | None) -> list[str] | None:
        if values is None:
            return values
        normalized: list[str] = []
        for value in values:
            clean = value.strip().lower()
            if clean and clean not in normalized:
                normalized.append(clean)
        return normalized

    @model_validator(mode="after")
    def validate_time_window(self) -> "CampaignUpdate":
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be greater than starts_at")
        return self


class CampaignRead(BaseModel):
    id: UUID
    organization_id: UUID
    title: str
    slug: str
    short_description: str | None
    description: str | None
    tags: list[str]
    cover_image_url: str | None
    support_types: list[SupportType]

    goal_amount: Decimal
    raised_amount: Decimal

    province: str | None
    district: str | None
    address_line: str | None
    latitude: Decimal | None
    longitude: Decimal | None
    media_urls: list[str]

    starts_at: datetime
    ends_at: datetime | None
    is_active: bool
    status: CampaignStatus
    published_at: datetime | None
    closed_at: datetime | None

    created_at: datetime
    updated_at: datetime

    @field_validator("tags", "media_urls", mode="before")
    @classmethod
    def normalize_read_string_lists(cls, value: Any) -> list[str]:
        normalized: list[str] = []
        for item in _coerce_raw_to_list(value):
            text = str(item).strip()
            if text and text not in normalized:
                normalized.append(text)
        return normalized

    @field_validator("support_types", mode="before")
    @classmethod
    def normalize_read_support_types(cls, value: Any) -> list[str]:
        allowed = {item.value for item in SupportType}
        normalized: list[str] = []
        for item in _coerce_raw_to_list(value):
            if isinstance(item, SupportType):
                normalized_value = item.value
            else:
                normalized_value = str(item).strip().lower()
            if normalized_value in allowed and normalized_value not in normalized:
                normalized.append(normalized_value)
        return normalized

    model_config = ConfigDict(from_attributes=True)


class CampaignPublishResponse(BaseModel):
    message: str
    campaign: CampaignRead


class CampaignCloseRequest(BaseModel):
    closed_at: datetime | None = None


class CampaignCloseResponse(BaseModel):
    message: str
    campaign: CampaignRead


class CampaignReopenResponse(BaseModel):
    message: str
    campaign: CampaignRead
