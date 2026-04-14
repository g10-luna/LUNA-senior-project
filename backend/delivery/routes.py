"""
Delivery service HTTP routes (book requests + delivery tasks).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from book.schemas import BookResponse
from delivery.schemas import (
    BookRequestCreate,
    BookRequestListResponse,
    BookReturnCreate,
    BookReturnListResponse,
    DeliveryTaskCreate,
    DeliveryTaskListResponse,
    DeliveryTaskStatusUpdate,
)
from auth.schemas import UserResponse
from delivery.services import (
    DeliveryError,
    approve_book_request,
    approve_book_return,
    book_request_to_response,
    book_return_to_response,
    cancel_book_request,
    cancel_book_return,
    confirm_book_placed,
    confirm_student_delivery,
    confirm_admin_return_receipt,
    confirm_student_book_on_robot,
    create_book_request,
    create_book_return,
    create_delivery_task_from_request,
    create_delivery_task_from_return,
    get_book_request,
    get_book_return,
    get_delivery_task,
    get_request_activity,
    get_return_activity,
    is_dispatchable,
    list_book_requests,
    list_book_returns,
    list_delivery_tasks,
    list_returnable_books_for_student,
    start_simulated_robot_delivery,
    task_to_response,
    update_delivery_task_status,
)
from shared.auth_dependencies import get_current_user_dep
from shared.db import SessionLocal
from shared.models import TaskStatusHistory


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _success(data: dict) -> dict:
    return {
        "success": True,
        "data": data,
        "meta": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request_id": str(uuid.uuid4())[:8],
        },
    }


def _handle_delivery_error(exc: DeliveryError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=str(exc))


requests_router = APIRouter(prefix="/api/v1/requests", tags=["requests"])
returns_router = APIRouter(prefix="/api/v1/returns", tags=["returns"])
deliveries_router = APIRouter(prefix="/api/v1/deliveries", tags=["deliveries"])


@requests_router.get("/health")
def requests_health():
    return {"status": "healthy"}


@requests_router.post("/")
def create_request(
    body: BookRequestCreate,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        row = create_book_request(
            db,
            user=user,
            book_id=body.book_id,
            request_location=body.request_location,
            notes=body.notes,
        )
        return _success(
            {"request": book_request_to_response(db, row, user).model_dump(mode="json")}
        )
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@requests_router.get("/")
def list_requests(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        out: BookRequestListResponse = list_book_requests(db, user=user, page=page, limit=limit)
        return _success(
            {
                "items": [i.model_dump(mode="json") for i in out.items],
                "pagination": {"page": out.page, "limit": out.limit, "total": out.total},
            }
        )
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@requests_router.get("/{request_id}")
def get_request(
    request_id: uuid.UUID,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        row = get_book_request(db, user=user, request_id=request_id)
        return _success({"request": book_request_to_response(db, row, user).model_dump(mode="json")})
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@requests_router.get("/{request_id}/activity")
def get_request_activity_route(
    request_id: uuid.UUID,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Request + linked delivery task and task status history for student timeline / live updates."""
    try:
        br, task_payload = get_request_activity(db, user=user, request_id=request_id)
        return _success(
            {
                "request": book_request_to_response(db, br, user).model_dump(mode="json"),
                "task": task_payload.model_dump(mode="json") if task_payload else None,
            }
        )
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@requests_router.post("/{request_id}/approve")
def approve_request(
    request_id: uuid.UUID,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        row = approve_book_request(db, user=user, request_id=request_id)
        return _success({"request": book_request_to_response(db, row, user).model_dump(mode="json")})
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@requests_router.post("/{request_id}/cancel")
def cancel_request(
    request_id: uuid.UUID,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        row = cancel_book_request(db, user=user, request_id=request_id)
        return _success({"request": book_request_to_response(db, row, user).model_dump(mode="json")})
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@requests_router.post("/{request_id}/confirm-delivery")
def confirm_delivery(
    request_id: uuid.UUID,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Student confirms they received the book (closes the request after robot delivery)."""
    try:
        row = confirm_student_delivery(db, user=user, request_id=request_id)
        return _success({"request": book_request_to_response(db, row, user).model_dump(mode="json")})
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


# --- Book returns ---


@returns_router.get("/health")
def returns_health():
    return {"status": "healthy"}


@returns_router.post("/")
def create_return(
    body: BookReturnCreate,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        row = create_book_return(
            db,
            user=user,
            book_id=body.book_id,
            pickup_location=body.pickup_location,
        )
        return _success(
            {"return": book_return_to_response(db, row, user).model_dump(mode="json")}
        )
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@returns_router.get("/")
def list_returns(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        out: BookReturnListResponse = list_book_returns(db, user=user, page=page, limit=limit)
        return _success(
            {
                "items": [i.model_dump(mode="json") for i in out.items],
                "pagination": {"page": out.page, "limit": out.limit, "total": out.total},
            }
        )
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@returns_router.get("/returnable-books")
def list_returnable_books_route(
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Checked-out titles the student received (confirmed delivery) and may start a return for."""
    try:
        books = list_returnable_books_for_student(db, user=user)
        return _success(
            {
                "items": [BookResponse.model_validate(b).model_dump(mode="json") for b in books],
                "count": len(books),
            }
        )
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@returns_router.get("/{return_id}")
def get_return(
    return_id: uuid.UUID,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        row = get_book_return(db, user=user, return_id=return_id)
        return _success({"return": book_return_to_response(db, row, user).model_dump(mode="json")})
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@returns_router.get("/{return_id}/activity")
def get_return_activity_route(
    return_id: uuid.UUID,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        ret, task_payload, tasks_payload = get_return_activity(db, user=user, return_id=return_id)
        return _success(
            {
                "return": book_return_to_response(db, ret, user).model_dump(mode="json"),
                "task": task_payload.model_dump(mode="json") if task_payload else None,
                "tasks": [t.model_dump(mode="json") for t in tasks_payload],
            }
        )
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@returns_router.post("/{return_id}/approve")
def approve_return(
    return_id: uuid.UUID,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        row = approve_book_return(db, user=user, return_id=return_id)
        return _success({"return": book_return_to_response(db, row, user).model_dump(mode="json")})
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@returns_router.post("/{return_id}/cancel")
def cancel_return(
    return_id: uuid.UUID,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        row = cancel_book_return(db, user=user, return_id=return_id)
        return _success({"return": book_return_to_response(db, row, user).model_dump(mode="json")})
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@returns_router.post("/{return_id}/confirm-handoff")
def confirm_return_handoff(
    return_id: uuid.UUID,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Student confirms the book is on the robot (after outbound run), or legacy single-leg handoff."""
    try:
        row = confirm_student_book_on_robot(db, user=user, return_id=return_id)
        return _success({"return": book_return_to_response(db, row, user).model_dump(mode="json")})
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@returns_router.post("/{return_id}/confirm-receipt")
def confirm_return_receipt_at_desk(
    return_id: uuid.UUID,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Librarian confirms the book was received at the desk (after return leg completes)."""
    try:
        row = confirm_admin_return_receipt(db, user=user, return_id=return_id)
        return _success({"return": book_return_to_response(db, row, user).model_dump(mode="json")})
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


# --- Deliveries ---


@deliveries_router.get("/health")
def deliveries_health():
    return {"status": "healthy"}


@deliveries_router.post("/tasks")
def post_delivery_task(
    body: DeliveryTaskCreate,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        if body.return_id is not None:
            task = create_delivery_task_from_return(db, user=user, return_id=body.return_id)
        else:
            task = create_delivery_task_from_request(db, user=user, request_id=body.request_id)  # type: ignore[arg-type]
        return _success({"task": task_to_response(task).model_dump(mode="json")})
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@deliveries_router.get("/tasks")
def get_delivery_tasks(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    dispatchable_only: bool = Query(
        False,
        description="If true, only return tasks that are dispatchable for robot/bridge (status and book_placed).",
    ),
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        out: DeliveryTaskListResponse = list_delivery_tasks(db, user=user, page=page, limit=limit)
        if dispatchable_only:
            dispatchable_items = [i for i in out.items if is_dispatchable(i)]  # type: ignore[arg-type]
            return _success(
                {
                    "items": [i.model_dump(mode="json") for i in dispatchable_items],
                    "pagination": {
                        "page": out.page,
                        "limit": out.limit,
                        "total": len(dispatchable_items),
                    },
                }
            )
        return _success(
            {
                "items": [i.model_dump(mode="json") for i in out.items],
                "pagination": {"page": out.page, "limit": out.limit, "total": out.total},
            }
        )
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@deliveries_router.get("/tasks/{task_id}")
def get_task(
    task_id: uuid.UUID,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        task = get_delivery_task(db, user=user, task_id=task_id)
        hist = (
            db.query(TaskStatusHistory)
            .filter(TaskStatusHistory.task_id == task.id)
            .order_by(TaskStatusHistory.changed_at.asc())
            .all()
        )
        return _success({"task": task_to_response(task, hist).model_dump(mode="json")})
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@deliveries_router.post("/tasks/{task_id}/book-placed")
def post_book_placed(
    task_id: uuid.UUID,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        task = confirm_book_placed(db, user=user, task_id=task_id)
        return _success({"task": task_to_response(task).model_dump(mode="json")})
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@deliveries_router.post("/tasks/{task_id}/simulate-run")
def post_simulate_robot_run(
    task_id: uuid.UUID,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Start a robot pickup+delivery run (~4 minutes), then mark the task completed."""
    try:
        task = start_simulated_robot_delivery(db, user=user, task_id=task_id)
        hist = (
            db.query(TaskStatusHistory)
            .filter(TaskStatusHistory.task_id == task.id)
            .order_by(TaskStatusHistory.changed_at.asc())
            .all()
        )
        return _success({"task": task_to_response(task, hist).model_dump(mode="json")})
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@deliveries_router.post("/tasks/{task_id}/status")
def post_task_status(
    task_id: uuid.UUID,
    body: DeliveryTaskStatusUpdate,
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Update a delivery task status (for example, IN_PROGRESS, COMPLETED, FAILED).

    This endpoint is intended for bridge/robot or operator flows, not for students.
    """
    try:
        task = update_delivery_task_status(
            db,
            user=user,
            task_id=task_id,
            new_status=body.status,
            reason=body.reason,
        )
        return _success({"task": task_to_response(task).model_dump(mode="json")})
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e
