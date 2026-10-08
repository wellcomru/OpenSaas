"""Чат с ИИ (internal, JWT)."""
from __future__ import annotations

import json
from typing import Annotated
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from dependencies import CurrentUser
from modules.ai_chat import service as chat_service
from modules.ai_chat.schemas import (
    AiModelPublic,
    ChatConfig,
    ChatMessagePublic,
    ChatPublic,
    ChatRename,
    SendMessageRequest,
    UsageSummary,
)

router = APIRouter(prefix="/chat", tags=["chat"])


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n"


@router.get("/config", response_model=ChatConfig)
async def chat_config(db: Annotated[AsyncSession, Depends(get_db)]):
    """Модели и цены (с наценкой). Публичный: нужен и лендингу."""
    models = await chat_service.list_models(db)
    return ChatConfig(
        enabled=settings.ai_enabled,
        default_model=settings.ai_default_model,
        markup_percent=settings.ai_markup_percent,
        models=[
            AiModelPublic(
                id=m.id,
                name=m.name,
                description=m.description,
                input_price=chat_service.user_price(m.input_price),
                output_price=chat_service.user_price(m.output_price),
            )
            for m in models
        ],
    )


@router.get("/usage", response_model=UsageSummary)
async def usage(user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]):
    return UsageSummary(
        balance=user.balance, total_spent=await chat_service.total_spent(db, user.id)
    )


@router.get("/chats", response_model=list[ChatPublic])
async def list_chats(user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]):
    return [ChatPublic.model_validate(c) for c in await chat_service.list_chats(db, user.id)]


@router.get("/chats/{chat_id}/messages", response_model=list[ChatMessagePublic])
async def list_messages(
    chat_id: UUID, user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
):
    chat = await chat_service.get_chat(db, user.id, chat_id)
    return [
        ChatMessagePublic.model_validate(m)
        for m in await chat_service.list_messages(db, chat.id)
    ]


@router.patch("/chats/{chat_id}", response_model=ChatPublic)
async def rename_chat(
    chat_id: UUID,
    payload: ChatRename,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    chat = await chat_service.rename_chat(db, user.id, chat_id, payload.title)
    return ChatPublic.model_validate(chat)


@router.delete("/chats/{chat_id}", status_code=204)
async def delete_chat(
    chat_id: UUID, user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
):
    await chat_service.delete_chat(db, user.id, chat_id)


@router.post("/send")
async def send_message(
    payload: SendMessageRequest,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Отправить сообщение и получить ответ потоком (Server-Sent Events).

    События: start (чат и сообщение пользователя) → delta (кусочки текста)
    → done (сохранённый ответ, цена, новый баланс) или error.
    Ошибки до начала стрима (нет денег, нет модели) — обычный HTTP 4xx.
    """
    turn = await chat_service.prepare_turn(
        db, user, payload.chat_id, payload.model, payload.content
    )

    async def events():
        yield _sse(
            {
                "type": "start",
                "chat": ChatPublic.model_validate(turn.chat).model_dump(mode="json"),
                "user_message": ChatMessagePublic.model_validate(turn.user_message).model_dump(mode="json"),
            }
        )
        result = chat_service.StreamResult()
        try:
            async for piece in chat_service.stream_completion(
                turn.model.id, turn.history, turn.max_output_tokens, result
            ):
                yield _sse({"type": "delta", "content": piece})
        except httpx.HTTPError:
            result.error = "Не удалось связаться с моделью. Попробуйте ещё раз."
        except BaseException:
            # Человек закрыл вкладку: досчитываем и списываем в фоне.
            chat_service.finish_turn_in_background(turn, result)
            raise

        saved = await chat_service.finish_turn(turn, result)
        if saved is None:
            yield _sse({"type": "error", "detail": result.error or "Модель не ответила"})
            return
        if result.error:
            yield _sse({"type": "error", "detail": result.error})
        yield _sse(
            {
                "type": "done",
                "message": ChatMessagePublic.model_validate(saved["message"]).model_dump(mode="json"),
                "cost": str(saved["cost"]),
                "balance": str(saved["balance"]),
            }
        )

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        # X-Accel-Buffering: nginx отдаёт кусочки сразу, без буфера.
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
