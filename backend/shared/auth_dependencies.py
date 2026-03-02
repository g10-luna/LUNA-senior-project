"""
Shared auth dependencies for JWT validation and RBAC.
Other services can use these to protect routes.
"""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from auth.schemas import UserResponse, UserRole
from auth.services import get_current_user

security = HTTPBearer(auto_error=False)


def get_access_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    """Extract access token from Authorization header."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> UserResponse | None:
    """Get current user if token provided, else None."""
    if not credentials:
        return None
    try:
        return get_current_user(credentials.credentials)
    except ValueError:
        return None


def get_current_user_dep(
    token: str = Depends(get_access_token),
) -> UserResponse:
    """Require valid JWT. Raises 401 if missing or invalid."""
    try:
        return get_current_user(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_role(*allowed_roles: UserRole):
    """Dependency factory: require user to have one of the given roles."""

    def role_checker(user: UserResponse = Depends(get_current_user_dep)) -> UserResponse:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {[r.value for r in allowed_roles]}",
            )
        return user

    return role_checker


# Convenience dependencies
RequireStudent = Depends(require_role(UserRole.STUDENT))
RequireLibrarian = Depends(require_role(UserRole.LIBRARIAN))
RequireAdmin = Depends(require_role(UserRole.ADMIN))
RequireLibrarianOrAdmin = Depends(require_role(UserRole.LIBRARIAN, UserRole.ADMIN))
