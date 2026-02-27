"""
Auth request/response schemas aligned with System Design Section 6.2.
"""
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    STUDENT = "STUDENT"
    LIBRARIAN = "LIBRARIAN"
    ADMIN = "ADMIN"


# --- Register ---
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    phone_number: str | None = None
    role: UserRole = UserRole.STUDENT


# --- Login ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# --- Refresh ---
class RefreshRequest(BaseModel):
    refresh_token: str


# --- Forgot Password ---
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


# --- Reset Password ---
class ResetPasswordRequest(BaseModel):
    token: str = Field(..., description="Password reset token from email")
    new_password: str = Field(..., min_length=8)


# --- Change Password ---
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


# --- Update Profile (PUT /me) ---
class UpdateProfileRequest(BaseModel):
    first_name: str | None = Field(None, min_length=1)
    last_name: str | None = Field(None, min_length=1)
    phone_number: str | None = None


# --- Response models ---
class UserResponse(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    role: UserRole
    phone_number: str | None = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int = Field(..., description="Access token expiry in seconds")
    token_type: str = "Bearer"


class RegisterResponse(BaseModel):
    user: UserResponse
    access_token: str | None = None
    refresh_token: str | None = None
    expires_in: int | None = None
    token_type: str | None = "Bearer"
    message: str | None = None


class LoginResponse(BaseModel):
    user: UserResponse
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "Bearer"
