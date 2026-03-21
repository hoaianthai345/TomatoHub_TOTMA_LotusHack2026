"""Add credit score system for supporters and organizations

Revision ID: 202603210009
Revises: 202603210008
Create Date: 2026-03-21 23:05:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "202603210009"
down_revision: str | None = "202603210008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    credit_target_type = postgresql.ENUM(
        "supporter",
        "organization",
        name="credit_target_type",
        create_type=False,
    )
    credit_target_type.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "users",
        sa.Column(
            "credit_score",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "credit_score",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )

    op.create_table(
        "credit_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_type", credit_target_type, nullable=False),
        sa.Column("target_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("target_organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "context",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "(target_type = 'supporter' AND target_user_id IS NOT NULL AND target_organization_id IS NULL) OR "
            "(target_type = 'organization' AND target_organization_id IS NOT NULL AND target_user_id IS NULL)",
            name="ck_credit_events_target_consistency",
        ),
        sa.ForeignKeyConstraint(["target_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["target_organization_id"],
            ["organizations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_credit_events_target_user_created_at",
        "credit_events",
        ["target_user_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_credit_events_target_org_created_at",
        "credit_events",
        ["target_organization_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_credit_events_actor_user_id",
        "credit_events",
        ["actor_user_id"],
        unique=False,
    )

    op.alter_column("users", "credit_score", server_default=None)
    op.alter_column("organizations", "credit_score", server_default=None)
    op.alter_column("credit_events", "context", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_credit_events_actor_user_id", table_name="credit_events")
    op.drop_index("ix_credit_events_target_org_created_at", table_name="credit_events")
    op.drop_index("ix_credit_events_target_user_created_at", table_name="credit_events")
    op.drop_table("credit_events")

    op.drop_column("organizations", "credit_score")
    op.drop_column("users", "credit_score")

    postgresql.ENUM(
        "supporter",
        "organization",
        name="credit_target_type",
        create_type=False,
    ).drop(
        op.get_bind(),
        checkfirst=True,
    )
