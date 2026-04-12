"""Book request & delivery task persistence and state transitions."""
from __future__ import annotations

import threading
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from auth.schemas import UserResponse, UserRole
from book.repository import get_book_by_id
from delivery.schemas import (
    BookRequestListResponse,
    BookRequestResponse,
    DeliveryTaskListResponse,
    DeliveryTaskResponse,
    TaskStatusEventResponse,
)
from shared.db import SessionLocal
from shared.models import (
    BookRequest,
    DeliveryTask,
    RequestStatus,
    TaskStatus,
    TaskStatusHistory,
    TaskType,
    UserProfile,
)


# Robot pickup + delivery duration used when starting a demo delivery run from the dashboard.
SIMULATED_DELIVERY_SECONDS = 240
# After robot delivery completes, the student must confirm within this window or the request auto-closes.
STUDENT_CONFIRM_MINUTES = 5


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


def _metadata_datetime(meta: dict, key: str) -> datetime | None:
    raw = meta.get(key)
    if not raw or not isinstance(raw, str):
        return None
    s = raw.strip().replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None


def _student_confirm_deadline_at(task: DeliveryTask) -> datetime | None:
    if task.status != TaskStatus.COMPLETED or task.completed_at is None:
        return None
    return task.completed_at + timedelta(minutes=STUDENT_CONFIRM_MINUTES)


def task_to_response(
    task: DeliveryTask,
    history: list[TaskStatusHistory] | None = None,
) -> DeliveryTaskResponse:
    meta = task.task_metadata or {}
    hist_models = [
        TaskStatusEventResponse.model_validate(h) for h in (history or [])
    ]
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
        book_placed_at=_metadata_datetime(meta, "book_placed_at"),
        delivery_eta_at=_metadata_datetime(meta, "delivery_eta_at")
        or _metadata_datetime(meta, "simulated_eta_at"),
        student_confirm_deadline_at=_student_confirm_deadline_at(task),
        status_history=hist_models,
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


def _apply_auto_close_if_confirm_deadline_passed(db: Session, br: BookRequest, task: DeliveryTask) -> bool:
    """Close the book request if the delivery task finished and the confirm window expired without confirmation."""
    if br.status != RequestStatus.IN_PROGRESS:
        return False
    if task.status != TaskStatus.COMPLETED or task.completed_at is None:
        return False
    if br.student_confirmed_at is not None:
        return False
    now = datetime.now(timezone.utc)
    deadline = task.completed_at + timedelta(minutes=STUDENT_CONFIRM_MINUTES)
    if now < deadline:
        return False
    br.status = RequestStatus.COMPLETED
    br.completed_at = now
    br.auto_closed_without_confirm_at = now
    db.commit()
    db.refresh(br)
    return True


def ensure_book_request_auto_closed_if_stale(db: Session, br: BookRequest) -> BookRequest:
    """If the robot run finished but the student never confirmed and the window passed, close the request.

    Runs on read so list/detail stay correct when the in-process timer did not fire (server restart, etc.).
    """
    task = (
        db.query(DeliveryTask)
        .filter(DeliveryTask.request_id == br.id)
        .order_by(DeliveryTask.created_at.desc())
        .first()
    )
    if task is None:
        return br
    _apply_auto_close_if_confirm_deadline_passed(db, br, task)
    return br


def book_request_to_response(db: Session, br: BookRequest, viewer: UserResponse) -> BookRequestResponse:
    """Serialize a book request; enrich with student + book labels for staff views."""
    br = ensure_book_request_auto_closed_if_stale(db, br)
    base = BookRequestResponse.model_validate(br)
    data = base.model_dump()
    book = get_book_by_id(db, br.book_id)
    if book:
        data["book_title"] = book.title
    if viewer.role != UserRole.STUDENT:
        prof = db.get(UserProfile, br.user_id)
        if prof:
            data["student_email"] = prof.email
            data["student_display_name"] = f"{prof.first_name} {prof.last_name}".strip()
    return BookRequestResponse(**data)


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
        items=[book_request_to_response(db, r, user) for r in rows],
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

    now = datetime.now(timezone.utc)
    row.status = RequestStatus.APPROVED
    row.approved_at = now
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

    now = datetime.now(timezone.utc)
    row.status = RequestStatus.CANCELLED
    if row.completed_at is None:
        row.completed_at = now
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
    now = datetime.now(timezone.utc)
    br.status = RequestStatus.IN_PROGRESS
    if br.in_progress_at is None:
        br.in_progress_at = now
    db.commit()
    db.refresh(task)
    return task


def get_request_activity(
    db: Session,
    *,
    user: UserResponse,
    request_id: UUID,
) -> tuple[BookRequest, DeliveryTaskResponse | None]:
    """
    Book request plus linked delivery task and full task status history (student timeline).
    """
    br = get_book_request(db, user=user, request_id=request_id)
    task = (
        db.query(DeliveryTask)
        .filter(DeliveryTask.request_id == br.id)
        .order_by(DeliveryTask.created_at.desc())
        .first()
    )
    if task is None:
        return br, None
    hist = (
        db.query(TaskStatusHistory)
        .filter(TaskStatusHistory.task_id == task.id)
        .order_by(TaskStatusHistory.changed_at.asc())
        .all()
    )
    return br, task_to_response(task, hist)


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
        items=[task_to_response(t, None) for t in rows],
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
    if new_status == TaskStatus.COMPLETED:
        _schedule_student_confirm_deadline_timer(task.id)
    return task


def _complete_timed_delivery_task(task_id: UUID) -> None:
    """Background completion for timed robot delivery runs (thread timer)."""
    scheduled: UUID | None = None
    db = SessionLocal()
    try:
        task = db.get(DeliveryTask, task_id)
        if task is None:
            return
        meta = dict(task.task_metadata or {})
        if not (meta.get("delivery_run") or meta.get("simulated_run")):
            return
        if task.status != TaskStatus.IN_PROGRESS:
            return
        old_status = task.status
        task.status = TaskStatus.COMPLETED
        now = datetime.now(timezone.utc)
        task.completed_at = now
        _append_task_history(
            db,
            task_id=task.id,
            old_status=old_status,
            new_status=TaskStatus.COMPLETED,
            changed_by=None,
            reason="robot_run_complete",
        )
        db.commit()
        scheduled = task.id
    finally:
        db.close()
    if scheduled is not None:
        _schedule_student_confirm_deadline_timer(scheduled)


def _auto_close_request_if_no_student_confirm(task_id: UUID) -> None:
    """After STUDENT_CONFIRM_MINUTES, close the book request if the student never confirmed."""
    db = SessionLocal()
    try:
        task = db.get(DeliveryTask, task_id)
        if task is None or not task.request_id:
            return
        br = db.get(BookRequest, task.request_id)
        if br is None:
            return
        _apply_auto_close_if_confirm_deadline_passed(db, br, task)
    finally:
        db.close()


def _schedule_student_confirm_deadline_timer(task_id: UUID) -> None:
    db = SessionLocal()
    delay_sec: float | None = None
    try:
        task = db.get(DeliveryTask, task_id)
        if task is None or task.status != TaskStatus.COMPLETED or not task.completed_at:
            return
        deadline = task.completed_at + timedelta(minutes=STUDENT_CONFIRM_MINUTES)
        delay_sec = (deadline - datetime.now(timezone.utc)).total_seconds()
    finally:
        db.close()
    if delay_sec is None:
        return
    if delay_sec < 0:
        delay_sec = 0.0

    def _fire() -> None:
        _auto_close_request_if_no_student_confirm(task_id)

    timer = threading.Timer(delay_sec, _fire)
    timer.daemon = True
    timer.start()


def _schedule_timed_delivery_completion(task_id: UUID) -> None:
    def _fire() -> None:
        _complete_timed_delivery_task(task_id)

    timer = threading.Timer(float(SIMULATED_DELIVERY_SECONDS), _fire)
    timer.daemon = True
    timer.start()


def start_simulated_robot_delivery(db: Session, *, user: UserResponse, task_id: UUID) -> DeliveryTask:
    """Move a queued, dispatchable task to IN_PROGRESS and complete it after SIMULATED_DELIVERY_SECONDS."""
    if user.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
        raise DeliveryError("Only librarians can start robot delivery.")

    task = get_delivery_task(db, user=user, task_id=task_id)
    if task.status != TaskStatus.QUEUED:
        raise DeliveryError("Only queued tasks can start delivery.")
    if not is_dispatchable(task):
        raise DeliveryError("Book must be placed on the robot before starting delivery.")

    old_status = task.status
    meta = dict(task.task_metadata or {})
    now = datetime.now(timezone.utc)
    eta = now + timedelta(seconds=SIMULATED_DELIVERY_SECONDS)
    meta["delivery_run"] = True
    meta["delivery_eta_at"] = eta.isoformat()
    meta["delivery_duration_sec"] = SIMULATED_DELIVERY_SECONDS
    task.task_metadata = meta
    task.status = TaskStatus.IN_PROGRESS
    if task.started_at is None:
        task.started_at = now
    _append_task_history(
        db,
        task_id=task.id,
        old_status=old_status,
        new_status=TaskStatus.IN_PROGRESS,
        changed_by=user.id,
        reason="robot_run_started",
    )
    db.commit()
    db.refresh(task)

    _schedule_timed_delivery_completion(task.id)
    return task


def confirm_student_delivery(db: Session, *, user: UserResponse, request_id: UUID) -> BookRequest:
    """Student confirms they received the book after the robot run completed."""
    if user.role != UserRole.STUDENT:
        raise DeliveryError("Only students can confirm delivery receipt.")

    br = get_book_request(db, user=user, request_id=request_id)
    if br.status != RequestStatus.IN_PROGRESS:
        raise DeliveryError("This request is not awaiting your confirmation.")

    task = (
        db.query(DeliveryTask)
        .filter(DeliveryTask.request_id == br.id)
        .order_by(DeliveryTask.created_at.desc())
        .first()
    )
    if task is None or task.status != TaskStatus.COMPLETED:
        raise DeliveryError("Delivery is not complete yet.")

    now = datetime.now(timezone.utc)
    if not task.completed_at:
        raise DeliveryError("Delivery is not complete yet.")
    deadline = task.completed_at + timedelta(minutes=STUDENT_CONFIRM_MINUTES)
    if now > deadline:
        raise DeliveryError(
            "The confirmation window has closed. The robot has returned to staff.",
            status_code=400,
        )

    br.status = RequestStatus.COMPLETED
    br.completed_at = now
    br.student_confirmed_at = now
    db.commit()
    db.refresh(br)
    return br
