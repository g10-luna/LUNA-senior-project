"""Initial canonical app/ops schema for LUNA.

Revision ID: 20260224_000001
Revises:
Create Date: 2026-02-24 12:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "20260224_000001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS app")
    op.execute("CREATE SCHEMA IF NOT EXISTS ops")

    user_role_enum = postgresql.ENUM(
        "STUDENT", "LIBRARIAN", "ADMIN", name="user_role_enum", create_type=False
    )
    book_status_enum = postgresql.ENUM(
        "AVAILABLE",
        "CHECKED_OUT",
        "RESERVED",
        "UNAVAILABLE",
        name="book_status_enum",
        create_type=False,
    )
    request_status_enum = postgresql.ENUM(
        "PENDING",
        "APPROVED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        name="request_status_enum",
        create_type=False,
    )
    return_status_enum = postgresql.ENUM(
        "PENDING",
        "PICKUP_SCHEDULED",
        "PICKED_UP",
        "COMPLETED",
        "CANCELLED",
        name="return_status_enum",
        create_type=False,
    )
    task_type_enum = postgresql.ENUM(
        "STUDENT_DELIVERY",
        "RETURN_PICKUP",
        "INTER_STAFF",
        "WORKSTATION",
        "TRANSFER",
        name="task_type_enum",
        create_type=False,
    )
    task_priority_enum = postgresql.ENUM(
        "LOW", "NORMAL", "HIGH", "URGENT", name="task_priority_enum", create_type=False
    )
    task_status_enum = postgresql.ENUM(
        "PENDING",
        "QUEUED",
        "ASSIGNED",
        "IN_PROGRESS",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
        name="task_status_enum",
        create_type=False,
    )
    robot_status_enum = postgresql.ENUM(
        "IDLE", "BUSY", "NAVIGATING", "ERROR", "MAINTENANCE", name="robot_status_enum", create_type=False
    )
    notification_type_enum = postgresql.ENUM(
        "DELIVERY_UPDATE",
        "REQUEST_STATUS",
        "SYSTEM_ALERT",
        "ROBOT_STATUS",
        name="notification_type_enum",
        create_type=False,
    )

    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)
    book_status_enum.create(bind, checkfirst=True)
    request_status_enum.create(bind, checkfirst=True)
    return_status_enum.create(bind, checkfirst=True)
    task_type_enum.create(bind, checkfirst=True)
    task_priority_enum.create(bind, checkfirst=True)
    task_status_enum.create(bind, checkfirst=True)
    robot_status_enum.create(bind, checkfirst=True)
    notification_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "user_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("role", user_role_enum, nullable=False, server_default="STUDENT"),
        sa.Column("phone_number", sa.String(length=30), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("email", name="uq_user_profiles_email"),
        schema="app",
    )
    op.create_index("ix_user_profiles_email", "user_profiles", ["email"], unique=False, schema="app")

    op.create_table(
        "books",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("isbn", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("author", sa.String(length=200), nullable=False),
        sa.Column("publisher", sa.String(length=200), nullable=True),
        sa.Column("publication_year", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cover_image_url", sa.Text(), nullable=True),
        sa.Column("status", book_status_enum, nullable=False, server_default="AVAILABLE"),
        sa.Column("shelf_location", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("isbn", name="uq_books_isbn"),
        schema="app",
    )
    op.create_index("ix_books_title", "books", ["title"], unique=False, schema="app")
    op.create_index("ix_books_author", "books", ["author"], unique=False, schema="app")
    op.create_index("ix_books_isbn", "books", ["isbn"], unique=False, schema="app")

    op.create_table(
        "book_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app.user_profiles.id"), nullable=False),
        sa.Column("book_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app.books.id"), nullable=False),
        sa.Column("request_location", sa.String(length=120), nullable=False),
        sa.Column("status", request_status_enum, nullable=False, server_default="PENDING"),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        schema="app",
    )
    op.create_index("ix_book_requests_user_id", "book_requests", ["user_id"], unique=False, schema="app")
    op.create_index("ix_book_requests_status", "book_requests", ["status"], unique=False, schema="app")

    op.create_table(
        "book_returns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app.user_profiles.id"), nullable=False),
        sa.Column("book_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app.books.id"), nullable=False),
        sa.Column("pickup_location", sa.String(length=120), nullable=False),
        sa.Column("status", return_status_enum, nullable=False, server_default="PENDING"),
        sa.Column("initiated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("picked_up_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        schema="app",
    )
    op.create_index("ix_book_returns_user_id", "book_returns", ["user_id"], unique=False, schema="app")
    op.create_index("ix_book_returns_status", "book_returns", ["status"], unique=False, schema="app")

    op.create_table(
        "robots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("robot_name", sa.String(length=100), nullable=False),
        sa.Column("status", robot_status_enum, nullable=False, server_default="IDLE"),
        sa.Column("current_location", sa.String(length=120), nullable=True),
        sa.Column("battery_level", sa.Float(), nullable=True),
        sa.Column("sensor_data", sa.JSON(), nullable=True),
        sa.Column("last_heartbeat", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("robot_name", name="uq_robots_robot_name"),
        schema="ops",
    )
    op.create_index("ix_robots_status", "robots", ["status"], unique=False, schema="ops")

    op.create_table(
        "delivery_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app.book_requests.id", ondelete="SET NULL"), nullable=True),
        sa.Column("return_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app.book_returns.id", ondelete="SET NULL"), nullable=True),
        sa.Column("task_type", task_type_enum, nullable=False),
        sa.Column("priority", task_priority_enum, nullable=False, server_default="NORMAL"),
        sa.Column("status", task_status_enum, nullable=False, server_default="PENDING"),
        sa.Column("assigned_robot_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ops.robots.id", ondelete="SET NULL"), nullable=True),
        sa.Column("source_location", sa.String(length=120), nullable=False),
        sa.Column("destination_location", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.CheckConstraint(
            "(request_id IS NULL) <> (return_id IS NULL)",
            name="ck_delivery_task_exactly_one_source",
        ),
        schema="app",
    )
    op.create_index("ix_delivery_tasks_status", "delivery_tasks", ["status"], unique=False, schema="app")
    op.create_index("ix_delivery_tasks_priority", "delivery_tasks", ["priority"], unique=False, schema="app")
    op.create_index("ix_delivery_tasks_created_at", "delivery_tasks", ["created_at"], unique=False, schema="app")

    op.create_table(
        "task_status_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app.delivery_tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("old_status", task_status_enum, nullable=True),
        sa.Column("new_status", task_status_enum, nullable=False),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("reason", sa.Text(), nullable=True),
        schema="app",
    )
    op.create_index("ix_task_status_history_task_id", "task_status_history", ["task_id"], unique=False, schema="app")

    op.create_table(
        "waypoints",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("location_code", sa.String(length=80), nullable=False),
        sa.Column("x_coordinate", sa.Float(), nullable=False),
        sa.Column("y_coordinate", sa.Float(), nullable=False),
        sa.Column("z_coordinate", sa.Float(), nullable=False, server_default="0"),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("name", name="uq_waypoints_name"),
        sa.UniqueConstraint("location_code", name="uq_waypoints_location_code"),
        schema="ops",
    )
    op.create_index("ix_waypoints_location_code", "waypoints", ["location_code"], unique=False, schema="ops")

    op.create_table(
        "task_waypoints",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app.delivery_tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("waypoint_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ops.waypoints.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sequence_order", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("task_id", "waypoint_id", name="uq_task_waypoint_pair"),
        schema="app",
    )
    op.create_index("ix_task_waypoints_task_id", "task_waypoints", ["task_id"], unique=False, schema="app")

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app.user_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("notification_type", notification_type_enum, nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        schema="app",
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"], unique=False, schema="app")
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"], unique=False, schema="app")
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"], unique=False, schema="app")

    op.create_table(
        "notification_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app.user_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("push_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("in_app_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", name="uq_notification_preferences_user_id"),
        schema="app",
    )

    op.create_table(
        "robot_status_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("robot_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ops.robots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", robot_status_enum, nullable=False),
        sa.Column("current_location", sa.String(length=120), nullable=True),
        sa.Column("battery_level", sa.Float(), nullable=True),
        sa.Column("sensor_data", sa.JSON(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        schema="ops",
    )
    op.create_index("ix_robot_status_logs_robot_id", "robot_status_logs", ["robot_id"], unique=False, schema="ops")

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=150), nullable=False),
        sa.Column("resource_type", sa.String(length=120), nullable=False),
        sa.Column("resource_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("changes", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        schema="ops",
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"], unique=False, schema="ops")
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"], unique=False, schema="ops")


def downgrade() -> None:
    op.drop_index("ix_audit_logs_action", table_name="audit_logs", schema="ops")
    op.drop_index("ix_audit_logs_user_id", table_name="audit_logs", schema="ops")
    op.drop_table("audit_logs", schema="ops")

    op.drop_index("ix_robot_status_logs_robot_id", table_name="robot_status_logs", schema="ops")
    op.drop_table("robot_status_logs", schema="ops")

    op.drop_table("notification_preferences", schema="app")

    op.drop_index("ix_notifications_created_at", table_name="notifications", schema="app")
    op.drop_index("ix_notifications_is_read", table_name="notifications", schema="app")
    op.drop_index("ix_notifications_user_id", table_name="notifications", schema="app")
    op.drop_table("notifications", schema="app")

    op.drop_index("ix_task_waypoints_task_id", table_name="task_waypoints", schema="app")
    op.drop_table("task_waypoints", schema="app")

    op.drop_index("ix_waypoints_location_code", table_name="waypoints", schema="ops")
    op.drop_table("waypoints", schema="ops")

    op.drop_index("ix_task_status_history_task_id", table_name="task_status_history", schema="app")
    op.drop_table("task_status_history", schema="app")

    op.drop_index("ix_delivery_tasks_created_at", table_name="delivery_tasks", schema="app")
    op.drop_index("ix_delivery_tasks_priority", table_name="delivery_tasks", schema="app")
    op.drop_index("ix_delivery_tasks_status", table_name="delivery_tasks", schema="app")
    op.drop_table("delivery_tasks", schema="app")

    op.drop_index("ix_robots_status", table_name="robots", schema="ops")
    op.drop_table("robots", schema="ops")

    op.drop_index("ix_book_returns_status", table_name="book_returns", schema="app")
    op.drop_index("ix_book_returns_user_id", table_name="book_returns", schema="app")
    op.drop_table("book_returns", schema="app")

    op.drop_index("ix_book_requests_status", table_name="book_requests", schema="app")
    op.drop_index("ix_book_requests_user_id", table_name="book_requests", schema="app")
    op.drop_table("book_requests", schema="app")

    op.drop_index("ix_books_isbn", table_name="books", schema="app")
    op.drop_index("ix_books_author", table_name="books", schema="app")
    op.drop_index("ix_books_title", table_name="books", schema="app")
    op.drop_table("books", schema="app")

    op.drop_index("ix_user_profiles_email", table_name="user_profiles", schema="app")
    op.drop_table("user_profiles", schema="app")

    bind = op.get_bind()
    postgresql.ENUM(name="notification_type_enum").drop(bind, checkfirst=True)
    postgresql.ENUM(name="robot_status_enum").drop(bind, checkfirst=True)
    postgresql.ENUM(name="task_status_enum").drop(bind, checkfirst=True)
    postgresql.ENUM(name="task_priority_enum").drop(bind, checkfirst=True)
    postgresql.ENUM(name="task_type_enum").drop(bind, checkfirst=True)
    postgresql.ENUM(name="return_status_enum").drop(bind, checkfirst=True)
    postgresql.ENUM(name="request_status_enum").drop(bind, checkfirst=True)
    postgresql.ENUM(name="book_status_enum").drop(bind, checkfirst=True)
    postgresql.ENUM(name="user_role_enum").drop(bind, checkfirst=True)

    op.execute("DROP SCHEMA IF EXISTS app CASCADE")
    op.execute("DROP SCHEMA IF EXISTS ops CASCADE")

