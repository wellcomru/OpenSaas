"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const faqs = [
  {
    q: "Сколько стоит один вопрос?",
    a: "Зависит от модели и длины текста. Обычный ответ быстрой модели стоит несколько копеек, мощной — от нескольких десятков копеек до пары рублей. Точная цена показывается под каждым ответом, а примерная — в таблице цен выше.",
  },
  {
    q: "Есть ли подписка или автосписания?",
    a: "Нет. Вы пополняете баланс на любую сумму от 100 ₽, и с него списывается стоимость каждого ответа. Ничего не списывается, пока вы не задаёте вопросы. Деньги на балансе не сгорают.",
  },
  {
    q: "Как пополнить баланс?",
    a: "В личном кабинете, раздел «Баланс». Оплата через Робокассу картой российского банка, через СБП и другими способами. Деньги зачисляются сразу после оплаты.",
  },
  {
    q: "Какие нейросети доступны?",
    a: "GPT от OpenAI, Claude от Anthropic, Gemini от Google, DeepSeek, YandexGPT, Alice AI, Grok, Kimi и другие — всего больше 15 моделей. Список постоянно обновляется.",
  },
  {
    q: "Какую модель выбрать?",
    a: "Для повседневных задач — быстрые и дешёвые: GPT-5.4 Mini, Claude Haiku, DeepSeek Flash. Для сложного анализа, больших текстов и кода — Claude Sonnet или Opus, GPT-5.5, Gemini Pro. Модель можно сменить прямо в диалоге.",
  },
  {
    q: "Нужен ли VPN или зарубежная карта?",
    a: "Нет. Сервис работает из России, оплата — в рублях российскими картами и через СБП.",
  },
  {
    q: "Почему цена зависит от длины диалога?",
    a: "Нейросеть каждый раз перечитывает переписку, чтобы помнить контекст. Чем длиннее диалог, тем больше текста она обрабатывает. Для новой темы начинайте новый чат — так дешевле.",
  },
  {
    q: "Мои переписки кто-то видит?",
    a: "Чаты привязаны к вашему аккаунту, другие пользователи их не видят. Не отправляйте в чат пароли, данные карт и другую секретную информацию.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="lx-section">
      <div className="lx-container grid lg:grid-cols-[1fr_1.5fr] gap-14">
        <div className="lg:sticky lg:top-32 self-start">
          <SectionHeading
            align="left"
            tag="FAQ"
            title={<>Частые <em>вопросы</em></>}
            text="Не нашли ответ? Напишите нам на почту, указанную внизу страницы."
          />
        </div>

        <Reveal delay={0.08}>
          <div className="border-t border-[var(--lx-line-2)]">
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={f.q} className="border-b border-[var(--lx-line-2)]">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-6 py-6 text-left group"
                  >
                    <span className="text-[18px] font-medium tracking-tight group-hover:text-[var(--lx-clay-ink)] transition-colors">{f.q}</span>
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-none border transition-all duration-300"
                      style={{
                        background: isOpen ? "var(--lx-ink)" : "transparent",
                        borderColor: isOpen ? "var(--lx-ink)" : "var(--lx-line-2)",
                        color: isOpen ? "#fff" : "var(--lx-ink)",
                        transform: isOpen ? "rotate(45deg)" : "none",
                      }}
                    >
                      <Plus size={16} strokeWidth={2} />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="pb-6 pr-14 text-[15.5px] leading-relaxed text-[var(--lx-ink-2)]">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
