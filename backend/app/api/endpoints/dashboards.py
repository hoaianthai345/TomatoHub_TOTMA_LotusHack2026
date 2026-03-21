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
from app.models.campaign import Campaign, CampaignStatus, SupportType
from app.models.monetary_donation import MonetaryDonation
from app.models.organization import Organization
from app.models.user import User
from app.models.volunteer_registration import VolunteerRegistration, VolunteerStatus
from app.schemas.dashboard import (
    OrganizationActivityItemRead,
    OrganizationCampaignSnapshotRead,
    OrganizationDashboardRead,
    SupporterContributionItemRead,
    SupporterDashboardRead,
    SupporterParticipationCardRead,
    SupporterTaskItemRead,
)

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


def _to_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _timestamp_key(value: datetime | None) -> float:
    normalized = _to_utc(value)
    if normalized is None:
        return 0
    return normalized.timestamp()


def _format_datetime_label(value: datetime | None, fallback: str = "No schedule yet") -> str:
    normalized = _to_utc(value)
    if normalized is None:
        return fallback
    return normalized.strftime("%b %d, %Y %H:%M UTC")


def _format_amount(value: Decimal | int | float, currency: str = "VND") -> str:
    amount = Decimal(value)
    if amount == amount.to_integral():
        formatted = f"{amount:,.0f}"
    else:
        formatted = f"{amount:,.2f}"
    return f"{formatted} {currency.upper()}"


def _humanize_payment_method(value: str) -> str:
    return value.replace("_", " ").title()


def _build_campaign_location(campaign: Campaign) -> str:
    return ", ".join(
        value
        for value in [campaign.address_line, campaign.district, campaign.province]
        if value
    )


def _campaign_status_label(status_value: CampaignStatus) -> str:
    return {
        CampaignStatus.draft: "Draft",
        CampaignStatus.published: "Running",
        CampaignStatus.closed: "Closed",
    }.get(status_value, "Unknown")


def _registration_status_label(status_value: VolunteerStatus) -> str:
    return {
        VolunteerStatus.pending: "Pending review",
        VolunteerStatus.approved: "Approved",
        VolunteerStatus.rejected: "Rejected",
    }.get(status_value, "Pending review")


def _build_supporter_participation_cards(
    campaigns_by_id: dict[UUID, Campaign],
    donations: list[MonetaryDonation],
    registrations: list[VolunteerRegistration],
    now: datetime,
) -> list[SupporterParticipationCardRead]:
    donations_by_campaign: dict[UUID, list[MonetaryDonation]] = defaultdict(list)
    registrations_by_campaign: dict[UUID, list[VolunteerRegistration]] = defaultdict(list)

    for donation in donations:
        donations_by_campaign[donation.campaign_id].append(donation)
    for registration in registrations:
        registrations_by_campaign[registration.campaign_id].append(registration)

    cards_with_time: list[tuple[datetime | None, SupporterParticipationCardRead]] = []

    for campaign_id in set(donations_by_campaign) | set(registrations_by_campaign):
        campaign = campaigns_by_id.get(campaign_id)
        if campaign is None:
            continue

        latest_donation = next(
            iter(
                sorted(
                    donations_by_campaign.get(campaign_id, []),
                    key=lambda item: _timestamp_key(item.donated_at),
                    reverse=True,
                )
            ),
            None,
        )
        latest_registration = next(
            iter(
                sorted(
                    registrations_by_campaign.get(campaign_id, []),
                    key=lambda item: _timestamp_key(item.registered_at),
                    reverse=True,
                )
            ),
            None,
        )

        latest_activity_at = max(
            [
                value
                for value in [
                    latest_donation.donated_at if latest_donation else None,
                    latest_registration.registered_at if latest_registration else None,
                ]
                if value is not None
            ],
            key=_timestamp_key,
            default=None,
        )

        if latest_registration is not None:
            if latest_registration.status == VolunteerStatus.approved:
                role_label = "Volunteer"
                status_label = "Approved"
                if campaign.starts_at and _timestamp_key(campaign.starts_at) > _timestamp_key(now):
                    next_step = (
                        f"Prepare for check-in before {_format_datetime_label(campaign.starts_at)}."
                    )
                else:
                    next_step = "Coordinate with the organization for your next field task."
            elif latest_registration.status == VolunteerStatus.pending:
                role_label = "Volunteer applicant"
                status_label = "Pending review"
                next_step = "Wait for the organization to confirm your volunteer registration."
            else:
                role_label = "Volunteer applicant"
                status_label = "Rejected"
                next_step = "Pick another campaign or contact the organization for follow-up."
        else:
            role_label = "Donor"
            status_label = "Donation received"
            next_step = "Your donation is already counted toward this campaign goal."

        cards_with_time.append(
            (
                latest_activity_at,
                SupporterParticipationCardRead(
                    id=f"participation-{campaign.id}",
                    campaign_id=campaign.id,
                    campaign_title=campaign.title,
                    campaign_location=_build_campaign_location(campaign),
                    cover_image_url=campaign.cover_image_url,
                    role_label=role_label,
                    status_label=status_label,
                    next_step=next_step,
                    date_label=_format_datetime_label(
                        latest_activity_at,
                        fallback="Recent activity pending",
                    ),
                ),
            )
        )

    cards_with_time.sort(key=lambda item: _timestamp_key(item[0]), reverse=True)
    return [item for _, item in cards_with_time[:3]]


def _build_supporter_contribution_items(
    campaigns_by_id: dict[UUID, Campaign],
    donations: list[MonetaryDonation],
    registrations: list[VolunteerRegistration],
) -> list[SupporterContributionItemRead]:
    items_with_time: list[tuple[datetime | None, SupporterContributionItemRead]] = []

    for donation in donations:
        campaign = campaigns_by_id.get(donation.campaign_id)
        if campaign is None:
            continue

        summary = (
            f"Donated {_format_amount(donation.amount, donation.currency)} "
            f"via {_humanize_payment_method(donation.payment_method)}."
        )
        if donation.note:
            summary = f"{summary} {donation.note}"

        items_with_time.append(
            (
                donation.donated_at,
                SupporterContributionItemRead(
                    id=f"contribution-donation-{donation.id}",
                    campaign_id=campaign.id,
                    campaign_title=campaign.title,
                    contribution_type=SupportType.money,
                    summary=summary,
                    status_label="Received",
                    date_label=_format_datetime_label(donation.donated_at),
                ),
            )
        )

    for registration in registrations:
        campaign = campaigns_by_id.get(registration.campaign_id)
        if campaign is None:
            continue

        summary = (
            registration.message.strip()
            if registration.message
            else f"Volunteer registration submitted for {campaign.title}."
        )

        items_with_time.append(
            (
                registration.registered_at,
                SupporterContributionItemRead(
                    id=f"contribution-registration-{registration.id}",
                    campaign_id=campaign.id,
                    campaign_title=campaign.title,
                    contribution_type=SupportType.volunteer,
                    summary=summary,
                    status_label=_registration_status_label(registration.status),
                    date_label=_format_datetime_label(registration.registered_at),
                ),
            )
        )

    items_with_time.sort(key=lambda item: _timestamp_key(item[0]), reverse=True)
    return [item for _, item in items_with_time[:3]]


def _build_supporter_task_items(
    campaigns_by_id: dict[UUID, Campaign],
    registrations: list[VolunteerRegistration],
    now: datetime,
) -> list[SupporterTaskItemRead]:
    status_priority = {
        VolunteerStatus.approved: 2,
        VolunteerStatus.pending: 1,
        VolunteerStatus.rejected: 0,
    }

    sorted_registrations = sorted(
        registrations,
        key=lambda item: (status_priority.get(item.status, 0), _timestamp_key(item.registered_at)),
        reverse=True,
    )

    items: list[SupporterTaskItemRead] = []
    for registration in sorted_registrations:
        campaign = campaigns_by_id.get(registration.campaign_id)
        if campaign is None:
            continue

        if registration.status == VolunteerStatus.approved:
            title = f"Prepare for {campaign.title}"
            status_label = "Scheduled"
            if campaign.starts_at and _timestamp_key(campaign.starts_at) > _timestamp_key(now):
                due_label = f"Starts {_format_datetime_label(campaign.starts_at)}"
            else:
                due_label = "Campaign already in progress"
        elif registration.status == VolunteerStatus.pending:
            title = f"Watch for approval on {campaign.title}"
            status_label = "Pending review"
            due_label = "Waiting for organizer response"
        else:
            title = f"Review next steps for {campaign.title}"
            status_label = "Update needed"
            due_label = "Consider another campaign"

        items.append(
            SupporterTaskItemRead(
                id=f"task-{registration.id}",
                campaign_id=campaign.id,
                campaign_title=campaign.title,
                title=title,
                status_label=status_label,
                due_label=due_label,
            )
        )

        if len(items) == 3:
            break

    return items


def _build_organization_campaign_snapshots(
    campaigns: list[Campaign],
    donations_by_campaign: dict[UUID, list[MonetaryDonation]],
    registrations_by_campaign: dict[UUID, list[VolunteerRegistration]],
    beneficiaries_by_campaign: dict[UUID, list[Beneficiary]],
) -> list[OrganizationCampaignSnapshotRead]:
    snapshots: list[OrganizationCampaignSnapshotRead] = []

    for campaign in campaigns[:3]:
        donation_count = len(donations_by_campaign.get(campaign.id, []))
        registration_count = len(registrations_by_campaign.get(campaign.id, []))
        beneficiary_count = len(beneficiaries_by_campaign.get(campaign.id, []))
        progress_percent = 0
        if campaign.goal_amount:
            progress_percent = int(
                max(
                    0,
                    min(
                        100,
                        round((Decimal(campaign.raised_amount) / Decimal(campaign.goal_amount)) * 100),
                    ),
                )
            )

        remaining_amount = max(Decimal(campaign.goal_amount) - Decimal(campaign.raised_amount), Decimal("0"))

        if campaign.status == CampaignStatus.draft:
            note = "Draft is ready for review before publishing."
        elif campaign.status == CampaignStatus.closed:
            note = "Campaign is closed. Keep transparency updates current."
        elif Decimal(campaign.raised_amount) >= Decimal(campaign.goal_amount):
            note = "Goal reached. Focus on delivery and public updates."
        elif SupportType.volunteer.value in campaign.support_types and registration_count == 0:
            note = "Volunteer outreach still needs attention."
        elif SupportType.money.value in campaign.support_types and donation_count == 0:
            note = "Fundraising has not started yet."
        else:
            note = f"{_format_amount(remaining_amount)} left to goal."

        snapshots.append(
            OrganizationCampaignSnapshotRead(
                id=f"org-campaign-{campaign.id}",
                campaign_id=campaign.id,
                campaign_title=campaign.title,
                location=_build_campaign_location(campaign),
                status_label=_campaign_status_label(campaign.status),
                support_label=(
                    f"{donation_count} donation(s), "
                    f"{registration_count} volunteer registration(s), "
                    f"{beneficiary_count} beneficiary link(s)."
                ),
                progress_percent=progress_percent,
                note=note,
            )
        )

    return snapshots


def _build_organization_recent_activities(
    campaigns: list[Campaign],
    campaigns_by_id: dict[UUID, Campaign],
    donations: list[MonetaryDonation],
    registrations: list[VolunteerRegistration],
    beneficiaries: list[Beneficiary],
) -> list[OrganizationActivityItemRead]:
    events: list[tuple[datetime | None, OrganizationActivityItemRead]] = []

    for donation in donations[:6]:
        campaign = campaigns_by_id.get(donation.campaign_id)
        if campaign is None:
            continue
        events.append(
            (
                donation.donated_at,
                OrganizationActivityItemRead(
                    id=f"activity-donation-{donation.id}",
                    actor=donation.donor_name,
                    title="New donation received",
                    detail=(
                        f'{donation.donor_name} donated '
                        f'{_format_amount(donation.amount, donation.currency)} '
                        f'to "{campaign.title}".'
                    ),
                    time_label=_format_datetime_label(donation.donated_at),
                ),
            )
        )

    for registration in registrations[:6]:
        campaign = campaigns_by_id.get(registration.campaign_id)
        if campaign is None:
            continue
        events.append(
            (
                registration.registered_at,
                OrganizationActivityItemRead(
                    id=f"activity-registration-{registration.id}",
                    actor=registration.full_name,
                    title="Volunteer registration received",
                    detail=f'{registration.full_name} signed up for "{campaign.title}".',
                    time_label=_format_datetime_label(registration.registered_at),
                ),
            )
        )

    for beneficiary in beneficiaries[:6]:
        campaign = campaigns_by_id.get(beneficiary.campaign_id) if beneficiary.campaign_id else None
        campaign_label = campaign.title if campaign is not None else "an upcoming campaign"
        events.append(
            (
                beneficiary.created_at,
                OrganizationActivityItemRead(
                    id=f"activity-beneficiary-{beneficiary.id}",
                    actor="Field team",
                    title="Beneficiary linked",
                    detail=f'{beneficiary.full_name} was linked to "{campaign_label}".',
                    time_label=_format_datetime_label(beneficiary.created_at),
                ),
            )
        )

    for campaign in campaigns[:6]:
        event_time = campaign.published_at if campaign.published_at is not None else campaign.created_at
        if campaign.status == CampaignStatus.published and campaign.published_at is not None:
            title = "Campaign published"
            detail = f'"{campaign.title}" is now live for public support.'
        elif campaign.status == CampaignStatus.draft:
            title = "Draft campaign created"
            detail = f'"{campaign.title}" is saved in the workspace for review.'
        else:
            title = "Campaign updated"
            detail = f'"{campaign.title}" remains in the organization pipeline.'

        events.append(
            (
                event_time,
                OrganizationActivityItemRead(
                    id=f"activity-campaign-{campaign.id}",
                    actor="Campaign desk",
                    title=title,
                    detail=detail,
                    time_label=_format_datetime_label(event_time),
                ),
            )
        )

    events.sort(key=lambda item: _timestamp_key(item[0]), reverse=True)
    return [item for _, item in events[:4]]


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
