from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_optional_current_user
from app.api.permissions import ensure_authenticated_user_matches
from app.models.campaign import Campaign, CampaignStatus
from app.models.credit_event import CreditTargetType
from app.models.monetary_donation import MonetaryDonation
from app.models.user import User
from app.schemas.monetary_donation import MonetaryDonationCreate, MonetaryDonationRead
from app.services.credit_service import (
    DONATION_CREATED_SUPPORTER_POINTS,
    DONATION_RECEIVED_ORGANIZATION_POINTS,
    apply_credit_event,
)

router = APIRouter(prefix="/donations", tags=["donations"])


@router.get("/", response_model=list[MonetaryDonationRead])
def list_donations(
    campaign_id: UUID | None = Query(default=None),
    organization_id: UUID | None = Query(default=None),
    donor_user_id: UUID | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
) -> list[MonetaryDonation]:
    if donor_user_id is not None:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to query user donations",
            )
        if not current_user.is_superuser:
            ensure_authenticated_user_matches(
                current_user,
                donor_user_id,
                auth_detail="Authentication required to query user donations",
                mismatch_detail="Cannot query donations for another user",
            )

    if organization_id is not None:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to query organization donations",
            )
        if not current_user.is_superuser and current_user.organization_id != organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot query donations for another organization",
            )

    stmt = (
        select(MonetaryDonation)
        .order_by(MonetaryDonation.donated_at.desc())
        .limit(limit)
    )
    if campaign_id is not None:
        stmt = stmt.where(MonetaryDonation.campaign_id == campaign_id)
    if donor_user_id is not None:
        stmt = stmt.where(MonetaryDonation.donor_user_id == donor_user_id)
    if organization_id is not None:
        stmt = stmt.join(Campaign, Campaign.id == MonetaryDonation.campaign_id).where(
            Campaign.organization_id == organization_id
        )

    return list(db.scalars(stmt).all())


@router.post("/", response_model=MonetaryDonationRead, status_code=status.HTTP_201_CREATED)
def create_donation(
    payload: MonetaryDonationCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
) -> MonetaryDonation:
    campaign = db.get(Campaign, payload.campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    if campaign.status != CampaignStatus.published or not campaign.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign is not open for donations",
        )

    goal_amount = Decimal(campaign.goal_amount)
    raised_amount = Decimal(campaign.raised_amount)
    remaining_amount = goal_amount - raised_amount
    if remaining_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign has already reached its funding goal",
        )
    if Decimal(payload.amount) > remaining_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Donation amount exceeds remaining campaign goal. "
                f"Maximum allowed is {remaining_amount}"
            ),
        )

    donor_user_id = payload.donor_user_id
    donor_name = payload.donor_name.strip()

    if current_user is not None and not current_user.is_superuser:
        if donor_user_id is not None and donor_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot create donation for another user",
            )
        donor_user_id = current_user.id
        donor_name = current_user.full_name

    if donor_user_id is not None:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to create a linked donation",
            )
        if not current_user.is_superuser:
            ensure_authenticated_user_matches(
                current_user,
                donor_user_id,
                auth_detail="Authentication required to create a linked donation",
                mismatch_detail="Cannot create donation for another user",
            )
        donor_user = db.get(User, donor_user_id)
        if donor_user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donor user not found")
        if not donor_name:
            donor_name = donor_user.full_name

    if not donor_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="donor_name cannot be empty",
        )

    donation = MonetaryDonation(
        campaign_id=payload.campaign_id,
        donor_user_id=donor_user_id,
        donor_name=donor_name,
        amount=payload.amount,
        currency=payload.currency.upper(),
        payment_method=payload.payment_method,
        note=payload.note,
    )
    db.add(donation)

    campaign.raised_amount = raised_amount + Decimal(payload.amount)
    db.flush()

    if donor_user_id is not None:
        apply_credit_event(
            db,
            target_type=CreditTargetType.supporter,
            target_user_id=donor_user_id,
            actor_user_id=donor_user_id,
            event_type="donation_created",
            points=DONATION_CREATED_SUPPORTER_POINTS,
            note=f"Donation for campaign {campaign.title}",
            context={
                "campaign_id": str(campaign.id),
                "donation_id": str(donation.id),
                "amount": str(payload.amount),
                "currency": payload.currency.upper(),
            },
        )

    apply_credit_event(
        db,
        target_type=CreditTargetType.organization,
        target_organization_id=campaign.organization_id,
        actor_user_id=donor_user_id,
        event_type="donation_received",
        points=DONATION_RECEIVED_ORGANIZATION_POINTS,
        note=f"Received donation for campaign {campaign.title}",
        context={
            "campaign_id": str(campaign.id),
            "donation_id": str(donation.id),
            "amount": str(payload.amount),
            "currency": payload.currency.upper(),
        },
    )

    db.commit()
    db.refresh(donation)
    return donation
