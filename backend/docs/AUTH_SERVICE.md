# Auth Service Documentation

## Overview

The Auth Service implements user authentication and authorization per **Backend Implementation Design Section 5.1** and **System Design Section 6.1.1, 6.3**.

## Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | Login and get tokens | No |
| POST | `/api/v1/auth/logout` | Logout and invalidate refresh token | Yes |
| POST | `/api/v1/auth/refresh` | Refresh access token | No (uses refresh_token in body) |
| POST | `/api/v1/auth/forgot-password` | Request password reset email | No |
| POST | `/api/v1/auth/reset-password` | Reset password with token | No |
| GET | `/api/v1/auth/me` | Get current user profile | Yes |
| PUT | `/api/v1/auth/me` | Update profile | Yes |
| PUT | `/api/v1/auth/change-password` | Change password | Yes |

## Request/Response Formats

### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "SecurePassword123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+1234567890",
  "role": "STUDENT"
}
```

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "SecurePassword123!"
}
```

### Refresh
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Protected Endpoints
```http
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

## JWT & Tokens

- **Access token:** Short-lived (Supabase default ~1 hour), used in `Authorization: Bearer` header
- **Refresh token:** Long-lived (7 days), stored in Redis; invalidated on logout
- **Token flow:** Login returns both; use refresh endpoint when access token expires

## RBAC (Role-Based Access Control)

**Roles:** `STUDENT`, `LIBRARIAN`, `ADMIN`

### Using RBAC in Other Services

```python
from shared.auth_dependencies import (
    get_current_user_dep,
    require_role,
    UserRole,
)

# Require any authenticated user
@router.get("/items")
def get_items(user: UserResponse = Depends(get_current_user_dep)):
    ...

# Require Librarian or Admin
@router.post("/books")
def create_book(user: UserResponse = Depends(require_role(UserRole.LIBRARIAN, UserRole.ADMIN))):
    ...
```

### API Gateway

For Nginx or Kong, validate JWT by calling the Auth service or using a shared secret. The Auth service can expose a token validation endpoint, or the gateway can verify the JWT signature if it has the secret.

## Environment Variables

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)
- `REDIS_URL` - Redis for refresh token storage

## Running the Service

```bash
cd backend
source venv/bin/activate
uvicorn auth.main:app --host 0.0.0.0 --port 8001 --reload
```

API docs: http://localhost:8001/docs
