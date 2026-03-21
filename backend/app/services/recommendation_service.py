from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.campaign import Campaign, CampaignStatus, SupportType
from app.models.monetary_donation import MonetaryDonation
from app.models.user import User
from app.models.volunteer_registration import VolunteerRegistration
from app.schemas.recommendation import (
    CampaignDraftRecommendationRequest,
    CampaignDraftRecommendationResponse,
    SupporterCampaignRecommendationItem,
    SupporterCampaignRecommendationResponse,
)
from app.services.groq_client import GroqClient
from app.services.openai_client import OpenAIClient

_MAX_SHORT_DESCRIPTION_CHARS = 280
_MAX_DESCRIPTION_CHARS = 1800
_MAX_LIST_ITEM_CHARS = 160
_MAX_TAG_CHARS = 60


def _get_recommendation_model_pool() -> tuple[str, str]:
    heavy_model = settings.GROQ_MODEL_HEAVY.strip() or settings.GROQ_MODEL.strip()
    light_model = settings.GROQ_MODEL_LIGHT.strip() or heavy_model
    return light_model, heavy_model


def _campaign_draft_complexity(payload: CampaignDraftRecommendationRequest) -> int:
    constraint_chars = sum(len(constraint) for constraint in payload.constraints)
    return (
        len(payload.title)
        + len(payload.campaign_goal)
        + len(payload.beneficiary_context or "")
        + len(payload.location_hint or "")
        + len(payload.tone or "")
        + constraint_chars
        + (len(payload.constraints) * 80)
        + (len(payload.support_types_hint) * 120)
    )


def _select_model_for_campaign_draft(
    payload: CampaignDraftRecommendationRequest,
) -> tuple[str, str]:
    light_model, heavy_model = _get_recommendation_model_pool()
    if (
        not settings.RECOMMENDATION_MODEL_ROUTING_ENABLED
        or light_model == heavy_model
    ):
        return heavy_model, "single"

    complexity = _campaign_draft_complexity(payload)
    if complexity <= settings.RECOMMENDATION_DRAFT_COMPLEXITY_THRESHOLD:
        return light_model, "light"
    return heavy_model, "heavy"


def _select_model_for_supporter_rewrite(
    *,
    candidate_items: list[SupporterCampaignRecommendationItem],
) -> tuple[str, str]:
    light_model, heavy_model = _get_recommendation_model_pool()
    if (
        not settings.RECOMMENDATION_MODEL_ROUTING_ENABLED
        or light_model == heavy_model
    ):
        return heavy_model, "single"

    if len(candidate_items) <= settings.RECOMMENDATION_SUPPORTER_LIGHT_MAX_ITEMS:
        return light_model, "light"
    return heavy_model, "heavy"


def _recommended_draft_provider_order() -> list[str]:
    preferred = settings.RECOMMENDATION_DRAFT_PREFERRED_PROVIDER.strip().lower()
    if preferred not in {"openai", "groq"}:
        preferred = "openai"
    secondary = "groq" if preferred == "openai" else "openai"
    return [preferred, secondary]


def _normalize_text(value: str | None) -> str:
    if value is None:
        return ""
    return " ".join(value.strip().lower().split())


def _sanitize_generated_text(
    value: str | None,
    *,
    allow_newlines: bool = False,
    max_chars: int | None = None,
) -> str:
    if value is None:
        return ""

    normalized = unicodedata.normalize("NFKC", str(value))
    sanitized_chars: list[str] = []
    for char in normalized:
        if char == "\n" and allow_newlines:
            sanitized_chars.append(char)
            continue
        if char in {"\r", "\t"}:
            sanitized_chars.append(" ")
            continue

        category = unicodedata.category(char)
        if category.startswith("C") or category.startswith("S") or category.startswith("M"):
            # Block control/format/surrogate/private-use, symbol/emoji, and combining marks.
            continue
        sanitized_chars.append(char)

    cleaned = "".join(sanitized_chars)
    cleaned = re.sub(r"[`*_~#|<>]+", " ", cleaned, flags=re.UNICODE)
    cleaned = re.sub(r"[^\w\s\.,;:!\?\-\/\(\)]", " ", cleaned, flags=re.UNICODE)
    if allow_newlines:
        lines = [" ".join(line.split()) for line in cleaned.split("\n")]
        cleaned = "\n".join([line for line in lines if line])
    else:
        cleaned = " ".join(cleaned.split())

    if max_chars is not None and max_chars > 0:
        cleaned = cleaned[:max_chars]
    return cleaned.strip()


def _sanitize_generated_list(
    values: list[str],
    *,
    max_items: int,
    max_item_chars: int = _MAX_LIST_ITEM_CHARS,
) -> list[str]:
    sanitized_values = [
        _sanitize_generated_text(value, max_chars=max_item_chars)
        for value in values
    ]
    return _dedupe_keep_order(sanitized_values, max_items=max_items)


def _sanitize_generated_tags(values: list[str], *, max_items: int) -> list[str]:
    sanitized: list[str] = []
    for value in values:
        clean = _sanitize_generated_text(value, max_chars=_MAX_TAG_CHARS).lower()
        if not clean:
            continue
        normalized = re.sub(r"[^\w\s-]+", "", clean, flags=re.UNICODE)
        normalized = re.sub(r"[\s_]+", "-", normalized, flags=re.UNICODE)
        normalized = normalized.strip("-")
        if normalized:
            sanitized.append(normalized)
    return _dedupe_keep_order(sanitized, max_items=max_items)


def _dedupe_keep_order(values: list[str], *, max_items: int) -> list[str]:
    output: list[str] = []
    seen: set[str] = set()
    for raw in values:
        normalized = " ".join(raw.strip().split())
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        output.append(normalized)
        if len(output) >= max_items:
            break
    return output


def _to_support_types(values: list[str] | None) -> list[SupportType]:
    if not values:
        return []
    output: list[SupportType] = []
    seen: set[SupportType] = set()
    for raw in values:
        try:
            support_type = SupportType(str(raw).strip().lower())
        except ValueError:
            continue
        if support_type in seen:
            continue
        seen.add(support_type)
        output.append(support_type)
    return output


def _campaign_location_label(campaign: Campaign) -> str | None:
    parts = [campaign.address_line, campaign.district, campaign.province]
    normalized = [part.strip() for part in parts if isinstance(part, str) and part.strip()]
    return ", ".join(normalized) if normalized else None


def _infer_support_types(
    *,
    title: str,
    campaign_goal: str,
    beneficiary_context: str | None,
    support_types_hint: list[SupportType],
) -> list[SupportType]:
    inferred: list[SupportType] = []
    seen: set[SupportType] = set()

    for support_type in support_types_hint:
        if support_type not in seen:
            seen.add(support_type)
            inferred.append(support_type)

    text_blob = " ".join(
        [
            _normalize_text(title),
            _normalize_text(campaign_goal),
            _normalize_text(beneficiary_context),
        ]
    )
    keywords = {
        SupportType.money: ("fund", "fundraising", "donate", "cash", "tiền", "kinh phí", "chi phí"),
        SupportType.goods: ("supplies", "goods", "kit", "food", "in-kind", "vật phẩm", "thực phẩm", "hàng hóa"),
        SupportType.volunteer: ("volunteer", "on-site", "check-in", "coordination", "tình nguyện", "hỗ trợ hiện trường"),
    }
    for support_type, tokens in keywords.items():
        if support_type in seen:
            continue
        if any(token in text_blob for token in tokens):
            seen.add(support_type)
            inferred.append(support_type)

    if not inferred:
        inferred = [SupportType.money, SupportType.volunteer]
    return inferred


def _heuristic_campaign_draft_recommendation(
    payload: CampaignDraftRecommendationRequest,
) -> CampaignDraftRecommendationResponse:
    support_types = _infer_support_types(
        title=payload.title,
        campaign_goal=payload.campaign_goal,
        beneficiary_context=payload.beneficiary_context,
        support_types_hint=payload.support_types_hint,
    )
    support_type_labels = ", ".join(support_type.value for support_type in support_types)

    short_description = (
        f"{payload.title.strip()}: mobilize {support_type_labels} support "
        "to address urgent community needs with a transparent execution plan."
    )

    context_line = payload.beneficiary_context or "Target beneficiaries need immediate and transparent support."
    location_line = payload.location_hint or "Target area will be confirmed before campaign publish."
    constraint_line = (
        "; ".join(payload.constraints)
        if payload.constraints
        else "No special constraints."
    )

    description = (
        f"Campaign objective:\\n{payload.campaign_goal.strip()}\\n\\n"
        f"Beneficiary context:\\n{context_line.strip()}\\n\\n"
        f"Delivery location:\\n{location_line.strip()}\\n\\n"
        "Suggested execution plan:\\n"
        "- Define weekly milestones and publish measurable progress updates.\\n"
        "- Assign clear responsibilities for organization staff, coordinators, and supporters.\\n"
        "- Standardize handover checklists to reduce losses and missing records.\\n\\n"
        f"Constraints to respect:\\n{constraint_line.strip()}"
    )

    base_tags = [
        "community-support",
        "transparent-impact",
        payload.title.strip().lower().replace(" ", "-"),
    ]
    if payload.location_hint:
        base_tags.append(payload.location_hint.strip().lower().replace(" ", "-"))
    if payload.beneficiary_context:
        context_words = payload.beneficiary_context.split()
        if context_words:
            base_tags.append(context_words[0].strip(".,").lower())

    volunteer_tasks = [
        "Welcome supporters at field checkpoints and verify check-in/check-out.",
        "Record donations and goods handover with a transparent per-shift template.",
        "Upload execution evidence (photos, handover records, and progress logs).",
    ]
    donation_suggestions = [
        "Define clear giving tiers (for example: basic, standard, and impactful levels).",
        "Encourage recurring donations to maintain campaign operations.",
        "Promote in-kind donations that match verified local needs.",
    ]
    risk_notes = [
        "Data sync gaps may appear between field teams and dashboard records.",
        "Volunteer allocation can become imbalanced across time slots.",
        "Disbursement reporting may be delayed without standardized handover documents.",
    ]
    transparency_notes = [
        "Publish weekly or monthly updates with quantitative metrics.",
        "Track every donation and handover in timestamped logs.",
        "Attach field evidence for each disbursement and completion milestone.",
    ]

    return CampaignDraftRecommendationResponse(
        short_description=_sanitize_generated_text(
            short_description,
            max_chars=_MAX_SHORT_DESCRIPTION_CHARS,
        ),
        description=_sanitize_generated_text(
            description,
            allow_newlines=True,
            max_chars=_MAX_DESCRIPTION_CHARS,
        ),
        suggested_tags=_sanitize_generated_tags(base_tags, max_items=8),
        suggested_support_types=support_types,
        volunteer_tasks=_sanitize_generated_list(volunteer_tasks, max_items=6),
        donation_suggestions=_sanitize_generated_list(donation_suggestions, max_items=6),
        risk_notes=_sanitize_generated_list(risk_notes, max_items=6),
        transparency_notes=_sanitize_generated_list(transparency_notes, max_items=6),
        generated_by="heuristic",
        model=None,
    )


def _merge_campaign_draft_llm_output(
    *,
    heuristic: CampaignDraftRecommendationResponse,
    llm_data: dict[str, Any],
    model: str,
    generated_by: str,
) -> CampaignDraftRecommendationResponse:
    suggested_support_types = _to_support_types(
        llm_data.get("suggested_support_types")
        if isinstance(llm_data.get("suggested_support_types"), list)
        else None
    )
    if not suggested_support_types:
        suggested_support_types = heuristic.suggested_support_types

    short_description = _sanitize_generated_text(
        str(llm_data.get("short_description") or ""),
        max_chars=_MAX_SHORT_DESCRIPTION_CHARS,
    )
    description = _sanitize_generated_text(
        str(llm_data.get("description") or ""),
        allow_newlines=True,
        max_chars=_MAX_DESCRIPTION_CHARS,
    )
    suggested_tags = (
        [str(item) for item in llm_data.get("suggested_tags", [])]
        if isinstance(llm_data.get("suggested_tags"), list)
        else []
    )
    volunteer_tasks = (
        [str(item) for item in llm_data.get("volunteer_tasks", [])]
        if isinstance(llm_data.get("volunteer_tasks"), list)
        else []
    )
    donation_suggestions = (
        [str(item) for item in llm_data.get("donation_suggestions", [])]
        if isinstance(llm_data.get("donation_suggestions"), list)
        else []
    )
    risk_notes = (
        [str(item) for item in llm_data.get("risk_notes", [])]
        if isinstance(llm_data.get("risk_notes"), list)
        else []
    )
    transparency_notes = (
        [str(item) for item in llm_data.get("transparency_notes", [])]
        if isinstance(llm_data.get("transparency_notes"), list)
        else []
    )

    return CampaignDraftRecommendationResponse(
        short_description=short_description or heuristic.short_description,
        description=description or heuristic.description,
        suggested_tags=_sanitize_generated_tags(
            suggested_tags or heuristic.suggested_tags,
            max_items=8,
        ),
        suggested_support_types=suggested_support_types,
        volunteer_tasks=_sanitize_generated_list(
            volunteer_tasks or heuristic.volunteer_tasks,
            max_items=6,
        ),
        donation_suggestions=_sanitize_generated_list(
            donation_suggestions or heuristic.donation_suggestions,
            max_items=6,
        ),
        risk_notes=_sanitize_generated_list(
            risk_notes or heuristic.risk_notes,
            max_items=6,
        ),
        transparency_notes=_sanitize_generated_list(
            transparency_notes or heuristic.transparency_notes,
            max_items=6,
        ),
        generated_by=generated_by,
        model=model,
    )


def recommend_campaign_draft(
    payload: CampaignDraftRecommendationRequest,
) -> CampaignDraftRecommendationResponse:
    heuristic = _heuristic_campaign_draft_recommendation(payload)
    system_prompt = (
        "You are an AI copilot for nonprofit campaign planning. "
        "Return ONLY one valid JSON object with keys: "
        "short_description, description, suggested_tags, suggested_support_types, "
        "volunteer_tasks, donation_suggestions, risk_notes, transparency_notes. "
        "For suggested_support_types, use only: money, goods, volunteer. "
        "Write concise outputs. Use plain text without emojis, markdown, or unusual symbols."
    )
    user_prompt = (
        "Campaign draft brief:\\n"
        f"- title: {payload.title}\\n"
        f"- campaign_goal: {payload.campaign_goal}\\n"
        f"- beneficiary_context: {payload.beneficiary_context or 'N/A'}\\n"
        f"- location_hint: {payload.location_hint or 'N/A'}\\n"
        f"- support_types_hint: {[item.value for item in payload.support_types_hint]}\\n"
        f"- constraints: {payload.constraints}\\n"
        f"- tone: {payload.tone}\\n\\n"
        "Requirements: practical content, clear actions, transparency-first, feasible execution. "
        "Keep each list item short and avoid special characters."
    )

    for provider in _recommended_draft_provider_order():
        try:
            if provider == "openai":
                client = OpenAIClient()
                if not client.enabled:
                    continue
                llm_result = client.generate_json_object(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    model=settings.OPENAI_MODEL.strip() or None,
                    temperature=0.3,
                    max_tokens=1400,
                )
                return _merge_campaign_draft_llm_output(
                    heuristic=heuristic,
                    llm_data=llm_result.data,
                    model=llm_result.model,
                    generated_by="openai",
                )

            client = GroqClient()
            if not client.enabled:
                continue
            selected_model, model_tier = _select_model_for_campaign_draft(payload)
            llm_result = client.generate_json_object(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model=selected_model,
                temperature=0.4,
                max_tokens=1500,
            )
            return _merge_campaign_draft_llm_output(
                heuristic=heuristic,
                llm_data=llm_result.data,
                model=llm_result.model,
                generated_by=(
                    f"groq-{model_tier}" if model_tier in {"light", "heavy"} else "groq"
                ),
            )
        except Exception:
            continue

    return heuristic


def _supporter_campaign_score(
    *,
    campaign: Campaign,
    user_support_types: set[str],
    user_location: str,
    donated_campaign_ids: set[UUID],
    registered_campaign_ids: set[UUID],
    now: datetime,
) -> tuple[float, list[str], list[str]]:
    score = 0.0
    reasons: list[str] = []
    actions: list[str] = []

    campaign_support_types = _to_support_types(campaign.support_types)
    if SupportType.money in campaign_support_types and "donor_money" in user_support_types:
        score += 3.0
        reasons.append("This campaign needs financial support aligned with your preferences.")
        actions.append("Donate an amount that matches your budget to accelerate fundraising progress.")
    if SupportType.goods in campaign_support_types and (
        "donor_goods" in user_support_types or "shipper" in user_support_types
    ):
        score += 3.0
        reasons.append("This campaign needs goods and distribution support that fits your skills.")
        actions.append("Prepare required items or join delivery support at campaign checkpoints.")
    if SupportType.volunteer in campaign_support_types and (
        "volunteer" in user_support_types or "coordinator" in user_support_types
    ):
        score += 3.0
        reasons.append("This campaign needs volunteers and matches your selected role.")
        actions.append("Register as a volunteer and track approval status on your dashboard.")

    campaign_location_blob = _normalize_text(
        " ".join(
            [
                campaign.province or "",
                campaign.district or "",
                campaign.address_line or "",
            ]
        )
    )
    if user_location and campaign_location_blob:
        if user_location in campaign_location_blob or campaign_location_blob in user_location:
            score += 1.8
            reasons.append("The campaign location is close to your declared area.")
        else:
            user_tokens = [token for token in user_location.split() if len(token) >= 3]
            if any(token in campaign_location_blob for token in user_tokens):
                score += 1.0
                reasons.append("The campaign appears to be in an area where you can support conveniently.")

    goal_amount = Decimal(campaign.goal_amount or 0)
    raised_amount = Decimal(campaign.raised_amount or 0)
    if goal_amount > 0:
        gap_ratio = max(Decimal("0"), (goal_amount - raised_amount) / goal_amount)
        if gap_ratio >= Decimal("0.70"):
            score += 2.0
            reasons.append("The campaign still has a significant funding gap versus its goal.")
        elif gap_ratio >= Decimal("0.40"):
            score += 1.0
            reasons.append("There is still meaningful room for your contribution to create impact.")

    if campaign.ends_at is not None:
        ends_at = campaign.ends_at
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        days_left = (ends_at - now).days
        if days_left <= 7:
            score += 1.4
            reasons.append("The campaign deadline is near and needs immediate supporter activity.")
        elif days_left <= 30:
            score += 0.7
            reasons.append("The campaign is in a phase where momentum should be increased.")

    if campaign.id in donated_campaign_ids or campaign.id in registered_campaign_ids:
        score += 1.2
        reasons.append("You have already contributed before, so continued follow-up is valuable.")
        actions.append("Check the transparency page for the latest progress and proof updates.")

    if not reasons:
        reasons.append("The campaign has clear community needs and is currently active.")
    if not actions:
        actions.append("Open campaign details and choose the support method that fits you.")

    return (
        score,
        _sanitize_generated_list(reasons, max_items=3, max_item_chars=180),
        _sanitize_generated_list(actions, max_items=3, max_item_chars=180),
    )


def _enhance_supporter_recommendations_with_llm(
    *,
    supporter: User,
    candidate_items: list[SupporterCampaignRecommendationItem],
) -> tuple[list[SupporterCampaignRecommendationItem], str, str | None]:
    client = GroqClient()
    if not client.enabled or not candidate_items:
        return candidate_items, "heuristic", None
    selected_model, model_tier = _select_model_for_supporter_rewrite(
        candidate_items=candidate_items,
    )

    system_prompt = (
        "You are an AI recommendation assistant for a social impact platform. "
        "Return ONLY one JSON object with key 'items'. "
        "Each item must contain: campaign_id, match_reasons (list), suggested_actions (list). "
        "Keep wording concise and practical, and do not invent facts. "
        "Use plain text without emojis, markdown, or unusual symbols."
    )
    serialized_candidates = [
        {
            "campaign_id": str(item.campaign_id),
            "campaign_title": item.campaign_title,
            "support_types": [support_type.value for support_type in item.support_types],
            "location": item.location,
            "score": item.match_score,
            "current_reasons": item.match_reasons,
        }
        for item in candidate_items
    ]
    user_prompt = (
        "Supporter profile:\\n"
        f"- full_name: {supporter.full_name}\\n"
        f"- location: {supporter.location or 'N/A'}\\n"
        f"- support_types: {supporter.support_types}\\n\\n"
        f"Candidate campaign list: {serialized_candidates}\\n\\n"
        "Improve match reasons and suggested actions for each campaign_id."
    )

    try:
        llm_result = client.generate_json_object(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=selected_model,
            temperature=0.3,
            max_tokens=1200,
        )
    except RuntimeError:
        return candidate_items, "heuristic", None

    llm_items_raw = llm_result.data.get("items")
    if not isinstance(llm_items_raw, list):
        return candidate_items, "heuristic", None

    llm_by_campaign_id: dict[str, dict[str, Any]] = {}
    for raw in llm_items_raw:
        if not isinstance(raw, dict):
            continue
        campaign_id = str(raw.get("campaign_id") or "").strip()
        if not campaign_id:
            continue
        llm_by_campaign_id[campaign_id] = raw

    enriched: list[SupporterCampaignRecommendationItem] = []
    for item in candidate_items:
        llm_item = llm_by_campaign_id.get(str(item.campaign_id))
        if llm_item is None:
            enriched.append(item)
            continue

        reasons_raw = llm_item.get("match_reasons")
        actions_raw = llm_item.get("suggested_actions")
        reasons = (
            [str(value) for value in reasons_raw]
            if isinstance(reasons_raw, list)
            else item.match_reasons
        )
        actions = (
            [str(value) for value in actions_raw]
            if isinstance(actions_raw, list)
            else item.suggested_actions
        )
        enriched.append(
            item.model_copy(
                update={
                    "match_reasons": _sanitize_generated_list(
                        reasons or item.match_reasons,
                        max_items=3,
                        max_item_chars=180,
                    ),
                    "suggested_actions": _sanitize_generated_list(
                        actions or item.suggested_actions,
                        max_items=3,
                        max_item_chars=180,
                    ),
                }
            )
        )

    generated_by = f"groq-{model_tier}" if model_tier in {"light", "heavy"} else "groq"
    return enriched, generated_by, llm_result.model


def recommend_campaigns_for_supporter(
    db: Session,
    *,
    supporter: User,
    limit: int,
) -> SupporterCampaignRecommendationResponse:
    now = datetime.now(timezone.utc)
    max_limit = min(max(1, limit), settings.SUPPORTER_RECOMMENDATION_MAX_LIMIT)

    campaigns = list(
        db.scalars(
            select(Campaign)
            .where(
                Campaign.status == CampaignStatus.published,
                Campaign.is_active.is_(True),
                or_(Campaign.ends_at.is_(None), Campaign.ends_at >= now),
            )
            .order_by(Campaign.updated_at.desc())
        ).all()
    )

    donated_campaign_ids = set(
        db.scalars(
            select(MonetaryDonation.campaign_id).where(
                MonetaryDonation.donor_user_id == supporter.id
            )
        ).all()
    )
    registered_campaign_ids = set(
        db.scalars(
            select(VolunteerRegistration.campaign_id).where(
                VolunteerRegistration.user_id == supporter.id
            )
        ).all()
    )

    user_support_types = {support_type.lower() for support_type in supporter.support_types}
    user_location = _normalize_text(supporter.location)

    scored_items: list[SupporterCampaignRecommendationItem] = []
    for campaign in campaigns:
        score, reasons, actions = _supporter_campaign_score(
            campaign=campaign,
            user_support_types=user_support_types,
            user_location=user_location,
            donated_campaign_ids=donated_campaign_ids,
            registered_campaign_ids=registered_campaign_ids,
            now=now,
        )

        goal_amount = Decimal(campaign.goal_amount or 0)
        raised_amount = Decimal(campaign.raised_amount or 0)
        progress_percent = 0
        if goal_amount > 0:
            progress_percent = max(0, min(100, int((raised_amount / goal_amount) * 100)))

        scored_items.append(
            SupporterCampaignRecommendationItem(
                campaign_id=campaign.id,
                campaign_slug=campaign.slug,
                campaign_title=campaign.title,
                short_description=campaign.short_description,
                location=_campaign_location_label(campaign),
                support_types=_to_support_types(campaign.support_types),
                goal_amount=goal_amount,
                raised_amount=raised_amount,
                progress_percent=progress_percent,
                ends_at=campaign.ends_at,
                match_score=round(float(score), 2),
                match_reasons=reasons,
                suggested_actions=actions,
            )
        )

    scored_items.sort(
        key=lambda item: (
            item.match_score,
            item.progress_percent,
        ),
        reverse=True,
    )
    top_items = scored_items[:max_limit]

    enriched_items, generated_by, model = _enhance_supporter_recommendations_with_llm(
        supporter=supporter,
        candidate_items=top_items,
    )

    return SupporterCampaignRecommendationResponse(
        user_id=supporter.id,
        generated_by=generated_by,
        model=model,
        items=enriched_items,
    )
