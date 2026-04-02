"""book_requests: approved_at, in_progress_at for delivery timeline.

Revision ID: 20260402_000002
Revises: 20260224_000001
Create Date: 2026-04-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260402_000002"
down_revision: Union[str, None] = "20260224_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "book_requests",
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        schema="app",
    )
    op.add_column(
        "book_requests",
        sa.Column("in_progress_at", sa.DateTime(timezone=True), nullable=True),
        schema="app",
    )


def downgrade() -> None:
    op.drop_column("book_requests", "in_progress_at", schema="app")
    op.drop_column("book_requests", "approved_at", schema="app")
