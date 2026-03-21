from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from threading import Lock
from time import monotonic

from fastapi import HTTPException, Request, status


@dataclass(slots=True)
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int


class InMemorySlidingWindowRateLimiter:
    def __init__(self, *, window_seconds: int, max_requests: int) -> None:
        self._window_seconds = max(1, int(window_seconds))
        self._max_requests = max(1, int(max_requests))
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str) -> RateLimitDecision:
        now = monotonic()
        cutoff = now - self._window_seconds
        with self._lock:
            queue = self._events[key]
            while queue and queue[0] <= cutoff:
                queue.popleft()

            if len(queue) >= self._max_requests:
                retry_after = max(1, int((queue[0] + self._window_seconds) - now) + 1)
                return RateLimitDecision(allowed=False, retry_after_seconds=retry_after)

            queue.append(now)
            return RateLimitDecision(allowed=True, retry_after_seconds=0)


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        first_ip = forwarded_for.split(",")[0].strip()
        if first_ip:
            return first_ip
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_rate_limit(
    *,
    limiter: InMemorySlidingWindowRateLimiter,
    key: str,
    detail: str,
) -> None:
    decision = limiter.check(key)
    if decision.allowed:
        return
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=detail,
        headers={"Retry-After": str(decision.retry_after_seconds)},
    )

