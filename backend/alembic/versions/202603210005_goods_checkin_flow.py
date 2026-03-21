"""Add goods check-in records for QR module

Revision ID: 202603210005
Revises: 202603210004
Create Date: 2026-03-21 10:05:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "202603210005"
down_revision: str | None = "202603210004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "goods_checkins",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("checkpoint_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("donor_name", sa.String(length=255), nullable=False),
        sa.Column("item_name", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("unit", sa.String(length=50), nullable=False, server_default="item"),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["checkpoint_id"], ["campaign_checkpoints.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_goods_checkins_campaign_checked_in_at",
        "goods_checkins",
        ["campaign_id", "checked_in_at"],
        unique=False,
    )
    op.create_index(
        "ix_goods_checkins_checkpoint_checked_in_at",
        "goods_checkins",
        ["checkpoint_id", "checked_in_at"],
        unique=False,
    )
    op.alter_column("goods_checkins", "unit", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_goods_checkins_checkpoint_checked_in_at", table_name="goods_checkins")
    op.drop_index("ix_goods_checkins_campaign_checked_in_at", table_name="goods_checkins")
    op.drop_table("goods_checkins")
