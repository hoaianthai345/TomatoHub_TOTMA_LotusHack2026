"""Add user refresh token version for auth lifecycle

Revision ID: 202603210007
Revises: 202603210006
Create Date: 2026-03-21 13:30:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "202603210007"
down_revision: str | None = "202603210006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "refresh_token_version",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )
    op.alter_column("users", "refresh_token_version", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "refresh_token_version")
