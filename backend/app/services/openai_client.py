from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import settings


def _extract_first_json_object(content: str) -> dict[str, Any]:
    stripped = content.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.lower().startswith("json"):
            stripped = stripped[4:].strip()

    try:
        parsed = json.loads(stripped)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    first_curly = stripped.find("{")
    last_curly = stripped.rfind("}")
    if first_curly >= 0 and last_curly > first_curly:
        possible = stripped[first_curly : last_curly + 1]
        parsed = json.loads(possible)
        if isinstance(parsed, dict):
            return parsed

    raise ValueError("OpenAI response is not a valid JSON object")


@dataclass(slots=True)
class OpenAIGenerationResult:
    data: dict[str, Any]
    model: str


class OpenAIClient:
    def __init__(self) -> None:
        self._api_key = (settings.OPENAI_API_KEY or "").strip()
        self._base_url = settings.OPENAI_API_BASE_URL.rstrip("/")
        self._model = settings.OPENAI_MODEL
        self._timeout_seconds = settings.OPENAI_TIMEOUT_SECONDS

    @property
    def enabled(self) -> bool:
        return bool(self._api_key) and settings.RECOMMENDATION_USE_LLM

    def _post_chat_completions(
        self,
        *,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        request = Request(
            url=f"{self._base_url}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=self._timeout_seconds) as response:
                raw = response.read().decode("utf-8")
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(
                f"OpenAI HTTPError {exc.code}: {detail or exc.reason}"
            ) from exc
        except URLError as exc:
            raise RuntimeError(f"OpenAI URLError: {exc.reason}") from exc

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise RuntimeError("OpenAI response is not valid JSON") from exc
        if not isinstance(parsed, dict):
            raise RuntimeError("OpenAI response must be an object")
        return parsed

    def generate_json_object(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        temperature: float = 0.3,
        max_tokens: int = 1200,
    ) -> OpenAIGenerationResult:
        if not self.enabled:
            raise RuntimeError("OpenAI API key not configured")

        selected_model = (model or self._model).strip()
        if not selected_model:
            raise RuntimeError("OpenAI model is not configured")

        base_payload: dict[str, Any] = {
            "model": selected_model,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }

        response_format_payload = {
            **base_payload,
            "response_format": {"type": "json_object"},
        }

        try:
            response = self._post_chat_completions(payload=response_format_payload)
        except RuntimeError:
            response = self._post_chat_completions(payload=base_payload)

        try:
            choice = response["choices"][0]
            message_content = choice["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError("OpenAI response missing choices/message/content") from exc

        if not isinstance(message_content, str):
            raise RuntimeError("OpenAI message content must be a string")

        parsed = _extract_first_json_object(message_content)
        model_name = str(response.get("model") or selected_model)
        return OpenAIGenerationResult(data=parsed, model=model_name)
