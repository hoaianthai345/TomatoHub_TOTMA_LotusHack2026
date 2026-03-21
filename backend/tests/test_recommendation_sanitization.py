import unittest

from app.models.campaign import SupportType
from app.schemas.recommendation import CampaignDraftRecommendationRequest
from app.services import recommendation_service


class RecommendationSanitizationTestCase(unittest.TestCase):
    def test_sanitize_generated_text_removes_control_and_symbol_characters(self) -> None:
        raw = "Plan 🔥\u200b\twith\x00 weird ✅ chars"
        cleaned = recommendation_service._sanitize_generated_text(raw)
        self.assertEqual(cleaned, "Plan with weird chars")

    def test_sanitize_generated_tags_normalizes_values(self) -> None:
        tags = recommendation_service._sanitize_generated_tags(
            [" Aid ⚡ ", "community_support", "Risk!!!", ""],
            max_items=8,
        )
        self.assertEqual(tags, ["aid", "community-support", "risk"])

    def test_campaign_draft_merge_sanitizes_llm_output(self) -> None:
        payload = CampaignDraftRecommendationRequest(
            title="Community Food Drive",
            campaign_goal="Provide food support for vulnerable households in the city.",
            beneficiary_context="Low-income families",
            location_hint="District 1",
            support_types_hint=[SupportType.money, SupportType.goods],
            constraints=["publish weekly updates"],
            tone="clear and practical",
        )
        heuristic = recommendation_service._heuristic_campaign_draft_recommendation(payload)

        merged = recommendation_service._merge_campaign_draft_llm_output(
            heuristic=heuristic,
            llm_data={
                "short_description": "Support now ✅\u200b",
                "description": "Detailed plan 🔥 with milestones.",
                "suggested_tags": [" aid ⚡ ", "impact!!!"],
                "suggested_support_types": ["money", "goods", "invalid_type"],
                "volunteer_tasks": ["Check in volunteers ✅"],
                "donation_suggestions": ["Donate monthly 💸"],
                "risk_notes": ["Data mismatch ⚠️ risk"],
                "transparency_notes": ["Post weekly logs 📌"],
            },
            model="demo-model",
            generated_by="groq-light",
        )

        self.assertEqual(merged.short_description, "Support now")
        self.assertEqual(merged.description, "Detailed plan with milestones.")
        self.assertEqual(merged.suggested_tags, ["aid", "impact"])
        self.assertEqual(merged.suggested_support_types, [SupportType.money, SupportType.goods])
        self.assertEqual(merged.volunteer_tasks, ["Check in volunteers"])
        self.assertEqual(merged.donation_suggestions, ["Donate monthly"])
        self.assertEqual(merged.risk_notes, ["Data mismatch risk"])
        self.assertEqual(merged.transparency_notes, ["Post weekly logs"])


if __name__ == "__main__":
    unittest.main()
