"""
Canonical SQLAlchemy models for LUNA v1 data design.

Design notes:
- Supabase Auth remains the source of truth for credentials and JWT.
- user_profiles.id stores the Supabase auth user UUID.
- Tables are split across `app` and `ops` schemas for clarity.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.db import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    LIBRARIAN = "LIBRARIAN"
    ADMIN = "ADMIN"


class BookStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    CHECKED_OUT = "CHECKED_OUT"
    RESERVED = "RESERVED"
    UNAVAILABLE = "UNAVAILABLE"


class RequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class ReturnStatus(str, enum.Enum):
    PENDING = "PENDING"
    PICKUP_SCHEDULED = "PICKUP_SCHEDULED"
    PICKED_UP = "PICKED_UP"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class TaskType(str, enum.Enum):
    STUDENT_DELIVERY = "STUDENT_DELIVERY"
    RETURN_PICKUP = "RETURN_PICKUP"
    INTER_STAFF = "INTER_STAFF"
    WORKSTATION = "WORKSTATION"
    TRANSFER = "TRANSFER"


class TaskPriority(str, enum.Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class RobotStatus(str, enum.Enum):
    IDLE = "IDLE"
    BUSY = "BUSY"
    NAVIGATING = "NAVIGATING"
    ERROR = "ERROR"
    MAINTENANCE = "MAINTENANCE"


class NotificationType(str, enum.Enum):
    DELIVERY_UPDATE = "DELIVERY_UPDATE"
    REQUEST_STATUS = "REQUEST_STATUS"
    SYSTEM_ALERT = "SYSTEM_ALERT"
    ROBOT_STATUS = "ROBOT_STATUS"


class UserProfile(Base, TimestampMixin):
    __tablename__ = "user_profiles"
    __table_args__ = {"schema": "app"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role_enum"), nullable=False, default=UserRole.STUDENT
    )
    phone_number: Mapped[str | None] = mapped_column(String(30))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Book(Base, TimestampMixin):
    __tablename__ = "books"
    __table_args__ = {"schema": "app"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    isbn: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    author: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    publisher: Mapped[str | None] = mapped_column(String(200))
    publication_year: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    cover_image_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[BookStatus] = mapped_column(
        Enum(BookStatus, name="book_status_enum"),
        nullable=False,
        default=BookStatus.AVAILABLE,
    )
    shelf_location: Mapped[str | None] = mapped_column(String(120))


class BookRequest(Base):
    __tablename__ = "book_requests"
    __table_args__ = {"schema": "app"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("app.user_profiles.id"), nullable=False, index=True
    )
    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("app.books.id"), nullable=False, index=True
    )
    request_location: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus, name="request_status_enum"),
        nullable=False,
        default=RequestStatus.PENDING,
        index=True,
    )
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)


class BookReturn(Base):
    __tablename__ = "book_returns"
    __table_args__ = {"schema": "app"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("app.user_profiles.id"), nullable=False, index=True
    )
    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("app.books.id"), nullable=False, index=True
    )
    pickup_location: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[ReturnStatus] = mapped_column(
        Enum(ReturnStatus, name="return_status_enum"),
        nullable=False,
        default=ReturnStatus.PENDING,
        index=True,
    )
    initiated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    picked_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Robot(Base, TimestampMixin):
    __tablename__ = "robots"
    __table_args__ = {"schema": "ops"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    robot_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    status: Mapped[RobotStatus] = mapped_column(
        Enum(RobotStatus, name="robot_status_enum"),
        nullable=False,
        default=RobotStatus.IDLE,
        index=True,
    )
    current_location: Mapped[str | None] = mapped_column(String(120))
    battery_level: Mapped[float | None] = mapped_column(Float)
    sensor_data: Mapped[dict | None] = mapped_column(JSON)
    last_heartbeat: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DeliveryTask(Base):
    __tablename__ = "delivery_tasks"
    __table_args__ = (
        CheckConstraint(
            "(request_id IS NULL) <> (return_id IS NULL)",
            name="ck_delivery_task_exactly_one_source",
        ),
        {"schema": "app"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    request_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app.book_requests.id", ondelete="SET NULL"),
        index=True,
    )
    return_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app.book_returns.id", ondelete="SET NULL"),
        index=True,
    )
    task_type: Mapped[TaskType] = mapped_column(
        Enum(TaskType, name="task_type_enum"), nullable=False, index=True
    )
    priority: Mapped[TaskPriority] = mapped_column(
        Enum(TaskPriority, name="task_priority_enum"),
        nullable=False,
        default=TaskPriority.NORMAL,
        index=True,
    )
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, name="task_status_enum"),
        nullable=False,
        default=TaskStatus.PENDING,
        index=True,
    )
    assigned_robot_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ops.robots.id", ondelete="SET NULL"), index=True
    )
    source_location: Mapped[str] = mapped_column(String(120), nullable=False)
    destination_location: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    task_metadata: Mapped[dict | None] = mapped_column("metadata", JSON)


class TaskStatusHistory(Base):
    __tablename__ = "task_status_history"
    __table_args__ = {"schema": "app"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("app.delivery_tasks.id", ondelete="CASCADE"), index=True
    )
    old_status: Mapped[TaskStatus | None] = mapped_column(
        Enum(TaskStatus, name="task_status_enum")
    )
    new_status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, name="task_status_enum"), nullable=False
    )
    changed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    reason: Mapped[str | None] = mapped_column(Text)


class Waypoint(Base):
    __tablename__ = "waypoints"
    __table_args__ = {"schema": "ops"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    location_code: Mapped[str] = mapped_column(
        String(80), unique=True, nullable=False, index=True
    )
    x_coordinate: Mapped[float] = mapped_column(Float, nullable=False)
    y_coordinate: Mapped[float] = mapped_column(Float, nullable=False)
    z_coordinate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    waypoint_metadata: Mapped[dict | None] = mapped_column("metadata", JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class TaskWaypoint(Base):
    __tablename__ = "task_waypoints"
    __table_args__ = (
        UniqueConstraint("task_id", "waypoint_id", name="uq_task_waypoint_pair"),
        {"schema": "app"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("app.delivery_tasks.id", ondelete="CASCADE"), index=True
    )
    waypoint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ops.waypoints.id", ondelete="CASCADE"), index=True
    )
    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {"schema": "app"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("app.user_profiles.id", ondelete="CASCADE"), index=True
    )
    notification_type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type_enum"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSON)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    __table_args__ = {"schema": "app"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app.user_profiles.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    push_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    in_app_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class RobotStatusLog(Base):
    __tablename__ = "robot_status_logs"
    __table_args__ = {"schema": "ops"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    robot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ops.robots.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[RobotStatus] = mapped_column(
        Enum(RobotStatus, name="robot_status_enum"), nullable=False
    )
    current_location: Mapped[str | None] = mapped_column(String(120))
    battery_level: Mapped[float | None] = mapped_column(Float)
    sensor_data: Mapped[dict | None] = mapped_column(JSON)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = {"schema": "ops"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True)
    action: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(120), nullable=False)
    resource_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    changes: Mapped[dict | None] = mapped_column(JSON)
    ip_address: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

