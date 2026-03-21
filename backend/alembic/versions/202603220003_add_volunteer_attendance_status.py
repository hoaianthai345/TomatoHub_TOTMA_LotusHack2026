"""Add volunteer attendance status fields

Revision ID: 202603220003
Revises: 202603220002
Create Date: 2026-03-22 16:30:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "202603220003"
down_revision: str | None = "202603220002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

volunteer_attendance_status_enum = sa.Enum(
    "not_marked",
    "arrived",
    "absent",
    "left_early",
    "completed",
    name="volunteer_attendance_status",
)


def upgrade() -> None:
    bind = op.get_bind()
    volunteer_attendance_status_enum.create(bind, checkfirst=True)

    op.add_column(
        "volunteer_registrations",
        sa.Column(
            "attendance_status",
            volunteer_attendance_status_enum,
            nullable=False,
            server_default="not_marked",
        ),
    )
    op.add_column(
        "volunteer_registrations",
        sa.Column("attendance_note", sa.Text(), nullable=True),
    )
    op.add_column(
        "volunteer_registrations",
        sa.Column("attendance_marked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "volunteer_registrations",
        sa.Column("attendance_marked_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_volunteer_registrations_attendance_marked_by_user_id_users",
        "volunteer_registrations",
        "users",
        ["attendance_marked_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    bind = op.get_bind()

    op.drop_constraint(
        "fk_volunteer_registrations_attendance_marked_by_user_id_users",
        "volunteer_registrations",
        type_="foreignkey",
    )
    op.drop_column("volunteer_registrations", "attendance_marked_by_user_id")
    op.drop_column("volunteer_registrations", "attendance_marked_at")
    op.drop_column("volunteer_registrations", "attendance_note")
    op.drop_column("volunteer_registrations", "attendance_status")

    volunteer_attendance_status_enum.drop(bind, checkfirst=True)
