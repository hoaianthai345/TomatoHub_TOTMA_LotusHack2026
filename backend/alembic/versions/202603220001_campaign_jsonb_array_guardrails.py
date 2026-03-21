"""Normalize campaign jsonb array fields and add guardrails

Revision ID: 202603220001
Revises: 202603210009
Create Date: 2026-03-22 09:35:00
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "202603220001"
down_revision: str | None = "202603210009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Repair old/bad rows where JSONB object {} was saved instead of array [].
    op.execute(
        """
        UPDATE campaigns
        SET tags = '[]'::jsonb
        WHERE tags IS NULL OR jsonb_typeof(tags) <> 'array'
        """
    )
    op.execute(
        """
        UPDATE campaigns
        SET media_urls = '[]'::jsonb
        WHERE media_urls IS NULL OR jsonb_typeof(media_urls) <> 'array'
        """
    )
    op.execute(
        """
        UPDATE campaigns
        SET support_types = '["money"]'::jsonb
        WHERE support_types IS NULL OR jsonb_typeof(support_types) <> 'array'
        """
    )

    op.create_check_constraint(
        "ck_campaigns_tags_is_array",
        "campaigns",
        "jsonb_typeof(tags) = 'array'",
    )
    op.create_check_constraint(
        "ck_campaigns_media_urls_is_array",
        "campaigns",
        "jsonb_typeof(media_urls) = 'array'",
    )
    op.create_check_constraint(
        "ck_campaigns_support_types_is_array",
        "campaigns",
        "jsonb_typeof(support_types) = 'array'",
    )


def downgrade() -> None:
    op.drop_constraint("ck_campaigns_support_types_is_array", "campaigns", type_="check")
    op.drop_constraint("ck_campaigns_media_urls_is_array", "campaigns", type_="check")
    op.drop_constraint("ck_campaigns_tags_is_array", "campaigns", type_="check")
