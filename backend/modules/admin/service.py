"""Бизнес-логика админки."""
from __future__ import annotations

from decimal import Decimal
from typing import Sequence
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from modules.auth.models import User, UserRole
from modules.ai_chat.models import ChatMessage
from modules.billing.models import BalanceTransactionKind, Payment, PaymentStatus
from modules.billing.service import credit
from modules.referrals.models import ReferralPayout, ReferralPayoutStatus


async def stats(db: AsyncSession) -> dict:
    total_users = await db.scalar(select(func.count(User.id)))
    revenue = await db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.status == PaymentStatus.SUCCESS
        )
    )
    ai_spent = Decimal(
        await db.scalar(select(func.coalesce(func.sum(ChatMessage.cost), 0))) or 0
    )
    total_balance = await db.scalar(select(func.coalesce(func.sum(User.balance), 0)))
    pending_payouts = await db.scalar(
        select(func.coalesce(func.sum(ReferralPayout.amount), 0)).where(
            ReferralPayout.status.in_(
                [ReferralPayoutStatus.PENDING, ReferralPayoutStatus.APPROVED]
            )
        )
    )
    markup = 1 + settings.ai_markup_percent / 100

    return {
        "total_users": total_users or 0,
        "revenue": Decimal(revenue or 0),
        "ai_spent": ai_spent,
        # Прибыль с ИИ: списано с пользователей минус себестоимость.
        "ai_profit": (ai_spent - ai_spent / markup).quantize(Decimal("0.01")),
        "total_balance": Decimal(total_balance or 0),
        "pending_payouts": Decimal(pending_payouts or 0),
    }


async def list_users(
    db: AsyncSession,
    page: int = 1,
    limit: int = 20,
    role: str | None = None,
    is_active: bool | None = None,
) -> Sequence[User]:
    q = select(User).order_by(User.created_at.desc())
    if role:
        q = q.where(User.role == role)
    if is_active is not None:
        q = q.where(User.is_active == is_active)
    return (await db.scalars(q.limit(limit).offset((page - 1) * limit))).all()


async def set_role(db: AsyncSession, user_id: UUID, role: UserRole) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role
    await db.commit()
    return user


async def set_active(db: AsyncSession, user_id: UUID, is_active: bool) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = is_active
    await db.commit()
    return user


async def list_payments(db: AsyncSession, limit: int = 100) -> Sequence[Payment]:
    return (
        await db.scalars(
            select(Payment).order_by(Payment.created_at.desc()).limit(limit)
        )
    ).all()


async def adjust_balance(
    db: AsyncSession, user_id: UUID, amount: Decimal, comment: str
) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    await credit(
        db, user.id, amount, BalanceTransactionKind.ADMIN,
        comment or "Корректировка администратором",
    )
    await db.commit()
    await db.refresh(user)
    return user
