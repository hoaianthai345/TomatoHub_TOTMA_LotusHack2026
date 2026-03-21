from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, model_validator

from app.models.volunteer_registration import (
    VolunteerAttendanceStatus,
    VolunteerRole,
    VolunteerStatus,
)


class VolunteerRegistrationBase(BaseModel):
    campaign_id: UUID
    user_id: UUID | None = None
    full_name: str
    email: EmailStr
    phone_number: str | None = None
    message: str | None = None
    role: VolunteerRole | None = None
    shift_start_at: datetime | None = None
    shift_end_at: datetime | None = None

    @model_validator(mode="after")
    def validate_shift_window(self) -> "VolunteerRegistrationBase":
        if (
            self.shift_start_at is not None
            and self.shift_end_at is not None
            and self.shift_end_at <= self.shift_start_at
        ):
            raise ValueError("shift_end_at must be greater than shift_start_at")
        return self


class VolunteerRegistrationCreate(VolunteerRegistrationBase):
    status: VolunteerStatus = VolunteerStatus.pending


class VolunteerQuickJoinCreate(BaseModel):
    campaign_id: UUID
    phone_number: str | None = None
    message: str | None = None
    role: VolunteerRole | None = None
    shift_start_at: datetime | None = None
    shift_end_at: datetime | None = None

    @model_validator(mode="after")
    def validate_shift_window(self) -> "VolunteerQuickJoinCreate":
        if (
            self.shift_start_at is not None
            and self.shift_end_at is not None
            and self.shift_end_at <= self.shift_start_at
        ):
            raise ValueError("shift_end_at must be greater than shift_start_at")
        return self


class VolunteerRegistrationUpdateStatus(BaseModel):
    status: VolunteerStatus


class VolunteerRegistrationUpdateAttendance(BaseModel):
    attendance_status: VolunteerAttendanceStatus
    attendance_note: str | None = None


class VolunteerRegistrationRead(VolunteerRegistrationBase):
    id: UUID
    status: VolunteerStatus
    attendance_status: VolunteerAttendanceStatus
    attendance_note: str | None = None
    attendance_marked_at: datetime | None = None
    attendance_marked_by_user_id: UUID | None = None
    registered_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignVolunteerParticipantRead(BaseModel):
    full_name: str
    status: VolunteerStatus
    role: VolunteerRole | None = None
    shift_start_at: datetime | None = None
    shift_end_at: datetime | None = None
    attendance_status: VolunteerAttendanceStatus
    registered_at: datetime

    model_config = ConfigDict(from_attributes=True)
