from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.volunteer_registration import VolunteerStatus


class VolunteerRegistrationBase(BaseModel):
    campaign_id: UUID
    user_id: UUID | None = None
    full_name: str
    email: EmailStr
    phone_number: str | None = None
    message: str | None = None


class VolunteerRegistrationCreate(VolunteerRegistrationBase):
    status: VolunteerStatus = VolunteerStatus.pending


class VolunteerQuickJoinCreate(BaseModel):
    campaign_id: UUID
    phone_number: str | None = None
    message: str | None = None


class VolunteerRegistrationUpdateStatus(BaseModel):
    status: VolunteerStatus


class VolunteerRegistrationRead(VolunteerRegistrationBase):
    id: UUID
    status: VolunteerStatus
    registered_at: datetime

    model_config = ConfigDict(from_attributes=True)
