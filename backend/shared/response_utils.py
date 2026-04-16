"""
Shared API response helpers – System Design Section 6.2.2.

All LUNA backend routes must use ``api_success`` and ``api_error`` to
guarantee a consistent envelope shape across every service module
(auth, book, delivery, notification, robot).

Response envelope contract
--------------------------
Success::

    {
        "success": true,
        "data": { ... },
        "meta": { "timestamp": "<ISO-8601 UTC>", "request_id": "<8-char hex>" }
    }

Error::

    {
        "success": false,
        "error": { "code": "<SCREAMING_SNAKE>", "message": "<human text>", "details": ... },
        "meta": { "timestamp": "<ISO-8601 UTC>", "request_id": "<8-char hex>" }
    }
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from typing_extensions import TypedDict


# ---------------------------------------------------------------------------
# TypedDict shapes
# ---------------------------------------------------------------------------


class ApiMeta(TypedDict):
    """Metadata block attached to every API response."""

    timestamp: str  # ISO-8601, UTC
    request_id: str  # 8-char hex snippet – enough for log correlation


class ApiErrorBody(TypedDict):
    """Structured error detail nested inside an error envelope."""

    code: str       # SCREAMING_SNAKE identifier, e.g. "INVALID_CREDENTIALS"
    message: str    # Human-readable description shown to callers
    details: Any    # May be a dict *or* a list (e.g. Supabase field-error arrays)


class ApiSuccess(TypedDict):
    """Typed success envelope returned by ``api_success``."""

    success: Literal[True]
    data: Any
    meta: ApiMeta


class ApiError(TypedDict):
    """Typed error envelope returned by ``api_error``."""

    success: Literal[False]
    error: ApiErrorBody
    meta: ApiMeta


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _build_meta() -> ApiMeta:
    """Generate a fresh meta block with a UTC timestamp and a unique request ID."""
    return ApiMeta(
        timestamp=datetime.now(timezone.utc).isoformat(),
        request_id=uuid.uuid4().hex[:8],
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def api_success(data: Any) -> ApiSuccess:
    """
    Build a standard success envelope per Section 6.2.2.

    Args:
        data: Any JSON-serialisable payload to embed under the ``data`` key.

    Returns:
        An ``ApiSuccess`` TypedDict ready to be returned directly from a
        FastAPI route handler.

    Example::

        return api_success({"user": user.model_dump(mode="json")})
    """
    return ApiSuccess(
        success=True,
        data=data,
        meta=_build_meta(),
    )


def api_error(
    code: str,
    message: str,
    details: Any = None,
) -> ApiError:
    """
    Build a standard error envelope per Section 6.2.2.

    ``details`` intentionally accepts ``Any`` (not only ``dict``) because
    Supabase validation responses may return a *list* of per-field error
    objects.  Restricting to ``dict | None`` would silently drop that
    context and was therefore rejected during the VIBE audit.

    Args:
        code:     SCREAMING_SNAKE error identifier, e.g. ``"INVALID_TOKEN"``.
        message:  Human-readable explanation shown to API callers.
        details:  Optional supplemental context (dict, list, or scalar).

    Returns:
        An ``ApiError`` TypedDict ready to be returned directly from a
        FastAPI route handler.

    Example::

        return api_error("NOT_FOUND", "User profile does not exist.")
    """
    return ApiError(
        success=False,
        error=ApiErrorBody(
            code=code,
            message=message,
            details=details if details is not None else {},
        ),
        meta=_build_meta(),
    )
