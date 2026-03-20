"""Add auth and frontend data fields

Revision ID: 202603210003
Revises: 202603210002
Create Date: 2026-03-21 04:30:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "202603210003"
down_revision: str | None = "202603210002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    beneficiary_status = postgresql.ENUM(
        "added",
        "verified",
        "assigned",
        "received",
        name="beneficiary_status",
        create_type=False,
    )
    beneficiary_status.create(op.get_bind(), checkfirst=True)

    op.add_column("organizations", sa.Column("location", sa.String(length=120), nullable=True))
    op.add_column(
        "organizations",
        sa.Column("verified", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column("organizations", sa.Column("logo_url", sa.String(length=500), nullable=True))

    op.add_column("users", sa.Column("location", sa.String(length=120), nullable=True))
    op.add_column(
        "users",
        sa.Column(
            "support_types",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )

    op.add_column("campaigns", sa.Column("short_description", sa.String(length=500), nullable=True))
    op.add_column(
        "campaigns",
        sa.Column(
            "tags",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column("campaigns", sa.Column("cover_image_url", sa.String(length=500), nullable=True))

    op.add_column("beneficiaries", sa.Column("location", sa.String(length=255), nullable=True))
    op.add_column(
        "beneficiaries",
        sa.Column(
            "status",
            beneficiary_status,
            server_default=sa.text("'added'"),
            nullable=False,
        ),
    )

    op.execute(
        "UPDATE beneficiaries SET status = CASE WHEN is_verified = true THEN 'verified' ELSE 'added' END"
    )

    op.alter_column("organizations", "verified", server_default=None)
    op.alter_column("users", "support_types", server_default=None)
    op.alter_column("campaigns", "tags", server_default=None)
    op.alter_column("beneficiaries", "status", server_default=sa.text("'added'"))


def downgrade() -> None:
    op.drop_column("beneficiaries", "status")
    op.drop_column("beneficiaries", "location")

    op.drop_column("campaigns", "cover_image_url")
    op.drop_column("campaigns", "tags")
    op.drop_column("campaigns", "short_description")

    op.drop_column("users", "support_types")
    op.drop_column("users", "location")

    op.drop_column("organizations", "logo_url")
    op.drop_column("organizations", "verified")
    op.drop_column("organizations", "location")

    postgresql.ENUM(
        "added",
        "verified",
        "assigned",
        "received",
        name="beneficiary_status",
        create_type=False,
    ).drop(
        op.get_bind(),
        checkfirst=True,
    )
