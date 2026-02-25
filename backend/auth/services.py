"""
Auth business logic using Supabase Auth.
"""
from uuid import UUID

from auth.supabase_client import get_supabase
from auth.schemas import UserRole, UserResponse
from shared.redis_client import (
    invalidate_refresh_token,
    is_refresh_token_valid,
    store_refresh_token,
)


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
        store_refresh_token(str(user_id), session.refresh_token)
        return _supabase_user_to_response(user), session.access_token, session.refresh_token, session.expires_in or 3600
    # Email confirmation required
    return _supabase_user_to_response(user), None, None, None


def login_user(email: str, password: str):
    """Login user via Supabase Auth."""
    supabase = get_supabase()
    response = supabase.auth.sign_in_with_password({"email": email, "password": password})
    if not response.session or not response.user:
        raise ValueError("Invalid email or password")
    user = response.user
    user_id = user.id if hasattr(user, "id") else user["id"]
    session = response.session
    store_refresh_token(str(user_id), session.refresh_token)
    return (
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


def get_current_user(access_token: str) -> UserResponse:
    """Get user from access token."""
    supabase = get_supabase()
    response = supabase.auth.get_user(access_token)
    if not response or not response.user:
        raise ValueError("Invalid or expired token")
    return _supabase_user_to_response(response.user)


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
    return get_current_user(access_token)


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
