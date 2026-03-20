from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_organization_user, get_db
from app.api.permissions import ensure_matching_organization
from app.models.campaign import Campaign, CampaignStatus
from app.models.user import User
from app.schemas.campaign import (
    CampaignCreate,
    CampaignPublishResponse,
    CampaignRead,
    CampaignUpdate,
)
from app.services.campaign_service import (
    create_manual_campaign,
    get_campaign_or_404,
    publish_campaign,
    update_manual_campaign,
)

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("/", response_model=list[CampaignRead])
def list_campaigns(
    limit: int = Query(default=20, ge=1, le=100),
    campaign_status: CampaignStatus = Query(default=CampaignStatus.published, alias="status"),
    organization_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[Campaign]:
    stmt = select(Campaign).order_by(Campaign.created_at.desc()).limit(limit)
    stmt = stmt.where(Campaign.status == campaign_status)
    if organization_id is not None:
        stmt = stmt.where(Campaign.organization_id == organization_id)
    return list(db.scalars(stmt).all())


@router.get("/by-organization/{organization_id}", response_model=list[CampaignRead])
def list_campaigns_by_organization(
    organization_id: UUID,
    limit: int = Query(default=50, ge=1, le=200),
    campaign_status: CampaignStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
) -> list[Campaign]:
    stmt = (
        select(Campaign)
        .where(Campaign.organization_id == organization_id)
        .order_by(Campaign.created_at.desc())
        .limit(limit)
    )
    if campaign_status is not None:
        stmt = stmt.where(Campaign.status == campaign_status)
    return list(db.scalars(stmt).all())


@router.get("/{campaign_id}", response_model=CampaignRead)
def get_campaign(campaign_id: UUID, db: Session = Depends(get_db)) -> Campaign:
    return get_campaign_or_404(db, campaign_id)


@router.get("/slug/{slug}", response_model=CampaignRead)
def get_campaign_by_slug(slug: str, db: Session = Depends(get_db)) -> Campaign:
    campaign = db.scalar(select(Campaign).where(Campaign.slug == slug))
    if campaign is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )
    return campaign


@router.post("/", response_model=CampaignRead, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> Campaign:
    ensure_matching_organization(
        current_user,
        payload.organization_id,
        detail="Cannot create campaign for another organization",
    )
    return create_manual_campaign(db, payload)


@router.patch("/{campaign_id}", response_model=CampaignRead)
def update_campaign(
    campaign_id: UUID,
    payload: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> Campaign:
    campaign = get_campaign_or_404(db, campaign_id)
    ensure_matching_organization(
        current_user,
        campaign.organization_id,
        detail="Cannot update campaign from another organization",
    )
    if payload.organization_id is not None:
        ensure_matching_organization(
            current_user,
            payload.organization_id,
            detail="Cannot reassign campaign to another organization",
        )
    return update_manual_campaign(db, campaign_id, payload)


@router.post("/{campaign_id}/publish", response_model=CampaignPublishResponse)
def publish_campaign_endpoint(
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> CampaignPublishResponse:
    campaign = get_campaign_or_404(db, campaign_id)
    ensure_matching_organization(
        current_user,
        campaign.organization_id,
        detail="Cannot publish campaign from another organization",
    )
    campaign = publish_campaign(db, campaign_id)
    return CampaignPublishResponse(
        message="Campaign published successfully",
        campaign=CampaignRead.model_validate(campaign),
    )
