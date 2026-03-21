from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class CampaignImageRead(BaseModel):
    id: UUID
    campaign_id: UUID
    uploaded_by_user_id: UUID | None
    original_filename: str
    mime_type: str
    size_bytes: int
    relative_path: str
    file_url: str
    created_at: datetime


class CampaignImageSetCoverResponse(BaseModel):
    message: str
    campaign_id: UUID
    cover_image_url: str
