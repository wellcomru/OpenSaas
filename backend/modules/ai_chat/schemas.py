"""Pydantic схемы для ai_chat."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AiModelPublic(BaseModel):
    """Модель для пользователя: цены уже с наценкой, ₽ за 1 млн токенов."""

    id: str
    name: str
    description: str
    input_price: Decimal
    output_price: Decimal


class AiModelAdmin(BaseModel):
    """Модель для админки: себестоимость, ₽ за 1 млн токенов."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    input_price: Decimal
    output_price: Decimal
    is_active: bool
    sort_order: int


class AiModelCreate(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=255)
    input_price: Decimal = Field(ge=0)
    output_price: Decimal = Field(ge=0)
    is_active: bool = True
    sort_order: int = 100


class AiModelUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=255)
    input_price: Decimal | None = Field(default=None, ge=0)
    output_price: Decimal | None = Field(default=None, ge=0)
    is_active: bool | None = None
    sort_order: int | None = None


class ChatConfig(BaseModel):
    enabled: bool
    default_model: str
    markup_percent: Decimal
    models: list[AiModelPublic]


class ChatPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    model: str
    created_at: datetime
    updated_at: datetime


class ChatRename(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class ChatMessagePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role: str
    content: str
    model: str | None = None
    prompt_tokens: int
    completion_tokens: int
    cost: Decimal
    created_at: datetime


class SendMessageRequest(BaseModel):
    chat_id: UUID | None = None
    model: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=100_000)


class UsageSummary(BaseModel):
    balance: Decimal
    total_spent: Decimal
