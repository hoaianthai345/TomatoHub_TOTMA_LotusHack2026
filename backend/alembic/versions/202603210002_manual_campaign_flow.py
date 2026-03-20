"""Add manual campaign workflow fields

Revision ID: 202603210002
Revises: 202603210001
Create Date: 2026-03-21 02:05:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "202603210002"
down_revision: str | None = "202603210001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    campaign_status = postgresql.ENUM(
        "draft",
        "published",
        "closed",
        name="campaign_status",
        create_type=False,
    )
    campaign_status.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "campaigns",
        sa.Column(
            "support_types",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[\"money\"]'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column("campaigns", sa.Column("province", sa.String(length=120), nullable=True))
    op.add_column("campaigns", sa.Column("district", sa.String(length=120), nullable=True))
    op.add_column("campaigns", sa.Column("address_line", sa.String(length=255), nullable=True))
    op.add_column("campaigns", sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=True))
    op.add_column("campaigns", sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=True))
    op.add_column(
        "campaigns",
        sa.Column(
            "media_urls",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "campaigns",
        sa.Column(
            "status",
            campaign_status,
            server_default=sa.text("'draft'"),
            nullable=False,
        ),
    )
    op.add_column("campaigns", sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("campaigns", sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True))

    # Keep existing campaigns visible in public list after upgrade.
    op.execute(
        "UPDATE campaigns SET status = 'published', published_at = created_at WHERE is_active = true"
    )

    op.alter_column("campaigns", "support_types", server_default=None)
    op.alter_column("campaigns", "media_urls", server_default=None)
    op.alter_column("campaigns", "status", server_default=sa.text("'draft'"))

    op.create_index("ix_campaigns_status", "campaigns", ["status"], unique=False)
    op.create_check_constraint(
        "ck_campaigns_ends_after_starts",
        "campaigns",
        "ends_at IS NULL OR ends_at > starts_at",
    )


def downgrade() -> None:
    op.drop_constraint("ck_campaigns_ends_after_starts", "campaigns", type_="check")
    op.drop_index("ix_campaigns_status", table_name="campaigns")

    op.drop_column("campaigns", "closed_at")
    op.drop_column("campaigns", "published_at")
    op.drop_column("campaigns", "status")
    op.drop_column("campaigns", "media_urls")
    op.drop_column("campaigns", "longitude")
    op.drop_column("campaigns", "latitude")
    op.drop_column("campaigns", "address_line")
    op.drop_column("campaigns", "district")
    op.drop_column("campaigns", "province")
    op.drop_column("campaigns", "support_types")

    postgresql.ENUM(
        "draft",
        "published",
        "closed",
        name="campaign_status",
        create_type=False,
    ).drop(
        op.get_bind(),
        checkfirst=True,
    )
