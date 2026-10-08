"use client";

import { useEffect, useState } from "react";
import { ArrowUp, ChevronDown, Sparkles, Wallet } from "lucide-react";

const DIALOG = [
  {
    model: "GPT-5.4 Mini",
    q: "Напиши короткое письмо клиенту: доставка задержится на 2 дня",
    a: "Здравствуйте, Анна! Сообщаем, что ваш заказ задержится на 2 дня — мы уже ускоряем отправку. Приносим извинения и дарим скидку 10% на следующую покупку.",
    cost: "0,15 ₽",
  },
  {
    model: "Claude Sonnet 5",
    q: "Объясни простыми словами, что такое ИП на УСН 6%",
    a: "Это режим, при котором вы платите 6% от всех поступлений на счёт. Расходы не учитываются, зато отчётность простая — одна декларация в год.",
    cost: "0,66 ₽",
  },
  {
    model: "DeepSeek V4.1 Flash",
    q: "Придумай 3 названия для кофейни у моря",
    a: "1. «Бриз и зерно»\n2. «Солёная пенка»\n3. «Кофе на волне»",
    cost: "0,02 ₽",
  },
];

/** Демо чата на первом экране: печатает вопрос и ответ, показывает цену ответа. */
export function ChatMockup() {
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState(0);
  const item = DIALOG[step % DIALOG.length];

  useEffect(() => {
    setTyped(0);
  }, [step]);

  useEffect(() => {
    if (typed < item.a.length) {
      const t = setTimeout(() => setTyped((n) => Math.min(item.a.length, n + 3)), typed === 0 ? 900 : 22);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 3200);
    return () => clearTimeout(t);
  }, [typed, item.a.length]);

  const done = typed >= item.a.length;

  return (
    <div
      className="overflow-hidden rounded-[28px] border border-[var(--lx-line)] bg-white text-left"
      style={{ boxShadow: "var(--lx-shadow-lg)" }}
    >
      <div className="flex items-center gap-2 border-b border-[var(--lx-line)] px-4 py-3">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--lx-line-2)] px-3 py-1.5 text-[13px] font-medium">
          {item.model}
          <ChevronDown size={14} className="text-[var(--lx-ink-3)]" />
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--lx-line)] px-3 py-1.5 text-[13px]">
          <Wallet size={13} />
          487,30 ₽
        </span>
      </div>

      <div className="space-y-5 px-5 py-6 sm:px-7" style={{ minHeight: 260 }}>
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--lx-ink)] px-4 py-2.5 text-[14.5px] text-white">
            {item.q}
          </div>
        </div>
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-[var(--lx-sand)] text-[var(--lx-clay)]">
            <Sparkles size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-[var(--lx-ink)]">
              {item.a.slice(0, typed)}
              {!done && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-[var(--lx-clay)]" />}
            </p>
            <p
              className="mt-2 text-[11.5px] text-[var(--lx-ink-3)] transition-opacity duration-500"
              style={{ opacity: done ? 1 : 0 }}
            >
              {item.model} · списано {item.cost}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--lx-line)] p-3">
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--lx-line-2)] px-4 py-2.5">
          <span className="flex-1 text-[14px] text-[var(--lx-ink-3)]">Напишите сообщение…</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--lx-ink)] text-white">
            <ArrowUp size={15} />
          </span>
        </div>
      </div>
    </div>
  );
}
