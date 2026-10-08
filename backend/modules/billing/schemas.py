"""Pydantic схемы для billing."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BalancePublic(BaseModel):
    balance: Decimal
    currency: str = "RUB"
    topup_min: Decimal
    topup_max: Decimal
    topup_presets: list[int]


class TopupRequest(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    provider: str = "robokassa"  # "robokassa" | "stripe"


class TopupResponse(BaseModel):
    payment_url: str
    payment_id: UUID


class PaymentPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    amount: Decimal
    currency: str
    status: str
    provider: str
    created_at: datetime


class BalanceTransactionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    amount: Decimal
    kind: str
    description: str
    created_at: datetime
