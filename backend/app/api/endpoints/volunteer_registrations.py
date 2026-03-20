from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_organization_user,
    get_db,
    get_optional_current_user,
)
from app.api.permissions import ensure_authenticated_user_matches
from app.models.campaign import Campaign
from app.models.user import User
from app.models.volunteer_registration import VolunteerRegistration, VolunteerStatus
from app.schemas.volunteer_registration import (
    VolunteerRegistrationCreate,
    VolunteerRegistrationRead,
    VolunteerRegistrationUpdateStatus,
)

router = APIRouter(prefix="/volunteer-registrations", tags=["volunteer_registrations"])


@router.get("/", response_model=list[VolunteerRegistrationRead])
def list_volunteer_registrations(
    campaign_id: UUID | None = Query(default=None),
    organization_id: UUID | None = Query(default=None),
    user_id: UUID | None = Query(default=None),
    registration_status: VolunteerStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[VolunteerRegistration]:
    stmt = (
        select(VolunteerRegistration)
        .order_by(VolunteerRegistration.registered_at.desc())
        .limit(limit)
    )
    if campaign_id is not None:
        stmt = stmt.where(VolunteerRegistration.campaign_id == campaign_id)
    if user_id is not None:
        stmt = stmt.where(VolunteerRegistration.user_id == user_id)
    if registration_status is not None:
        stmt = stmt.where(VolunteerRegistration.status == registration_status)
    if organization_id is not None:
        stmt = stmt.join(Campaign, Campaign.id == VolunteerRegistration.campaign_id).where(
            Campaign.organization_id == organization_id
        )
    return list(db.scalars(stmt).all())


@router.post("/", response_model=VolunteerRegistrationRead, status_code=status.HTTP_201_CREATED)
def create_volunteer_registration(
    payload: VolunteerRegistrationCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
) -> VolunteerRegistration:
    campaign = db.get(Campaign, payload.campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    full_name = payload.full_name
    email = payload.email
    if payload.user_id is not None:
        ensure_authenticated_user_matches(
            current_user,
            payload.user_id,
            auth_detail="Authentication required to create a linked registration",
            mismatch_detail="Cannot create registration for another user",
        )
        user = db.get(User, payload.user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        full_name = user.full_name
        email = user.email

    registration = VolunteerRegistration(
        campaign_id=payload.campaign_id,
        user_id=payload.user_id,
        full_name=full_name,
        email=email,
        phone_number=payload.phone_number,
        message=payload.message,
        status=VolunteerStatus.pending,
    )
    db.add(registration)
    db.commit()
    db.refresh(registration)
    return registration


@router.patch("/{registration_id}/status", response_model=VolunteerRegistrationRead)
def update_volunteer_registration_status(
    registration_id: UUID,
    payload: VolunteerRegistrationUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> VolunteerRegistration:
    registration = db.get(VolunteerRegistration, registration_id)
    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Volunteer registration not found",
        )

    campaign = db.get(Campaign, registration.campaign_id)
    if campaign is None or campaign.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update registration for another organization",
        )

    registration.status = payload.status
    db.commit()
    db.refresh(registration)
    return registration
