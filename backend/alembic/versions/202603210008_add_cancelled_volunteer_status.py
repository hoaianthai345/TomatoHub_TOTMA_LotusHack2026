"""Add cancelled status for volunteer registrations

Revision ID: 202603210008
Revises: 202603210007
Create Date: 2026-03-21 13:45:00
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "202603210008"
down_revision: str | None = "202603210007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE volunteer_status ADD VALUE IF NOT EXISTS 'cancelled'")


def downgrade() -> None:
    # PostgreSQL ENUM value removal is not trivial and requires type recreation.
    # Keep downgrade as no-op to avoid destructive data loss.
    pass
