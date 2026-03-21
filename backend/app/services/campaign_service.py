from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.campaign import Campaign, CampaignStatus, SupportType
from app.models.organization import Organization
from app.schemas.campaign import CampaignCreate, CampaignUpdate


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "campaign"


def _organization_exists(db: Session, organization_id: uuid.UUID) -> bool:
    stmt = select(Organization.id).where(Organization.id == organization_id)
    return db.scalar(stmt) is not None


def _slug_exists(db: Session, slug: str, campaign_id: uuid.UUID | None = None) -> bool:
    stmt = select(Campaign.id).where(Campaign.slug == slug)
    if campaign_id is not None:
        stmt = stmt.where(Campaign.id != campaign_id)
    return db.scalar(stmt) is not None


def _resolve_slug(
    db: Session,
    title: str,
    preferred_slug: str | None,
    campaign_id: uuid.UUID | None = None,
) -> str:
    base = _slugify(preferred_slug or title)
    slug = base
    suffix = 2
    while _slug_exists(db, slug, campaign_id):
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug


def _normalize_support_types(values: list[SupportType | str]) -> list[str]:
    normalized: list[str] = []
    for value in values:
        if isinstance(value, SupportType):
            normalized.append(value.value)
        else:
            normalized.append(value)
    return normalized


def get_campaign_or_404(db: Session, campaign_id: uuid.UUID) -> Campaign:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )
    return campaign


def create_manual_campaign(db: Session, payload: CampaignCreate) -> Campaign:
    if not _organization_exists(db, payload.organization_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    campaign = Campaign(
        organization_id=payload.organization_id,
        title=payload.title,
        slug=_resolve_slug(db, payload.title, payload.slug),
        short_description=payload.short_description,
        description=payload.description,
        tags=payload.tags,
        cover_image_url=payload.cover_image_url or (payload.media_urls[0] if payload.media_urls else None),
        support_types=_normalize_support_types(payload.support_types),
        goal_amount=payload.goal_amount,
        raised_amount=Decimal("0.00"),
        province=payload.province,
        district=payload.district,
        address_line=payload.address_line,
        latitude=payload.latitude,
        longitude=payload.longitude,
        media_urls=payload.media_urls,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        status=CampaignStatus.draft,
        is_active=False,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


def update_manual_campaign(
    db: Session,
    campaign_id: uuid.UUID,
    payload: CampaignUpdate,
) -> Campaign:
    campaign = get_campaign_or_404(db, campaign_id)

    if campaign.status == CampaignStatus.closed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Closed campaign cannot be updated",
        )

    update_data = payload.model_dump(exclude_unset=True)
    if update_data.get("support_types") is None:
        update_data.pop("support_types", None)
    if update_data.get("tags") is None:
        update_data.pop("tags", None)
    if update_data.get("media_urls") is None:
        update_data.pop("media_urls", None)

    if "organization_id" in update_data:
        org_id = update_data["organization_id"]
        if org_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="organization_id cannot be null",
            )
        if not _organization_exists(db, org_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found",
            )

    next_starts_at = update_data.get("starts_at", campaign.starts_at)
    next_ends_at = update_data.get("ends_at", campaign.ends_at)
    if next_ends_at and next_starts_at and next_ends_at <= next_starts_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ends_at must be greater than starts_at",
        )

    if "slug" in update_data or "title" in update_data:
        update_data["slug"] = _resolve_slug(
            db=db,
            title=update_data.get("title", campaign.title),
            preferred_slug=update_data.get("slug", campaign.slug),
            campaign_id=campaign.id,
        )

    if "support_types" in update_data:
        update_data["support_types"] = _normalize_support_types(update_data["support_types"])

    for field, value in update_data.items():
        setattr(campaign, field, value)

    db.commit()
    db.refresh(campaign)
    return campaign


def publish_campaign(db: Session, campaign_id: uuid.UUID) -> Campaign:
    campaign = get_campaign_or_404(db, campaign_id)

    if campaign.status == CampaignStatus.closed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Closed campaign cannot be published",
        )

    if campaign.status == CampaignStatus.published:
        return campaign

    if campaign.goal_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="goal_amount must be greater than 0",
        )
    if not campaign.support_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one support type is required",
        )

    campaign.status = CampaignStatus.published
    campaign.published_at = datetime.now(timezone.utc)
    campaign.is_active = True

    db.commit()
    db.refresh(campaign)
    return campaign


def delete_campaign(db: Session, campaign_id: uuid.UUID) -> None:
    campaign = get_campaign_or_404(db, campaign_id)
    db.delete(campaign)
    db.commit()
