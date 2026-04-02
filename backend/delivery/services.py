"""Book request & delivery task persistence and state transitions."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from auth.schemas import UserResponse, UserRole
from book.repository import get_book_by_id
from delivery.schemas import (
    BookRequestListResponse,
    BookRequestResponse,
    DeliveryTaskListResponse,
    DeliveryTaskResponse,
)
from shared.models import (
    BookRequest,
    DeliveryTask,
    RequestStatus,
    TaskStatus,
    TaskStatusHistory,
    TaskType,
)


class DeliveryError(Exception):
    """Business rule violation; maps to 4xx."""

    def __init__(self, message: str, *, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def is_dispatchable(task: DeliveryTask) -> bool:
    """
    A delivery task is dispatchable when:
    - It has been confirmed as book-placed in metadata, and
    - Its status is QUEUED (ready for the robot/bridge to pick up).
    """
    meta = task.task_metadata or {}
    return bool(meta.get("book_placed")) and task.status == TaskStatus.QUEUED


def task_to_response(task: DeliveryTask) -> DeliveryTaskResponse:
    meta = task.task_metadata or {}
    return DeliveryTaskResponse(
        id=task.id,
        request_id=task.request_id,
        return_id=task.return_id,
        task_type=task.task_type,
        status=task.status,
        source_location=task.source_location,
        destination_location=task.destination_location,
        created_at=task.created_at,
        started_at=task.started_at,
        completed_at=task.completed_at,
        book_placed=bool(meta.get("book_placed")),
    )


def _append_task_history(
    db: Session,
    *,
    task_id: UUID,
    old_status: TaskStatus | None,
    new_status: TaskStatus,
    changed_by: UUID | None,
    reason: str | None = None,
) -> None:
    db.add(
        TaskStatusHistory(
            task_id=task_id,
            old_status=old_status,
            new_status=new_status,
            changed_by=changed_by,
            reason=reason,
        )
    )


def create_book_request(
    db: Session,
    *,
    user: UserResponse,
    book_id: UUID,
    request_location: str,
    notes: str | None,
) -> BookRequest:
    if user.role != UserRole.STUDENT:
        raise DeliveryError("Only students can create book delivery requests.")

    book = get_book_by_id(db, book_id)
    if book is None:
        raise DeliveryError("Book not found.", status_code=404)

    active = (
        db.query(BookRequest)
        .filter(
            BookRequest.user_id == user.id,
            BookRequest.book_id == book_id,
            BookRequest.status.in_(
                (
                    RequestStatus.PENDING,
                    RequestStatus.APPROVED,
                    RequestStatus.IN_PROGRESS,
                )
            ),
        )
        .first()
    )
    if active:
        return active

    req = BookRequest(
        user_id=user.id,
        book_id=book_id,
        request_location=request_location.strip(),
        status=RequestStatus.PENDING,
        notes=notes.strip() if notes else None,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


def list_book_requests(
    db: Session,
    *,
    user: UserResponse,
    page: int = 1,
    limit: int = 20,
) -> BookRequestListResponse:
    limit = min(max(limit, 1), 100)
    page = max(page, 1)

    q = db.query(BookRequest)
    if user.role == UserRole.STUDENT:
        q = q.filter(BookRequest.user_id == user.id)

    total = q.count()
    rows: list[BookRequest] = (
        q.order_by(BookRequest.requested_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return BookRequestListResponse(
        items=[BookRequestResponse.model_validate(r) for r in rows],
        page=page,
        limit=limit,
        total=total,
    )


def get_book_request(db: Session, *, user: UserResponse, request_id: UUID) -> BookRequest:
    row = db.get(BookRequest, request_id)
    if row is None:
        raise DeliveryError("Request not found.", status_code=404)
    if user.role == UserRole.STUDENT and row.user_id != user.id:
        raise DeliveryError("Not allowed to view this request.", status_code=403)
    return row


def approve_book_request(db: Session, *, user: UserResponse, request_id: UUID) -> BookRequest:
    if user.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
        raise DeliveryError("Only librarians can approve requests.")

    row = db.get(BookRequest, request_id)
    if row is None:
        raise DeliveryError("Request not found.", status_code=404)
    if row.status != RequestStatus.PENDING:
        raise DeliveryError("Only pending requests can be approved.")

    row.status = RequestStatus.APPROVED
    db.commit()
    db.refresh(row)
    return row


def cancel_book_request(db: Session, *, user: UserResponse, request_id: UUID) -> BookRequest:
    row = db.get(BookRequest, request_id)
    if row is None:
        raise DeliveryError("Request not found.", status_code=404)

    if user.role == UserRole.STUDENT:
        if row.user_id != user.id:
            raise DeliveryError("Not allowed to cancel this request.", status_code=403)
        if row.status != RequestStatus.PENDING:
            raise DeliveryError("You can only cancel pending requests.")
    elif user.role in (UserRole.LIBRARIAN, UserRole.ADMIN):
        if row.status in (RequestStatus.IN_PROGRESS, RequestStatus.COMPLETED):
            raise DeliveryError("Cannot cancel a request that is in progress or completed.")
    else:
        raise DeliveryError("Not allowed to cancel requests.")

    row.status = RequestStatus.CANCELLED
    db.commit()
    db.refresh(row)
    return row


def create_delivery_task_from_request(
    db: Session,
    *,
    user: UserResponse,
    request_id: UUID,
) -> DeliveryTask:
    if user.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
        raise DeliveryError("Only librarians can create delivery tasks.")

    existing = db.query(DeliveryTask).filter(DeliveryTask.request_id == request_id).first()
    if existing:
        return existing

    br = db.get(BookRequest, request_id)
    if br is None:
        raise DeliveryError("Request not found.", status_code=404)
    if br.status != RequestStatus.APPROVED:
        raise DeliveryError("Request must be approved before creating a delivery task.")

    book = get_book_by_id(db, br.book_id)
    if book is None:
        raise DeliveryError("Book not found for this request.", status_code=404)

    source = (book.shelf_location or "").strip() or "Stacks"
    task = DeliveryTask(
        request_id=br.id,
        return_id=None,
        task_type=TaskType.STUDENT_DELIVERY,
        status=TaskStatus.PENDING,
        source_location=source[:120],
        destination_location=br.request_location[:120],
        task_metadata={"book_placed": False},
    )
    db.add(task)
    db.flush()
    _append_task_history(
        db,
        task_id=task.id,
        old_status=None,
        new_status=TaskStatus.PENDING,
        changed_by=user.id,
        reason="task_created",
    )
    br.status = RequestStatus.IN_PROGRESS
    db.commit()
    db.refresh(task)
    return task


def list_delivery_tasks(
    db: Session,
    *,
    user: UserResponse,
    page: int = 1,
    limit: int = 20,
) -> DeliveryTaskListResponse:
    limit = min(max(limit, 1), 100)
    page = max(page, 1)

    q = db.query(DeliveryTask)
    if user.role == UserRole.STUDENT:
        q = q.join(BookRequest, BookRequest.id == DeliveryTask.request_id).filter(
            BookRequest.user_id == user.id
        )

    total = q.count()
    rows: list[DeliveryTask] = (
        q.order_by(DeliveryTask.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return DeliveryTaskListResponse(
        items=[task_to_response(t) for t in rows],
        page=page,
        limit=limit,
        total=total,
    )


def get_delivery_task(db: Session, *, user: UserResponse, task_id: UUID) -> DeliveryTask:
    task = db.get(DeliveryTask, task_id)
    if task is None:
        raise DeliveryError("Task not found.", status_code=404)

    if user.role == UserRole.STUDENT:
        if task.request_id is None:
            raise DeliveryError("Not allowed to view this task.", status_code=403)
        br = db.get(BookRequest, task.request_id)
        if br is None or br.user_id != user.id:
            raise DeliveryError("Not allowed to view this task.", status_code=403)

    return task


def confirm_book_placed(db: Session, *, user: UserResponse, task_id: UUID) -> DeliveryTask:
    if user.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
        raise DeliveryError("Only librarians can confirm book placement.")

    task = get_delivery_task(db, user=user, task_id=task_id)
    if task.status in (TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.FAILED):
        raise DeliveryError("Cannot update a terminal task.")

    meta = dict(task.task_metadata or {})
    if meta.get("book_placed"):
        db.refresh(task)
        return task

    meta["book_placed"] = True
    meta["book_placed_at"] = datetime.now(timezone.utc).isoformat()
    old_status = task.status
    task.task_metadata = meta

    if task.status == TaskStatus.PENDING:
        task.status = TaskStatus.QUEUED
        _append_task_history(
            db,
            task_id=task.id,
            old_status=old_status,
            new_status=TaskStatus.QUEUED,
            changed_by=user.id,
            reason="book_placed",
        )

    db.commit()
    db.refresh(task)
    return task


def update_delivery_task_status(
    db: Session,
    *,
    user: UserResponse,
    task_id: UUID,
    new_status: TaskStatus,
    reason: str | None = None,
) -> DeliveryTask:
    """
    Update a delivery task status while enforcing legal transitions and recording history.

    This is intended for bridge/robot and operator flows once a task is dispatchable.
    """
    task = get_delivery_task(db, user=user, task_id=task_id)

    # Do not allow any changes once the task is terminal.
    if task.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED):
        raise DeliveryError("Cannot change status of a terminal task.", status_code=400)

    current = task.status
    allowed_next: dict[TaskStatus, set[TaskStatus]] = {
        TaskStatus.PENDING: {TaskStatus.CANCELLED, TaskStatus.FAILED},
        TaskStatus.QUEUED: {TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED, TaskStatus.FAILED},
        TaskStatus.ASSIGNED: {TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED, TaskStatus.FAILED},
        TaskStatus.IN_PROGRESS: {TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED},
    }

    if new_status == current:
        # Idempotent no-op; just refresh and return.
        db.refresh(task)
        return task

    allowed = allowed_next.get(current, set())
    if new_status not in allowed:
        raise DeliveryError(
            f"Illegal status transition: {current.value} -> {new_status.value}", status_code=400
        )

    old_status = task.status
    task.status = new_status

    now = datetime.now(timezone.utc)
    if new_status == TaskStatus.IN_PROGRESS and task.started_at is None:
        task.started_at = now
    if new_status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED):
        task.completed_at = now

    _append_task_history(
        db,
        task_id=task.id,
        old_status=old_status,
        new_status=new_status,
        changed_by=user.id,
        reason=reason,
    )

    db.commit()
    db.refresh(task)
    return task
