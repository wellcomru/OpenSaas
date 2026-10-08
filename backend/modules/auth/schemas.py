"""Pydantic схемы для auth."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    referral_code: str | None = None
    # Решение ALTCHA (base64 JSON), см. modules/auth/altcha.py
    altcha: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class ConfirmEmailRequest(BaseModel):
    token: str


class ResendConfirmationRequest(BaseModel):
    email: EmailStr


class VerifyEmailCodeRequest(BaseModel):
    user_id: UUID
    code: str = Field(min_length=6, max_length=6)


class ResendCodeRequest(BaseModel):
    user_id: UUID


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    altcha: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    role: str
    is_active: bool
    is_email_verified: bool
    balance: Decimal = Decimal("0")
    created_at: datetime


class AuthConfig(BaseModel):
    """Что включено на сервере — фронт подстраивает формы под это."""

    email_enabled: bool
    captcha: str | None


class AuthResponse(TokenPair):
    user: UserPublic
    pending_verification: bool = False
    dev_code: str | None = None
