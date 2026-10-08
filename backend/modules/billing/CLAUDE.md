# billing — контекст

## Назначение

Баланс пользователя в рублях и его пополнение. Интеграция с Робокассой
(готово) и Stripe (заготовка). Тарифов и подписок нет: пользователь
пополняет баланс, а модуль `ai_chat` списывает с него стоимость ответов ИИ.

## Файлы

- `models.py` — Payment, BalanceTransaction (+ старые Plan/Subscription: таблицы
  остались в БД для истории, в коде не используются)
- `schemas.py` — Pydantic схемы
- `service.py` — `add_balance`, `credit`, `create_topup_payment`,
  `apply_successful_payment`, списки платежей и пополнений
- `robokassa.py` — `build_payment_url`, `verify_result_signature`
- `stripe.py` — заготовка, TODO для будущей реализации

## Баланс

- `users.balance` (Numeric 14,4). Меняется **только** атомарным
  `UPDATE users SET balance = balance ± x` через `add_balance` — параллельные
  запросы не затирают друг друга.
- `balance_transactions` — история зачислений: `topup` (оплата), `bonus`
  (WELCOME_BONUS при регистрации), `admin` (корректировка в админке).
  Списания за ИИ лежат в `chat_messages.cost`.

## Пополнение

1. Frontend → `POST /billing/topup {amount, provider}` (TOPUP_MIN_AMOUNT..TOPUP_MAX_AMOUNT)
2. Backend создаёт `Payment(status=pending, metadata={"kind": "topup"})`, возвращает `payment_url`
3. Юзер платит на стороне Робокассы
4. Робокасса шлёт webhook (`/api/v1/webhooks/robokassa`)
5. Webhook: проверка подписи (password2) → строка платежа `FOR UPDATE` →
   `apply_successful_payment` зачисляет `payment.amount` (не OutSum из запроса)
6. `referrals.process_payment_for_referral` создаёт payout (REFERRAL_COMMISSION_PERCENT, по умолчанию 5%)

## Endpoints

```
GET  /api/v1/billing/balance
POST /api/v1/billing/topup
GET  /api/v1/billing/payments
GET  /api/v1/billing/transactions
```

## Нельзя менять

- Webhook сигнатура с `OutSum/InvId/SignatureValue` — формат Робокассы,
  ответ — plain text `OK<InvId>`.
- Повторный webhook не должен зачислять деньги второй раз (проверка `status == SUCCESS`).
