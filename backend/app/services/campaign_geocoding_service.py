from __future__ import annotations

import json
import logging
import ssl
from decimal import Decimal, ROUND_HALF_UP
from functools import lru_cache
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.core.config import settings

try:
    import certifi
except ImportError:  # pragma: no cover - certifi is available in runtime deps
    certifi = None

logger = logging.getLogger(__name__)
_COORDINATE_PRECISION = Decimal("0.000001")


def _normalize_location_value(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = " ".join(value.strip().split())
    return normalized or None


def _build_vietnam_query(
    *,
    address_line: str | None,
    district: str | None,
    province: str | None,
) -> str | None:
    parts = [
        _normalize_location_value(address_line),
        _normalize_location_value(district),
        _normalize_location_value(province),
        "Vietnam",
    ]
    query = ", ".join([part for part in parts if part])
    if query == "Vietnam":
        return None
    return query


def _build_vietnam_query_candidates(
    *,
    address_line: str | None,
    district: str | None,
    province: str | None,
) -> list[str]:
    normalized_address = _normalize_location_value(address_line)
    normalized_district = _normalize_location_value(district)
    normalized_province = _normalize_location_value(province)

    raw_candidates = [
        _build_vietnam_query(
            address_line=normalized_address,
            district=normalized_district,
            province=normalized_province,
        ),
        _build_vietnam_query(
            address_line=None,
            district=normalized_district,
            province=normalized_province,
        ),
        _build_vietnam_query(
            address_line=normalized_address,
            district=None,
            province=normalized_province,
        ),
        _build_vietnam_query(
            address_line=normalized_address,
            district=normalized_district,
            province=None,
        ),
        _build_vietnam_query(
            address_line=None,
            district=normalized_district,
            province=None,
        ),
        _build_vietnam_query(
            address_line=None,
            district=None,
            province=normalized_province,
        ),
    ]

    candidates: list[str] = []
    for candidate in raw_candidates:
        if candidate and candidate not in candidates:
            candidates.append(candidate)
    return candidates


def _build_ssl_context() -> ssl.SSLContext | None:
    if certifi is None:
        return None
    try:
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:  # noqa: BLE001
        return None


_SSL_CONTEXT = _build_ssl_context()


def _to_decimal_coordinate(raw_value: object) -> Decimal | None:
    if raw_value is None:
        return None
    text = str(raw_value).strip()
    if not text:
        return None
    try:
        value = Decimal(text)
    except Exception:  # noqa: BLE001
        return None
    return value.quantize(_COORDINATE_PRECISION, rounding=ROUND_HALF_UP)


def _is_valid_coordinate_pair(latitude: Decimal, longitude: Decimal) -> bool:
    return (
        Decimal("-90") <= latitude <= Decimal("90")
        and Decimal("-180") <= longitude <= Decimal("180")
    )


@lru_cache(maxsize=512)
def _geocode_query(query: str) -> tuple[Decimal, Decimal] | None:
    if not settings.CAMPAIGN_GEOCODING_ENABLED:
        return None

    base_url = settings.CAMPAIGN_GEOCODING_API_URL.rstrip("/")
    params = urlencode(
        {
            "q": query,
            "format": "jsonv2",
            "limit": "1",
            "addressdetails": "0",
            "countrycodes": "vn",
        }
    )
    request = Request(
        url=f"{base_url}?{params}",
        headers={"User-Agent": settings.CAMPAIGN_GEOCODING_USER_AGENT},
        method="GET",
    )

    try:
        with urlopen(
            request,
            timeout=settings.CAMPAIGN_GEOCODING_TIMEOUT_SECONDS,
            context=_SSL_CONTEXT,
        ) as response:
            payload = response.read().decode("utf-8")
    except (HTTPError, URLError, TimeoutError) as exc:
        logger.warning("Campaign geocoding request failed for query '%s': %s", query, exc)
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Campaign geocoding unexpected error for query '%s': %s", query, exc)
        return None

    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError:
        logger.warning("Campaign geocoding returned invalid JSON for query '%s'", query)
        return None

    if not isinstance(parsed, list) or not parsed:
        return None

    first = parsed[0]
    if not isinstance(first, dict):
        return None

    latitude = _to_decimal_coordinate(first.get("lat"))
    longitude = _to_decimal_coordinate(first.get("lon"))
    if latitude is None or longitude is None:
        return None
    if not _is_valid_coordinate_pair(latitude, longitude):
        return None
    return latitude, longitude


def geocode_campaign_location(
    *,
    address_line: str | None,
    district: str | None,
    province: str | None,
) -> tuple[Decimal | None, Decimal | None]:
    queries = _build_vietnam_query_candidates(
        address_line=address_line,
        district=district,
        province=province,
    )
    if not queries:
        return None, None

    for query in queries:
        resolved = _geocode_query(query)
        if resolved is not None:
            return resolved
    return None, None


def has_campaign_location_data(
    *,
    address_line: str | None,
    district: str | None,
    province: str | None,
) -> bool:
    return any(
        _normalize_location_value(value)
        for value in (address_line, district, province)
    )
