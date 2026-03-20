from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.beneficiary import Beneficiary
from app.models.campaign import Campaign, CampaignStatus
from app.models.monetary_donation import MonetaryDonation
from app.models.organization import Organization
from app.models.user import User
from app.models.volunteer_registration import VolunteerRegistration, VolunteerStatus
from app.schemas.dashboard import OrganizationDashboardRead, SupporterDashboardRead

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


@router.get("/organization/{organization_id}", response_model=OrganizationDashboardRead)
def organization_dashboard(
    organization_id: UUID,
    db: Session = Depends(get_db),
) -> OrganizationDashboardRead:
    organization = db.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    campaign_ids = list(
        db.scalars(select(Campaign.id).where(Campaign.organization_id == organization_id)).all()
    )

    campaign_count = len(campaign_ids)
    beneficiary_count = (
        db.scalar(select(func.count(Beneficiary.id)).where(Beneficiary.organization_id == organization_id))
        or 0
    )

    if campaign_ids:
        donation_count = (
            db.scalar(
                select(func.count(MonetaryDonation.id)).where(
                    MonetaryDonation.campaign_id.in_(campaign_ids)
                )
            )
            or 0
        )
        total_raised = (
            db.scalar(
                select(func.coalesce(func.sum(MonetaryDonation.amount), 0)).where(
                    MonetaryDonation.campaign_id.in_(campaign_ids)
                )
            )
            or Decimal("0")
        )
        supporter_ids = set(
            db.scalars(
                select(MonetaryDonation.donor_user_id).where(
                    MonetaryDonation.campaign_id.in_(campaign_ids),
                    MonetaryDonation.donor_user_id.is_not(None),
                )
            ).all()
        )
        supporter_ids.update(
            db.scalars(
                select(VolunteerRegistration.user_id).where(
                    VolunteerRegistration.campaign_id.in_(campaign_ids),
                    VolunteerRegistration.user_id.is_not(None),
                )
            ).all()
        )
        supporter_count = len(supporter_ids)
    else:
        donation_count = 0
        total_raised = Decimal("0")
        supporter_count = 0

    return OrganizationDashboardRead(
        organization_id=organization_id,
        campaigns=campaign_count,
        beneficiaries=beneficiary_count,
        supporters=supporter_count,
        donations=donation_count,
        total_raised=Decimal(total_raised),
    )


@router.get("/supporter/{user_id}", response_model=SupporterDashboardRead)
def supporter_dashboard(
    user_id: UUID,
    db: Session = Depends(get_db),
) -> SupporterDashboardRead:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    total_contributions = (
        db.scalar(select(func.count(MonetaryDonation.id)).where(MonetaryDonation.donor_user_id == user_id))
        or 0
    )
    total_donated_amount = (
        db.scalar(
            select(func.coalesce(func.sum(MonetaryDonation.amount), 0)).where(
                MonetaryDonation.donor_user_id == user_id
            )
        )
        or Decimal("0")
    )
    my_registrations = (
        db.scalar(
            select(func.count(VolunteerRegistration.id)).where(VolunteerRegistration.user_id == user_id)
        )
        or 0
    )
    tasks_completed = (
        db.scalar(
            select(func.count(VolunteerRegistration.id)).where(
                VolunteerRegistration.user_id == user_id,
                VolunteerRegistration.status == VolunteerStatus.approved,
            )
        )
        or 0
    )

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

    return SupporterDashboardRead(
        user_id=user_id,
        active_campaigns=active_campaigns,
        total_contributions=total_contributions,
        total_donated_amount=Decimal(total_donated_amount),
        my_registrations=my_registrations,
        tasks_completed=tasks_completed,
    )
