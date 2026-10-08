"""Admin endpoints (internal, role=admin required)."""
from __future__ import annotations

from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from dependencies import AdminUser, require_admin
from modules.admin import service as admin_service
from modules.ai_chat import service as chat_service
from modules.ai_chat.models import AiModel
from modules.ai_chat.schemas import AiModelAdmin, AiModelCreate, AiModelUpdate
from modules.auth.models import UserRole
from modules.auth.schemas import UserPublic
from modules.email import service as email_service
from modules.billing.schemas import PaymentPublic
from modules.referrals import service as ref_service
from modules.referrals.models import ReferralPayoutStatus
from modules.referrals.schemas import AdminReferralPayoutPublic

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


class RoleUpdate(BaseModel):
    role: UserRole


class BalanceAdjust(BaseModel):
    # Положительная сумма — начислить, отрицательная — списать.
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    comment: str = Field(default="", max_length=255)


@router.post("/email/test")
async def send_test_email(admin: AdminUser):
    """Отправить проверочное письмо админу и вернуть ошибку SMTP, если она есть."""
    if not settings.email_enabled:
        raise HTTPException(
            status_code=400, detail="SMTP не настроен: задайте SMTP_USER и SMTP_PASSWORD"
        )
    try:
        await email_service.send_test_email(admin.email)
    except Exception as exc:  # noqa: BLE001 — показываем админу причину как есть
        raise HTTPException(
            status_code=502, detail=f"{type(exc).__name__}: {exc}"
        ) from exc
    return {"detail": f"Письмо отправлено на {admin.email}"}


@router.get("/stats")
async def stats(db: Annotated[AsyncSession, Depends(get_db)]):
    return await admin_service.stats(db)


@router.get("/users", response_model=list[UserPublic])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    role: str | None = None,
    status: str | None = Query(default=None),
):
    is_active = None
    if status == "blocked":
        is_active = False
    elif status == "active":
        is_active = True
    items = await admin_service.list_users(
        db, page=page, limit=limit, role=role, is_active=is_active
    )
    return [UserPublic.model_validate(u) for u in items]


@router.patch("/users/{user_id}/role", response_model=UserPublic)
async def set_role(
    user_id: UUID,
    payload: RoleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await admin_service.set_role(db, user_id, payload.role)
    return UserPublic.model_validate(user)


@router.patch("/users/{user_id}/block", response_model=UserPublic)
async def block_user(
    user_id: UUID, db: Annotated[AsyncSession, Depends(get_db)]
):
    user = await admin_service.set_active(db, user_id, False)
    return UserPublic.model_validate(user)


@router.patch("/users/{user_id}/unblock", response_model=UserPublic)
async def unblock_user(
    user_id: UUID, db: Annotated[AsyncSession, Depends(get_db)]
):
    user = await admin_service.set_active(db, user_id, True)
    return UserPublic.model_validate(user)


@router.get("/payments", response_model=list[PaymentPublic])
async def list_payments(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(100, ge=1, le=500),
):
    items = await admin_service.list_payments(db, limit=limit)
    return [PaymentPublic.model_validate(p) for p in items]


@router.get("/referrals/payouts", response_model=list[AdminReferralPayoutPublic])
async def list_referral_payouts(
    db: Annotated[AsyncSession, Depends(get_db)],
    status: ReferralPayoutStatus | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    items = await ref_service.admin_list_payouts(
        db, status_filter=status, limit=limit, offset=offset
    )
    return [AdminReferralPayoutPublic.model_validate(p) for p in items]


@router.patch(
    "/referrals/payouts/{payout_id}/approve",
    response_model=AdminReferralPayoutPublic,
)
async def approve_payout(
    payout_id: UUID, db: Annotated[AsyncSession, Depends(get_db)]
):
    p = await ref_service.admin_set_payout_status(
        db, payout_id, ReferralPayoutStatus.APPROVED
    )
    return AdminReferralPayoutPublic.model_validate(p)


@router.patch(
    "/referrals/payouts/{payout_id}/mark-paid",
    response_model=AdminReferralPayoutPublic,
)
async def mark_paid(
    payout_id: UUID, db: Annotated[AsyncSession, Depends(get_db)]
):
    p = await ref_service.admin_set_payout_status(
        db, payout_id, ReferralPayoutStatus.PAID
    )
    return AdminReferralPayoutPublic.model_validate(p)


@router.patch(
    "/referrals/payouts/{payout_id}/reject",
    response_model=AdminReferralPayoutPublic,
)
async def reject_payout(
    payout_id: UUID, db: Annotated[AsyncSession, Depends(get_db)]
):
    p = await ref_service.admin_set_payout_status(
        db, payout_id, ReferralPayoutStatus.REJECTED
    )
    return AdminReferralPayoutPublic.model_validate(p)


@router.post("/users/{user_id}/balance", response_model=UserPublic)
async def adjust_balance(
    user_id: UUID,
    payload: BalanceAdjust,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if payload.amount == 0:
        raise HTTPException(status_code=400, detail="Сумма не может быть нулевой")
    user = await admin_service.adjust_balance(db, user_id, payload.amount, payload.comment)
    return UserPublic.model_validate(user)


# === Модели ИИ и их себестоимость ===


@router.get("/ai-models", response_model=list[AiModelAdmin])
async def list_ai_models(db: Annotated[AsyncSession, Depends(get_db)]):
    return [
        AiModelAdmin.model_validate(m)
        for m in await chat_service.list_models(db, include_inactive=True)
    ]


@router.post("/ai-models", response_model=AiModelAdmin)
async def create_ai_model(
    payload: AiModelCreate, db: Annotated[AsyncSession, Depends(get_db)]
):
    if await db.get(AiModel, payload.id):
        raise HTTPException(status_code=409, detail="Такая модель уже есть")
    model = AiModel(**payload.model_dump())
    db.add(model)
    await db.commit()
    return AiModelAdmin.model_validate(model)


@router.patch("/ai-models/{model_id:path}", response_model=AiModelAdmin)
async def update_ai_model(
    model_id: str,
    payload: AiModelUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    model = await db.get(AiModel, model_id)
    if model is None:
        raise HTTPException(status_code=404, detail="Модель не найдена")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(model, key, value)
    await db.commit()
    return AiModelAdmin.model_validate(model)
