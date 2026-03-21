from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class VolunteerStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


class VolunteerRole(str, enum.Enum):
    packing = "packing"
    delivery = "delivery"
    medic = "medic"
    online = "online"


class VolunteerAttendanceStatus(str, enum.Enum):
    not_marked = "not_marked"
    arrived = "arrived"
    absent = "absent"
    left_early = "left_early"
    completed = "completed"


class VolunteerRegistration(Base):
    __tablename__ = "volunteer_registrations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[VolunteerRole | None] = mapped_column(
        Enum(VolunteerRole, name="volunteer_role"),
        nullable=True,
    )
    shift_start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    shift_end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attendance_status: Mapped[VolunteerAttendanceStatus] = mapped_column(
        Enum(VolunteerAttendanceStatus, name="volunteer_attendance_status"),
        default=VolunteerAttendanceStatus.not_marked,
        nullable=False,
    )
    attendance_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    attendance_marked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    attendance_marked_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[VolunteerStatus] = mapped_column(
        Enum(VolunteerStatus, name="volunteer_status"),
        default=VolunteerStatus.pending,
        nullable=False,
    )

    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    campaign: Mapped["Campaign"] = relationship(back_populates="volunteer_registrations")
    user: Mapped["User | None"] = relationship(back_populates="volunteer_registrations")
