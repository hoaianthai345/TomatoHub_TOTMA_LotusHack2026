import unittest
from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import patch

from app.core.config import settings
from app.models.campaign import SupportType
from app.schemas.recommendation import CampaignDraftRecommendationRequest
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


def _build_payload() -> CampaignDraftRecommendationRequest:
    return CampaignDraftRecommendationRequest(
        title="Community Food Drive",
        campaign_goal="Provide food support for vulnerable households in the city.",
        beneficiary_context="Low-income families",
        location_hint="District 1",
        support_types_hint=[SupportType.money, SupportType.goods],
        constraints=["publish weekly updates"],
        tone="clear and practical",
    )


class RecommendationProviderOrderTestCase(unittest.TestCase):
    @patch("app.services.recommendation_service.GroqClient")
    @patch("app.services.recommendation_service.OpenAIClient")
    def test_campaign_draft_prefers_openai_when_available(
        self,
        mock_openai_cls,
        mock_groq_cls,
    ) -> None:
        openai = mock_openai_cls.return_value
        openai.enabled = True
        openai.generate_json_object.return_value = SimpleNamespace(
            data={
                "short_description": "Clean short output",
                "description": "Clean description output",
            },
            model="gpt-4o-mini",
        )
        groq = mock_groq_cls.return_value
        groq.enabled = True

        with override_settings(
            RECOMMENDATION_DRAFT_PREFERRED_PROVIDER="openai",
            OPENAI_API_KEY="test-openai-key",
            OPENAI_MODEL="gpt-4o-mini",
            GROQ_API_KEY="test-groq-key",
            GROQ_MODEL="llama-3.3-70b-versatile",
            GROQ_MODEL_LIGHT="llama-3.1-8b-instant",
            GROQ_MODEL_HEAVY="llama-3.3-70b-versatile",
        ):
            response = recommendation_service.recommend_campaign_draft(_build_payload())

        self.assertEqual(response.generated_by, "openai")
        openai.generate_json_object.assert_called_once()
        groq.generate_json_object.assert_not_called()

    @patch("app.services.recommendation_service.GroqClient")
    @patch("app.services.recommendation_service.OpenAIClient")
    def test_campaign_draft_falls_back_to_groq_when_openai_fails(
        self,
        mock_openai_cls,
        mock_groq_cls,
    ) -> None:
        openai = mock_openai_cls.return_value
        openai.enabled = True
        openai.generate_json_object.side_effect = RuntimeError("openai unavailable")

        groq = mock_groq_cls.return_value
        groq.enabled = True
        groq.generate_json_object.return_value = SimpleNamespace(
            data={
                "short_description": "Groq short output",
                "description": "Groq description output",
            },
            model="llama-3.1-8b-instant",
        )

        with override_settings(
            RECOMMENDATION_DRAFT_PREFERRED_PROVIDER="openai",
            OPENAI_API_KEY="test-openai-key",
            OPENAI_MODEL="gpt-4o-mini",
            GROQ_API_KEY="test-groq-key",
            GROQ_MODEL="llama-3.3-70b-versatile",
            GROQ_MODEL_LIGHT="llama-3.1-8b-instant",
            GROQ_MODEL_HEAVY="llama-3.3-70b-versatile",
        ):
            response = recommendation_service.recommend_campaign_draft(_build_payload())

        self.assertTrue(response.generated_by.startswith("groq"))
        openai.generate_json_object.assert_called_once()
        groq.generate_json_object.assert_called_once()


if __name__ == "__main__":
    unittest.main()
