"""Backfill volunteer attendance status defaults

Revision ID: 202603220003
Revises: 202603220002
Create Date: 2026-03-22 14:20:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "202603220003"
down_revision: str | None = "202603220002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TABLE = "volunteer_registrations"
_COLUMN = "attendance_status"
_VALID_ATTENDANCE_STATUSES = (
    "not_marked",
    "arrived",
    "absent",
    "left_early",
    "completed",
)


def _has_attendance_status_column() -> bool:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns(_TABLE)}
    return _COLUMN in columns


def upgrade() -> None:
    if not _has_attendance_status_column():
        return

    valid_statuses_sql = ", ".join(f"'{status}'" for status in _VALID_ATTENDANCE_STATUSES)
    op.execute(
        sa.text(
            f"""
            UPDATE {_TABLE}
            SET {_COLUMN} = 'not_marked'
            WHERE {_COLUMN} IS NULL
               OR btrim({_COLUMN}) = ''
               OR {_COLUMN} NOT IN ({valid_statuses_sql})
            """
        )
    )
    op.execute(sa.text(f"ALTER TABLE {_TABLE} ALTER COLUMN {_COLUMN} SET DEFAULT 'not_marked'"))
    op.execute(sa.text(f"ALTER TABLE {_TABLE} ALTER COLUMN {_COLUMN} SET NOT NULL"))


def downgrade() -> None:
    if not _has_attendance_status_column():
        return

    op.execute(sa.text(f"ALTER TABLE {_TABLE} ALTER COLUMN {_COLUMN} DROP NOT NULL"))
    op.execute(sa.text(f"ALTER TABLE {_TABLE} ALTER COLUMN {_COLUMN} DROP DEFAULT"))
