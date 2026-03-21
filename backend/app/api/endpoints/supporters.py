from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, get_optional_current_user
from app.api.permissions import ensure_authenticated_user_matches
from app.models.campaign import Campaign
from app.models.monetary_donation import MonetaryDonation
from app.models.user import User
from app.models.volunteer_registration import VolunteerRegistration
from app.schemas.supporter import SupporterRead, SupporterUpdate
from app.schemas.user import UserSupportType

router = APIRouter(prefix="/supporters", tags=["supporters"])


def _normalize_support_types(raw_values: list[str]) -> list[UserSupportType]:
    normalized: list[UserSupportType] = []
    for value in raw_values:
        try:
            normalized.append(UserSupportType(value))
        except ValueError:
            continue
    return normalized


def _build_supporter_read(db: Session, user: User) -> SupporterRead:
    joined_campaign_ids = set(
        db.scalars(
            select(MonetaryDonation.campaign_id).where(MonetaryDonation.donor_user_id == user.id)
        ).all()
    )
    joined_campaign_ids.update(
        db.scalars(
            select(VolunteerRegistration.campaign_id).where(VolunteerRegistration.user_id == user.id)
        ).all()
    )
    return SupporterRead(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        credit_score=user.credit_score,
        location=user.location,
        support_types=_normalize_support_types(user.support_types),
        joined_campaign_ids=sorted(joined_campaign_ids, key=str),
    )


@router.get("/", response_model=list[SupporterRead])
def list_supporters(
    organization_id: UUID | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
) -> list[SupporterRead]:
    supporters_by_id: dict[UUID, SupporterRead] = {}

    if organization_id is not None:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to query organization supporters",
            )
        if not current_user.is_superuser and current_user.organization_id != organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot query supporters for another organization",
            )

        campaign_ids = list(
            db.scalars(select(Campaign.id).where(Campaign.organization_id == organization_id)).all()
        )
        if not campaign_ids:
            return []

        donations = db.execute(
            select(MonetaryDonation.donor_user_id, MonetaryDonation.campaign_id).where(
                MonetaryDonation.campaign_id.in_(campaign_ids),
                MonetaryDonation.donor_user_id.is_not(None),
            )
        ).all()
        volunteer_regs = db.execute(
            select(VolunteerRegistration.user_id, VolunteerRegistration.campaign_id).where(
                VolunteerRegistration.campaign_id.in_(campaign_ids),
                VolunteerRegistration.user_id.is_not(None),
            )
        ).all()

        campaign_map: dict[UUID, set[UUID]] = {}
        for user_id, campaign_id in donations + volunteer_regs:
            if user_id is None:
                continue
            campaign_map.setdefault(user_id, set()).add(campaign_id)

        if not campaign_map:
            return []

        users = db.scalars(
            select(User)
            .where(User.id.in_(campaign_map.keys()))
            .order_by(User.full_name.asc())
            .limit(limit)
        ).all()

        for user in users:
            supporters_by_id[user.id] = SupporterRead(
                id=user.id,
                full_name=user.full_name,
                email=user.email,
                credit_score=user.credit_score,
                location=user.location,
                support_types=_normalize_support_types(user.support_types),
                joined_campaign_ids=sorted(campaign_map.get(user.id, set()), key=str),
            )
        return list(supporters_by_id.values())

    users = db.scalars(
        select(User)
        .where(User.organization_id.is_(None), User.is_superuser.is_(False))
        .order_by(User.full_name.asc())
        .limit(limit)
    ).all()

    for user in users:
        supporters_by_id[user.id] = _build_supporter_read(db, user)
    return list(supporters_by_id.values())


@router.patch("/{supporter_id}", response_model=SupporterRead)
def update_supporter_profile(
    supporter_id: UUID,
    payload: SupporterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> SupporterRead:
    if not current_user.is_superuser:
        ensure_authenticated_user_matches(
            current_user,
            supporter_id,
            auth_detail="Authentication required to update supporter profile",
            mismatch_detail="Cannot update another supporter profile",
        )

    supporter = db.get(User, supporter_id)
    if supporter is None or (supporter.organization_id is not None and not supporter.is_superuser):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supporter not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "full_name" in update_data:
        full_name = (update_data.get("full_name") or "").strip()
        if not full_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="full_name cannot be empty",
            )
        supporter.full_name = full_name

    if "location" in update_data:
        location = update_data.get("location")
        supporter.location = location.strip() if isinstance(location, str) else None

    if "support_types" in update_data:
        support_types = update_data.get("support_types")
        supporter.support_types = (
            [support_type.value for support_type in support_types] if support_types is not None else []
        )

    db.add(supporter)
    db.commit()
    db.refresh(supporter)
    return _build_supporter_read(db, supporter)
