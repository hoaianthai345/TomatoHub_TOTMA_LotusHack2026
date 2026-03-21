from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_current_organization_user, get_db
from app.api.permissions import ensure_authenticated_user_matches, ensure_matching_organization
from app.models.beneficiary import Beneficiary
from app.models.campaign import Campaign, CampaignStatus
from app.models.goods_checkin import GoodsCheckin
from app.models.monetary_donation import MonetaryDonation
from app.models.organization import Organization
from app.models.user import User
from app.models.volunteer_attendance import VolunteerAttendance
from app.models.volunteer_registration import VolunteerRegistration, VolunteerStatus
from app.schemas.dashboard import (
    OrganizationActivityItemRead,
    OrganizationCampaignPipelineItemRead,
    OrganizationCampaignSnapshotRead,
    OrganizationDashboardRead,
    SupporterContributionItemRead,
    SupporterDashboardRead,
    SupporterParticipationCardRead,
    SupporterParticipationItemRead,
    SupporterTaskItemRead,
)

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


def _relative_time_label(value: datetime) -> str:
    now = datetime.now(timezone.utc)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    delta_seconds = max(int((now - value).total_seconds()), 0)

    if delta_seconds < 60:
        return "just now"
    if delta_seconds < 3600:
        minutes = delta_seconds // 60
        return f"{minutes} minute(s) ago"
    if delta_seconds < 86400:
        hours = delta_seconds // 3600
        return f"{hours} hour(s) ago"
    days = delta_seconds // 86400
    return f"{days} day(s) ago"


def _campaign_location_label(campaign: Campaign) -> str | None:
    parts = [campaign.address_line, campaign.district, campaign.province]
    normalized = [part.strip() for part in parts if isinstance(part, str) and part.strip()]
    return ", ".join(normalized) if normalized else None


def _campaign_status_label(status: CampaignStatus) -> str:
    if status == CampaignStatus.published:
        return "Running"
    if status == CampaignStatus.closed:
        return "Closed"
    return "Draft"


def _build_organization_campaign_snapshots(
    campaigns: list[Campaign],
    donations_by_campaign: dict[UUID, list[MonetaryDonation]],
    registrations_by_campaign: dict[UUID, list[VolunteerRegistration]],
    beneficiaries_by_campaign: dict[UUID, list[Beneficiary]],
) -> list[OrganizationCampaignSnapshotRead]:
    snapshots: list[OrganizationCampaignSnapshotRead] = []
    for campaign in campaigns:
        goal_amount = Decimal(campaign.goal_amount or 0)
        raised_amount = Decimal(campaign.raised_amount or 0)
        progress_percent = 0
        if goal_amount > 0:
            progress_percent = max(0, min(100, int((raised_amount / goal_amount) * 100)))

        support_label = ", ".join(campaign.support_types) if campaign.support_types else "No support type"
        beneficiary_count = len(beneficiaries_by_campaign.get(campaign.id, []))
        registration_count = len(registrations_by_campaign.get(campaign.id, []))
        donation_count = len(donations_by_campaign.get(campaign.id, []))

        snapshots.append(
            OrganizationCampaignSnapshotRead(
                id=f"org-campaign-{campaign.id}",
                campaign_id=campaign.id,
                campaign_title=campaign.title,
                location=_campaign_location_label(campaign) or "Location pending",
                status_label=_campaign_status_label(campaign.status),
                support_label=support_label,
                progress_percent=progress_percent,
                note=(
                    f"{beneficiary_count} beneficiary(ies), "
                    f"{registration_count} volunteer registration(s), "
                    f"{donation_count} donation(s)."
                ),
            )
        )

    return snapshots[:8]


def _build_organization_recent_activities(
    campaigns: list[Campaign],
    campaigns_by_id: dict[UUID, Campaign],
    donations: list[MonetaryDonation],
    registrations: list[VolunteerRegistration],
    beneficiaries: list[Beneficiary],
) -> list[OrganizationActivityItemRead]:
    activities: list[OrganizationActivityItemRead] = []

    for campaign in campaigns[:10]:
        activities.append(
            OrganizationActivityItemRead(
                id=f"campaign-{campaign.id}",
                actor="Organization",
                title="Campaign updated",
                detail=f'"{campaign.title}" status is {_campaign_status_label(campaign.status).lower()}.',
                time_label=_relative_time_label(campaign.updated_at),
                created_at=campaign.updated_at,
            )
        )

    for donation in donations[:10]:
        campaign = campaigns_by_id.get(donation.campaign_id)
        if campaign is None:
            continue
        activities.append(
            OrganizationActivityItemRead(
                id=f"donation-{donation.id}",
                actor=donation.donor_name,
                title="Donation received",
                detail=(
                    f'{donation.donor_name} donated {donation.amount} '
                    f'{donation.currency} to "{campaign.title}".'
                ),
                time_label=_relative_time_label(donation.donated_at),
                created_at=donation.donated_at,
            )
        )

    for registration in registrations[:10]:
        campaign = campaigns_by_id.get(registration.campaign_id)
        if campaign is None:
            continue
        status_value = (
            registration.status.value
            if hasattr(registration.status, "value")
            else str(registration.status)
        )
        activities.append(
            OrganizationActivityItemRead(
                id=f"registration-{registration.id}",
                actor=registration.full_name,
                title="Volunteer registration updated",
                detail=(
                    f'{registration.full_name} registration is {status_value} '
                    f'on "{campaign.title}".'
                ),
                time_label=_relative_time_label(registration.registered_at),
                created_at=registration.registered_at,
            )
        )

    for beneficiary in beneficiaries[:10]:
        if beneficiary.campaign_id is None:
            continue
        campaign = campaigns_by_id.get(beneficiary.campaign_id)
        if campaign is None:
            continue
        activities.append(
            OrganizationActivityItemRead(
                id=f"beneficiary-{beneficiary.id}",
                actor=beneficiary.full_name,
                title="Beneficiary profile updated",
                detail=f'Beneficiary "{beneficiary.full_name}" linked to "{campaign.title}".',
                time_label=_relative_time_label(beneficiary.created_at),
                created_at=beneficiary.created_at,
            )
        )

    activities.sort(
        key=lambda item: item.created_at or datetime.now(timezone.utc),
        reverse=True,
    )
    return activities[:12]


def _build_supporter_participation_cards(
    campaigns_by_id: dict[UUID, Campaign],
    donations: list[MonetaryDonation],
    registrations: list[VolunteerRegistration],
    now: datetime,
) -> list[SupporterParticipationCardRead]:
    _ = now
    cards_with_time: list[tuple[datetime, SupporterParticipationCardRead]] = []
    seen_campaign_ids: set[UUID] = set()

    for registration in registrations:
        campaign = campaigns_by_id.get(registration.campaign_id)
        if campaign is None:
            continue

        if registration.status == VolunteerStatus.approved:
            next_step = "Arrive at checkpoint and scan QR to check in."
        elif registration.status == VolunteerStatus.pending:
            next_step = "Wait for organization approval."
        elif registration.status == VolunteerStatus.rejected:
            next_step = "Registration was rejected."
        else:
            next_step = "Registration was cancelled."

        cards_with_time.append(
            (
                registration.registered_at,
                SupporterParticipationCardRead(
                    id=f"volunteer-{registration.id}",
                    campaign_id=campaign.id,
                    campaign_title=campaign.title,
                    campaign_location=_campaign_location_label(campaign) or "Location updating",
                    cover_image_url=(
                        campaign.cover_image_url
                        or (campaign.media_urls[0] if campaign.media_urls else None)
                    ),
                    role_label="Volunteer",
                    status_label=registration.status.value,
                    next_step=next_step,
                    date_label=_relative_time_label(registration.registered_at),
                ),
            )
        )
        seen_campaign_ids.add(campaign.id)

    for donation in donations:
        campaign = campaigns_by_id.get(donation.campaign_id)
        if campaign is None or campaign.id in seen_campaign_ids:
            continue

        cards_with_time.append(
            (
                donation.donated_at,
                SupporterParticipationCardRead(
                    id=f"donation-{donation.id}",
                    campaign_id=campaign.id,
                    campaign_title=campaign.title,
                    campaign_location=_campaign_location_label(campaign) or "Location updating",
                    cover_image_url=(
                        campaign.cover_image_url
                        or (campaign.media_urls[0] if campaign.media_urls else None)
                    ),
                    role_label="Money Donor",
                    status_label="contributed",
                    next_step="Track campaign progress in transparency logs.",
                    date_label=_relative_time_label(donation.donated_at),
                ),
            )
        )

    cards_with_time.sort(key=lambda item: item[0], reverse=True)
    return [card for _, card in cards_with_time[:6]]


def _build_supporter_contribution_items(
    campaigns_by_id: dict[UUID, Campaign],
    donations: list[MonetaryDonation],
    registrations: list[VolunteerRegistration],
) -> list[SupporterContributionItemRead]:
    items: list[SupporterContributionItemRead] = []

    for donation in donations:
        campaign = campaigns_by_id.get(donation.campaign_id)
        campaign_title = campaign.title if campaign is not None else str(donation.campaign_id)
        items.append(
            SupporterContributionItemRead(
                id=f"money-{donation.id}",
                campaign_id=donation.campaign_id,
                campaign_title=campaign_title,
                contribution_type="money",
                summary=f"Donated {donation.amount} {donation.currency}.",
                status_label="received",
                date_label=_relative_time_label(donation.donated_at),
                created_at=donation.donated_at,
            )
        )

    for registration in registrations:
        campaign = campaigns_by_id.get(registration.campaign_id)
        campaign_title = campaign.title if campaign is not None else str(registration.campaign_id)
        status_value = (
            registration.status.value
            if hasattr(registration.status, "value")
            else str(registration.status)
        )
        items.append(
            SupporterContributionItemRead(
                id=f"volunteer-registration-{registration.id}",
                campaign_id=registration.campaign_id,
                campaign_title=campaign_title,
                contribution_type="volunteer",
                summary=f"Volunteer registration is {status_value}.",
                status_label=status_value,
                date_label=_relative_time_label(registration.registered_at),
                created_at=registration.registered_at,
            )
        )

    items.sort(key=lambda item: item.created_at or datetime.now(timezone.utc), reverse=True)
    return items[:10]


def _build_supporter_task_items(
    campaigns_by_id: dict[UUID, Campaign],
    registrations: list[VolunteerRegistration],
    now: datetime,
) -> list[SupporterTaskItemRead]:
    _ = now
    items: list[SupporterTaskItemRead] = []
    for registration in registrations:
        campaign = campaigns_by_id.get(registration.campaign_id)
        campaign_title = campaign.title if campaign is not None else str(registration.campaign_id)
        if registration.status == VolunteerStatus.approved:
            title = "Check in at campaign checkpoint"
            status_label = "ready"
            due_label = "As scheduled by organization"
        elif registration.status == VolunteerStatus.pending:
            title = "Wait for registration approval"
            status_label = "pending"
            due_label = "Awaiting organization review"
        elif registration.status == VolunteerStatus.rejected:
            title = "Registration closed by organization"
            status_label = "rejected"
            due_label = "No action required"
        else:
            title = "Registration cancelled"
            status_label = "cancelled"
            due_label = "No action required"

        items.append(
            SupporterTaskItemRead(
                id=f"task-{registration.id}",
                campaign_id=registration.campaign_id,
                campaign_title=campaign_title,
                title=title,
                status_label=status_label,
                due_label=due_label,
                created_at=registration.registered_at,
            )
        )

    items.sort(key=lambda item: item.created_at or datetime.now(timezone.utc), reverse=True)
    return items[:8]


@router.get("/organization/{organization_id}", response_model=OrganizationDashboardRead)
def organization_dashboard(
    organization_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> OrganizationDashboardRead:
    ensure_matching_organization(
        current_user,
        organization_id,
        detail="Cannot view another organization dashboard",
    )
    organization = db.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    campaigns = list(
        db.scalars(
            select(Campaign)
            .where(Campaign.organization_id == organization_id)
            .order_by(Campaign.created_at.desc())
        ).all()
    )
    campaign_ids = [campaign.id for campaign in campaigns]
    campaigns_by_id = {campaign.id: campaign for campaign in campaigns}

    beneficiaries = list(
        db.scalars(
            select(Beneficiary)
            .where(Beneficiary.organization_id == organization_id)
            .order_by(Beneficiary.created_at.desc())
        ).all()
    )

    if campaign_ids:
        donations = list(
            db.scalars(
                select(MonetaryDonation)
                .where(MonetaryDonation.campaign_id.in_(campaign_ids))
                .order_by(MonetaryDonation.donated_at.desc())
            ).all()
        )
        registrations = list(
            db.scalars(
                select(VolunteerRegistration)
                .where(VolunteerRegistration.campaign_id.in_(campaign_ids))
                .order_by(VolunteerRegistration.registered_at.desc())
            ).all()
        )
    else:
        donations = []
        registrations = []

    donations_by_campaign: dict[UUID, list[MonetaryDonation]] = defaultdict(list)
    registrations_by_campaign: dict[UUID, list[VolunteerRegistration]] = defaultdict(list)
    beneficiaries_by_campaign: dict[UUID, list[Beneficiary]] = defaultdict(list)

    for donation in donations:
        donations_by_campaign[donation.campaign_id].append(donation)
    for registration in registrations:
        registrations_by_campaign[registration.campaign_id].append(registration)
    for beneficiary in beneficiaries:
        if beneficiary.campaign_id is not None:
            beneficiaries_by_campaign[beneficiary.campaign_id].append(beneficiary)

    supporter_ids = {
        donation.donor_user_id
        for donation in donations
        if donation.donor_user_id is not None
    }
    supporter_ids.update(
        registration.user_id
        for registration in registrations
        if registration.user_id is not None
    )

    total_raised = sum((Decimal(donation.amount) for donation in donations), Decimal("0"))

    return OrganizationDashboardRead(
        organization_id=organization_id,
        campaigns=len(campaigns),
        beneficiaries=len(beneficiaries),
        supporters=len(supporter_ids),
        donations=len(donations),
        total_raised=total_raised,
        campaign_snapshots=_build_organization_campaign_snapshots(
            campaigns,
            donations_by_campaign,
            registrations_by_campaign,
            beneficiaries_by_campaign,
        ),
        recent_activities=_build_organization_recent_activities(
            campaigns,
            campaigns_by_id,
            donations,
            registrations,
            beneficiaries,
        ),
    )


@router.get("/supporter/{user_id}", response_model=SupporterDashboardRead)
def supporter_dashboard(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> SupporterDashboardRead:
    ensure_authenticated_user_matches(
        current_user,
        user_id,
        auth_detail="Authentication required to view a supporter dashboard",
        mismatch_detail="Cannot view another user dashboard",
    )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    donations = list(
        db.scalars(
            select(MonetaryDonation)
            .where(MonetaryDonation.donor_user_id == user_id)
            .order_by(MonetaryDonation.donated_at.desc())
        ).all()
    )
    registrations = list(
        db.scalars(
            select(VolunteerRegistration)
            .where(VolunteerRegistration.user_id == user_id)
            .order_by(VolunteerRegistration.registered_at.desc())
        ).all()
    )

    supported_campaign_ids = sorted(
        {
            donation.campaign_id
            for donation in donations
        }
        | {
            registration.campaign_id
            for registration in registrations
        },
        key=str,
    )

    campaigns_by_id: dict[UUID, Campaign] = {}
    if supported_campaign_ids:
        campaigns = list(
            db.scalars(select(Campaign).where(Campaign.id.in_(supported_campaign_ids))).all()
        )
        campaigns_by_id = {campaign.id: campaign for campaign in campaigns}

    active_campaigns = (
        db.scalar(
            select(func.count(func.distinct(Campaign.id)))
            .select_from(Campaign)
            .join(
                MonetaryDonation,
                (MonetaryDonation.campaign_id == Campaign.id)
                & (MonetaryDonation.donor_user_id == user_id),
                isouter=True,
            )
            .join(
                VolunteerRegistration,
                (VolunteerRegistration.campaign_id == Campaign.id)
                & (VolunteerRegistration.user_id == user_id),
                isouter=True,
            )
            .where(
                Campaign.status == CampaignStatus.published,
                (MonetaryDonation.id.is_not(None) | VolunteerRegistration.id.is_not(None)),
            )
        )
        or 0
    )

    now = datetime.now(timezone.utc)
    total_donated_amount = sum((Decimal(donation.amount) for donation in donations), Decimal("0"))
    tasks_completed = sum(
        1 for registration in registrations if registration.status == VolunteerStatus.approved
    )

    return SupporterDashboardRead(
        user_id=user_id,
        active_campaigns=active_campaigns,
        total_contributions=len(donations),
        total_donated_amount=total_donated_amount,
        my_registrations=len(registrations),
        tasks_completed=tasks_completed,
        participation_cards=_build_supporter_participation_cards(
            campaigns_by_id,
            donations,
            registrations,
            now,
        ),
        contribution_items=_build_supporter_contribution_items(
            campaigns_by_id,
            donations,
            registrations,
        ),
        task_items=_build_supporter_task_items(
            campaigns_by_id,
            registrations,
            now,
        ),
    )


@router.get(
    "/organization/{organization_id}/campaign-pipeline",
    response_model=list[OrganizationCampaignPipelineItemRead],
)
def organization_campaign_pipeline(
    organization_id: UUID,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> list[OrganizationCampaignPipelineItemRead]:
    ensure_matching_organization(
        current_user,
        organization_id,
        detail="Cannot view another organization dashboard",
    )
    campaigns = list(
        db.scalars(
            select(Campaign)
            .where(Campaign.organization_id == organization_id)
            .order_by(Campaign.updated_at.desc())
            .limit(limit)
        ).all()
    )

    items: list[OrganizationCampaignPipelineItemRead] = []
    for campaign in campaigns:
        goal_amount = Decimal(campaign.goal_amount or 0)
        raised_amount = Decimal(campaign.raised_amount or 0)
        progress_percent = 0
        if goal_amount > 0:
            progress_percent = max(0, min(100, int((raised_amount / goal_amount) * 100)))
        support_label = ", ".join(campaign.support_types) if campaign.support_types else "No support type"
        status_label = _campaign_status_label(campaign.status)
        if campaign.status == CampaignStatus.draft:
            note = "Complete details and publish when ready."
        elif campaign.status == CampaignStatus.closed:
            note = "Campaign closed. Review final transparency logs."
        else:
            note = "Campaign is live. Keep updating progress checkpoints."

        items.append(
            OrganizationCampaignPipelineItemRead(
                id=f"org-campaign-{campaign.id}",
                campaign_id=campaign.id,
                campaign_title=campaign.title,
                location=_campaign_location_label(campaign),
                status_label=status_label,
                support_label=support_label,
                progress_percent=progress_percent,
                note=note,
                updated_at=campaign.updated_at,
            )
        )
    return items


@router.get(
    "/organization/{organization_id}/recent-activities",
    response_model=list[OrganizationActivityItemRead],
)
def organization_recent_activities(
    organization_id: UUID,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> list[OrganizationActivityItemRead]:
    ensure_matching_organization(
        current_user,
        organization_id,
        detail="Cannot view another organization dashboard",
    )

    campaign_ids = list(
        db.scalars(select(Campaign.id).where(Campaign.organization_id == organization_id)).all()
    )
    if not campaign_ids:
        return []

    activities: list[OrganizationActivityItemRead] = []

    donation_rows = db.execute(
        select(
            MonetaryDonation.id,
            MonetaryDonation.campaign_id,
            MonetaryDonation.donor_name,
            MonetaryDonation.amount,
            MonetaryDonation.currency,
            MonetaryDonation.donated_at,
            Campaign.title,
        )
        .join(Campaign, Campaign.id == MonetaryDonation.campaign_id)
        .where(MonetaryDonation.campaign_id.in_(campaign_ids))
        .order_by(MonetaryDonation.donated_at.desc())
        .limit(limit)
    ).all()
    for row in donation_rows:
        activities.append(
            OrganizationActivityItemRead(
                id=f"donation-{row.id}",
                actor=row.donor_name,
                title="Donation received",
                detail=f'{row.donor_name} donated {row.amount} {row.currency} to "{row.title}".',
                time_label=_relative_time_label(row.donated_at),
                created_at=row.donated_at,
            )
        )

    registration_rows = db.execute(
        select(
            VolunteerRegistration.id,
            VolunteerRegistration.full_name,
            VolunteerRegistration.status,
            VolunteerRegistration.registered_at,
            Campaign.title,
        )
        .join(Campaign, Campaign.id == VolunteerRegistration.campaign_id)
        .where(VolunteerRegistration.campaign_id.in_(campaign_ids))
        .order_by(VolunteerRegistration.registered_at.desc())
        .limit(limit)
    ).all()
    for row in registration_rows:
        status_label = row.status.value if hasattr(row.status, "value") else str(row.status)
        activities.append(
            OrganizationActivityItemRead(
                id=f"registration-{row.id}",
                actor=row.full_name,
                title="Volunteer registration updated",
                detail=f'{row.full_name} registration is {status_label} on "{row.title}".',
                time_label=_relative_time_label(row.registered_at),
                created_at=row.registered_at,
            )
        )

    goods_rows = db.execute(
        select(
            GoodsCheckin.id,
            GoodsCheckin.donor_name,
            GoodsCheckin.item_name,
            GoodsCheckin.quantity,
            GoodsCheckin.unit,
            GoodsCheckin.checked_in_at,
            Campaign.title,
        )
        .join(Campaign, Campaign.id == GoodsCheckin.campaign_id)
        .where(GoodsCheckin.campaign_id.in_(campaign_ids))
        .order_by(GoodsCheckin.checked_in_at.desc())
        .limit(limit)
    ).all()
    for row in goods_rows:
        activities.append(
            OrganizationActivityItemRead(
                id=f"goods-{row.id}",
                actor=row.donor_name,
                title="Goods check-in confirmed",
                detail=(
                    f'{row.donor_name} checked in {row.item_name} '
                    f"x{row.quantity} {row.unit} for \"{row.title}\"."
                ),
                time_label=_relative_time_label(row.checked_in_at),
                created_at=row.checked_in_at,
            )
        )

    activities.sort(key=lambda item: item.created_at, reverse=True)
    return activities[:limit]


@router.get(
    "/supporter/{user_id}/participations",
    response_model=list[SupporterParticipationItemRead],
)
def supporter_participations(
    user_id: UUID,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[SupporterParticipationItemRead]:
    ensure_authenticated_user_matches(
        current_user,
        user_id,
        auth_detail="Authentication required to view a supporter dashboard",
        mismatch_detail="Cannot view another user dashboard",
    )

    items: list[SupporterParticipationItemRead] = []
    seen_campaign_ids: set[UUID] = set()

    registration_rows = db.execute(
        select(VolunteerRegistration, Campaign)
        .join(Campaign, Campaign.id == VolunteerRegistration.campaign_id)
        .where(VolunteerRegistration.user_id == user_id)
        .order_by(VolunteerRegistration.registered_at.desc())
        .limit(limit)
    ).all()
    for registration, campaign in registration_rows:
        seen_campaign_ids.add(campaign.id)
        if registration.status == VolunteerStatus.approved:
            next_step = "Arrive at checkpoint and scan QR to check in."
        elif registration.status == VolunteerStatus.pending:
            next_step = "Wait for organization approval."
        elif registration.status == VolunteerStatus.rejected:
            next_step = "Registration was rejected."
        else:
            next_step = "Registration was cancelled."
        items.append(
            SupporterParticipationItemRead(
                id=f"volunteer-{registration.id}",
                campaign_id=campaign.id,
                campaign_title=campaign.title,
                campaign_location=_campaign_location_label(campaign),
                role_label="Volunteer",
                status_label=registration.status.value,
                next_step=next_step,
                date_label=_relative_time_label(registration.registered_at),
                created_at=registration.registered_at,
            )
        )

    donation_rows = db.execute(
        select(MonetaryDonation, Campaign)
        .join(Campaign, Campaign.id == MonetaryDonation.campaign_id)
        .where(MonetaryDonation.donor_user_id == user_id)
        .order_by(MonetaryDonation.donated_at.desc())
        .limit(limit)
    ).all()
    for donation, campaign in donation_rows:
        if campaign.id in seen_campaign_ids:
            continue
        items.append(
            SupporterParticipationItemRead(
                id=f"donation-{donation.id}",
                campaign_id=campaign.id,
                campaign_title=campaign.title,
                campaign_location=_campaign_location_label(campaign),
                role_label="Money Donor",
                status_label="contributed",
                next_step="Track campaign progress in transparency logs.",
                date_label=_relative_time_label(donation.donated_at),
                created_at=donation.donated_at,
            )
        )

    items.sort(key=lambda item: item.created_at, reverse=True)
    return items[:limit]


@router.get("/supporter/{user_id}/tasks", response_model=list[SupporterTaskItemRead])
def supporter_tasks(
    user_id: UUID,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[SupporterTaskItemRead]:
    ensure_authenticated_user_matches(
        current_user,
        user_id,
        auth_detail="Authentication required to view a supporter dashboard",
        mismatch_detail="Cannot view another user dashboard",
    )

    registration_rows = db.execute(
        select(VolunteerRegistration, Campaign)
        .join(Campaign, Campaign.id == VolunteerRegistration.campaign_id)
        .where(VolunteerRegistration.user_id == user_id)
        .order_by(VolunteerRegistration.registered_at.desc())
        .limit(limit)
    ).all()

    items: list[SupporterTaskItemRead] = []
    for registration, campaign in registration_rows:
        if registration.status == VolunteerStatus.approved:
            task_title = "Check in at campaign checkpoint"
            status_label = "ready"
            due_label = "As scheduled by organization"
        elif registration.status == VolunteerStatus.pending:
            task_title = "Wait for registration approval"
            status_label = "pending"
            due_label = "Awaiting organization review"
        elif registration.status == VolunteerStatus.rejected:
            task_title = "Registration closed by organization"
            status_label = "rejected"
            due_label = "No action required"
        else:
            task_title = "Registration cancelled"
            status_label = "cancelled"
            due_label = "No action required"

        items.append(
            SupporterTaskItemRead(
                id=f"task-{registration.id}",
                campaign_id=campaign.id,
                campaign_title=campaign.title,
                title=task_title,
                status_label=status_label,
                due_label=due_label,
                created_at=registration.registered_at,
            )
        )
    return items[:limit]


@router.get(
    "/supporter/{user_id}/contributions",
    response_model=list[SupporterContributionItemRead],
)
def supporter_contributions(
    user_id: UUID,
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[SupporterContributionItemRead]:
    ensure_authenticated_user_matches(
        current_user,
        user_id,
        auth_detail="Authentication required to view a supporter dashboard",
        mismatch_detail="Cannot view another user dashboard",
    )

    campaign_titles = dict(
        db.execute(
            select(Campaign.id, Campaign.title).where(
                Campaign.id.in_(
                    select(MonetaryDonation.campaign_id).where(MonetaryDonation.donor_user_id == user_id)
                )
            )
        ).all()
    )

    items: list[SupporterContributionItemRead] = []

    donation_rows = db.execute(
        select(MonetaryDonation)
        .where(MonetaryDonation.donor_user_id == user_id)
        .order_by(MonetaryDonation.donated_at.desc())
        .limit(limit)
    ).scalars().all()
    for donation in donation_rows:
        campaign_title = campaign_titles.get(donation.campaign_id, str(donation.campaign_id))
        items.append(
            SupporterContributionItemRead(
                id=f"money-{donation.id}",
                campaign_id=donation.campaign_id,
                campaign_title=campaign_title,
                contribution_type="money",
                summary=f"Donated {donation.amount} {donation.currency}.",
                status_label="received",
                date_label=_relative_time_label(donation.donated_at),
                created_at=donation.donated_at,
            )
        )

    goods_rows = db.execute(
        select(GoodsCheckin, Campaign.title)
        .join(Campaign, Campaign.id == GoodsCheckin.campaign_id)
        .where(GoodsCheckin.user_id == user_id)
        .order_by(GoodsCheckin.checked_in_at.desc())
        .limit(limit)
    ).all()
    for goods_checkin, campaign_title in goods_rows:
        items.append(
            SupporterContributionItemRead(
                id=f"goods-{goods_checkin.id}",
                campaign_id=goods_checkin.campaign_id,
                campaign_title=campaign_title,
                contribution_type="goods",
                summary=(
                    f"Checked in {goods_checkin.item_name} "
                    f"x{goods_checkin.quantity} {goods_checkin.unit}."
                ),
                status_label="checked_in",
                date_label=_relative_time_label(goods_checkin.checked_in_at),
                created_at=goods_checkin.checked_in_at,
            )
        )

    attendance_rows = db.execute(
        select(VolunteerAttendance, Campaign.title)
        .join(Campaign, Campaign.id == VolunteerAttendance.campaign_id)
        .where(VolunteerAttendance.user_id == user_id)
        .order_by(VolunteerAttendance.check_in_at.desc())
        .limit(limit)
    ).all()
    for attendance, campaign_title in attendance_rows:
        status_label = "completed" if attendance.check_out_at is not None else "in_progress"
        duration = (
            f"{attendance.duration_minutes} minute(s)"
            if attendance.duration_minutes is not None
            else "ongoing"
        )
        items.append(
            SupporterContributionItemRead(
                id=f"volunteer-{attendance.id}",
                campaign_id=attendance.campaign_id,
                campaign_title=campaign_title,
                contribution_type="volunteer",
                summary=f"Volunteer attendance recorded ({duration}).",
                status_label=status_label,
                date_label=_relative_time_label(attendance.check_in_at),
                created_at=attendance.check_in_at,
            )
        )

    items.sort(key=lambda item: item.created_at, reverse=True)
    return items[:limit]
