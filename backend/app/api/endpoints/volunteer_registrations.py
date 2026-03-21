from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_active_user,
    get_current_organization_user,
    get_db,
    get_optional_current_user,
)
from app.api.permissions import ensure_authenticated_user_matches
from app.models.campaign import Campaign, CampaignStatus, SupportType
from app.models.credit_event import CreditTargetType
from app.models.user import User
from app.models.volunteer_registration import (
    VolunteerAttendanceStatus,
    VolunteerRegistration,
    VolunteerStatus,
)
from app.schemas.volunteer_registration import (
    VolunteerQuickJoinCreate,
    VolunteerRegistrationCreate,
    VolunteerRegistrationRead,
    VolunteerRegistrationUpdateAttendance,
    VolunteerRegistrationUpdateStatus,
)
from app.services.credit_service import (
    VOLUNTEER_APPROVED_ORGANIZATION_POINTS,
    VOLUNTEER_APPROVED_SUPPORTER_POINTS,
    VOLUNTEER_REGISTERED_ORGANIZATION_POINTS,
    VOLUNTEER_REGISTERED_SUPPORTER_POINTS,
    apply_credit_event,
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
    current_user: User | None = Depends(get_optional_current_user),
) -> list[VolunteerRegistration]:
    if user_id is not None:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to query user registrations",
            )
        if not current_user.is_superuser:
            ensure_authenticated_user_matches(
                current_user,
                user_id,
                auth_detail="Authentication required to query user registrations",
                mismatch_detail="Cannot query registrations for another user",
            )

    if organization_id is not None:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to query organization registrations",
            )
        if not current_user.is_superuser and current_user.organization_id != organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot query registrations for another organization",
            )

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
    if campaign.status != CampaignStatus.published or not campaign.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign is not open for volunteer registration",
        )
    if SupportType.volunteer.value not in (campaign.support_types or []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign does not accept volunteer registration",
        )

    if (
        current_user is not None
        and current_user.organization_id is not None
        and not current_user.is_superuser
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization account cannot register as volunteer",
        )

    user_id = payload.user_id
    full_name = payload.full_name.strip()
    email = payload.email

    if current_user is not None and not current_user.is_superuser:
        if user_id is not None and user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot create registration for another user",
            )
        user_id = current_user.id
        full_name = current_user.full_name
        email = current_user.email

    if user_id is not None:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to create a linked registration",
            )
        if not current_user.is_superuser:
            ensure_authenticated_user_matches(
                current_user,
                user_id,
                auth_detail="Authentication required to create a linked registration",
                mismatch_detail="Cannot create registration for another user",
            )
        user = db.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if user.organization_id is not None and not user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Volunteer registration user must be a supporter account",
            )
        if not full_name:
            full_name = user.full_name
        email = user.email

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="full_name cannot be empty",
        )

    if user_id is not None:
        existing = db.scalar(
            select(VolunteerRegistration)
            .where(
                VolunteerRegistration.campaign_id == payload.campaign_id,
                VolunteerRegistration.user_id == user_id,
            )
            .order_by(VolunteerRegistration.registered_at.desc())
        )
        if existing is not None:
            existing.full_name = full_name
            existing.email = email
            existing.phone_number = payload.phone_number
            existing.message = payload.message
            existing.role = payload.role
            existing.shift_start_at = payload.shift_start_at
            existing.shift_end_at = payload.shift_end_at
            if existing.status in {VolunteerStatus.rejected, VolunteerStatus.cancelled}:
                existing.status = VolunteerStatus.pending
            db.commit()
            db.refresh(existing)
            return existing
    else:
        existing_unlinked = db.scalar(
            select(VolunteerRegistration)
            .where(
                VolunteerRegistration.campaign_id == payload.campaign_id,
                VolunteerRegistration.user_id.is_(None),
                func.lower(VolunteerRegistration.email) == email.lower(),
            )
            .order_by(VolunteerRegistration.registered_at.desc())
        )
        if existing_unlinked is not None:
            existing_unlinked.full_name = full_name
            existing_unlinked.email = email
            existing_unlinked.phone_number = payload.phone_number
            existing_unlinked.message = payload.message
            existing_unlinked.role = payload.role
            existing_unlinked.shift_start_at = payload.shift_start_at
            existing_unlinked.shift_end_at = payload.shift_end_at
            if existing_unlinked.status in {VolunteerStatus.rejected, VolunteerStatus.cancelled}:
                existing_unlinked.status = VolunteerStatus.pending
            db.commit()
            db.refresh(existing_unlinked)
            return existing_unlinked

    registration = VolunteerRegistration(
        campaign_id=payload.campaign_id,
        user_id=user_id,
        full_name=full_name,
        email=email,
        phone_number=payload.phone_number,
        message=payload.message,
        role=payload.role,
        shift_start_at=payload.shift_start_at,
        shift_end_at=payload.shift_end_at,
        status=VolunteerStatus.pending,
    )
    db.add(registration)
    db.flush()

    if user_id is not None:
        apply_credit_event(
            db,
            target_type=CreditTargetType.supporter,
            target_user_id=user_id,
            actor_user_id=user_id,
            event_type="volunteer_registered",
            points=VOLUNTEER_REGISTERED_SUPPORTER_POINTS,
            note=f"Registered for volunteer campaign {campaign.title}",
            context={
                "campaign_id": str(campaign.id),
                "registration_id": str(registration.id),
            },
        )

    apply_credit_event(
        db,
        target_type=CreditTargetType.organization,
        target_organization_id=campaign.organization_id,
        actor_user_id=user_id,
        event_type="volunteer_registration_received",
        points=VOLUNTEER_REGISTERED_ORGANIZATION_POINTS,
        note=f"Received volunteer registration for campaign {campaign.title}",
        context={
            "campaign_id": str(campaign.id),
            "registration_id": str(registration.id),
        },
    )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Volunteer registration already exists for this campaign and user",
        ) from None
    db.refresh(registration)
    return registration


@router.post("/quick-join", response_model=VolunteerRegistrationRead)
def quick_join_volunteer_registration(
    payload: VolunteerQuickJoinCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> VolunteerRegistration:
    if current_user.organization_id is not None and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization account cannot register as volunteer",
        )

    create_payload = VolunteerRegistrationCreate(
        campaign_id=payload.campaign_id,
        user_id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        phone_number=payload.phone_number,
        message=payload.message,
        role=payload.role,
        shift_start_at=payload.shift_start_at,
        shift_end_at=payload.shift_end_at,
    )
    return create_volunteer_registration(
        payload=create_payload,
        db=db,
        current_user=current_user,
    )


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

    previous_status = registration.status
    registration.status = payload.status
    if (
        previous_status != VolunteerStatus.approved
        and payload.status == VolunteerStatus.approved
    ):
        if registration.user_id is not None:
            apply_credit_event(
                db,
                target_type=CreditTargetType.supporter,
                target_user_id=registration.user_id,
                actor_user_id=current_user.id,
                event_type="volunteer_approved",
                points=VOLUNTEER_APPROVED_SUPPORTER_POINTS,
                note=f"Volunteer registration approved for campaign {campaign.title}",
                context={
                    "campaign_id": str(campaign.id),
                    "registration_id": str(registration.id),
                },
            )

        apply_credit_event(
            db,
            target_type=CreditTargetType.organization,
            target_organization_id=campaign.organization_id,
            actor_user_id=current_user.id,
            event_type="volunteer_approved_organization",
            points=VOLUNTEER_APPROVED_ORGANIZATION_POINTS,
            note=f"Approved volunteer registration for campaign {campaign.title}",
            context={
                "campaign_id": str(campaign.id),
                "registration_id": str(registration.id),
            },
        )

    db.commit()
    db.refresh(registration)
    return registration


@router.patch("/{registration_id}/attendance", response_model=VolunteerRegistrationRead)
def update_volunteer_registration_attendance(
    registration_id: UUID,
    payload: VolunteerRegistrationUpdateAttendance,
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
            detail="Cannot update attendance for another organization",
        )

    if registration.status in {VolunteerStatus.rejected, VolunteerStatus.cancelled}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Attendance status cannot be marked for rejected or cancelled registration",
        )

    note = payload.attendance_note.strip() if payload.attendance_note else None
    registration.attendance_status = payload.attendance_status
    if (
        registration.status == VolunteerStatus.pending
        and payload.attendance_status != VolunteerAttendanceStatus.not_marked
    ):
        registration.status = VolunteerStatus.approved
    registration.attendance_note = note or None
    registration.attendance_marked_at = datetime.now(timezone.utc)
    registration.attendance_marked_by_user_id = current_user.id

    db.commit()
    db.refresh(registration)
    return registration


@router.post("/{registration_id}/withdraw", response_model=VolunteerRegistrationRead)
def withdraw_volunteer_registration(
    registration_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> VolunteerRegistration:
    registration = db.get(VolunteerRegistration, registration_id)
    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Volunteer registration not found",
        )

    if (
        current_user.organization_id is not None
        and not current_user.is_superuser
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Supporter account required to withdraw registration",
        )

    if not current_user.is_superuser and registration.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot withdraw another user's registration",
        )

    registration.status = VolunteerStatus.cancelled
    db.add(registration)
    db.commit()
    db.refresh(registration)
    return registration


@router.post("/{registration_id}/cancel", response_model=VolunteerRegistrationRead)
def cancel_volunteer_registration(
    registration_id: UUID,
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
            detail="Cannot cancel registration for another organization",
        )

    registration.status = VolunteerStatus.cancelled
    db.add(registration)
    db.commit()
    db.refresh(registration)
    return registration


@router.delete("/{registration_id}")
def delete_volunteer_registration(
    registration_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict[str, str]:
    registration = db.get(VolunteerRegistration, registration_id)
    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Volunteer registration not found",
        )

    campaign = db.get(Campaign, registration.campaign_id)
    if campaign is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    can_delete = (
        current_user.is_superuser
        or registration.user_id == current_user.id
        or current_user.organization_id == campaign.organization_id
    )
    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove registration from another campaign",
        )

    db.delete(registration)
    db.commit()
    return {"message": "Volunteer registration removed successfully"}
