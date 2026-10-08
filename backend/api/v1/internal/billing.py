"""Billing endpoints (internal): баланс и пополнение."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from dependencies import CurrentUser
from modules.billing import service as billing_service
from modules.billing.schemas import (
    BalancePublic,
    BalanceTransactionPublic,
    PaymentPublic,
    TopupRequest,
    TopupResponse,
)

router = APIRouter(prefix="/billing", tags=["billing"])

TOPUP_PRESETS = [300, 500, 1000, 3000]


@router.get("/balance", response_model=BalancePublic)
async def get_balance(user: CurrentUser):
    return BalancePublic(
        balance=user.balance,
        topup_min=settings.topup_min_amount,
        topup_max=settings.topup_max_amount,
        topup_presets=TOPUP_PRESETS,
    )


@router.post("/topup", response_model=TopupResponse)
async def topup(
    payload: TopupRequest,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    url, payment = await billing_service.create_topup_payment(
        db, user, payload.amount, payload.provider
    )
    return TopupResponse(payment_url=url, payment_id=payment.id)


@router.get("/payments", response_model=list[PaymentPublic])
async def list_payments(
    user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
):
    payments = await billing_service.list_user_payments(db, user)
    return [PaymentPublic.model_validate(p) for p in payments]


@router.get("/transactions", response_model=list[BalanceTransactionPublic])
async def list_transactions(
    user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
):
    items = await billing_service.list_transactions(db, user.id)
    return [BalanceTransactionPublic.model_validate(t) for t in items]
