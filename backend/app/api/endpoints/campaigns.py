from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_active_user,
    get_current_organization_user,
    get_db,
    get_optional_current_user,
)
from app.api.permissions import ensure_matching_organization
from app.models.campaign_image import CampaignImage
from app.models.campaign import Campaign, CampaignStatus, SupportType
from app.models.credit_event import CreditTargetType
from app.models.user import User
from app.models.volunteer_registration import VolunteerRegistration, VolunteerStatus
from app.schemas.campaign import (
    CampaignCloseRequest,
    CampaignCloseResponse,
    CampaignCreate,
    CampaignPublishResponse,
    CampaignRead,
    CampaignReopenResponse,
    CampaignUpdate,
)
from app.schemas.campaign_image import CampaignImageRead, CampaignImageSetCoverResponse
from app.schemas.volunteer_registration import CampaignVolunteerParticipantRead
from app.services.campaign_image_storage import (
    build_public_upload_url,
    delete_stored_upload,
    save_campaign_image_file,
)
from app.services.campaign_service import (
    close_campaign,
    create_manual_campaign,
    delete_campaign,
    get_campaign_or_404,
    publish_campaign,
    reopen_campaign,
    update_manual_campaign,
)
from app.services.credit_service import (
    CAMPAIGN_CLOSED_ORGANIZATION_POINTS,
    CAMPAIGN_PUBLISHED_ORGANIZATION_POINTS,
    apply_credit_event,
)

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


def _to_campaign_image_read(
    image: CampaignImage,
    *,
    request: Request,
) -> CampaignImageRead:
    relative_url = build_public_upload_url(image.relative_path)
    file_url = relative_url
    try:
        file_url = str(request.url_for("uploads", path=image.relative_path))
    except RuntimeError:
        # Fallback when request router cannot resolve mounted static route.
        file_url = relative_url

    return CampaignImageRead(
        id=image.id,
        campaign_id=image.campaign_id,
        uploaded_by_user_id=image.uploaded_by_user_id,
        original_filename=image.original_filename,
        mime_type=image.mime_type,
        size_bytes=image.size_bytes,
        relative_path=image.relative_path,
        file_url=file_url,
        created_at=image.created_at,
    )


def _ensure_campaign_media_upload_permission(
    *,
    campaign: Campaign,
    current_user: User,
) -> None:
    if current_user.is_superuser:
        return

    if current_user.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization account required to upload campaign images",
        )

    if current_user.organization_id != campaign.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot upload media for another organization campaign",
        )


@router.get("/", response_model=list[CampaignRead])
def list_campaigns(
    limit: int = Query(default=20, ge=1, le=100),
    campaign_status: CampaignStatus = Query(default=CampaignStatus.published, alias="status"),
    organization_id: UUID | None = Query(default=None),
    province: str | None = Query(default=None, min_length=1, max_length=120),
    district: str | None = Query(default=None, min_length=1, max_length=120),
    support_type: SupportType | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[Campaign]:
    stmt = select(Campaign).order_by(Campaign.created_at.desc()).limit(limit)
    stmt = stmt.where(Campaign.status == campaign_status)
    if organization_id is not None:
        stmt = stmt.where(Campaign.organization_id == organization_id)
    if province is not None:
        stmt = stmt.where(Campaign.province.ilike(f"%{province.strip()}%"))
    if district is not None:
        stmt = stmt.where(Campaign.district.ilike(f"%{district.strip()}%"))
    if support_type is not None:
        stmt = stmt.where(Campaign.support_types.contains([support_type.value]))
    return list(db.scalars(stmt).all())


@router.get("/by-organization/{organization_id}", response_model=list[CampaignRead])
def list_campaigns_by_organization(
    organization_id: UUID,
    limit: int = Query(default=50, ge=1, le=200),
    campaign_status: CampaignStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
) -> list[Campaign]:
    stmt = (
        select(Campaign)
        .where(Campaign.organization_id == organization_id)
        .order_by(Campaign.created_at.desc())
        .limit(limit)
    )
    can_manage_org_campaigns = (
        current_user is not None
        and (current_user.is_superuser or current_user.organization_id == organization_id)
    )
    if campaign_status is None:
        if not can_manage_org_campaigns:
            stmt = stmt.where(Campaign.status == CampaignStatus.published)
    else:
        if campaign_status != CampaignStatus.published and not can_manage_org_campaigns:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Authentication required to query non-public organization campaigns",
            )
        stmt = stmt.where(Campaign.status == campaign_status)
    return list(db.scalars(stmt).all())


@router.get("/{campaign_id}", response_model=CampaignRead)
def get_campaign(campaign_id: UUID, db: Session = Depends(get_db)) -> Campaign:
    return get_campaign_or_404(db, campaign_id)


@router.get(
    "/{campaign_id}/volunteers",
    response_model=list[CampaignVolunteerParticipantRead],
)
def list_campaign_volunteers(
    campaign_id: UUID,
    include_pending: bool = Query(default=True),
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
) -> list[VolunteerRegistration]:
    _ = get_campaign_or_404(db, campaign_id)

    allowed_statuses: list[VolunteerStatus] = [VolunteerStatus.approved]
    if include_pending:
        allowed_statuses.append(VolunteerStatus.pending)

    registrations = list(
        db.scalars(
            select(VolunteerRegistration)
            .where(
                VolunteerRegistration.campaign_id == campaign_id,
                VolunteerRegistration.status.in_(allowed_statuses),
            )
            .order_by(VolunteerRegistration.registered_at.desc())
            .limit(limit)
        ).all()
    )
    return registrations


@router.get("/{campaign_id}/images", response_model=list[CampaignImageRead])
def list_campaign_images(
    campaign_id: UUID,
    request: Request,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[CampaignImageRead]:
    _ = get_campaign_or_404(db, campaign_id)

    images = list(
        db.scalars(
            select(CampaignImage)
            .where(CampaignImage.campaign_id == campaign_id)
            .order_by(CampaignImage.created_at.desc())
            .limit(limit)
        ).all()
    )
    return [_to_campaign_image_read(image, request=request) for image in images]


@router.post(
    "/{campaign_id}/images",
    response_model=CampaignImageRead,
    status_code=status.HTTP_201_CREATED,
)
def upload_campaign_image(
    campaign_id: UUID,
    request: Request,
    file: UploadFile = File(...),
    set_as_cover: bool = Form(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CampaignImageRead:
    campaign = get_campaign_or_404(db, campaign_id)
    _ensure_campaign_media_upload_permission(
        campaign=campaign,
        current_user=current_user,
    )

    relative_path, size_bytes, mime_type, original_filename = save_campaign_image_file(
        campaign_id=campaign.id,
        upload_file=file,
    )

    image = CampaignImage(
        campaign_id=campaign.id,
        uploaded_by_user_id=current_user.id,
        relative_path=relative_path,
        original_filename=original_filename,
        mime_type=mime_type,
        size_bytes=size_bytes,
    )
    db.add(image)

    public_path = build_public_upload_url(relative_path)
    media_urls = list(campaign.media_urls or [])
    if public_path not in media_urls:
        media_urls.append(public_path)
        campaign.media_urls = media_urls

    if set_as_cover or not campaign.cover_image_url:
        campaign.cover_image_url = public_path

    db.commit()
    db.refresh(image)
    return _to_campaign_image_read(image, request=request)


@router.post(
    "/{campaign_id}/images/{image_id}/set-cover",
    response_model=CampaignImageSetCoverResponse,
)
def set_campaign_cover_image(
    campaign_id: UUID,
    image_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CampaignImageSetCoverResponse:
    campaign = get_campaign_or_404(db, campaign_id)
    if not current_user.is_superuser and current_user.organization_id != campaign.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only campaign organization can set cover image",
        )

    image = db.get(CampaignImage, image_id)
    if image is None or image.campaign_id != campaign.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign image not found",
        )

    public_path = build_public_upload_url(image.relative_path)
    media_urls = list(campaign.media_urls or [])
    if public_path not in media_urls:
        media_urls.append(public_path)
        campaign.media_urls = media_urls
    campaign.cover_image_url = public_path

    db.commit()
    return CampaignImageSetCoverResponse(
        message="Campaign cover image updated",
        campaign_id=campaign.id,
        cover_image_url=public_path,
    )


@router.delete("/{campaign_id}/images/{image_id}")
def delete_campaign_image(
    campaign_id: UUID,
    image_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict[str, str]:
    campaign = get_campaign_or_404(db, campaign_id)
    image = db.get(CampaignImage, image_id)
    if image is None or image.campaign_id != campaign.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign image not found",
        )

    can_delete = current_user.is_superuser or current_user.organization_id == campaign.organization_id
    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only campaign organization can delete campaign images",
        )

    public_path = build_public_upload_url(image.relative_path)
    media_urls = [url for url in list(campaign.media_urls or []) if url != public_path]
    campaign.media_urls = media_urls
    if campaign.cover_image_url == public_path:
        campaign.cover_image_url = media_urls[0] if media_urls else None

    db.delete(image)
    db.commit()

    delete_stored_upload(image.relative_path)
    return {"message": "Campaign image deleted successfully"}


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
    was_published = campaign.status == CampaignStatus.published
    ensure_matching_organization(
        current_user,
        campaign.organization_id,
        detail="Cannot publish campaign from another organization",
    )
    campaign = publish_campaign(db, campaign_id)
    if not was_published:
        apply_credit_event(
            db,
            target_type=CreditTargetType.organization,
            target_organization_id=campaign.organization_id,
            actor_user_id=current_user.id,
            event_type="campaign_published",
            points=CAMPAIGN_PUBLISHED_ORGANIZATION_POINTS,
            note=f"Campaign published: {campaign.title}",
            context={"campaign_id": str(campaign.id)},
        )
        db.commit()
    return CampaignPublishResponse(
        message="Campaign published successfully",
        campaign=CampaignRead.model_validate(campaign),
    )


@router.post("/{campaign_id}/close", response_model=CampaignCloseResponse)
def close_campaign_endpoint(
    campaign_id: UUID,
    payload: CampaignCloseRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> CampaignCloseResponse:
    campaign = get_campaign_or_404(db, campaign_id)
    was_closed = campaign.status == CampaignStatus.closed
    ensure_matching_organization(
        current_user,
        campaign.organization_id,
        detail="Cannot close campaign from another organization",
    )
    campaign = close_campaign(db, campaign_id, payload)
    if not was_closed:
        apply_credit_event(
            db,
            target_type=CreditTargetType.organization,
            target_organization_id=campaign.organization_id,
            actor_user_id=current_user.id,
            event_type="campaign_closed",
            points=CAMPAIGN_CLOSED_ORGANIZATION_POINTS,
            note=f"Campaign closed: {campaign.title}",
            context={"campaign_id": str(campaign.id)},
        )
        db.commit()
    return CampaignCloseResponse(
        message="Campaign closed successfully",
        campaign=CampaignRead.model_validate(campaign),
    )


@router.post("/{campaign_id}/reopen", response_model=CampaignReopenResponse)
def reopen_campaign_endpoint(
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> CampaignReopenResponse:
    campaign = get_campaign_or_404(db, campaign_id)
    ensure_matching_organization(
        current_user,
        campaign.organization_id,
        detail="Cannot reopen campaign from another organization",
    )
    campaign = reopen_campaign(db, campaign_id)
    return CampaignReopenResponse(
        message="Campaign reopened as draft",
        campaign=CampaignRead.model_validate(campaign),
    )


@router.delete("/{campaign_id}")
def delete_campaign_endpoint(
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> dict[str, str]:
    campaign = get_campaign_or_404(db, campaign_id)
    ensure_matching_organization(
        current_user,
        campaign.organization_id,
        detail="Cannot delete campaign from another organization",
    )
    delete_campaign(db, campaign_id)
    return {"message": "Campaign deleted successfully"}
