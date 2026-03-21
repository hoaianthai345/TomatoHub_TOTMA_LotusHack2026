import unittest
from contextlib import contextmanager
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from app.core.config import settings
from app.models.campaign import SupportType
from app.schemas.recommendation import (
    CampaignDraftRecommendationRequest,
    SupporterCampaignRecommendationItem,
)
from app.services import recommendation_service


@contextmanager
def override_settings(**kwargs):
    original: dict[str, object] = {}
    for key, value in kwargs.items():
        original[key] = getattr(settings, key)
        setattr(settings, key, value)
    try:
        yield
    finally:
        for key, value in original.items():
            setattr(settings, key, value)


def build_candidate_item() -> SupporterCampaignRecommendationItem:
    return SupporterCampaignRecommendationItem(
        campaign_id=uuid4(),
        campaign_slug="demo-campaign",
        campaign_title="Demo Campaign",
        short_description="Short desc",
        location="HCMC",
        support_types=[SupportType.money],
        goal_amount=Decimal("1000"),
        raised_amount=Decimal("120"),
        progress_percent=12,
        ends_at=datetime.now(timezone.utc),
        match_score=1.0,
        match_reasons=["reason"],
        suggested_actions=["action"],
    )


class RecommendationModelRoutingTestCase(unittest.TestCase):
    def test_campaign_draft_routes_light_for_simple_payload(self) -> None:
        payload = CampaignDraftRecommendationRequest(
            title="Help elders",
            campaign_goal="Raise small support for elders in community center quickly.",
            beneficiary_context="Elder households",
            location_hint="District 1",
            support_types_hint=[SupportType.money],
            constraints=[],
            tone="clear",
        )

        with override_settings(
            RECOMMENDATION_MODEL_ROUTING_ENABLED=True,
            RECOMMENDATION_DRAFT_COMPLEXITY_THRESHOLD=600,
            GROQ_MODEL="llama-3.3-70b-versatile",
            GROQ_MODEL_HEAVY="llama-3.3-70b-versatile",
            GROQ_MODEL_LIGHT="llama-3.1-8b-instant",
        ):
            model, tier = recommendation_service._select_model_for_campaign_draft(payload)

        self.assertEqual(model, "llama-3.1-8b-instant")
        self.assertEqual(tier, "light")

    def test_campaign_draft_routes_heavy_for_complex_payload(self) -> None:
        payload = CampaignDraftRecommendationRequest(
            title="Emergency flood support",
            campaign_goal=("Support " * 200).strip(),
            beneficiary_context=("Need support " * 80).strip(),
            location_hint="Long, detailed location context",
            support_types_hint=[SupportType.money, SupportType.goods, SupportType.volunteer],
            constraints=["constraint-a", "constraint-b", "constraint-c", "constraint-d"],
            tone="clear and transparent",
        )

        with override_settings(
            RECOMMENDATION_MODEL_ROUTING_ENABLED=True,
            RECOMMENDATION_DRAFT_COMPLEXITY_THRESHOLD=600,
            GROQ_MODEL="llama-3.3-70b-versatile",
            GROQ_MODEL_HEAVY="llama-3.3-70b-versatile",
            GROQ_MODEL_LIGHT="llama-3.1-8b-instant",
        ):
            model, tier = recommendation_service._select_model_for_campaign_draft(payload)

        self.assertEqual(model, "llama-3.3-70b-versatile")
        self.assertEqual(tier, "heavy")

    def test_supporter_rewrite_routes_by_candidate_count(self) -> None:
        small_items = [build_candidate_item() for _ in range(3)]
        large_items = [build_candidate_item() for _ in range(12)]

        with override_settings(
            RECOMMENDATION_MODEL_ROUTING_ENABLED=True,
            RECOMMENDATION_SUPPORTER_LIGHT_MAX_ITEMS=8,
            GROQ_MODEL="llama-3.3-70b-versatile",
            GROQ_MODEL_HEAVY="llama-3.3-70b-versatile",
            GROQ_MODEL_LIGHT="llama-3.1-8b-instant",
        ):
            small_model, small_tier = recommendation_service._select_model_for_supporter_rewrite(
                candidate_items=small_items
            )
            large_model, large_tier = recommendation_service._select_model_for_supporter_rewrite(
                candidate_items=large_items
            )

        self.assertEqual(small_model, "llama-3.1-8b-instant")
        self.assertEqual(small_tier, "light")
        self.assertEqual(large_model, "llama-3.3-70b-versatile")
        self.assertEqual(large_tier, "heavy")


if __name__ == "__main__":
    unittest.main()

