"""Add compatibility columns for volunteer registrations

Revision ID: 202603220002
Revises: 202603220001
Create Date: 2026-03-22 10:15:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "202603220002"
down_revision: str | None = "202603220001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TABLE = "volunteer_registrations"
_FK_NAME = "fk_volunteer_registrations_attendance_marked_by_user_id"


def _get_column_names() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns(_TABLE)}


def _get_fk_names() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {
        fk["name"]
        for fk in inspector.get_foreign_keys(_TABLE)
        if fk.get("name")
    }


def upgrade() -> None:
    columns = _get_column_names()
    if "role" not in columns:
        op.add_column(_TABLE, sa.Column("role", sa.String(length=120), nullable=True))
    if "shift_start_at" not in columns:
        op.add_column(_TABLE, sa.Column("shift_start_at", sa.DateTime(timezone=True), nullable=True))
    if "shift_end_at" not in columns:
        op.add_column(_TABLE, sa.Column("shift_end_at", sa.DateTime(timezone=True), nullable=True))
    if "attendance_status" not in columns:
        op.add_column(_TABLE, sa.Column("attendance_status", sa.String(length=30), nullable=True))
    if "attendance_note" not in columns:
        op.add_column(_TABLE, sa.Column("attendance_note", sa.Text(), nullable=True))
    if "attendance_marked_at" not in columns:
        op.add_column(_TABLE, sa.Column("attendance_marked_at", sa.DateTime(timezone=True), nullable=True))
    if "attendance_marked_by_user_id" not in columns:
        op.add_column(
            _TABLE,
            sa.Column("attendance_marked_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        )

    fk_names = _get_fk_names()
    if _FK_NAME not in fk_names and "attendance_marked_by_user_id" in _get_column_names():
        op.create_foreign_key(
            _FK_NAME,
            _TABLE,
            "users",
            ["attendance_marked_by_user_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    fk_names = _get_fk_names()
    if _FK_NAME in fk_names:
        op.drop_constraint(_FK_NAME, _TABLE, type_="foreignkey")

    columns = _get_column_names()
    if "attendance_marked_by_user_id" in columns:
        op.drop_column(_TABLE, "attendance_marked_by_user_id")
    if "attendance_marked_at" in columns:
        op.drop_column(_TABLE, "attendance_marked_at")
    if "attendance_note" in columns:
        op.drop_column(_TABLE, "attendance_note")
    if "attendance_status" in columns:
        op.drop_column(_TABLE, "attendance_status")
    if "shift_end_at" in columns:
        op.drop_column(_TABLE, "shift_end_at")
    if "shift_start_at" in columns:
        op.drop_column(_TABLE, "shift_start_at")
    if "role" in columns:
        op.drop_column(_TABLE, "role")
