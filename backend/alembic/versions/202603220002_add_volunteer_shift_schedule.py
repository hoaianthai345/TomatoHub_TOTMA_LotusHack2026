"""Add volunteer role and shift schedule fields

Revision ID: 202603220002
Revises: 202603220001
Create Date: 2026-03-22 12:10:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "202603220002"
down_revision: str | None = "202603220001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

volunteer_role_enum = sa.Enum(
    "packing",
    "delivery",
    "medic",
    "online",
    name="volunteer_role",
)


def upgrade() -> None:
    bind = op.get_bind()
    volunteer_role_enum.create(bind, checkfirst=True)

    op.add_column(
        "volunteer_registrations",
        sa.Column("role", volunteer_role_enum, nullable=True),
    )
    op.add_column(
        "volunteer_registrations",
        sa.Column("shift_start_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "volunteer_registrations",
        sa.Column("shift_end_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    bind = op.get_bind()

    op.drop_column("volunteer_registrations", "shift_end_at")
    op.drop_column("volunteer_registrations", "shift_start_at")
    op.drop_column("volunteer_registrations", "role")

    volunteer_role_enum.drop(bind, checkfirst=True)

