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

    def test_campaign_draft_merge_strips_title_prefix_from_short_description(self) -> None:
        payload = CampaignDraftRecommendationRequest(
            title="Book",
            campaign_goal="Donate books for children",
            beneficiary_context="Students in rural schools",
            location_hint="District 9",
            support_types_hint=[SupportType.money],
            constraints=[],
            tone="clear and practical",
        )
        heuristic = recommendation_service._heuristic_campaign_draft_recommendation(payload)

        merged = recommendation_service._merge_campaign_draft_llm_output(
            heuristic=heuristic,
            llm_data={
                "short_description": "Book: mobilize money support to address urgent community needs with a transparent execution plan.",
            },
            model="demo-model",
            generated_by="groq-light",
            campaign_title=payload.title,
        )

        self.assertEqual(
            merged.short_description,
            "mobilize money support to address urgent community needs with a transparent execution plan.",
        )

    def test_sanitize_generated_text_converts_escaped_newlines(self) -> None:
        raw = "Line 1\\nLine 2\\r\\nLine 3"
        cleaned = recommendation_service._sanitize_generated_text(raw, allow_newlines=True)
        self.assertEqual(cleaned, "Line 1\nLine 2\nLine 3")

    def test_heuristic_description_uses_real_newlines(self) -> None:
        payload = CampaignDraftRecommendationRequest(
            title="Book Drive",
            campaign_goal="Donate books for children",
            beneficiary_context="Students in rural schools",
            location_hint="District 9",
            support_types_hint=[SupportType.goods],
            constraints=[],
            tone="clear and practical",
        )

        recommendation = recommendation_service._heuristic_campaign_draft_recommendation(payload)
        self.assertIn("\n", recommendation.description)
        self.assertNotIn("\\n", recommendation.description)

    def test_heuristic_short_description_does_not_include_title_prefix(self) -> None:
        payload = CampaignDraftRecommendationRequest(
            title="Book",
            campaign_goal="Donate books for children",
            beneficiary_context="Students in rural schools",
            location_hint="District 9",
            support_types_hint=[SupportType.money],
            constraints=[],
            tone="clear and practical",
        )

        recommendation = recommendation_service._heuristic_campaign_draft_recommendation(payload)
        self.assertEqual(
            recommendation.short_description,
            "mobilize money support to address urgent community needs with a transparent execution plan.",
        )


if __name__ == "__main__":
    unittest.main()
