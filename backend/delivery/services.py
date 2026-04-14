"""Book request & delivery task persistence and state transitions."""
from __future__ import annotations

import threading
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from auth.schemas import UserResponse, UserRole
from book.repository import get_book_by_id
from delivery.schemas import (
    BookRequestListResponse,
    BookRequestResponse,
    BookReturnListResponse,
    BookReturnResponse,
    DeliveryTaskListResponse,
    DeliveryTaskResponse,
    TaskStatusEventResponse,
)
from shared.db import SessionLocal
from shared.models import (
    Book,
    BookRequest,
    BookReturn,
    BookStatus,
    DeliveryTask,
    Notification,
    NotificationType,
    RequestStatus,
    ReturnStatus,
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


RETURN_PICKUP_LEG_OUTBOUND = "outbound"
RETURN_PICKUP_LEG_RETURN = "return"

ACTIVE_BOOK_RETURN_STATUSES = (
    ReturnStatus.PENDING,
    ReturnStatus.PICKUP_SCHEDULED,
    ReturnStatus.PICKED_UP,
    ReturnStatus.AWAITING_STUDENT_LOAD,
    ReturnStatus.READY_FOR_RETURN_LEG,
    ReturnStatus.RETURN_IN_TRANSIT,
    ReturnStatus.AWAITING_ADMIN_CONFIRM,
)


def _return_pickup_leg(task: DeliveryTask) -> str | None:
    meta = task.task_metadata or {}
    leg = meta.get("return_pickup_leg")
    return str(leg) if leg else None


def is_dispatchable(task: DeliveryTask) -> bool:
    """
    Dispatchable when QUEUED and either:
    - Student delivery / legacy: book_placed is true, or
    - Return outbound leg: no student book confirmation needed yet (robot goes to pickup first), or
    - Return trip leg: student already confirmed the book is on the robot (book_placed true).
    """
    if task.status != TaskStatus.QUEUED:
        return False
    meta = task.task_metadata or {}
    if task.task_type == TaskType.RETURN_PICKUP:
        leg = _return_pickup_leg(task)
        if leg == RETURN_PICKUP_LEG_OUTBOUND:
            return True
        if leg == RETURN_PICKUP_LEG_RETURN:
            return bool(meta.get("book_placed"))
        return bool(meta.get("book_placed"))
    return bool(meta.get("book_placed"))


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
    if task.return_id and _return_pickup_leg(task) == RETURN_PICKUP_LEG_RETURN:
        # After return leg completes, staff confirm receipt — no student countdown on this task.
        return None
    return task.completed_at + timedelta(minutes=STUDENT_CONFIRM_MINUTES)


def _return_tasks_chronological(db: Session, return_id: UUID) -> list[DeliveryTask]:
    return (
        db.query(DeliveryTask)
        .filter(DeliveryTask.return_id == return_id)
        .order_by(DeliveryTask.created_at.asc())
        .all()
    )


def _outbound_return_task(db: Session, return_id: UUID) -> DeliveryTask | None:
    for t in _return_tasks_chronological(db, return_id):
        if _return_pickup_leg(t) == RETURN_PICKUP_LEG_OUTBOUND:
            return t
    return None


def _return_leg_task(db: Session, return_id: UUID) -> DeliveryTask | None:
    for t in _return_tasks_chronological(db, return_id):
        if _return_pickup_leg(t) == RETURN_PICKUP_LEG_RETURN:
            return t
    return None


def _primary_return_task(db: Session, return_id: UUID) -> DeliveryTask | None:
    tasks = (
        db.query(DeliveryTask)
        .filter(DeliveryTask.return_id == return_id)
        .order_by(DeliveryTask.created_at.desc())
        .all()
    )
    if not tasks:
        return None
    for t in tasks:
        if t.status not in (TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.FAILED):
            return t
    return tasks[0]


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
        return_pickup_leg=_return_pickup_leg(task),
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


def _apply_auto_close_if_student_book_not_loaded(
    db: Session, ret: BookReturn, outbound_task: DeliveryTask
) -> bool:
    """Outbound robot arrived; student must confirm book is on robot within the window."""
    if ret.status != ReturnStatus.AWAITING_STUDENT_LOAD:
        return False
    if outbound_task.status != TaskStatus.COMPLETED or outbound_task.completed_at is None:
        return False
    if _return_pickup_leg(outbound_task) != RETURN_PICKUP_LEG_OUTBOUND:
        return False
    if ret.student_book_loaded_at is not None:
        return False
    now = datetime.now(timezone.utc)
    deadline = outbound_task.completed_at + timedelta(minutes=STUDENT_CONFIRM_MINUTES)
    if now < deadline:
        return False
    ret.status = ReturnStatus.COMPLETED
    ret.completed_at = now
    ret.auto_closed_without_confirm_at = now
    db.commit()
    db.refresh(ret)
    return True


def _apply_auto_close_return_if_confirm_deadline_passed(
    db: Session, ret: BookReturn, task: DeliveryTask
) -> bool:
    """Legacy: close if student never confirmed handoff after old single-leg return (PICKED_UP)."""
    if ret.status != ReturnStatus.PICKED_UP:
        return False
    if task.status != TaskStatus.COMPLETED or task.completed_at is None:
        return False
    if ret.student_confirmed_at is not None:
        return False
    now = datetime.now(timezone.utc)
    deadline = task.completed_at + timedelta(minutes=STUDENT_CONFIRM_MINUTES)
    if now < deadline:
        return False
    ret.status = ReturnStatus.COMPLETED
    ret.completed_at = now
    ret.auto_closed_without_confirm_at = now
    db.commit()
    db.refresh(ret)
    return True


def ensure_book_return_auto_closed_if_stale(db: Session, ret: BookReturn) -> BookReturn:
    if ret.status == ReturnStatus.AWAITING_STUDENT_LOAD:
        outbound = _outbound_return_task(db, ret.id)
        if outbound is not None:
            _apply_auto_close_if_student_book_not_loaded(db, ret, outbound)
        return ret
    task = _primary_return_task(db, ret.id)
    if task is None:
        return ret
    _apply_auto_close_return_if_confirm_deadline_passed(db, ret, task)
    return ret


def book_return_to_response(db: Session, ret: BookReturn, viewer: UserResponse) -> BookReturnResponse:
    ret = ensure_book_return_auto_closed_if_stale(db, ret)
    base = BookReturnResponse.model_validate(ret)
    data = base.model_dump()
    book = get_book_by_id(db, ret.book_id)
    if book:
        data["book_title"] = book.title
    if viewer.role != UserRole.STUDENT:
        prof = db.get(UserProfile, ret.user_id)
        if prof:
            data["student_email"] = prof.email
            data["student_display_name"] = f"{prof.first_name} {prof.last_name}".strip()
    return BookReturnResponse(**data)


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
        req_ids = [r for (r,) in db.query(BookRequest.id).filter(BookRequest.user_id == user.id).all()]
        ret_ids = [r for (r,) in db.query(BookReturn.id).filter(BookReturn.user_id == user.id).all()]
        if not req_ids and not ret_ids:
            return DeliveryTaskListResponse(
                items=[],
                page=page,
                limit=limit,
                total=0,
            )
        conds = []
        if req_ids:
            conds.append(DeliveryTask.request_id.in_(req_ids))
        if ret_ids:
            conds.append(DeliveryTask.return_id.in_(ret_ids))
        q = q.filter(or_(*conds))

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
        if task.request_id is not None:
            br = db.get(BookRequest, task.request_id)
            if br is None or br.user_id != user.id:
                raise DeliveryError("Not allowed to view this task.", status_code=403)
        elif task.return_id is not None:
            ret = db.get(BookReturn, task.return_id)
            if ret is None or ret.user_id != user.id:
                raise DeliveryError("Not allowed to view this task.", status_code=403)
        else:
            raise DeliveryError("Not allowed to view this task.", status_code=403)

    return task


def confirm_book_placed(db: Session, *, user: UserResponse, task_id: UUID) -> DeliveryTask:
    if user.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
        raise DeliveryError("Only librarians can confirm book placement.")

    task = get_delivery_task(db, user=user, task_id=task_id)
    if task.task_type == TaskType.RETURN_PICKUP and _return_pickup_leg(task) == RETURN_PICKUP_LEG_OUTBOUND:
        raise DeliveryError(
            "Outbound return runs do not use staff book placement — the student confirms when the book is on the robot.",
            status_code=400,
        )
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
        if task.return_id:
            ret = db.get(BookReturn, task.return_id)
            if ret is not None:
                leg = _return_pickup_leg(task)
                if leg == RETURN_PICKUP_LEG_OUTBOUND and ret.status == ReturnStatus.PICKUP_SCHEDULED:
                    ret.status = ReturnStatus.AWAITING_STUDENT_LOAD
                    ret.picked_up_at = now
                elif leg == RETURN_PICKUP_LEG_RETURN and ret.status in (
                    ReturnStatus.READY_FOR_RETURN_LEG,
                    ReturnStatus.RETURN_IN_TRANSIT,
                ):
                    ret.status = ReturnStatus.AWAITING_ADMIN_CONFIRM
        db.commit()
        scheduled = task.id
    finally:
        db.close()
    if scheduled is not None:
        _schedule_student_confirm_deadline_timer(scheduled)


def _auto_close_request_if_no_student_confirm(task_id: UUID) -> None:
    """After STUDENT_CONFIRM_MINUTES, close the book request or return if the student never confirmed."""
    db = SessionLocal()
    try:
        task = db.get(DeliveryTask, task_id)
        if task is None:
            return
        if task.request_id:
            br = db.get(BookRequest, task.request_id)
            if br is None:
                return
            _apply_auto_close_if_confirm_deadline_passed(db, br, task)
        elif task.return_id:
            ret = db.get(BookReturn, task.return_id)
            if ret is None:
                return
            if ret.status == ReturnStatus.AWAITING_STUDENT_LOAD:
                outbound = _outbound_return_task(db, ret.id)
                if outbound is not None and outbound.id == task.id:
                    _apply_auto_close_if_student_book_not_loaded(db, ret, outbound)
                return
            _apply_auto_close_return_if_confirm_deadline_passed(db, ret, task)
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
        if task.task_type == TaskType.RETURN_PICKUP and _return_pickup_leg(task) == RETURN_PICKUP_LEG_OUTBOUND:
            raise DeliveryError("This outbound return task is not ready to start.", status_code=400)
        raise DeliveryError("Book must be placed on the robot before starting delivery.", status_code=400)

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

    if task.return_id:
        ret = db.get(BookReturn, task.return_id)
        if (
            ret is not None
            and ret.status == ReturnStatus.READY_FOR_RETURN_LEG
            and _return_pickup_leg(task) == RETURN_PICKUP_LEG_RETURN
        ):
            ret.status = ReturnStatus.RETURN_IN_TRANSIT
            db.commit()

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

    book = get_book_by_id(db, br.book_id)
    if book is not None:
        book.status = BookStatus.CHECKED_OUT

    db.commit()
    db.refresh(br)
    return br


def _student_confirmed_pickup_for_book(
    db: Session, *, user_id: UUID, book_id: UUID
) -> bool:
    """True if this user completed a pickup request and confirmed they received this book."""
    return (
        db.query(BookRequest.id)
        .filter(
            BookRequest.user_id == user_id,
            BookRequest.book_id == book_id,
            BookRequest.status == RequestStatus.COMPLETED,
            BookRequest.student_confirmed_at.isnot(None),
        )
        .limit(1)
        .first()
        is not None
    )


def list_returnable_books_for_student(db: Session, *, user: UserResponse) -> list[Book]:
    """
    Books this student may start a return for: checked out to them (after they confirmed delivery)
    and not already in an active return workflow.
    """
    if user.role != UserRole.STUDENT:
        raise DeliveryError("Only students can list returnable books.")

    delivered_book_ids = {
        row[0]
        for row in db.query(BookRequest.book_id)
        .filter(
            BookRequest.user_id == user.id,
            BookRequest.status == RequestStatus.COMPLETED,
            BookRequest.student_confirmed_at.isnot(None),
        )
        .distinct()
        .all()
    }
    if not delivered_book_ids:
        return []

    active_return_book_ids = {
        row[0]
        for row in db.query(BookReturn.book_id)
        .filter(
            BookReturn.user_id == user.id,
            BookReturn.status.in_(ACTIVE_BOOK_RETURN_STATUSES),
        )
        .all()
    }

    books = (
        db.query(Book)
        .filter(Book.id.in_(delivered_book_ids))
        .order_by(Book.title.asc())
        .all()
    )
    out: list[Book] = []
    status_dirty = False
    for b in books:
        if b.id in active_return_book_ids:
            continue
        # Catalog row can drift (e.g. older confirm path, manual edits). Confirmed delivery implies checked out.
        if b.status != BookStatus.CHECKED_OUT:
            b.status = BookStatus.CHECKED_OUT
            status_dirty = True
        out.append(b)
    if status_dirty:
        db.commit()
        for b in out:
            db.refresh(b)
    return out


# --- Book returns (student return pickup via robot) ---


def create_book_return(
    db: Session,
    *,
    user: UserResponse,
    book_id: UUID,
    pickup_location: str,
) -> BookReturn:
    if user.role != UserRole.STUDENT:
        raise DeliveryError("Only students can create book returns.")

    book = get_book_by_id(db, book_id)
    if book is None:
        raise DeliveryError("Book not found.", status_code=404)
    if book.status != BookStatus.CHECKED_OUT:
        if _student_confirmed_pickup_for_book(db, user_id=user.id, book_id=book_id):
            book.status = BookStatus.CHECKED_OUT
            db.commit()
            db.refresh(book)
        else:
            raise DeliveryError(
                "You can only return books that are checked out.",
                status_code=400,
            )

    active = (
        db.query(BookReturn)
        .filter(
            BookReturn.user_id == user.id,
            BookReturn.book_id == book_id,
            BookReturn.status.in_(ACTIVE_BOOK_RETURN_STATUSES),
        )
        .first()
    )
    if active:
        return active

    ret = BookReturn(
        user_id=user.id,
        book_id=book_id,
        pickup_location=pickup_location.strip(),
        status=ReturnStatus.PENDING,
    )
    db.add(ret)
    db.commit()
    db.refresh(ret)
    return ret


def get_book_return(db: Session, *, user: UserResponse, return_id: UUID) -> BookReturn:
    row = db.get(BookReturn, return_id)
    if row is None:
        raise DeliveryError("Return not found.", status_code=404)
    if user.role == UserRole.STUDENT and row.user_id != user.id:
        raise DeliveryError("Not allowed to view this return.", status_code=403)
    return row


def list_book_returns(
    db: Session,
    *,
    user: UserResponse,
    page: int = 1,
    limit: int = 20,
) -> BookReturnListResponse:
    limit = min(max(limit, 1), 100)
    page = max(page, 1)

    q = db.query(BookReturn)
    if user.role == UserRole.STUDENT:
        q = q.filter(BookReturn.user_id == user.id)

    total = q.count()
    rows: list[BookReturn] = (
        q.order_by(BookReturn.initiated_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return BookReturnListResponse(
        items=[book_return_to_response(db, r, user) for r in rows],
        page=page,
        limit=limit,
        total=total,
    )


def approve_book_return(db: Session, *, user: UserResponse, return_id: UUID) -> BookReturn:
    if user.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
        raise DeliveryError("Only librarians can approve returns.")

    row = db.get(BookReturn, return_id)
    if row is None:
        raise DeliveryError("Return not found.", status_code=404)
    if row.status != ReturnStatus.PENDING:
        raise DeliveryError("Only pending returns can be approved.")

    row.status = ReturnStatus.PICKUP_SCHEDULED
    db.commit()
    db.refresh(row)
    return row


def cancel_book_return(db: Session, *, user: UserResponse, return_id: UUID) -> BookReturn:
    row = db.get(BookReturn, return_id)
    if row is None:
        raise DeliveryError("Return not found.", status_code=404)

    if user.role == UserRole.STUDENT:
        if row.user_id != user.id:
            raise DeliveryError("Not allowed to cancel this return.", status_code=403)
        if row.status != ReturnStatus.PENDING:
            raise DeliveryError("You can only cancel pending returns.")
    elif user.role in (UserRole.LIBRARIAN, UserRole.ADMIN):
        if row.status == ReturnStatus.COMPLETED:
            raise DeliveryError("Cannot cancel a completed return.")
    else:
        raise DeliveryError("Not allowed to cancel returns.", status_code=403)

    now = datetime.now(timezone.utc)
    row.status = ReturnStatus.CANCELLED
    if row.completed_at is None:
        row.completed_at = now
    db.commit()
    db.refresh(row)
    return row


def create_delivery_task_from_return(
    db: Session,
    *,
    user: UserResponse,
    return_id: UUID,
) -> DeliveryTask:
    if user.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
        raise DeliveryError("Only librarians can create delivery tasks.")

    existing = db.query(DeliveryTask).filter(DeliveryTask.return_id == return_id).first()
    if existing:
        return existing

    ret = db.get(BookReturn, return_id)
    if ret is None:
        raise DeliveryError("Return not found.", status_code=404)
    if ret.status != ReturnStatus.PICKUP_SCHEDULED:
        raise DeliveryError("Return must be approved before creating a pickup task.")

    task = DeliveryTask(
        request_id=None,
        return_id=ret.id,
        task_type=TaskType.RETURN_PICKUP,
        status=TaskStatus.QUEUED,
        source_location=ret.pickup_location[:120],
        destination_location="Circulation returns",
        task_metadata={
            "book_placed": False,
            "return_pickup_leg": RETURN_PICKUP_LEG_OUTBOUND,
        },
    )
    db.add(task)
    db.flush()
    _append_task_history(
        db,
        task_id=task.id,
        old_status=None,
        new_status=TaskStatus.QUEUED,
        changed_by=user.id,
        reason="return_task_created",
    )
    db.commit()
    db.refresh(task)
    return task


def get_return_activity(
    db: Session,
    *,
    user: UserResponse,
    return_id: UUID,
) -> tuple[BookReturn, DeliveryTaskResponse | None, list[DeliveryTaskResponse]]:
    ret = get_book_return(db, user=user, return_id=return_id)
    all_rows = (
        db.query(DeliveryTask)
        .filter(DeliveryTask.return_id == ret.id)
        .order_by(DeliveryTask.created_at.asc())
        .all()
    )
    payloads: list[DeliveryTaskResponse] = []
    for t in all_rows:
        hist = (
            db.query(TaskStatusHistory)
            .filter(TaskStatusHistory.task_id == t.id)
            .order_by(TaskStatusHistory.changed_at.asc())
            .all()
        )
        payloads.append(task_to_response(t, hist))
    primary = _primary_return_task(db, ret.id)
    primary_payload: DeliveryTaskResponse | None = None
    if primary is not None:
        for t, p in zip(all_rows, payloads):
            if t.id == primary.id:
                primary_payload = p
                break
    return ret, primary_payload, payloads


def _legacy_confirm_student_handoff_single_leg(db: Session, *, user: UserResponse, ret: BookReturn) -> BookReturn:
    """Pre–two-leg returns: student confirms after one robot run (PICKED_UP)."""
    task = _primary_return_task(db, ret.id)
    if task is None or task.status != TaskStatus.COMPLETED:
        raise DeliveryError("The pickup run is not complete yet.")
    now = datetime.now(timezone.utc)
    if not task.completed_at:
        raise DeliveryError("The pickup run is not complete yet.")
    deadline = task.completed_at + timedelta(minutes=STUDENT_CONFIRM_MINUTES)
    if now > deadline:
        raise DeliveryError(
            "The confirmation window has closed. The robot has returned to staff.",
            status_code=400,
        )
    book = get_book_by_id(db, ret.book_id)
    if book:
        book.status = BookStatus.AVAILABLE
    ret.status = ReturnStatus.COMPLETED
    ret.completed_at = now
    ret.student_confirmed_at = now
    db.commit()
    db.refresh(ret)
    return ret


def confirm_student_book_on_robot(db: Session, *, user: UserResponse, return_id: UUID) -> BookReturn:
    """Student confirms the book is on the robot after the outbound run reaches the pickup point."""
    if user.role != UserRole.STUDENT:
        raise DeliveryError("Only students can confirm the book is on the robot.")

    ret = get_book_return(db, user=user, return_id=return_id)
    if ret.status == ReturnStatus.PICKED_UP:
        return _legacy_confirm_student_handoff_single_leg(db, user=user, ret=ret)
    if ret.status != ReturnStatus.AWAITING_STUDENT_LOAD:
        raise DeliveryError("The robot is not waiting for you to confirm the book is loaded.")

    outbound = _outbound_return_task(db, ret.id)
    if outbound is None or outbound.status != TaskStatus.COMPLETED or not outbound.completed_at:
        raise DeliveryError("The robot has not finished traveling to the pickup point yet.")

    if _return_leg_task(db, ret.id) is not None:
        raise DeliveryError("The return trip was already scheduled.")

    now = datetime.now(timezone.utc)
    deadline = outbound.completed_at + timedelta(minutes=STUDENT_CONFIRM_MINUTES)
    if now > deadline:
        raise DeliveryError(
            "The confirmation window has closed.",
            status_code=400,
        )

    ret.student_book_loaded_at = now
    ret.status = ReturnStatus.READY_FOR_RETURN_LEG

    task2 = DeliveryTask(
        request_id=None,
        return_id=ret.id,
        task_type=TaskType.RETURN_PICKUP,
        status=TaskStatus.QUEUED,
        source_location=ret.pickup_location[:120],
        destination_location="Circulation returns",
        task_metadata={
            "book_placed": True,
            "return_pickup_leg": RETURN_PICKUP_LEG_RETURN,
            "student_book_loaded_at": now.isoformat(),
        },
    )
    db.add(task2)
    db.flush()
    _append_task_history(
        db,
        task_id=task2.id,
        old_status=None,
        new_status=TaskStatus.QUEUED,
        changed_by=user.id,
        reason="return_leg_task_created",
    )
    db.commit()
    db.refresh(ret)
    return ret


def confirm_admin_return_receipt(db: Session, *, user: UserResponse, return_id: UUID) -> BookReturn:
    """Librarian confirms the book was received at the desk after the return leg completes."""
    if user.role not in (UserRole.LIBRARIAN, UserRole.ADMIN):
        raise DeliveryError("Only librarians can confirm the book was received at the desk.")

    row = db.get(BookReturn, return_id)
    if row is None:
        raise DeliveryError("Return not found.", status_code=404)

    if row.status != ReturnStatus.AWAITING_ADMIN_CONFIRM:
        raise DeliveryError("This return is not waiting for desk confirmation.")

    rtask = _return_leg_task(db, row.id)
    if rtask is None or rtask.status != TaskStatus.COMPLETED:
        raise DeliveryError("The return trip is not complete yet.")

    now = datetime.now(timezone.utc)
    book = get_book_by_id(db, row.book_id)
    if book:
        book.status = BookStatus.AVAILABLE

    row.status = ReturnStatus.COMPLETED
    row.completed_at = now
    row.admin_receipt_confirmed_at = now

    db.add(
        Notification(
            user_id=row.user_id,
            notification_type=NotificationType.DELIVERY_UPDATE,
            title="Return received",
            message="Your book return was received at the circulation desk.",
            payload={"return_id": str(row.id), "book_id": str(row.book_id)},
        )
    )
    db.commit()
    db.refresh(row)
    return row
