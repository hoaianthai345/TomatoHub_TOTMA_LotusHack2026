from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_current_superuser, get_db
from app.api.permissions import ensure_authenticated_user_matches
from app.models.credit_event import CreditEvent, CreditTargetType
from app.models.organization import Organization
from app.models.user import User
from app.schemas.credit import CreditAdjustRequest, CreditEventRead, CreditProfileRead, MyCreditRead
from app.services.credit_service import (
    apply_credit_event,
    credit_level_from_score,
    list_organization_credit_events,
    list_supporter_credit_events,
)

router = APIRouter(prefix="/credits", tags=["credits"])


def _serialize_events(events: list[CreditEvent]) -> list[CreditEventRead]:
    return [CreditEventRead.model_validate(event) for event in events]


def _build_supporter_profile(
    db: Session,
    supporter: User,
    *,
    limit: int,
) -> CreditProfileRead:
    return CreditProfileRead(
        target_type=CreditTargetType.supporter,
        target_user_id=supporter.id,
        credit_score=supporter.credit_score,
        credit_level=credit_level_from_score(supporter.credit_score),
        recent_events=_serialize_events(
            list_supporter_credit_events(db, supporter.id, limit=limit)
        ),
    )


def _build_organization_profile(
    db: Session,
    organization: Organization,
    *,
    limit: int,
) -> CreditProfileRead:
    return CreditProfileRead(
        target_type=CreditTargetType.organization,
        target_organization_id=organization.id,
        credit_score=organization.credit_score,
        credit_level=credit_level_from_score(organization.credit_score),
        recent_events=_serialize_events(
            list_organization_credit_events(db, organization.id, limit=limit)
        ),
    )


@router.get("/me", response_model=MyCreditRead)
def get_my_credits(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> MyCreditRead:
    supporter_profile: CreditProfileRead | None = None
    organization_profile: CreditProfileRead | None = None

    if current_user.organization_id is None:
        supporter_profile = _build_supporter_profile(db, current_user, limit=limit)
    else:
        organization = db.get(Organization, current_user.organization_id)
        if organization is not None:
            organization_profile = _build_organization_profile(db, organization, limit=limit)

    return MyCreditRead(
        supporter=supporter_profile,
        organization=organization_profile,
    )


@router.get("/supporter/{supporter_id}", response_model=CreditProfileRead)
def get_supporter_credit_profile(
    supporter_id: UUID,
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CreditProfileRead:
    if not current_user.is_superuser:
        ensure_authenticated_user_matches(
            current_user,
            supporter_id,
            auth_detail="Authentication required to view supporter credits",
            mismatch_detail="Cannot view another supporter credit profile",
        )

    supporter = db.get(User, supporter_id)
    if supporter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supporter not found",
        )
    if supporter.organization_id is not None and not supporter.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provided user is an organization account",
        )

    return _build_supporter_profile(db, supporter, limit=limit)


@router.get("/organization/{organization_id}", response_model=CreditProfileRead)
def get_organization_credit_profile(
    organization_id: UUID,
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> CreditProfileRead:
    organization = db.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    return _build_organization_profile(db, organization, limit=limit)


@router.post("/adjust", response_model=CreditProfileRead)
def adjust_credit(
    payload: CreditAdjustRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> CreditProfileRead:
    apply_credit_event(
        db,
        target_type=payload.target_type,
        target_user_id=payload.target_user_id,
        target_organization_id=payload.target_organization_id,
        actor_user_id=current_user.id,
        event_type=payload.event_type,
        points=payload.points,
        note=payload.note,
        context=payload.context,
    )
    db.commit()

    if payload.target_type == CreditTargetType.supporter:
        supporter = db.get(User, payload.target_user_id)
        if supporter is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supporter not found",
            )
        return _build_supporter_profile(db, supporter, limit=20)

    organization = db.get(Organization, payload.target_organization_id)
    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    return _build_organization_profile(db, organization, limit=20)
