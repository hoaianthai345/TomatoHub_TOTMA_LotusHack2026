from __future__ import annotations

from collections.abc import Callable
from time import sleep
from typing import TypeVar

from sqlalchemy.exc import DBAPIError, OperationalError, TimeoutError

T = TypeVar("T")

_TRANSIENT_DB_ERROR_MARKERS = (
    "connection refused",
    "connection reset",
    "connection timed out",
    "could not connect to server",
    "server closed the connection unexpectedly",
    "ssl syscall error",
    "terminating connection",
    "timeout expired",
    "too many connections",
    "remaining connection slots are reserved",
)


def is_transient_db_error(exc: BaseException) -> bool:
    if isinstance(exc, (OperationalError, TimeoutError)):
        return True
    if isinstance(exc, DBAPIError) and exc.connection_invalidated:
        return True

    message = str(getattr(exc, "orig", exc)).lower()
    return any(marker in message for marker in _TRANSIENT_DB_ERROR_MARKERS)


def run_with_db_retry(
    operation: Callable[[], T],
    *,
    max_attempts: int,
    base_delay_seconds: float,
    max_delay_seconds: float,
    on_retry: Callable[[int, BaseException], None] | None = None,
) -> T:
    attempts = max(1, max_attempts)
    for attempt in range(1, attempts + 1):
        try:
            return operation()
        except Exception as exc:  # noqa: BLE001
            if not is_transient_db_error(exc) or attempt >= attempts:
                raise

            if on_retry is not None:
                on_retry(attempt, exc)

            delay = min(max_delay_seconds, base_delay_seconds * (2 ** (attempt - 1)))
            sleep(delay)

    raise RuntimeError("unreachable")

