"""Pydantic schemas for delivery & book-request APIs."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.models import RequestStatus, TaskStatus, TaskType


class BookRequestCreate(BaseModel):
    book_id: UUID
    request_location: str = Field(..., min_length=1, max_length=120)
    notes: str | None = Field(None, max_length=2000)


class BookRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    book_id: UUID
    request_location: str
    status: RequestStatus
    requested_at: datetime
    completed_at: datetime | None
    notes: str | None


class BookRequestListResponse(BaseModel):
    items: list[BookRequestResponse]
    page: int
    limit: int
    total: int


class DeliveryTaskCreate(BaseModel):
    request_id: UUID


class DeliveryTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    request_id: UUID | None
    return_id: UUID | None
    task_type: TaskType
    status: TaskStatus
    source_location: str
    destination_location: str
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    book_placed: bool


class DeliveryTaskListResponse(BaseModel):
    items: list[DeliveryTaskResponse]
    page: int
    limit: int
    total: int


class DeliveryTaskStatusUpdate(BaseModel):
    status: TaskStatus
    reason: str | None = Field(
        None,
        description="Optional human-readable reason or context, such as 'navigation_failed' or 'completed_ok'.",
        max_length=500,
    )
