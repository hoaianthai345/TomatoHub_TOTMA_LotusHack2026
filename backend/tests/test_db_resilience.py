import unittest

from sqlalchemy.exc import OperationalError

from app.db.resilience import is_transient_db_error, run_with_db_retry


class DbResilienceTestCase(unittest.TestCase):
    def test_detects_transient_operational_error(self) -> None:
        exc = OperationalError(
            statement="SELECT 1",
            params={},
            orig=Exception("connection refused"),
        )
        self.assertTrue(is_transient_db_error(exc))

    def test_retries_and_succeeds(self) -> None:
        state = {"count": 0}

        def flaky_operation() -> str:
            state["count"] += 1
            if state["count"] == 1:
                raise OperationalError(
                    statement="SELECT 1",
                    params={},
                    orig=Exception("server closed the connection unexpectedly"),
                )
            return "ok"

        result = run_with_db_retry(
            flaky_operation,
            max_attempts=2,
            base_delay_seconds=0,
            max_delay_seconds=0,
        )
        self.assertEqual(result, "ok")
        self.assertEqual(state["count"], 2)

    def test_non_transient_is_not_retried(self) -> None:
        state = {"count": 0}

        def bad_operation() -> None:
            state["count"] += 1
            raise ValueError("invalid payload")

        with self.assertRaises(ValueError):
            run_with_db_retry(
                bad_operation,
                max_attempts=3,
                base_delay_seconds=0,
                max_delay_seconds=0,
            )

        self.assertEqual(state["count"], 1)


if __name__ == "__main__":
    unittest.main()

