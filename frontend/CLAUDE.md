# Frontend — контекст

## Стек

- **Next.js 14 App Router**
- **TypeScript** в strict mode (`tsconfig.json`)
- **Tailwind CSS** + **shadcn/ui** компоненты (`components/ui/`)
- **TanStack Query v5** для серверного состояния
- **Zustand** для клиентского состояния (auth, ui)
- **react-hook-form** + **zod** для форм
- **axios** для HTTP (с refresh-token interceptor)
- **sonner** для toast'ов
- **lucide-react** для иконок

## Структура App Router

```
src/app/
├── layout.tsx              # глобальный layout (Providers)
├── globals.css             # Tailwind + CSS-переменные темы
│
├── (public)/               # лендинг и публичные страницы
│   ├── page.tsx            # /
│   └── ref/[code]/page.tsx # /ref/CODE
│
├── (auth)/                 # auth страницы (layout без сайдбара)
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── confirm-email/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
│
├── (chat)/                 # чат с ИИ на весь экран (AuthGuard + Sidebar, без отступов)
│   ├── layout.tsx
│   └── chat/page.tsx       # /chat?c=<id> — components/chat/ChatApp.tsx
│
├── (dashboard)/            # защищённые страницы (AuthGuard + Sidebar)
│   ├── layout.tsx
│   ├── dashboard/page.tsx
│   ├── billing/page.tsx    # баланс и пополнение
│   ├── referrals/page.tsx
│   ├── settings/page.tsx
│   └── settings/security/page.tsx
│
└── (admin)/                # admin (AuthGuard requireAdmin)
    ├── layout.tsx
    └── admin/
        ├── page.tsx
        ├── users/page.tsx
        ├── models/page.tsx # цены моделей ИИ
        ├── billing/page.tsx
        └── referrals/page.tsx
```

Route groups в скобках (`(public)`, `(auth)`, `(dashboard)`, `(admin)`)
**не** появляются в URL — это способ группировать layout'ы.

## Паттерны

### TanStack Query

```tsx
const { data, isLoading } = useQuery({
  queryKey: ["balance"],
  queryFn: () => billingApi.getBalance(),
});

const mut = useMutation({
  mutationFn: (id: string) => apiKeysApi.delete(id),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
});
```

### react-hook-form + zod

```tsx
const schema = z.object({ email: z.string().email() });
const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) });
```

### Zustand

`useAuthStore` хранит **только** `user: User | null` и состояние
загрузки. Токены живут в `tokenStorage` (localStorage), управляются
из `api/client.ts` — **не** дублируйте логику в state.

## CSS-переменные

Цвета через CSS-переменные в `globals.css`: `--background`,
`--foreground`, `--primary`, `--muted`, `--destructive`, `--card`,
`--border`. Темнее тема — добавьте класс `dark` на `html` (UI готов).

Меняйте бренд-цвета через `--primary` / `--primary-foreground`.

## Auth flow

1. Юзер логинится → `useAuth.login` → `tokenStorage.set` + Zustand `setUser`
   → редирект на `/chat`.
2. При перезагрузке / повторном открытии вкладки `restoreSession()` в
   `useAuth` (один раз на загрузку): сразу показывает сохранённый профиль
   (`tokenStorage.user`), затем проверяет `usersApi.me()`. Истёкший access
   обновляет interceptor через refresh-токен (30 дней).
3. Выход — **только** если сервер отверг токены (`isAuthRejection`: 400/401/
   403/422). Сетевая ошибка или 502/503 во время перезапуска сайта сессию
   не стирают: запрос повторяется, а без сохранённого профиля `AuthGuard`
   показывает «Не удаётся связаться с сервером» с кнопкой «Повторить».
4. Вошедшего человека `/login` и `/register` отправляют в `/chat`
   (`RedirectIfAuthenticated`), шапка лендинга показывает «Открыть чат».
5. Защита роутов: `AuthGuard` в `(dashboard)/layout.tsx` и
   `(admin)/layout.tsx` (с `requireAdmin`).

## Как добавить новую страницу

1. Создать `src/app/(dashboard)/<name>/page.tsx` (или в нужной группе).
2. Если нужны данные — `useQuery` с API клиентом из `@/api/...`.
3. Добавить ссылку в `src/components/layout/Sidebar.tsx`.

## Как добавить новый API клиент

См. `src/api/CLAUDE.md`. Кратко:

1. Новый файл `src/api/<name>.ts` со структурой
   `export const <name>Api = { method() {...} }`.
2. Каждый метод async и возвращает `.data`.
3. Типы — в `@/types/index.ts`.

## Чат с ИИ

`api/chat.ts` читает ответ потоком через `fetch` (axios не умеет SSE): события
`start` / `delta` / `done` / `error`. Истёкший токен обновляется вызовом через
`apiClient` и запрос повторяется. Markdown ответов — `components/chat/Markdown.tsx`
(react-markdown + remark-gfm). Название сервиса — `lib/brand.ts`.

## Никогда

- Не хардкодьте API URL — используйте `NEXT_PUBLIC_API_URL` (см. `next.config.ts`).
- Не храните токены в state — только в `tokenStorage`.
- Не дублируйте refresh-логику — она в `api/client.ts`.
- Не вытаскивайте `tokenStorage` напрямую в страницы — работайте через
  `useAuth` или API клиенты.
