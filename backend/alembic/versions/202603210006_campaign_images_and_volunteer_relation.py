"""Add campaign image uploads and volunteer campaign relation constraints

Revision ID: 202603210006
Revises: 202603210005
Create Date: 2026-03-21 12:10:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "202603210006"
down_revision: str | None = "202603210005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "campaign_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("uploaded_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("relative_path", sa.String(length=500), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=120), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("relative_path", name="uq_campaign_images_relative_path"),
    )
    op.create_index(
        "ix_campaign_images_campaign_id",
        "campaign_images",
        ["campaign_id"],
        unique=False,
    )
    op.create_index(
        "ix_campaign_images_uploaded_by_user_id",
        "campaign_images",
        ["uploaded_by_user_id"],
        unique=False,
    )

    # Keep one registration row per (campaign, user) relation for linked supporter accounts.
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY campaign_id, user_id
                    ORDER BY registered_at DESC, id DESC
                ) AS rn
            FROM volunteer_registrations
            WHERE user_id IS NOT NULL
        )
        DELETE FROM volunteer_registrations
        WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
        """
    )
    op.create_index(
        "uq_volunteer_registrations_campaign_user",
        "volunteer_registrations",
        ["campaign_id", "user_id"],
        unique=True,
        postgresql_where=sa.text("user_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_volunteer_registrations_campaign_user",
        table_name="volunteer_registrations",
    )

    op.drop_index("ix_campaign_images_uploaded_by_user_id", table_name="campaign_images")
    op.drop_index("ix_campaign_images_campaign_id", table_name="campaign_images")
    op.drop_table("campaign_images")
