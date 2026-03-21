import unittest

from app.api.rate_limit import InMemorySlidingWindowRateLimiter


class InMemorySlidingWindowRateLimiterTestCase(unittest.TestCase):
    def test_blocks_when_limit_reached(self) -> None:
        limiter = InMemorySlidingWindowRateLimiter(window_seconds=60, max_requests=2)

        first = limiter.check("ip:127.0.0.1")
        second = limiter.check("ip:127.0.0.1")
        third = limiter.check("ip:127.0.0.1")

        self.assertTrue(first.allowed)
        self.assertTrue(second.allowed)
        self.assertFalse(third.allowed)
        self.assertGreaterEqual(third.retry_after_seconds, 1)

    def test_isolated_by_key(self) -> None:
        limiter = InMemorySlidingWindowRateLimiter(window_seconds=60, max_requests=1)

        first_ip = limiter.check("ip:1.1.1.1")
        second_ip = limiter.check("ip:2.2.2.2")

        self.assertTrue(first_ip.allowed)
        self.assertTrue(second_ip.allowed)


if __name__ == "__main__":
    unittest.main()

