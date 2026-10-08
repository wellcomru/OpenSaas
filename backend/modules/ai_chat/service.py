"""Чат с ИИ через AI Gateway и списание с баланса по токенам.

Стоимость ответа = (вход × цена входа + выход × цена выхода) / 1 млн
× (1 + AI_MARKUP_PERCENT / 100). Цены моделей — в таблице ai_models.
"""
from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import ROUND_UP, Decimal
from typing import Sequence
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import AsyncSessionLocal
from modules.ai_chat.models import AiModel, Chat, ChatMessage
from modules.auth.models import User
from modules.billing import service as billing_service

logger = logging.getLogger("opensaas.ai_chat")

MILLION = Decimal(1_000_000)
# Грубая оценка для проверки баланса до запроса: ~3 символа на токен.
CHARS_PER_TOKEN = 3
# Минимум токенов ответа, на который должно хватать денег.
MIN_OUTPUT_TOKENS = 300


def markup_factor() -> Decimal:
    return 1 + settings.ai_markup_percent / 100


def user_price(cost_price: Decimal) -> Decimal:
    """Цена для пользователя за 1 млн токенов (себестоимость + наценка)."""
    return (Decimal(cost_price) * markup_factor()).quantize(Decimal("0.01"))


def calc_cost(model: AiModel, prompt_tokens: int, completion_tokens: int) -> Decimal:
    raw = (
        Decimal(prompt_tokens) * Decimal(model.input_price)
        + Decimal(completion_tokens) * Decimal(model.output_price)
    ) / MILLION
    return (raw * markup_factor()).quantize(Decimal("0.0001"), rounding=ROUND_UP)


# === Модели ===


async def list_models(db: AsyncSession, include_inactive: bool = False) -> Sequence[AiModel]:
    q = select(AiModel).order_by(AiModel.sort_order, AiModel.name)
    if not include_inactive:
        q = q.where(AiModel.is_active == True)  # noqa: E712
    return (await db.scalars(q)).all()


async def get_active_model(db: AsyncSession, model_id: str) -> AiModel:
    model = await db.get(AiModel, model_id)
    if model is None or not model.is_active:
        raise HTTPException(status_code=400, detail="Эта модель недоступна, выберите другую")
    return model


# === Чаты ===


async def list_chats(db: AsyncSession, user_id: UUID) -> Sequence[Chat]:
    return (
        await db.scalars(
            select(Chat)
            .where(Chat.user_id == user_id, Chat.deleted_at.is_(None))
            .order_by(Chat.updated_at.desc())
            .limit(200)
        )
    ).all()


async def get_chat(db: AsyncSession, user_id: UUID, chat_id: UUID) -> Chat:
    chat = await db.scalar(
        select(Chat).where(
            Chat.id == chat_id, Chat.user_id == user_id, Chat.deleted_at.is_(None)
        )
    )
    if chat is None:
        raise HTTPException(status_code=404, detail="Чат не найден")
    return chat


async def list_messages(db: AsyncSession, chat_id: UUID) -> Sequence[ChatMessage]:
    return (
        await db.scalars(
            select(ChatMessage)
            .where(ChatMessage.chat_id == chat_id)
            .order_by(ChatMessage.created_at)
        )
    ).all()


async def delete_chat(db: AsyncSession, user_id: UUID, chat_id: UUID) -> None:
    chat = await get_chat(db, user_id, chat_id)
    chat.deleted_at = datetime.now(timezone.utc)
    await db.commit()


async def rename_chat(db: AsyncSession, user_id: UUID, chat_id: UUID, title: str) -> Chat:
    chat = await get_chat(db, user_id, chat_id)
    chat.title = title
    await db.commit()
    await db.refresh(chat)
    return chat


async def total_spent(db: AsyncSession, user_id: UUID) -> Decimal:
    value = await db.scalar(
        select(func.coalesce(func.sum(ChatMessage.cost), 0)).where(
            ChatMessage.user_id == user_id
        )
    )
    return Decimal(value or 0)


# === Отправка сообщения ===


@dataclass
class PreparedTurn:
    """Всё, что нужно для запроса к модели, собранное до начала стрима."""

    chat: Chat
    model: AiModel
    user_message: ChatMessage
    history: list[dict]
    max_output_tokens: int
    is_new_chat: bool


@dataclass
class StreamResult:
    text: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    usage_received: bool = False
    error: str | None = None
    extra: dict = field(default_factory=dict)


async def prepare_turn(
    db: AsyncSession, user: User, chat_id: UUID | None, model_id: str, content: str
) -> PreparedTurn:
    """Проверяет баланс, сохраняет сообщение пользователя и собирает контекст."""
    if not settings.ai_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ИИ не подключён: администратор не задал AI_GATEWAY_KEY",
        )

    model = await get_active_model(db, model_id)

    is_new_chat = chat_id is None
    if is_new_chat:
        title = " ".join(content.split())[:60] or "Новый чат"
        chat = Chat(user_id=user.id, title=title, model=model.id)
        db.add(chat)
        await db.flush()
        previous: list[ChatMessage] = []
    else:
        chat = await get_chat(db, user.id, chat_id)
        chat.model = model.id
        previous = list(
            (
                await db.scalars(
                    select(ChatMessage)
                    .where(ChatMessage.chat_id == chat.id)
                    .order_by(ChatMessage.created_at.desc())
                    .limit(settings.ai_context_messages)
                )
            ).all()
        )
        previous.reverse()

    history = [{"role": "system", "content": settings.ai_system_prompt}]
    history += [
        {"role": m.role, "content": m.content} for m in previous if m.content
    ]
    history.append({"role": "user", "content": content})

    # Сколько токенов ответа пользователь может оплатить.
    prompt_chars = sum(len(m["content"]) for m in history)
    est_prompt_tokens = prompt_chars // CHARS_PER_TOKEN + 50
    balance = Decimal(user.balance)
    prompt_cost = calc_cost(model, est_prompt_tokens, 0)
    out_unit = calc_cost(model, 0, 1_000_000) / MILLION  # ₽ за 1 токен ответа
    affordable = int((balance - prompt_cost) / out_unit) if out_unit > 0 else settings.ai_max_output_tokens
    if affordable < MIN_OUTPUT_TOKENS:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Недостаточно средств на балансе. Пополните баланс, чтобы продолжить.",
        )

    user_message = ChatMessage(
        chat_id=chat.id, user_id=user.id, role="user", content=content, model=model.id
    )
    db.add(user_message)
    chat.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(chat)
    await db.refresh(user_message)

    return PreparedTurn(
        chat=chat,
        model=model,
        user_message=user_message,
        history=history,
        max_output_tokens=min(settings.ai_max_output_tokens, affordable),
        is_new_chat=is_new_chat,
    )


async def stream_completion(
    model_id: str, messages: list[dict], max_tokens: int, result: StreamResult
) -> AsyncIterator[str]:
    """Стримит ответ шлюза, отдаёт кусочки текста и копит итог в result."""
    body = {
        "model": model_id,
        "messages": messages,
        "stream": True,
        "stream_options": {"include_usage": True},
        # max_tokens часть моделей OpenAI не принимает, max_completion_tokens понимают все.
        "max_completion_tokens": max_tokens,
    }
    headers = {"Authorization": f"Bearer {settings.ai_gateway_key}"}
    url = settings.ai_gateway_url.rstrip("/") + "/chat/completions"
    timeout = httpx.Timeout(connect=15, read=300, write=30, pool=15)

    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("POST", url, json=body, headers=headers) as resp:
            if resp.status_code != 200:
                raw = (await resp.aread()).decode(errors="replace")
                logger.warning("AI gateway %s: %s", resp.status_code, raw[:500])
                try:
                    detail = json.loads(raw)["error"]["message"]
                except (ValueError, KeyError, TypeError):
                    detail = raw[:200]
                result.error = f"Модель вернула ошибку: {detail}"
                return
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                except ValueError:
                    continue
                if chunk.get("error"):
                    result.error = str(chunk["error"].get("message", chunk["error"]))
                    break
                usage = chunk.get("usage")
                if usage:
                    result.prompt_tokens = int(usage.get("prompt_tokens") or 0)
                    result.completion_tokens = int(usage.get("completion_tokens") or 0)
                    result.usage_received = True
                for choice in chunk.get("choices") or []:
                    piece = (choice.get("delta") or {}).get("content")
                    if piece:
                        result.text += piece
                        yield piece


async def finish_turn(turn: PreparedTurn, result: StreamResult) -> dict | None:
    """Сохраняет ответ и списывает деньги. Своя сессия: запрос мог уже закончиться.

    Возвращает None, если модель ничего не ответила (ошибка шлюза) — тогда
    ничего не списываем.
    """
    if not result.usage_received:
        if result.error and not result.text:
            return None
        # Стрим оборвался до итогов (закрыли вкладку, сбой сети) — оцениваем по тексту.
        prompt_chars = sum(len(m["content"]) for m in turn.history)
        result.prompt_tokens = prompt_chars // CHARS_PER_TOKEN
        result.completion_tokens = len(result.text) // CHARS_PER_TOKEN

    cost = calc_cost(turn.model, result.prompt_tokens, result.completion_tokens)

    async with AsyncSessionLocal() as db:
        message = ChatMessage(
            chat_id=turn.chat.id,
            user_id=turn.chat.user_id,
            role="assistant",
            content=result.text,
            model=turn.model.id,
            prompt_tokens=result.prompt_tokens,
            completion_tokens=result.completion_tokens,
            cost=cost,
        )
        db.add(message)
        balance = await billing_service.add_balance(db, turn.chat.user_id, -cost)
        await db.commit()
        await db.refresh(message)

    return {"message": message, "balance": balance, "cost": cost}


# Ссылки на фоновые задачи списания, чтобы их не собрал сборщик мусора.
_background: set[asyncio.Task] = set()


def finish_turn_in_background(turn: PreparedTurn, result: StreamResult) -> None:
    """Для оборванного стрима: сохранить ответ и списать деньги без ожидания."""
    task = asyncio.ensure_future(finish_turn(turn, result))
    _background.add(task)
    task.add_done_callback(_background.discard)
