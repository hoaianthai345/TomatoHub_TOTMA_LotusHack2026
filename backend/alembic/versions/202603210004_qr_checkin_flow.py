"""Add campaign checkpoints and volunteer QR attendance flow

Revision ID: 202603210004
Revises: 202603210003
Create Date: 2026-03-21 09:30:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "202603210004"
down_revision: str | None = "202603210003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "campaign_checkpoints",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("checkpoint_type", sa.String(length=50), nullable=False, server_default="volunteer"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("address_line", sa.String(length=255), nullable=True),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_campaign_checkpoints_campaign_id",
        "campaign_checkpoints",
        ["campaign_id"],
        unique=False,
    )
    op.create_index(
        "ix_campaign_checkpoints_organization_id",
        "campaign_checkpoints",
        ["organization_id"],
        unique=False,
    )

    op.create_table(
        "volunteer_attendances",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("checkpoint_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("registration_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("check_in_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("check_out_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["checkpoint_id"], ["campaign_checkpoints.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["registration_id"], ["volunteer_registrations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_volunteer_attendances_user_campaign",
        "volunteer_attendances",
        ["user_id", "campaign_id"],
        unique=False,
    )
    op.create_index(
        "ix_volunteer_attendances_open_session",
        "volunteer_attendances",
        ["checkpoint_id", "user_id", "check_out_at"],
        unique=False,
    )

    op.create_table(
        "checkpoint_scan_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("checkpoint_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("registration_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("scan_type", sa.String(length=30), nullable=False),
        sa.Column("result", sa.String(length=30), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("token_nonce", sa.String(length=64), nullable=True),
        sa.Column("scanned_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["checkpoint_id"], ["campaign_checkpoints.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["registration_id"], ["volunteer_registrations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_checkpoint_scan_logs_checkpoint_scanned_at",
        "checkpoint_scan_logs",
        ["checkpoint_id", "scanned_at"],
        unique=False,
    )
    op.create_index(
        "ix_checkpoint_scan_logs_user_id",
        "checkpoint_scan_logs",
        ["user_id"],
        unique=False,
    )

    op.alter_column("campaign_checkpoints", "checkpoint_type", server_default=None)
    op.alter_column("campaign_checkpoints", "is_active", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_checkpoint_scan_logs_user_id", table_name="checkpoint_scan_logs")
    op.drop_index(
        "ix_checkpoint_scan_logs_checkpoint_scanned_at",
        table_name="checkpoint_scan_logs",
    )
    op.drop_table("checkpoint_scan_logs")

    op.drop_index("ix_volunteer_attendances_open_session", table_name="volunteer_attendances")
    op.drop_index("ix_volunteer_attendances_user_campaign", table_name="volunteer_attendances")
    op.drop_table("volunteer_attendances")

    op.drop_index("ix_campaign_checkpoints_organization_id", table_name="campaign_checkpoints")
    op.drop_index("ix_campaign_checkpoints_campaign_id", table_name="campaign_checkpoints")
    op.drop_table("campaign_checkpoints")
