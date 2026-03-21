from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.api.permissions import ensure_authenticated_user_matches
from app.core.config import settings
from app.models.user import User
from app.schemas.recommendation import (
    CampaignDraftRecommendationRequest,
    CampaignDraftRecommendationResponse,
    SupporterCampaignRecommendationResponse,
)
from app.services.recommendation_service import (
    recommend_campaign_draft,
    recommend_campaigns_for_supporter,
)

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def _resolve_supporter_for_recommendation(
    *,
    db: Session,
    supporter_id: UUID,
    current_user: User,
) -> User:
    if not current_user.is_superuser:
        ensure_authenticated_user_matches(
            current_user,
            supporter_id,
            auth_detail="Authentication required to access supporter recommendations",
            mismatch_detail="Cannot access recommendations for another supporter",
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
            detail="Supporter account required",
        )
    if not supporter.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Supporter account is inactive",
        )
    return supporter


@router.post(
    "/campaign-draft",
    response_model=CampaignDraftRecommendationResponse,
)
def generate_campaign_draft_recommendation(
    payload: CampaignDraftRecommendationRequest,
    current_user: User = Depends(get_current_active_user),
) -> CampaignDraftRecommendationResponse:
    if current_user.organization_id is None and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization account required",
        )
    return recommend_campaign_draft(payload)


@router.get("/me/campaigns", response_model=SupporterCampaignRecommendationResponse)
def get_my_campaign_recommendations(
    limit: int = Query(default=8, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> SupporterCampaignRecommendationResponse:
    if current_user.organization_id is not None and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Supporter account required",
        )
    normalized_limit = min(max(1, limit), settings.SUPPORTER_RECOMMENDATION_MAX_LIMIT)
    return recommend_campaigns_for_supporter(
        db,
        supporter=current_user,
        limit=normalized_limit,
    )


@router.get(
    "/supporters/{supporter_id}/campaigns",
    response_model=SupporterCampaignRecommendationResponse,
)
def get_supporter_campaign_recommendations(
    supporter_id: UUID,
    limit: int = Query(default=8, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> SupporterCampaignRecommendationResponse:
    supporter = _resolve_supporter_for_recommendation(
        db=db,
        supporter_id=supporter_id,
        current_user=current_user,
    )
    normalized_limit = min(max(1, limit), settings.SUPPORTER_RECOMMENDATION_MAX_LIMIT)
    return recommend_campaigns_for_supporter(
        db,
        supporter=supporter,
        limit=normalized_limit,
    )
