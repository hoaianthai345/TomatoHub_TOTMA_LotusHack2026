from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class BeneficiaryStatus(str, enum.Enum):
    added = "added"
    verified = "verified"
    assigned = "assigned"
    received = "received"


class Beneficiary(Base):
    __tablename__ = "beneficiaries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True,
    )

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    story: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_support_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[BeneficiaryStatus] = mapped_column(
        Enum(BeneficiaryStatus, name="beneficiary_status"),
        default=BeneficiaryStatus.added,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    organization: Mapped["Organization"] = relationship(back_populates="beneficiaries")
    campaign: Mapped["Campaign | None"] = relationship(back_populates="beneficiaries")
