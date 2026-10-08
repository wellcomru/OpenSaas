# ai_chat — контекст

## Назначение

Чат с нейросетями через OpenAI-совместимый AI Gateway (по умолчанию Timeweb,
`AI_GATEWAY_URL` + `AI_GATEWAY_KEY`) и списание денег с баланса по токенам.

## Модели

- **AiModel** (`ai_models`): id модели в шлюзе (`openai/gpt-5.4-mini`), name,
  description, `input_price` / `output_price` — себестоимость, ₽ за 1 млн токенов,
  is_active, sort_order. Стартовый список — миграция 0011, правка — админка.
- **Chat**: user_id, title (первые 60 символов вопроса), model, deleted_at
  (мягкое удаление: по сообщениям считаются расходы).
- **ChatMessage**: role (user/assistant), content, prompt/completion tokens,
  cost — сколько списано с пользователя.

## Цена ответа

`cost = (prompt × input_price + completion × output_price) / 1e6 × (1 + AI_MARKUP_PERCENT/100)`,
округление вверх до 0.0001 ₽. Токены берём из `usage` шлюза
(`stream_options.include_usage`). Если стрим оборвался без usage — оценка
~3 символа на токен.

## Отправка сообщения (`POST /api/v1/chat/send`)

1. `prepare_turn`: проверяет модель и баланс (хватает ли хотя бы на 300 токенов
   ответа), ограничивает `max_completion_tokens` тем, что пользователь может
   оплатить, сохраняет сообщение пользователя, собирает контекст
   (system + последние AI_CONTEXT_MESSAGES сообщений).
2. Ответ — Server-Sent Events: `start` → `delta`… → `done` (сообщение, цена,
   новый баланс) или `error`. Заголовок `X-Accel-Buffering: no` отключает
   буфер nginx.
3. `finish_turn` (своя сессия БД) сохраняет ответ и списывает деньги. Если
   клиент закрыл вкладку — `finish_turn_in_background`.
4. Ошибка шлюза без текста — ничего не списываем.

`max_completion_tokens`, а не `max_tokens`: новые модели OpenAI не принимают
`max_tokens`, остальные провайдеры понимают оба.

## Endpoints

```
GET    /api/v1/chat/config            # модели и цены с наценкой (публичный)
GET    /api/v1/chat/usage             # баланс и сколько потрачено
GET    /api/v1/chat/chats
GET    /api/v1/chat/chats/{id}/messages
PATCH  /api/v1/chat/chats/{id}        # переименовать
DELETE /api/v1/chat/chats/{id}
POST   /api/v1/chat/send              # SSE
GET/POST/PATCH /api/v1/admin/ai-models
```
