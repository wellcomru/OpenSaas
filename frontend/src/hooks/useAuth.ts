"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authApi } from "@/api/auth";
import { isAuthRejection, tokenStorage } from "@/api/client";
import { usersApi } from "@/api/users";
import { useAuthStore } from "@/store/authStore";

const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000];

let restoring: Promise<void> | null = null;

/**
 * Восстановить сессию после перезагрузки или повторного открытия вкладки.
 * Выполняется один раз на загрузку страницы, сколько бы компонентов ни
 * вызывали useAuth.
 *
 * 1. Есть сохранённый профиль — показываем кабинет сразу.
 * 2. Проверяем сессию на сервере (истёкший access-токен обновит interceptor).
 * 3. Выходим, только если сервер отверг токены. Если сервер временно
 *    недоступен (сеть, перезапуск сайта), повторяем запрос, не выкидывая человека.
 */
function restoreSession(): Promise<void> {
  if (restoring) return restoring;
  const store = useAuthStore.getState;
  restoring = (async () => {
    if (!tokenStorage.hasSession) {
      store().setLoading(false);
      return;
    }
    const cached = tokenStorage.user;
    if (cached) store().setUser(cached);

    for (let attempt = 0; ; attempt++) {
      try {
        store().setUser(await usersApi.me());
        return;
      } catch (err) {
        if (isAuthRejection(err)) {
          store().logout();
          return;
        }
        if (attempt >= RETRY_DELAYS_MS.length) {
          if (!cached) store().setConnectionError(true);
          return;
        }
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
    }
  })().finally(() => {
    restoring = null;
  });
  return restoring;
}

export function useAuth() {
  const { user, isLoading, initialized, connectionError, setSession, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) void restoreSession();
  }, [initialized]);

  return {
    user,
    isLoading,
    connectionError,
    isAuthenticated: !!user,
    retry: () => {
      useAuthStore.setState({ connectionError: false, isLoading: true, initialized: false });
    },

    async login(email: string, password: string) {
      const res = await authApi.login(email, password);
      setSession(res.user, res.access_token, res.refresh_token);
      router.push("/chat");
      return res;
    },

    async register(
      email: string,
      password: string,
      first_name: string,
      last_name: string,
      referral_code?: string,
      altcha?: string,
    ) {
      const res = await authApi.register({
        email,
        password,
        first_name,
        last_name,
        referral_code,
        altcha,
      });
      setSession(res.user, res.access_token, res.refresh_token);
      // Код из письма нужен, только если на сервере настроена почта.
      if (res.pending_verification) {
        return { pendingVerification: true as const, userId: res.user.id };
      }
      router.push("/chat");
      return { pendingVerification: false as const };
    },

    async logout() {
      try {
        await authApi.logout();
      } catch {
        // ignore
      }
      logout();
      router.push("/login");
    },
  };
}
