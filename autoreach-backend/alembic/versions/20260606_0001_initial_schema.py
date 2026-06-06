"""Initial AutoReach AI schema.

Revision ID: 20260606_0001
Revises:
Create Date: 2026-06-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260606_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


thread_status = sa.Enum(
    "tracking",
    "draft_ready",
    "replied",
    "dismissed",
    name="threadstatus",
    native_enum=False,
    length=32,
)
intent_tag = sa.Enum(
    "job_application",
    "sales",
    "networking",
    "internship",
    "other",
    name="intenttag",
    native_enum=False,
    length=32,
)
draft_status = sa.Enum(
    "pending",
    "approved",
    "sent",
    "dismissed",
    "regenerated",
    name="draftstatus",
    native_enum=False,
    length=32,
)


def upgrade() -> None:
    op.create_table(
        "email_threads",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=255), nullable=False),
        sa.Column("recipient_email", sa.String(length=320), nullable=False),
        sa.Column("recipient_name", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=998), nullable=False),
        sa.Column("original_body", sa.Text(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", thread_status, nullable=False),
        sa.Column("intent_tag", intent_tag, nullable=False),
        sa.Column("urgency_score", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_email_threads_created_at", "email_threads", ["created_at"])
    op.create_index("ix_email_threads_recipient_email", "email_threads", ["recipient_email"])
    op.create_index("ix_email_threads_sent_at", "email_threads", ["sent_at"])
    op.create_index("ix_email_threads_status", "email_threads", ["status"])
    op.create_index("ix_email_threads_user_id", "email_threads", ["user_id"])

    op.create_table(
        "ai_drafts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("thread_id", sa.String(length=36), nullable=False),
        sa.Column("draft_subject", sa.String(length=998), nullable=False),
        sa.Column("draft_body", sa.Text(), nullable=False),
        sa.Column("tone", sa.String(length=100), nullable=False),
        sa.Column("tokens_used", sa.Integer(), nullable=False),
        sa.Column("status", draft_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["thread_id"], ["email_threads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_drafts_created_at", "ai_drafts", ["created_at"])
    op.create_index("ix_ai_drafts_status", "ai_drafts", ["status"])
    op.create_index("ix_ai_drafts_thread_id", "ai_drafts", ["thread_id"])


def downgrade() -> None:
    op.drop_index("ix_ai_drafts_thread_id", table_name="ai_drafts")
    op.drop_index("ix_ai_drafts_status", table_name="ai_drafts")
    op.drop_index("ix_ai_drafts_created_at", table_name="ai_drafts")
    op.drop_table("ai_drafts")

    op.drop_index("ix_email_threads_user_id", table_name="email_threads")
    op.drop_index("ix_email_threads_status", table_name="email_threads")
    op.drop_index("ix_email_threads_sent_at", table_name="email_threads")
    op.drop_index("ix_email_threads_recipient_email", table_name="email_threads")
    op.drop_index("ix_email_threads_created_at", table_name="email_threads")
    op.drop_table("email_threads")
