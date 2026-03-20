from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.campaign import Campaign
from app.models.monetary_donation import MonetaryDonation
from app.models.user import User
from app.models.volunteer_registration import VolunteerRegistration
from app.schemas.supporter import SupporterRead
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


@router.get("/", response_model=list[SupporterRead])
def list_supporters(
    organization_id: UUID | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[SupporterRead]:
    supporters_by_id: dict[UUID, SupporterRead] = {}

    if organization_id is not None:
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
        supporters_by_id[user.id] = SupporterRead(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            location=user.location,
            support_types=_normalize_support_types(user.support_types),
            joined_campaign_ids=sorted(joined_campaign_ids, key=str),
        )
    return list(supporters_by_id.values())
