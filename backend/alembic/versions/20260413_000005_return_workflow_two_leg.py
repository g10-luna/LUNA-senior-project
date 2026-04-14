"""Book return two-leg workflow: new statuses and timestamps.

Revision ID: 20260413_000005
Revises: 20260412_000004
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260413_000005"
down_revision = "20260412_000004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL cannot add enum values inside a transaction in older versions.
    # Enum types from initial migration live in public schema (not app.*).
    with op.get_context().autocommit_block():
        for val in (
            "AWAITING_STUDENT_LOAD",
            "READY_FOR_RETURN_LEG",
            "RETURN_IN_TRANSIT",
            "AWAITING_ADMIN_CONFIRM",
        ):
            op.execute(sa.text(f"ALTER TYPE return_status_enum ADD VALUE IF NOT EXISTS '{val}'"))

    op.add_column(
        "book_returns",
        sa.Column("student_book_loaded_at", sa.DateTime(timezone=True), nullable=True),
        schema="app",
    )
    op.add_column(
        "book_returns",
        sa.Column("admin_receipt_confirmed_at", sa.DateTime(timezone=True), nullable=True),
        schema="app",
    )


def downgrade() -> None:
    op.drop_column("book_returns", "admin_receipt_confirmed_at", schema="app")
    op.drop_column("book_returns", "student_book_loaded_at", schema="app")
