"""book_returns: student_confirmed_at, auto_closed_without_confirm_at

Revision ID: 20260412_000004
Revises: 20260412_000003
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260412_000004"
down_revision = "20260412_000003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "book_returns",
        sa.Column("student_confirmed_at", sa.DateTime(timezone=True), nullable=True),
        schema="app",
    )
    op.add_column(
        "book_returns",
        sa.Column("auto_closed_without_confirm_at", sa.DateTime(timezone=True), nullable=True),
        schema="app",
    )


def downgrade() -> None:
    op.drop_column("book_returns", "auto_closed_without_confirm_at", schema="app")
    op.drop_column("book_returns", "student_confirmed_at", schema="app")
