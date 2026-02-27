"""
Auth API routes - System Design Section 6.1.1.
Base path: /api/v1/auth
"""
import logging
import uuid
from datetime import datetime, timezone
import os
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, status

from auth.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    RefreshRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    UserResponse,
)
from auth.services import (
    change_password,
    delete_user_account,
    delete_local_user_profile,
    get_current_user,
    login_user,
    logout_user,
    refresh_tokens,
    register_user,
    update_user_profile,
)
from shared.auth_dependencies import get_access_token, get_current_user_dep

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
logger = logging.getLogger(__name__)


def _success(data: dict) -> dict:
    """Standard success response per Section 6.2.2."""
    return {
        "success": True,
        "data": data,
        "meta": {"timestamp": datetime.now(timezone.utc).isoformat(), "request_id": str(uuid.uuid4())[:8]},
    }


def _error(code: str, message: str, details: dict | None = None) -> dict:
    """Standard error response per Section 6.2.2."""
    return {
        "success": False,
        "error": {"code": code, "message": message, "details": details or {}},
        "meta": {"timestamp": datetime.now(timezone.utc).isoformat(), "request_id": str(uuid.uuid4())[:8]},
    }


def _extract_deleted_user_id(payload: dict[str, Any]) -> str | None:
    """
    Extract user id from common Supabase webhook payload variants.

    Supports:
    - DB webhook style: {"type":"DELETE","schema":"auth","table":"users","old_record":{"id":"..."}}
    - DB webhook style: {"type":"DELETE","record":{"id":"..."}}
    - App event style: {"event":"user.deleted","user":{"id":"..."}}
    """
    event_type = str(payload.get("type") or payload.get("event") or "").upper()
    schema = str(payload.get("schema") or "").lower()
    table = str(payload.get("table") or "").lower()

    if event_type in {"DELETE", "USER.DELETED", "USER_DELETED"}:
        if schema and schema != "auth":
            return None
        if table and table != "users":
            return None
        old_record = payload.get("old_record")
        record = payload.get("record")
        user = payload.get("user")
        for source in (old_record, record, user):
            if isinstance(source, dict):
                uid = source.get("id")
                if uid:
                    return str(uid)
    return None


@router.post("/register")
def register(req: RegisterRequest):
    """Register new user account."""
    try:
        result = register_user(
            email=req.email,
            password=req.password,
            first_name=req.first_name,
            last_name=req.last_name,
            phone_number=req.phone_number,
            role=req.role,
        )
        user, access_token, refresh_token, expires_in = result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        logger.exception("Unexpected registration failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed due to an internal error",
        )
    if access_token is None:
        return _success({
            "user": user.model_dump(mode="json"),
            "message": "Registration successful. Please check your email to confirm your account.",
        })
    return _success({
        "user": user.model_dump(mode="json"),
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": expires_in,
    })


@router.post("/login")
def login(req: LoginRequest):
    """Authenticate user and get tokens."""
    try:
        user, access_token, refresh_token, expires_in = login_user(
            req.email,
            req.password,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception:
        logger.exception("Unexpected login failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed due to an internal error",
        )
    return _success({
        "user": user.model_dump(mode="json"),
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": expires_in,
        "token_type": "Bearer",
    })


@router.post("/logout")
def logout(user: UserResponse = Depends(get_current_user_dep)):
    """Logout and invalidate refresh token."""
    logout_user(str(user.id))
    return _success({"message": "Logged out successfully"})


@router.post("/refresh")
def refresh(req: RefreshRequest):
    """Refresh access token."""
    try:
        access_token, new_refresh_token, expires_in = refresh_tokens(req.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    return _success({
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "expires_in": expires_in,
        "token_type": "Bearer",
    })


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    """Request password reset email."""
    from auth.supabase_client import get_supabase
    try:
        get_supabase().auth.reset_password_for_email(req.email)
    except Exception:
        # Keep response generic to avoid user-enumeration; log for operators.
        logger.exception("Password reset email request failed")
    return _success({"message": "If the email exists, a password reset link has been sent."})


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    """Reset password with token from email link.
    Token from Supabase reset link. verify_otp establishes session, then update_user sets new password.
    """
    from auth.supabase_client import get_supabase
    supabase = get_supabase()
    try:
        supabase.auth.verify_otp({"token_hash": req.token, "type": "recovery"})
        supabase.auth.update_user({"password": req.new_password})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    return _success({"message": "Password has been reset."})


@router.get("/me", response_model=dict)
def get_me(user: UserResponse = Depends(get_current_user_dep)):
    """Get current user profile."""
    return _success({"user": user.model_dump(mode="json")})


@router.put("/me")
def update_me(
    req: UpdateProfileRequest,
    user: UserResponse = Depends(get_current_user_dep),
    token: str = Depends(get_access_token),
):
    """Update current user profile."""
    try:
        updated = update_user_profile(
            access_token=token,
            first_name=req.first_name,
            last_name=req.last_name,
            phone_number=req.phone_number,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _success({"user": updated.model_dump(mode="json")})


@router.put("/change-password")
def change_pwd(
    req: ChangePasswordRequest,
    user: UserResponse = Depends(get_current_user_dep),
    token: str = Depends(get_access_token),
):
    """Change user password."""
    try:
        change_password(token, req.current_password, req.new_password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _success({"message": "Password changed successfully"})


@router.delete("/me")
def delete_me(user: UserResponse = Depends(get_current_user_dep)):
    """Delete current authenticated user account."""
    try:
        delete_user_account(str(user.id))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _success({"message": "User account deleted"})


@router.post("/webhooks/supabase-user-deleted")
def supabase_user_deleted_webhook(
    payload: dict[str, Any],
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
):
    """
    Handle Supabase user deletion events and remove mirrored local profile.
    Configure the same secret in Supabase webhook headers and backend .env.
    """
    expected_secret = os.getenv("SUPABASE_WEBHOOK_SECRET")
    if not expected_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SUPABASE_WEBHOOK_SECRET is not configured",
        )
    if x_webhook_secret != expected_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret")

    user_id = _extract_deleted_user_id(payload)
    if not user_id:
        # Acknowledge unrelated/unsupported events so webhook retries do not pile up.
        return _success({"handled": False, "reason": "No supported user deletion payload found"})

    deleted = delete_local_user_profile(user_id)
    return _success({"handled": True, "user_id": user_id, "deleted": deleted})
