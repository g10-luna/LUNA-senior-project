"""
Unit tests for shared.response_utils – VIBE Refactor Lab 2.

These tests validate the contract defined in System Design Section 6.2.2 and
serve as the "Evidence of Execution" (E step of the VIBE loop).

Run with:
    pytest backend/shared/tests/test_response_utils.py -v
"""

import re
from datetime import datetime, timezone

import pytest

# Adjust path so the module resolves without a full FastAPI environment.
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from shared.response_utils import (
    ApiError,
    ApiSuccess,
    api_error,
    api_success,
)


# ---------------------------------------------------------------------------
# api_success
# ---------------------------------------------------------------------------


class TestApiSuccess:
    def test_success_flag_is_true(self) -> None:
        """success field must be the literal True."""
        result = api_success({"user_id": "abc123"})
        assert result["success"] is True

    def test_data_is_preserved(self) -> None:
        """Whatever is passed as data must appear unchanged under the data key."""
        payload = {"user_id": "abc123", "role": "patron"}
        result = api_success(payload)
        assert result["data"] == payload

    def test_meta_keys_present(self) -> None:
        """Meta block must expose timestamp and request_id."""
        result = api_success({})
        assert "timestamp" in result["meta"]
        assert "request_id" in result["meta"]

    def test_timestamp_is_utc_iso8601(self) -> None:
        """Timestamp must be a parseable UTC ISO-8601 string."""
        result = api_success({})
        ts = result["meta"]["timestamp"]
        # datetime.fromisoformat raises ValueError on bad format
        parsed = datetime.fromisoformat(ts)
        assert parsed.tzinfo is not None, "Timestamp must be timezone-aware"

    def test_request_id_is_8_hex_chars(self) -> None:
        """Request ID must be exactly 8 lowercase hex characters."""
        result = api_success({})
        rid = result["meta"]["request_id"]
        assert re.fullmatch(r"[0-9a-f]{8}", rid), f"Bad request_id: {rid!r}"

    def test_unique_request_ids_per_call(self) -> None:
        """Every call must produce a distinct request_id (not a cached value)."""
        ids = {api_success({})["meta"]["request_id"] for _ in range(20)}
        assert len(ids) > 1, "request_ids must be unique across calls"

    def test_data_accepts_list(self) -> None:
        """data may be a list, not just a dict."""
        result = api_success([{"id": 1}, {"id": 2}])
        assert result["data"] == [{"id": 1}, {"id": 2}]

    def test_data_accepts_none(self) -> None:
        """data may be None for endpoints that return no body."""
        result = api_success(None)
        assert result["data"] is None


# ---------------------------------------------------------------------------
# api_error
# ---------------------------------------------------------------------------


class TestApiError:
    def test_success_flag_is_false(self) -> None:
        """success field must be the literal False."""
        result = api_error("INVALID_TOKEN", "Token has expired.")
        assert result["success"] is False

    def test_error_code_preserved(self) -> None:
        result = api_error("NOT_FOUND", "User not found.")
        assert result["error"]["code"] == "NOT_FOUND"

    def test_error_message_preserved(self) -> None:
        result = api_error("NOT_FOUND", "User not found.")
        assert result["error"]["message"] == "User not found."

    def test_details_defaults_to_empty_dict(self) -> None:
        """When details is omitted, the error body must carry an empty dict."""
        result = api_error("GENERIC", "Something went wrong.")
        assert result["error"]["details"] == {}

    def test_details_accepts_dict(self) -> None:
        """Dict details are passed through unchanged."""
        details = {"field": "email", "reason": "already registered"}
        result = api_error("CONFLICT", "Email in use.", details=details)
        assert result["error"]["details"] == details

    def test_details_accepts_list(self) -> None:
        """
        VIBE Verification Event:

        The AI initially suggested ``details: dict | None = None``, which would
        silently drop Supabase validation errors – they arrive as a *list* of
        per-field error objects, not a plain dict. We changed the type to ``Any``
        so lists pass through correctly.
        """
        supabase_field_errors = [
            {"field": "email", "message": "is invalid"},
            {"field": "password", "message": "is too short"},
        ]
        result = api_error("VALIDATION_ERROR", "Input validation failed.", details=supabase_field_errors)
        assert isinstance(result["error"]["details"], list)
        assert len(result["error"]["details"]) == 2

    def test_meta_keys_present(self) -> None:
        result = api_error("ERR", "err")
        assert "timestamp" in result["meta"]
        assert "request_id" in result["meta"]

    def test_unique_request_ids_per_call(self) -> None:
        ids = {api_error("E", "e")["meta"]["request_id"] for _ in range(20)}
        assert len(ids) > 1

    def test_timestamp_is_utc_iso8601(self) -> None:
        result = api_error("E", "e")
        ts = result["meta"]["timestamp"]
        parsed = datetime.fromisoformat(ts)
        assert parsed.tzinfo is not None


# ---------------------------------------------------------------------------
# TypedDict shape compliance
# ---------------------------------------------------------------------------


class TestTypedDictShape:
    def test_api_success_is_typed_dict_compatible(self) -> None:
        """Verify the return value has precisely the keys defined in ApiSuccess."""
        result = api_success({"x": 1})
        assert set(result.keys()) == {"success", "data", "meta"}

    def test_api_error_is_typed_dict_compatible(self) -> None:
        """Verify the return value has precisely the keys defined in ApiError."""
        result = api_error("CODE", "msg")
        assert set(result.keys()) == {"success", "error", "meta"}

    def test_api_error_body_keys(self) -> None:
        """error sub-dict must have exactly code, message, details."""
        result = api_error("CODE", "msg")
        assert set(result["error"].keys()) == {"code", "message", "details"}
