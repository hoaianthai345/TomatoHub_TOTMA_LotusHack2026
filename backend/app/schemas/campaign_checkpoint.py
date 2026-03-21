from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.campaign_checkpoint import CheckpointType
from app.models.checkpoint_scan_log import CheckpointScanResult, CheckpointScanType


class CampaignCheckpointBase(BaseModel):
    campaign_id: UUID
    name: str = Field(min_length=2, max_length=255)
    checkpoint_type: CheckpointType = CheckpointType.volunteer
    description: str | None = None
    address_line: str | None = Field(default=None, max_length=255)
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    is_active: bool = True


class CampaignCheckpointCreate(CampaignCheckpointBase):
    pass


class CampaignCheckpointUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    checkpoint_type: CheckpointType | None = None
    description: str | None = None
    address_line: str | None = Field(default=None, max_length=255)
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    is_active: bool | None = None


class CampaignCheckpointRead(CampaignCheckpointBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignCheckpointGenerateQrRequest(BaseModel):
    scan_type: CheckpointScanType
    expires_in_minutes: int = Field(default=20, ge=1, le=24 * 60)


class CampaignCheckpointGenerateQrResponse(BaseModel):
    checkpoint_id: UUID
    campaign_id: UUID
    scan_type: CheckpointScanType
    token: str
    expires_at: datetime


class CampaignCheckpointScanRequest(BaseModel):
    token: str = Field(min_length=20)
    donor_name: str | None = Field(default=None, max_length=255)
    item_name: str | None = Field(default=None, max_length=255)
    quantity: Decimal | None = Field(default=None, gt=0)
    unit: str | None = Field(default=None, max_length=50)
    note: str | None = None


class CampaignCheckpointManualAttendanceRequest(BaseModel):
    registration_id: UUID
    scan_type: CheckpointScanType


class GoodsCheckinRead(BaseModel):
    id: UUID
    campaign_id: UUID
    checkpoint_id: UUID
    user_id: UUID | None
    donor_name: str
    item_name: str
    quantity: Decimal
    unit: str
    note: str | None
    checked_in_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VolunteerAttendanceRead(BaseModel):
    id: UUID
    campaign_id: UUID
    checkpoint_id: UUID
    registration_id: UUID
    user_id: UUID
    check_in_at: datetime
    check_out_at: datetime | None
    duration_minutes: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignCheckpointScanResponse(BaseModel):
    message: str
    scan_type: CheckpointScanType
    flow_type: CheckpointType
    attendance: VolunteerAttendanceRead | None = None
    goods_checkin: GoodsCheckinRead | None = None


class CheckpointScanLogRead(BaseModel):
    id: UUID
    campaign_id: UUID
    checkpoint_id: UUID
    registration_id: UUID | None
    user_id: UUID | None
    scan_type: CheckpointScanType
    result: CheckpointScanResult
    message: str | None
    token_nonce: str | None
    scanned_at: datetime

    model_config = ConfigDict(from_attributes=True)
