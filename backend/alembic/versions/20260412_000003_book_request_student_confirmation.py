"""book_requests: student_confirmed_at, auto_closed_without_confirm_at

Revision ID: 20260412_000003
Revises: 20260402_000002
Create Date: 2026-04-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260412_000003"
down_revision: Union[str, None] = "20260402_000002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "book_requests",
        sa.Column("student_confirmed_at", sa.DateTime(timezone=True), nullable=True),
        schema="app",
    )
    op.add_column(
        "book_requests",
        sa.Column("auto_closed_without_confirm_at", sa.DateTime(timezone=True), nullable=True),
        schema="app",
    )


def downgrade() -> None:
    op.drop_column("book_requests", "auto_closed_without_confirm_at", schema="app")
    op.drop_column("book_requests", "student_confirmed_at", schema="app")
