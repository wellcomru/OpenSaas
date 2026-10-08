# Components — контекст

## Структура

- `ui/` — базовые shadcn компоненты (Button, Input, Card, Badge, Dialog,
  Label, Skeleton, Textarea). Стилизуются через CSS-переменные темы.
- `layout/` — Sidebar, Header, Footer, PublicHeader.
- `landing/` — лендинг: `ai/` (AiHero, ChatMockup, AiSections — задачи,
  как это работает, живая таблица цен, сравнение), FAQ, CTA.
- `billing/` — PaymentHistory.
- `chat/` — ChatApp (весь чат), Markdown (рендер ответов).
- `referrals/` — ReferralWidget, PayoutHistory.
- `AuthGuard.tsx` — обёртка для защищённых страниц (требует логин,
  опционально требует admin).
- `EmailBanner.tsx` — баннер «подтвердите email» (показывается, только
  если на сервере настроена почта и `user.is_email_verified === false`).
- `auth/` — `AuthCard` (карточка страниц входа), `AltchaCheck` (невидимая
  проверка «не робот», решает задачу ALTCHA в браузере), `VerifyCodeForm`
  (ввод 6-значного кода из письма).
- `Providers.tsx` — `QueryClientProvider` + `Toaster`.

## Соглашения

- Все компоненты, использующие хуки или интерактивность, помечены
  `"use client"` сверху.
- Серверные компоненты (без `"use client"`) предпочтительнее для статики
  — это уменьшает JS-бандл.
- Стили через Tailwind utility-классы и `cn(...)` из `@/lib/utils`.
- Иконки — `lucide-react`.

## Добавление shadcn-компонента

Скопируйте файл из <https://ui.shadcn.com> в `components/ui/`. Большинство
компонентов уже использует Radix UI (`@radix-ui/...`) — добавьте нужный
пакет в `package.json`.

## Тема / бренд

Цвета приходят из `globals.css` через CSS-переменные. Кабинет и страницы
входа используют ту же палитру, что лендинг (`.lx-*`): тёплая бумага
(`--background`), чернильные кнопки (`--primary`), акцент «глина»
(`--clay`, классы `text-clay`, `bg-clay-soft`), зелёный `--sage` для
успеха. Заголовки — `font-display` (Unbounded), текст — Onest.
