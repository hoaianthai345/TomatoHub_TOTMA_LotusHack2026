from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.beneficiary import Beneficiary, BeneficiaryStatus
from app.models.campaign import Campaign
from app.models.campaign_checkpoint import CampaignCheckpoint, CheckpointType
from app.models.checkpoint_scan_log import (
    CheckpointScanLog,
    CheckpointScanResult,
    CheckpointScanType,
)
from app.models.monetary_donation import MonetaryDonation
from app.models.volunteer_registration import VolunteerRegistration
from app.schemas.transparency import TransparencyLogRead, TransparencyLogType

router = APIRouter(prefix="/transparency", tags=["transparency"])


@dataclass(slots=True)
class _TransparencyEvent:
    id: str
    campaign_id: UUID
    event_type: TransparencyLogType
    title: str
    description: str
    created_at: datetime


def _apply_campaign_filters(
    stmt: Select,
    campaign_id: UUID | None,
    organization_id: UUID | None,
) -> Select:
    if campaign_id is not None:
        stmt = stmt.where(Campaign.id == campaign_id)
    if organization_id is not None:
        stmt = stmt.where(Campaign.organization_id == organization_id)
    return stmt


@router.get("/logs", response_model=list[TransparencyLogRead])
def list_transparency_logs(
    campaign_id: UUID | None = Query(default=None),
    organization_id: UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[TransparencyLogRead]:
    events: list[_TransparencyEvent] = []

    campaign_stmt = select(Campaign.id, Campaign.title, Campaign.published_at, Campaign.closed_at)
    campaign_stmt = _apply_campaign_filters(campaign_stmt, campaign_id, organization_id)
    for row in db.execute(campaign_stmt).all():
        if row.published_at is not None:
            events.append(
                _TransparencyEvent(
                    id=f"campaign-published:{row.id}",
                    campaign_id=row.id,
                    event_type="summary",
                    title="Campaign published",
                    description=f'Campaign "{row.title}" is now live.',
                    created_at=row.published_at,
                )
            )
        if row.closed_at is not None:
            events.append(
                _TransparencyEvent(
                    id=f"campaign-closed:{row.id}",
                    campaign_id=row.id,
                    event_type="summary",
                    title="Campaign closed",
                    description=f'Campaign "{row.title}" has been closed.',
                    created_at=row.closed_at,
                )
            )

    donation_stmt = select(
        MonetaryDonation.id,
        MonetaryDonation.campaign_id,
        MonetaryDonation.donor_name,
        MonetaryDonation.amount,
        MonetaryDonation.currency,
        MonetaryDonation.donated_at,
    ).join(Campaign, Campaign.id == MonetaryDonation.campaign_id)
    donation_stmt = _apply_campaign_filters(donation_stmt, campaign_id, organization_id)
    for row in db.execute(donation_stmt).all():
        events.append(
            _TransparencyEvent(
                id=f"donation:{row.id}",
                campaign_id=row.campaign_id,
                event_type="ledger",
                title="Donation recorded",
                description=f"{row.donor_name} donated {row.amount} {row.currency}.",
                created_at=row.donated_at,
            )
        )

    registration_stmt = select(
        VolunteerRegistration.id,
        VolunteerRegistration.campaign_id,
        VolunteerRegistration.full_name,
        VolunteerRegistration.status,
        VolunteerRegistration.registered_at,
    ).join(Campaign, Campaign.id == VolunteerRegistration.campaign_id)
    registration_stmt = _apply_campaign_filters(registration_stmt, campaign_id, organization_id)
    for row in db.execute(registration_stmt).all():
        status_label = str(row.status.value if hasattr(row.status, "value") else row.status)
        events.append(
            _TransparencyEvent(
                id=f"volunteer-registration:{row.id}",
                campaign_id=row.campaign_id,
                event_type="distribution",
                title="Volunteer registration updated",
                description=f"{row.full_name} registration is {status_label}.",
                created_at=row.registered_at,
            )
        )

    beneficiary_stmt = select(
        Beneficiary.id,
        Beneficiary.campaign_id,
        Beneficiary.full_name,
        Beneficiary.status,
        Beneficiary.created_at,
    ).join(Campaign, Campaign.id == Beneficiary.campaign_id)
    beneficiary_stmt = beneficiary_stmt.where(Beneficiary.campaign_id.is_not(None))
    beneficiary_stmt = _apply_campaign_filters(beneficiary_stmt, campaign_id, organization_id)
    for row in db.execute(beneficiary_stmt).all():
        if row.status != BeneficiaryStatus.received:
            continue
        events.append(
            _TransparencyEvent(
                id=f"beneficiary-received:{row.id}",
                campaign_id=row.campaign_id,
                event_type="evidence",
                title="Beneficiary marked as received",
                description=f"{row.full_name} has received support.",
                created_at=row.created_at,
            )
        )

    scan_log_stmt = (
        select(
            CheckpointScanLog.id,
            CheckpointScanLog.campaign_id,
            CheckpointScanLog.scan_type,
            CheckpointScanLog.result,
            CheckpointScanLog.message,
            CheckpointScanLog.scanned_at,
            CampaignCheckpoint.name,
            CampaignCheckpoint.checkpoint_type,
        )
        .join(Campaign, Campaign.id == CheckpointScanLog.campaign_id)
        .join(CampaignCheckpoint, CampaignCheckpoint.id == CheckpointScanLog.checkpoint_id)
    )
    scan_log_stmt = _apply_campaign_filters(scan_log_stmt, campaign_id, organization_id)
    for row in db.execute(scan_log_stmt).all():
        if row.result != CheckpointScanResult.success.value:
            continue

        if row.checkpoint_type == CheckpointType.volunteer.value:
            title = (
                "Volunteer check-in confirmed"
                if row.scan_type == CheckpointScanType.check_in.value
                else "Volunteer check-out confirmed"
            )
            event_type: TransparencyLogType = "distribution"
        else:
            title = "Goods check-in confirmed"
            event_type = "ledger"

        checkpoint_name = row.name or "checkpoint"
        detail_message = row.message or "QR scan recorded."
        events.append(
            _TransparencyEvent(
                id=f"scan-log:{row.id}",
                campaign_id=row.campaign_id,
                event_type=event_type,
                title=title,
                description=f"[{checkpoint_name}] {detail_message}",
                created_at=row.scanned_at,
            )
        )

    events.sort(key=lambda event: event.created_at, reverse=True)

    return [
        TransparencyLogRead(
            id=event.id,
            campaign_id=event.campaign_id,
            type=event.event_type,
            title=event.title,
            description=event.description,
            created_at=event.created_at,
        )
        for event in events[:limit]
    ]
