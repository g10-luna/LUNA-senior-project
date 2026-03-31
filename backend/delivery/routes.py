"""
Delivery service HTTP routes (book requests + delivery tasks).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from delivery.schemas import (
    BookRequestCreate,
    BookRequestListResponse,
    BookRequestResponse,
    DeliveryTaskCreate,
    DeliveryTaskListResponse,
    DeliveryTaskResponse,
)
from auth.schemas import UserResponse
from delivery.services import (
    DeliveryError,
    approve_book_request,
    cancel_book_request,
    confirm_book_placed,
    create_book_request,
    create_delivery_task_from_request,
    get_book_request,
    get_delivery_task,
    list_book_requests,
    list_delivery_tasks,
    task_to_response,
)
from shared.auth_dependencies import get_current_user_dep
from shared.db import SessionLocal


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
        return _success({"request": BookRequestResponse.model_validate(row).model_dump(mode="json")})
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
        return _success({"request": BookRequestResponse.model_validate(row).model_dump(mode="json")})
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
        return _success({"request": BookRequestResponse.model_validate(row).model_dump(mode="json")})
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
        return _success({"request": BookRequestResponse.model_validate(row).model_dump(mode="json")})
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
        task = create_delivery_task_from_request(db, user=user, request_id=body.request_id)
        return _success({"task": task_to_response(task).model_dump(mode="json")})
    except DeliveryError as e:
        raise _handle_delivery_error(e) from e


@deliveries_router.get("/tasks")
def get_delivery_tasks(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: UserResponse = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        out: DeliveryTaskListResponse = list_delivery_tasks(db, user=user, page=page, limit=limit)
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
        return _success({"task": task_to_response(task).model_dump(mode="json")})
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
