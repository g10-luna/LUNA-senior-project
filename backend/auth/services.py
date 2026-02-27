"""
Auth business logic using Supabase Auth.
"""
import logging
import os
from uuid import UUID

from supabase import create_client

from auth.supabase_client import get_supabase
from auth.schemas import UserRole, UserResponse
from shared.db import SessionLocal
from shared.models import UserProfile, UserRole as DbUserRole
from shared.redis_client import (
    invalidate_refresh_token,
    is_refresh_token_valid,
    store_refresh_token,
)

logger = logging.getLogger(__name__)


def _get_fresh_supabase_service_client():
    """
    Get a fresh Supabase client using service role key.

    Using a fresh client avoids auth-session state carry-over across requests
    when singleton clients perform end-user sign-in operations.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return create_client(url, key)


def _user_metadata_to_role(metadata: dict | None) -> UserRole:
    role = (metadata or {}).get("role", "STUDENT")
    try:
        return UserRole(role)
    except ValueError:
        return UserRole.STUDENT


def _supabase_user_to_response(user) -> UserResponse:
    """Convert Supabase User (dict or model) to UserResponse."""
    if hasattr(user, "model_dump"):
        user = user.model_dump()
    elif hasattr(user, "dict"):
        user = user.dict()
    metadata = (user.get("user_metadata") or {}) if isinstance(user, dict) else {}
    email = user.get("email") or ""
    return UserResponse(
        id=UUID(user["id"]),
        email=email,
        first_name=metadata.get("first_name", ""),
        last_name=metadata.get("last_name", ""),
        role=_user_metadata_to_role(metadata),
        phone_number=metadata.get("phone_number"),
    )


def _sync_user_profile(user: UserResponse) -> None:
    """
    Upsert auth user into local app.user_profiles.

    Supabase Auth is source-of-truth for credentials; we mirror core profile
    fields locally for app-domain relationships and joins.
    """
    db = SessionLocal()
    try:
        existing = db.get(UserProfile, user.id)
        if existing is None:
            db.add(
                UserProfile(
                    id=user.id,
                    email=user.email,
                    first_name=user.first_name or "",
                    last_name=user.last_name or "",
                    role=DbUserRole(user.role.value),
                    phone_number=user.phone_number,
                    is_active=True,
                )
            )
        else:
            existing.email = user.email
            existing.first_name = user.first_name or existing.first_name
            existing.last_name = user.last_name or existing.last_name
            existing.role = DbUserRole(user.role.value)
            existing.phone_number = user.phone_number
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def delete_local_user_profile(user_id: str) -> bool:
    """Delete local app.user_profiles row for a Supabase user ID."""
    db = SessionLocal()
    try:
        uid = UUID(user_id)
        existing = db.get(UserProfile, uid)
        if existing is None:
            return False
        db.delete(existing)
        db.commit()
        return True
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def register_user(
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    phone_number: str | None,
    role: UserRole,
):
    """Register new user via Supabase Auth."""
    supabase = get_supabase()
    response = supabase.auth.sign_up(
        {
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone_number": phone_number or "",
                    "role": role.value,
                }
            },
        }
    )
    if response.user is None:
        raise ValueError("Registration failed")
    user = response.user
    user_id = user.id if hasattr(user, "id") else user["id"]
    # Supabase may require email confirmation - check session
    session = response.session
    if session:
        user_response = _supabase_user_to_response(user)
        _sync_user_profile(user_response)
        store_refresh_token(str(user_id), session.refresh_token)
        return user_response, session.access_token, session.refresh_token, session.expires_in or 3600
    # Email confirmation required
    user_response = _supabase_user_to_response(user)
    _sync_user_profile(user_response)
    return user_response, None, None, None


def login_user(email: str, password: str):
    """Login user via Supabase Auth."""
    supabase = get_supabase()
    try:
        response = supabase.auth.sign_in_with_password({"email": email, "password": password})
    except Exception:
        # Normalize expected auth failures from Supabase into a consistent 401 path.
        raise ValueError("Invalid email or password")
    if not response.session or not response.user:
        raise ValueError("Invalid email or password")
    user = response.user
    user_id = user.id if hasattr(user, "id") else user["id"]
    session = response.session
    user_response = _supabase_user_to_response(user)
    _sync_user_profile(user_response)
    store_refresh_token(str(user_id), session.refresh_token)
    return (
        user_response,
        session.access_token,
        session.refresh_token,
        session.expires_in or 3600,
    )


def refresh_tokens(refresh_token: str):
    """Refresh access token using refresh token."""
    supabase = get_supabase()
    response = supabase.auth.refresh_session(refresh_token)
    if not response.session or not response.user:
        raise ValueError("Invalid or expired refresh token")
    user = response.user
    user_id = user.id if hasattr(user, "id") else user["id"]
    session = response.session
    if not is_refresh_token_valid(str(user_id), refresh_token):
        raise ValueError("Refresh token has been invalidated (logged out)")
    # Update stored refresh token
    store_refresh_token(str(user_id), session.refresh_token)
    return (
        session.access_token,
        session.refresh_token,
        session.expires_in or 3600,
    )


def logout_user(user_id: str):
    """Invalidate refresh token for user."""
    invalidate_refresh_token(user_id)


def delete_user_account(user_id: str) -> None:
    """
    Delete user account in Supabase Auth and mirrored local profile.

    This is intended for self-service account deletion (`DELETE /me`).
    """
    supabase = _get_fresh_supabase_service_client()
    try:
        # Prefer hard delete. Keep compatibility with supabase-py signature variants.
        try:
            supabase.auth.admin.delete_user(user_id, should_soft_delete=False)
        except TypeError:
            supabase.auth.admin.delete_user(user_id)
    except Exception as e:
        logger.exception("Supabase delete_user failed for user_id=%s", user_id)
        raise ValueError(f"Failed to delete user account: {e}")

    # Best-effort local cleanup after auth deletion succeeds.
    delete_local_user_profile(user_id)
    invalidate_refresh_token(user_id)


def get_current_user(access_token: str) -> UserResponse:
    """Get user from access token."""
    supabase = get_supabase()
    response = supabase.auth.get_user(access_token)
    if not response or not response.user:
        raise ValueError("Invalid or expired token")
    user_response = _supabase_user_to_response(response.user)
    _sync_user_profile(user_response)
    return user_response


def update_user_profile(access_token: str, first_name: str | None, last_name: str | None, phone_number: str | None):
    """Update user profile via Supabase Admin API."""
    supabase = get_supabase()
    response = supabase.auth.get_user(access_token)
    if not response or not response.user:
        raise ValueError("Invalid or expired token")
    user = response.user
    user_id = user.id if hasattr(user, "id") else user["id"]
    metadata = dict(getattr(user, "user_metadata", None) or user.get("user_metadata", {}) or {})
    if first_name is not None:
        metadata["first_name"] = first_name
    if last_name is not None:
        metadata["last_name"] = last_name
    if phone_number is not None:
        metadata["phone_number"] = phone_number
    supabase.auth.admin.update_user_by_id(user_id, {"user_metadata": metadata})
    updated_user = get_current_user(access_token)
    _sync_user_profile(updated_user)
    return updated_user


def change_password(access_token: str, current_password: str, new_password: str):
    """Change user password."""
    supabase = get_supabase()
    response = supabase.auth.get_user(access_token)
    if not response or not response.user:
        raise ValueError("Invalid or expired token")
    user = response.user
    email = getattr(user, "email", None) or (user.get("email") if isinstance(user, dict) else None)
    # Verify current password by attempting sign in
    try:
        supabase.auth.sign_in_with_password({"email": email, "password": current_password})
    except Exception:
        raise ValueError("Current password is incorrect")
    user_id = user.id if hasattr(user, "id") else user["id"]
    supabase.auth.admin.update_user_by_id(user_id, {"password": new_password})
