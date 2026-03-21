from __future__ import annotations

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


def _normalize_text(value: str | None) -> str:
    if value is None:
        return ""
    return " ".join(value.strip().lower().split())


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
        SupportType.money: ("fund", "tiền", "kinh phí", "chi phí", "donate", "cash"),
        SupportType.goods: ("vật phẩm", "supplies", "kit", "thực phẩm", "hàng hóa"),
        SupportType.volunteer: ("tình nguyện", "volunteer", "điểm", "check-in", "hỗ trợ hiện trường"),
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
        f"{payload.title.strip()}: huy động nguồn lực ({support_type_labels}) "
        "để giải quyết nhu cầu ưu tiên của cộng đồng mục tiêu."
    )

    context_line = payload.beneficiary_context or "Nhóm thụ hưởng cần hỗ trợ khẩn cấp và minh bạch."
    location_line = payload.location_hint or "Khu vực triển khai sẽ được xác nhận khi campaign publish."
    constraint_line = (
        "; ".join(payload.constraints)
        if payload.constraints
        else "Không có ràng buộc đặc biệt."
    )

    description = (
        f"Mục tiêu campaign:\\n{payload.campaign_goal.strip()}\\n\\n"
        f"Nhóm thụ hưởng:\\n{context_line.strip()}\\n\\n"
        f"Khu vực triển khai:\\n{location_line.strip()}\\n\\n"
        "Kế hoạch thực thi đề xuất:\\n"
        "- Thiết lập mốc hoạt động theo tuần và công khai tiến độ định kỳ.\\n"
        "- Phân vai rõ ràng cho tổ chức, điều phối viên, và supporter.\\n"
        "- Chuẩn hóa checklist bàn giao để tránh thất thoát/thiếu chứng từ.\\n\\n"
        f"Ràng buộc cần tuân thủ:\\n{constraint_line.strip()}"
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
        "Tiếp nhận supporter tại điểm hoạt động và xác nhận check-in/check-out.",
        "Tổng hợp vật phẩm/tài trợ theo biểu mẫu minh bạch mỗi ca.",
        "Cập nhật bằng chứng hoạt động (ảnh, biên bản bàn giao, log tiến độ).",
    ]
    donation_suggestions = [
        "Thiết kế gói đóng góp theo mốc ủng hộ rõ ràng (ví dụ: 100k/250k/500k).",
        "Ưu tiên khoản tài trợ định kỳ để duy trì vận hành campaign.",
        "Khuyến khích in-kind donation phù hợp nhu cầu thực tế tại địa phương.",
    ]
    risk_notes = [
        "Rủi ro thiếu đồng bộ dữ liệu giữa đội hiện trường và dashboard.",
        "Rủi ro quá tải tình nguyện viên vào cùng một khung giờ.",
        "Rủi ro chậm sao kê nếu chứng từ bàn giao không chuẩn hóa ngay từ đầu.",
    ]
    transparency_notes = [
        "Công khai cập nhật theo mốc thời gian (tuần/tháng) với số liệu định lượng.",
        "Lưu vết mọi khoản quyên góp và bàn giao bằng log có timestamp.",
        "Đính kèm bằng chứng hiện trường cho các mốc giải ngân/hoàn thành.",
    ]

    return CampaignDraftRecommendationResponse(
        short_description=short_description[:500],
        description=description,
        suggested_tags=_dedupe_keep_order(base_tags, max_items=8),
        suggested_support_types=support_types,
        volunteer_tasks=_dedupe_keep_order(volunteer_tasks, max_items=6),
        donation_suggestions=_dedupe_keep_order(donation_suggestions, max_items=6),
        risk_notes=_dedupe_keep_order(risk_notes, max_items=6),
        transparency_notes=_dedupe_keep_order(transparency_notes, max_items=6),
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

    short_description = str(llm_data.get("short_description") or "").strip()
    description = str(llm_data.get("description") or "").strip()
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
        suggested_tags=_dedupe_keep_order(
            suggested_tags or heuristic.suggested_tags,
            max_items=8,
        ),
        suggested_support_types=suggested_support_types,
        volunteer_tasks=_dedupe_keep_order(
            volunteer_tasks or heuristic.volunteer_tasks,
            max_items=6,
        ),
        donation_suggestions=_dedupe_keep_order(
            donation_suggestions or heuristic.donation_suggestions,
            max_items=6,
        ),
        risk_notes=_dedupe_keep_order(
            risk_notes or heuristic.risk_notes,
            max_items=6,
        ),
        transparency_notes=_dedupe_keep_order(
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
    client = GroqClient()
    if not client.enabled:
        return heuristic
    selected_model, model_tier = _select_model_for_campaign_draft(payload)

    system_prompt = (
        "Bạn là AI copilot cho tổ chức phi lợi nhuận. "
        "Trả về DUY NHẤT một JSON object hợp lệ với các key: "
        "short_description, description, suggested_tags, suggested_support_types, "
        "volunteer_tasks, donation_suggestions, risk_notes, transparency_notes. "
        "suggested_support_types chỉ được dùng: money, goods, volunteer."
    )
    user_prompt = (
        "Đề bài tạo campaign:\\n"
        f"- title: {payload.title}\\n"
        f"- campaign_goal: {payload.campaign_goal}\\n"
        f"- beneficiary_context: {payload.beneficiary_context or 'N/A'}\\n"
        f"- location_hint: {payload.location_hint or 'N/A'}\\n"
        f"- support_types_hint: {[item.value for item in payload.support_types_hint]}\\n"
        f"- constraints: {payload.constraints}\\n"
        f"- tone: {payload.tone}\\n\\n"
        "Yêu cầu: nội dung thực tế, hành động rõ ràng, ưu tiên minh bạch và khả thi."
    )

    try:
        llm_result = client.generate_json_object(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=selected_model,
            temperature=0.4,
            max_tokens=1500,
        )
    except RuntimeError:
        return heuristic

    try:
        return _merge_campaign_draft_llm_output(
            heuristic=heuristic,
            llm_data=llm_result.data,
            model=llm_result.model,
            generated_by=(
                f"groq-{model_tier}" if model_tier in {"light", "heavy"} else "groq"
            ),
        )
    except Exception:
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
        reasons.append("Campaign này cần hỗ trợ tài chính đúng với ưu tiên của bạn.")
        actions.append("Đóng góp tiền theo mức phù hợp để tăng tốc tiến độ gây quỹ.")
    if SupportType.goods in campaign_support_types and (
        "donor_goods" in user_support_types or "shipper" in user_support_types
    ):
        score += 3.0
        reasons.append("Campaign có nhu cầu vật phẩm/phân phối phù hợp kỹ năng của bạn.")
        actions.append("Chuẩn bị vật phẩm đúng danh mục hoặc tham gia vận chuyển tại checkpoint.")
    if SupportType.volunteer in campaign_support_types and (
        "volunteer" in user_support_types or "coordinator" in user_support_types
    ):
        score += 3.0
        reasons.append("Campaign cần tình nguyện viên, phù hợp vai trò bạn đã chọn.")
        actions.append("Đăng ký tình nguyện và theo dõi trạng thái duyệt trên dashboard.")

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
            reasons.append("Khu vực campaign gần với vị trí bạn đã khai báo.")
        else:
            user_tokens = [token for token in user_location.split() if len(token) >= 3]
            if any(token in campaign_location_blob for token in user_tokens):
                score += 1.0
                reasons.append("Campaign nằm trong khu vực bạn có thể hỗ trợ thuận tiện.")

    goal_amount = Decimal(campaign.goal_amount or 0)
    raised_amount = Decimal(campaign.raised_amount or 0)
    if goal_amount > 0:
        gap_ratio = max(Decimal("0"), (goal_amount - raised_amount) / goal_amount)
        if gap_ratio >= Decimal("0.70"):
            score += 2.0
            reasons.append("Campaign còn thiếu nhiều ngân sách so với mục tiêu.")
        elif gap_ratio >= Decimal("0.40"):
            score += 1.0
            reasons.append("Campaign vẫn còn khoảng trống đáng kể để bạn tạo tác động.")

    if campaign.ends_at is not None:
        ends_at = campaign.ends_at
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        days_left = (ends_at - now).days
        if days_left <= 7:
            score += 1.4
            reasons.append("Campaign sắp đến hạn, cần thêm supporter ngay.")
        elif days_left <= 30:
            score += 0.7
            reasons.append("Campaign đang ở giai đoạn cần đẩy nhanh tiến độ.")

    if campaign.id in donated_campaign_ids or campaign.id in registered_campaign_ids:
        score += 1.2
        reasons.append("Bạn đã có đóng góp trước đó, nên tiếp tục theo dõi campaign này.")
        actions.append("Kiểm tra trang transparency để cập nhật tiến độ mới nhất.")

    if not reasons:
        reasons.append("Campaign có nhu cầu cộng đồng rõ ràng và đang hoạt động.")
    if not actions:
        actions.append("Mở chi tiết campaign để chọn hình thức hỗ trợ phù hợp.")

    return score, _dedupe_keep_order(reasons, max_items=3), _dedupe_keep_order(actions, max_items=3)


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
        "Bạn là AI recommendation cho nền tảng thiện nguyện. "
        "Trả về DUY NHẤT JSON object có key 'items'. "
        "Mỗi item gồm: campaign_id, match_reasons (list), suggested_actions (list). "
        "Nội dung ngắn gọn, thực tế, không bịa dữ liệu."
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
        "Hồ sơ supporter:\\n"
        f"- full_name: {supporter.full_name}\\n"
        f"- location: {supporter.location or 'N/A'}\\n"
        f"- support_types: {supporter.support_types}\\n\\n"
        f"Danh sách campaign đề xuất: {serialized_candidates}\\n\\n"
        "Hãy tối ưu lý do gợi ý và action theo từng campaign_id."
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
                    "match_reasons": _dedupe_keep_order(reasons or item.match_reasons, max_items=3),
                    "suggested_actions": _dedupe_keep_order(
                        actions or item.suggested_actions,
                        max_items=3,
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
