"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { tokenStorage } from "@/api/client";

/**
 * Уже вошедшего человека со страниц входа и регистрации отправляем в кабинет.
 * Если сохранённые токены окажутся недействительными, кабинет сам вернёт на вход,
 * уже без них, поэтому зацикливания нет.
 */
export function RedirectIfAuthenticated() {
  const router = useRouter();
  useEffect(() => {
    if (tokenStorage.hasSession) router.replace("/chat");
  }, [router]);
  return null;
}
