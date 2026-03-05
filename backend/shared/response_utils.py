"""
LUNA API response helpers - System Design Section 6.2.2.
Standard response format for success and error responses.
"""
import uuid
from datetime import datetime, timezone
from typing import Any, TypedDict


class ApiMeta(TypedDict):
    """Meta object included in all API responses per Section 6.2.2."""

    timestamp: str
    request_id: str


class ApiSuccessResponse(TypedDict):
    """Success response shape per LUNA Section 6.2.2."""

    success: bool
    data: dict[str, Any]
    meta: ApiMeta


class ApiErrorResponse(TypedDict):
    """Error response shape per LUNA Section 6.2.2."""

    success: bool
    error: dict[str, Any]
    meta: ApiMeta


_RESERVED_KEYS = frozenset({"success", "data", "error", "meta"})


def _make_meta() -> ApiMeta:
    """Build meta object with timestamp and request_id."""
    return ApiMeta(
        timestamp=datetime.now(timezone.utc).isoformat(),
        request_id=str(uuid.uuid4())[:8],
    )


def api_success(data: dict[str, Any]) -> ApiSuccessResponse:
    """
    Standard success response per LUNA Section 6.2.2.

    Args:
        data: Response payload. Must be a dict. Must not contain reserved keys
              (success, data, error, meta) to avoid accidental override.

    Returns:
        Dict with success=True, data, and meta (timestamp, request_id).

    Raises:
        TypeError: If data is not a dict.
        ValueError: If data contains reserved keys.
    """
    if not isinstance(data, dict):
        raise TypeError("data must be a dict")
    if _RESERVED_KEYS & set(data.keys()):
        raise ValueError(
            f"data must not contain reserved keys: {_RESERVED_KEYS}. "
            f"Found: {_RESERVED_KEYS & set(data.keys())}"
        )
    return ApiSuccessResponse(
        success=True,
        data=data,
        meta=_make_meta(),
    )


def api_error(
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> ApiErrorResponse:
    """
    Standard error response per LUNA Section 6.2.2.

    Args:
        code: Error code (e.g., "AUTH_FAILED").
        message: Human-readable error message.
        details: Optional additional error context. Non-dict values are
                 replaced with empty dict for safety.

    Returns:
        Dict with success=False, error (code, message, details), and meta.
    """
    safe_details: dict[str, Any] = details if isinstance(details, dict) else {}
    return ApiErrorResponse(
        success=False,
        error={"code": code, "message": message, "details": safe_details},
        meta=_make_meta(),
    )
