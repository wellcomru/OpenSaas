"""Бизнес-логика биллинга: баланс в рублях и его пополнение.

Баланс меняется только атомарным UPDATE users SET balance = balance ± x,
чтобы параллельные запросы не затирали друг друга.
"""
from __future__ import annotations

import time
from decimal import Decimal
from typing import Sequence
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from modules.auth.models import User
from modules.billing import robokassa, stripe as stripe_mod
from modules.billing.models import (
    BalanceTransaction,
    BalanceTransactionKind,
    Payment,
    PaymentProvider,
    PaymentStatus,
)


async def add_balance(db: AsyncSession, user_id: UUID, amount: Decimal) -> Decimal:
    """Прибавить (или отнять, если amount < 0) и вернуть новый баланс. Без commit."""
    new_balance = await db.scalar(
        update(User)
        .where(User.id == user_id)
        .values(balance=User.balance + amount)
        .returning(User.balance)
    )
    return Decimal(new_balance)


async def credit(
    db: AsyncSession,
    user_id: UUID,
    amount: Decimal,
    kind: BalanceTransactionKind,
    description: str,
    payment_id: UUID | None = None,
) -> Decimal:
    """Зачислить деньги с записью в историю пополнений. Без commit."""
    db.add(
        BalanceTransaction(
            user_id=user_id,
            amount=amount,
            kind=kind.value,
            description=description,
            payment_id=payment_id,
        )
    )
    return await add_balance(db, user_id, amount)


async def create_topup_payment(
    db: AsyncSession, user: User, amount: Decimal, provider: str
) -> tuple[str, Payment]:
    amount = amount.quantize(Decimal("0.01"))
    if amount < settings.topup_min_amount or amount > settings.topup_max_amount:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Сумма пополнения от {settings.topup_min_amount:.0f} "
                f"до {settings.topup_max_amount:.0f} ₽"
            ),
        )

    try:
        provider_enum = PaymentProvider(provider)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid provider")

    numeric_inv_id = str(int(time.time() * 1000))
    payment = Payment(
        user_id=user.id,
        amount=amount,
        currency="RUB",
        status=PaymentStatus.PENDING,
        provider=provider_enum,
        provider_payment_id=numeric_inv_id,
        payment_metadata={"kind": "topup"},
    )
    db.add(payment)
    await db.flush()

    if provider_enum == PaymentProvider.ROBOKASSA:
        url = robokassa.build_payment_url(
            inv_id=numeric_inv_id,
            amount=amount,
            description=f"{settings.app_name}: пополнение баланса",
            user_email=user.email,
        )
    elif provider_enum == PaymentProvider.STRIPE:
        url = stripe_mod.build_checkout_url(str(payment.id), amount, user.email)
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    await db.commit()
    await db.refresh(payment)
    return url, payment


async def apply_successful_payment(db: AsyncSession, payment: Payment) -> Decimal:
    """Зачислить оплаченную сумму на баланс. Вызывается webhook-ом. Без commit."""
    payment.status = PaymentStatus.SUCCESS
    return await credit(
        db,
        payment.user_id,
        Decimal(payment.amount),
        BalanceTransactionKind.TOPUP,
        "Пополнение баланса",
        payment_id=payment.id,
    )


async def list_user_payments(db: AsyncSession, user: User) -> Sequence[Payment]:
    return (
        await db.scalars(
            select(Payment)
            .where(Payment.user_id == user.id)
            .order_by(Payment.created_at.desc())
        )
    ).all()


async def list_transactions(
    db: AsyncSession, user_id: UUID, limit: int = 100
) -> Sequence[BalanceTransaction]:
    return (
        await db.scalars(
            select(BalanceTransaction)
            .where(BalanceTransaction.user_id == user_id)
            .order_by(BalanceTransaction.created_at.desc())
            .limit(limit)
        )
    ).all()
