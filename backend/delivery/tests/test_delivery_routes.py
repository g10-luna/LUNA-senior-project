from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient

import sys

sys.path.append(str(Path(__file__).resolve().parents[2]))

from unittest.mock import MagicMock

from auth.schemas import UserResponse, UserRole
from delivery.main import app
from delivery import routes as delivery_routes
from delivery import services as delivery_services
from delivery.schemas import DeliveryTaskListResponse
from shared.auth_dependencies import get_current_user_dep


def _mock_db_override():
    yield MagicMock()
from shared.models import BookStatus, RequestStatus, ReturnStatus, TaskStatus, TaskType


def _student() -> UserResponse:
    return UserResponse(
        id=uuid4(),
        email="stu@luna.dev",
        first_name="Stu",
        last_name="Dent",
        role=UserRole.STUDENT,
        phone_number=None,
    )


def _librarian() -> UserResponse:
    return UserResponse(
        id=uuid4(),
        email="lib@luna.dev",
        first_name="Lib",
        last_name="Rarian",
        role=UserRole.LIBRARIAN,
        phone_number=None,
    )


def _book(bid=None):
    return SimpleNamespace(
        id=bid or uuid4(),
        isbn="9780000000001",
        title="Test Book",
        author="Author",
        publisher=None,
        publication_year=2020,
        description=None,
        cover_image_url=None,
        status=BookStatus.AVAILABLE,
        shelf_location="A-1",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def _request_row(uid, bid, status=RequestStatus.PENDING, location="Desk 3"):
    return SimpleNamespace(
        id=uuid4(),
        user_id=uid,
        book_id=bid,
        request_location=location,
        status=status,
        requested_at=datetime.now(timezone.utc),
        approved_at=None,
        in_progress_at=None,
        completed_at=None,
        student_confirmed_at=None,
        auto_closed_without_confirm_at=None,
        notes=None,
    )


def _return_row(uid, bid, status=ReturnStatus.PENDING, location="Desk 3"):
    return SimpleNamespace(
        id=uuid4(),
        user_id=uid,
        book_id=bid,
        pickup_location=location,
        status=status,
        initiated_at=datetime.now(timezone.utc),
        picked_up_at=None,
        completed_at=None,
        student_confirmed_at=None,
        auto_closed_without_confirm_at=None,
    )


def _patch_no_book_lookup(monkeypatch):
    """MagicMock db makes get_book_by_id return a MagicMock; book.title breaks Pydantic."""
    monkeypatch.setattr(delivery_services, "get_book_by_id", lambda db, bid: None)


def test_create_request_student_success(monkeypatch):
    _patch_no_book_lookup(monkeypatch)
    user = _student()
    book = _book()
    created = _request_row(user.id, book.id)

    def _fake_create(db, **kwargs):
        assert kwargs["user"].id == user.id
        assert kwargs["book_id"] == book.id
        return created

    monkeypatch.setattr(delivery_routes, "create_book_request", _fake_create)

    app.dependency_overrides[get_current_user_dep] = lambda: user
    app.dependency_overrides[delivery_routes.get_db] = _mock_db_override
    client = TestClient(app)
    try:
        res = client.post(
            "/api/v1/requests/",
            json={"book_id": str(book.id), "request_location": "North study hall"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["request"]["id"] == str(created.id)
    finally:
        app.dependency_overrides.clear()


def test_create_request_rejects_non_student():
    user = _librarian()
    app.dependency_overrides[get_current_user_dep] = lambda: user
    app.dependency_overrides[delivery_routes.get_db] = _mock_db_override
    client = TestClient(app)
    try:
        res = client.post(
            "/api/v1/requests/",
            json={"book_id": str(uuid4()), "request_location": "Here"},
        )
        assert res.status_code == 400
    finally:
        app.dependency_overrides.clear()


def test_create_return_student_success(monkeypatch):
    _patch_no_book_lookup(monkeypatch)
    user = _student()
    book = _book()
    created = _return_row(user.id, book.id)

    def _fake_create(db, **kwargs):
        assert kwargs["user"].id == user.id
        assert kwargs["book_id"] == book.id
        return created

    monkeypatch.setattr(delivery_routes, "create_book_return", _fake_create)

    app.dependency_overrides[get_current_user_dep] = lambda: user
    app.dependency_overrides[delivery_routes.get_db] = _mock_db_override
    client = TestClient(app)
    try:
        res = client.post(
            "/api/v1/returns/",
            json={"book_id": str(book.id), "pickup_location": "North study hall"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["return"]["id"] == str(created.id)
    finally:
        app.dependency_overrides.clear()


def test_create_return_rejects_non_student():
    user = _librarian()
    app.dependency_overrides[get_current_user_dep] = lambda: user
    app.dependency_overrides[delivery_routes.get_db] = _mock_db_override
    client = TestClient(app)
    try:
        res = client.post(
            "/api/v1/returns/",
            json={"book_id": str(uuid4()), "pickup_location": "Here"},
        )
        assert res.status_code == 400
    finally:
        app.dependency_overrides.clear()


def test_get_return_activity_returns_return_and_task_payload(monkeypatch):
    _patch_no_book_lookup(monkeypatch)
    user = _student()
    book = _book()
    br = _return_row(user.id, book.id, status=ReturnStatus.PICKUP_SCHEDULED)

    def _activity(db, *, user, return_id):
        assert return_id == br.id
        return br, None, []

    monkeypatch.setattr(delivery_routes, "get_return_activity", _activity)

    app.dependency_overrides[get_current_user_dep] = lambda: user
    app.dependency_overrides[delivery_routes.get_db] = _mock_db_override
    client = TestClient(app)
    try:
        res = client.get(f"/api/v1/returns/{br.id}/activity")
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["return"]["id"] == str(br.id)
        assert body["data"]["return"]["status"] == "PICKUP_SCHEDULED"
        assert body["data"]["task"] is None
        assert body["data"]["tasks"] == []
    finally:
        app.dependency_overrides.clear()


def test_get_request_activity_returns_request_and_task_payload(monkeypatch):
    _patch_no_book_lookup(monkeypatch)
    user = _student()
    book = _book()
    br = _request_row(user.id, book.id, status=RequestStatus.APPROVED)
    br.approved_at = datetime.now(timezone.utc)

    def _activity(db, *, user, request_id):
        assert request_id == br.id
        return br, None

    monkeypatch.setattr(delivery_routes, "get_request_activity", _activity)

    app.dependency_overrides[get_current_user_dep] = lambda: user
    app.dependency_overrides[delivery_routes.get_db] = _mock_db_override
    client = TestClient(app)
    try:
        res = client.get(f"/api/v1/requests/{br.id}/activity")
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["request"]["id"] == str(br.id)
        assert body["data"]["request"]["approved_at"] is not None
        assert body["data"]["task"] is None
    finally:
        app.dependency_overrides.clear()


def test_list_tasks_maps_book_placed(monkeypatch):
    user = _librarian()
    tid = uuid4()
    task = SimpleNamespace(
        id=tid,
        request_id=uuid4(),
        return_id=None,
        task_type=TaskType.STUDENT_DELIVERY,
        status=TaskStatus.QUEUED,
        source_location="A-1",
        destination_location="Desk",
        created_at=datetime.now(timezone.utc),
        started_at=None,
        completed_at=None,
        task_metadata={"book_placed": True},
    )

    def _list(db, *, user, page=1, limit=20):
        return DeliveryTaskListResponse(
            items=[delivery_services.task_to_response(task)],
            page=1,
            limit=20,
            total=1,
        )

    monkeypatch.setattr(delivery_routes, "list_delivery_tasks", _list)

    app.dependency_overrides[get_current_user_dep] = lambda: user
    app.dependency_overrides[delivery_routes.get_db] = _mock_db_override
    client = TestClient(app)
    try:
        res = client.get("/api/v1/deliveries/tasks")
        assert res.status_code == 200
        item = res.json()["data"]["items"][0]
        assert item["book_placed"] is True
        assert item["book_placed_at"] is None
        assert item["status_history"] == []
        assert item["id"] == str(tid)
    finally:
        app.dependency_overrides.clear()
