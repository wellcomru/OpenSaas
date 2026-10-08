"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { MailCheck } from "lucide-react";

import { AuthCard, authLinkClass } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

const LENGTH = 6;
const empty = () => Array<string>(LENGTH).fill("");

/** Ввод 6-значного кода из письма (показывается, только если почта настроена). */
export function VerifyCodeForm({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [digits, setDigits] = useState<string[]>(empty);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function submit(code: string) {
    if (code.length !== LENGTH) {
      setError("Введите все 6 цифр");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const user = await authApi.verifyEmailCode(userId, code);
      setUser(user);
      toast.success("Email подтверждён");
      router.push("/chat");
    } catch (e) {
      const err = e as AxiosError<{ detail?: string }>;
      setError(err.response?.data?.detail ?? "Не удалось подтвердить");
      setDigits(empty());
      inputs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  function fill(from: number, text: string) {
    const clean = text.replace(/\D/g, "");
    if (!clean) return;
    const next = [...digits];
    for (let i = 0; i < clean.length && from + i < LENGTH; i++) next[from + i] = clean[i];
    setDigits(next);
    setError(null);
    const filled = Math.min(from + clean.length, LENGTH - 1);
    inputs.current[filled]?.focus();
    // Все цифры введены — отправляем сразу, без лишнего клика.
    if (next.every(Boolean)) void submit(next.join(""));
  }

  function onChange(idx: number, value: string) {
    if (!value) {
      setDigits((prev) => prev.map((d, i) => (i === idx ? "" : d)));
      return;
    }
    const clean = value.replace(/\D/g, "");
    // Автоподстановка кода из SMS/письма (iOS, Android) вставляет все цифры в одно поле.
    fill(idx, clean.length > 2 ? clean : clean.slice(-1));
  }

  function onKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      e.preventDefault();
      setDigits((prev) => prev.map((d, i) => (i === idx - 1 ? "" : d)));
      inputs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < LENGTH - 1) {
      inputs.current[idx + 1]?.focus();
    } else if (e.key === "Enter") {
      void submit(digits.join(""));
    }
  }

  async function resend() {
    setResending(true);
    try {
      await authApi.resendCode(userId);
      toast.success("Новый код отправлен");
      setCooldown(60);
      setDigits(empty());
      setError(null);
      inputs.current[0]?.focus();
    } catch (e) {
      const err = e as AxiosError<{ detail?: string }>;
      toast.error(err.response?.data?.detail ?? "Не удалось отправить код");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthCard
      icon={<MailCheck className="h-6 w-6" strokeWidth={1.75} />}
      title="Подтвердите почту"
      description={
        <>
          Мы отправили 6-значный код на{" "}
          <span className="font-medium text-foreground">{email}</span>. Если письма нет,
          загляните в «Спам».
        </>
      }
      footer={
        cooldown > 0 ? (
          <>Отправить код ещё раз можно через {cooldown} сек</>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className={cn(authLinkClass, "disabled:opacity-50")}
          >
            {resending ? "Отправляем…" : "Отправить код ещё раз"}
          </button>
        )
      }
    >
      <div
        className="grid grid-cols-6 gap-2 sm:gap-2.5"
        onPaste={(e) => {
          e.preventDefault();
          fill(0, e.clipboardData.getData("text"));
        }}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            aria-label={`Цифра ${i + 1}`}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={LENGTH}
            value={d}
            disabled={submitting}
            onChange={(e) => onChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            className={cn(
              "aspect-[4/5] w-full min-w-0 rounded-xl border bg-card text-center font-display text-2xl text-foreground caret-clay outline-none transition-all",
              "focus:border-clay focus:ring-4 focus:ring-clay/15",
              d ? "border-foreground/30" : "border-input",
              error && "border-destructive/60",
            )}
          />
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        size="lg"
        className="mt-6 w-full"
        onClick={() => submit(digits.join(""))}
        disabled={submitting}
      >
        {submitting ? "Проверяем…" : "Подтвердить"}
      </Button>
    </AuthCard>
  );
}
