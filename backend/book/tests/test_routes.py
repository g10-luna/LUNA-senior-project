from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import sys
from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient

# Ensure imports like "auth.schemas" resolve when running pytest from backend/.
sys.path.append(str(Path(__file__).resolve().parents[2]))

from auth.schemas import UserResponse, UserRole
from book.main import app
from book.routes import BookConflictError, BookNotFoundError
from shared.auth_dependencies import get_current_user_dep
from shared.models import BookStatus


def _mock_user(role: UserRole = UserRole.LIBRARIAN) -> UserResponse:
    return UserResponse(
        id=uuid4(),
        email="tester@luna.dev",
        first_name="Test",
        last_name="User",
        role=role,
        phone_number=None,
    )


def _book_obj(**overrides):
    base = {
        "id": uuid4(),
        "isbn": "9780439554930",
        "title": "Harry Potter and the Sorcerer's Stone",
        "author": "J. K. Rowling",
        "publisher": "Scholastic",
        "publication_year": 1997,
        "description": "Sample",
        "cover_image_url": "https://covers.openlibrary.org/b/id/123-L.jpg",
        "status": BookStatus.AVAILABLE,
        "shelf_location": "A-101",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def _auth_client() -> TestClient:
    app.dependency_overrides[get_current_user_dep] = lambda: _mock_user()
    return TestClient(app)


def _clear_overrides() -> None:
    app.dependency_overrides.clear()


def test_list_books_success(monkeypatch):
    from book import routes as routes_module

    monkeypatch.setattr(
        routes_module,
        "list_books",
        lambda **_: SimpleNamespace(items=[_book_obj()], total=1, page=1, limit=20),
    )
    client = _auth_client()
    try:
        res = client.get("/api/v1/books/")
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["pagination"]["total"] == 1
        assert len(body["data"]["items"]) == 1
    finally:
        _clear_overrides()


def test_get_book_not_found(monkeypatch):
    from book import routes as routes_module

    def _raise_not_found(_book_id):
        raise BookNotFoundError("Book not found")

    monkeypatch.setattr(routes_module, "get_book", _raise_not_found)
    client = _auth_client()
    try:
        res = client.get(f"/api/v1/books/{uuid4()}")
        assert res.status_code == 404
    finally:
        _clear_overrides()


def test_create_book_conflict(monkeypatch):
    from book import routes as routes_module

    def _raise_conflict(**_kwargs):
        raise BookConflictError("A book with this ISBN already exists")

    monkeypatch.setattr(routes_module, "create_book", _raise_conflict)
    client = _auth_client()
    try:
        res = client.post(
            "/api/v1/books/",
            json={
                "isbn": "9780439554930",
                "title": "Test",
                "author": "Author",
                "publisher": "Pub",
                "publication_year": 2000,
                "description": "Desc",
                "cover_image_url": "https://example.com/cover.jpg",
                "status": "AVAILABLE",
                "shelf_location": "A-1",
            },
        )
        assert res.status_code == 409
    finally:
        _clear_overrides()


def test_search_suggestions_success(monkeypatch):
    from book import routes as routes_module

    monkeypatch.setattr(
        routes_module,
        "get_search_suggestions",
        lambda q, limit: [("Harry Potter", "title"), ("9780439554930", "isbn")],
    )
    client = _auth_client()
    try:
        res = client.get("/api/v1/books/search/suggestions?q=harry")
        assert res.status_code == 200
        body = res.json()
        assert body["data"]["count"] == 2
    finally:
        _clear_overrides()


def test_discovery_overview_success(monkeypatch):
    from book import routes as routes_module

    monkeypatch.setattr(routes_module, "get_random_discovery_books", lambda limit: [_book_obj()])
    monkeypatch.setattr(routes_module, "get_top_authors", lambda limit: [("Author", 10)])
    monkeypatch.setattr(routes_module, "get_top_publishers", lambda limit: [("Publisher", 8)])
    monkeypatch.setattr(routes_module, "get_top_publication_years", lambda limit: [(2020, 7)])
    monkeypatch.setattr(
        routes_module,
        "get_book_catalog_stats",
        lambda: {
            "total_books": 100,
            "available_books": 80,
            "checked_out_books": 10,
            "reserved_books": 5,
            "unavailable_books": 5,
            "missing_cover_count": 20,
            "missing_publication_year_count": 15,
        },
    )
    client = _auth_client()
    try:
        res = client.get("/api/v1/books/discover/overview")
        assert res.status_code == 200
        body = res.json()
        assert body["data"]["stats"]["total_books"] == 100
        assert len(body["data"]["random_books"]) == 1
    finally:
        _clear_overrides()


def test_requires_auth_for_books_list():
    client = TestClient(app)
    res = client.get("/api/v1/books/")
    assert res.status_code == 401

