"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { BrandIcon } from "../BrandIcon";
import { Reveal } from "../Reveal";
import { ChatMockup } from "./ChatMockup";

const stats = [
  { value: "15+", label: "нейросетей в одном окне" },
  { value: "0 ₽", label: "абонентской платы — только за ответы" },
  { value: "от 100 ₽", label: "пополнение картой или СБП" },
  { value: "без VPN", label: "работает из России" },
];

export function AiHero() {
  return (
    <section className="relative overflow-hidden lx-grain" style={{ paddingTop: 128 }}>
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, #fff 0%, rgba(255,255,255,0) 70%)" }} />
      <div aria-hidden className="absolute inset-x-0 top-0 h-[900px] lx-grid-lines pointer-events-none" style={{ maskImage: "radial-gradient(ellipse 60% 55% at 50% 30%, #000 10%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 30%, #000 10%, transparent 75%)", opacity: 0.6 }} />
      <div aria-hidden className="absolute pointer-events-none" style={{ width: 720, height: 720, top: 300, left: "50%", transform: "translateX(-50%)", borderRadius: "50%", filter: "blur(90px)", background: "radial-gradient(circle, rgba(224,138,104,0.28) 0%, rgba(224,138,104,0) 65%)" }} />

      <div className="relative lx-container grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        <div className="text-center lg:text-left">
          <Reveal>
            <span className="lx-chip inline-flex items-center gap-2 rounded-full border border-[var(--lx-line)] bg-white/80 px-3.5 py-1.5 text-[13px] text-[var(--lx-ink-2)]">
              <span className="lx-live-dot" /> ChatGPT, Claude, Gemini, DeepSeek и YandexGPT
            </span>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="lx-display mt-7" style={{ fontSize: "clamp(2.1rem, 4.6vw, 3.9rem)", lineHeight: 1.05 }}>
              Все лучшие нейросети <em>в одном чате</em>
            </h1>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="lx-lead mx-auto mt-6 lg:mx-0" style={{ maxWidth: 560, fontSize: 19 }}>
              Пишите тексты, разбирайтесь в сложном, считайте и программируйте вместе с ИИ. Без подписок и
              зарубежных карт: пополняете баланс в рублях и платите только за ответы.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <ul className="mx-auto mt-6 flex max-w-[560px] flex-col gap-2 text-left text-[15px] text-[var(--lx-ink-2)] lg:mx-0">
              {[
                "Обычный ответ стоит от копеек до нескольких рублей",
                "Модель можно менять прямо в диалоге — под каждую задачу",
                "История чатов сохраняется, продолжайте с того же места",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Check size={17} className="mt-0.5 flex-none text-[var(--lx-sage)]" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.26}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link href="/register" className="lx-btn lx-btn-ink">
                Начать общение
                <ArrowRight size={17} />
              </Link>
              <a href="#prices" className="lx-btn lx-btn-ghost">
                Модели и цены
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.32}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[13px] text-[var(--lx-ink-3)] lg:justify-start">
              <span className="inline-flex items-center gap-2 font-medium text-[var(--lx-ink-2)]"><BrandIcon name="openai" size={17} color="#16140f" /> OpenAI</span>
              <span className="inline-flex items-center gap-2 font-medium text-[var(--lx-ink-2)]"><BrandIcon name="claude" size={18} /> Anthropic</span>
              <span className="inline-flex items-center gap-2 font-medium text-[var(--lx-ink-2)]"><BrandIcon name="gemini" size={17} /> Google</span>
              <span className="font-medium text-[var(--lx-ink-2)]">DeepSeek</span>
              <span className="font-medium text-[var(--lx-ink-2)]">Яндекс</span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.18}>
          <div className="mx-auto w-full max-w-[560px]">
            <ChatMockup />
          </div>
        </Reveal>
      </div>

      <div className="relative lx-container mt-24 pb-20">
        <div className="grid grid-cols-2 border-t border-[var(--lx-line-2)] lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.value} delay={i * 0.06} className={"px-2 pb-2 pt-8 lg:px-6 " + (i > 0 ? "lg:border-l border-[var(--lx-line)]" : "")}>
              <div className="lx-display text-[var(--lx-ink)]" style={{ fontSize: "clamp(1.6rem, 2.6vw, 2.3rem)", lineHeight: 1 }}>{s.value}</div>
              <div className="mt-3 max-w-[220px] text-[14px] leading-snug text-[var(--lx-ink-3)]">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
