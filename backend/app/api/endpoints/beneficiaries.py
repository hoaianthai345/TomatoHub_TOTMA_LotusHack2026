from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_organization_user, get_db
from app.models.beneficiary import Beneficiary, BeneficiaryStatus
from app.models.user import User
from app.schemas.beneficiary import BeneficiaryCreate, BeneficiaryRead, BeneficiaryUpdate

router = APIRouter(prefix="/beneficiaries", tags=["beneficiaries"])


def _resolve_status_and_verification(
    status_value: BeneficiaryStatus,
    is_verified: bool,
) -> tuple[BeneficiaryStatus, bool]:
    verified_statuses = {
        BeneficiaryStatus.verified,
        BeneficiaryStatus.assigned,
        BeneficiaryStatus.received,
    }
    if status_value in verified_statuses:
        return status_value, True
    if is_verified:
        return BeneficiaryStatus.verified, True
    return status_value, False


@router.get("/", response_model=list[BeneficiaryRead])
def list_beneficiaries(
    organization_id: UUID | None = Query(default=None),
    campaign_id: UUID | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[Beneficiary]:
    stmt = select(Beneficiary).order_by(Beneficiary.created_at.desc()).limit(limit)
    if organization_id is not None:
        stmt = stmt.where(Beneficiary.organization_id == organization_id)
    if campaign_id is not None:
        stmt = stmt.where(Beneficiary.campaign_id == campaign_id)
    return list(db.scalars(stmt).all())


@router.post("/", response_model=BeneficiaryRead, status_code=status.HTTP_201_CREATED)
def create_beneficiary(
    payload: BeneficiaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> Beneficiary:
    if current_user.organization_id != payload.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create beneficiary for another organization",
        )

    resolved_status, resolved_verified = _resolve_status_and_verification(
        payload.status,
        payload.is_verified,
    )

    beneficiary = Beneficiary(
        organization_id=payload.organization_id,
        campaign_id=payload.campaign_id,
        full_name=payload.full_name,
        location=payload.location,
        category=payload.category,
        story=payload.story,
        target_support_amount=payload.target_support_amount,
        status=resolved_status,
        is_verified=resolved_verified,
    )
    db.add(beneficiary)
    db.commit()
    db.refresh(beneficiary)
    return beneficiary


@router.patch("/{beneficiary_id}", response_model=BeneficiaryRead)
def update_beneficiary(
    beneficiary_id: UUID,
    payload: BeneficiaryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> Beneficiary:
    beneficiary = db.get(Beneficiary, beneficiary_id)
    if beneficiary is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Beneficiary not found")

    if beneficiary.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update beneficiary from another organization",
        )

    update_data = payload.model_dump(exclude_unset=True)

    if update_data.get("status") is None:
        update_data.pop("status", None)
    if update_data.get("is_verified") is None:
        update_data.pop("is_verified", None)

    if "status" in update_data or "is_verified" in update_data:
        next_status = update_data.get("status", beneficiary.status)
        next_is_verified = update_data.get("is_verified", beneficiary.is_verified)
        resolved_status, resolved_verified = _resolve_status_and_verification(
            next_status,
            next_is_verified,
        )
        update_data["status"] = resolved_status
        update_data["is_verified"] = resolved_verified

    for field, value in update_data.items():
        setattr(beneficiary, field, value)

    db.commit()
    db.refresh(beneficiary)
    return beneficiary
