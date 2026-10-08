"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Code2,
  Languages,
  Mail,
  PenLine,
  Table2,
  UserPlus,
  Wallet,
  MessageSquare,
  Lightbulb,
} from "lucide-react";

import { chatApi } from "@/api/chat";
import { formatRub } from "@/lib/utils";
import type { AiModel } from "@/types";
import { Reveal, Stagger, StaggerItem } from "../Reveal";
import { SectionHeading } from "../SectionHeading";

/* ───────── Как это работает ───────── */

const steps = [
  { icon: UserPlus, title: "Зарегистрируйтесь", text: "Имя, email и пароль — меньше минуты. Подтверждать телефон не нужно." },
  { icon: Wallet, title: "Пополните баланс", text: "От 100 ₽ картой российского банка или через СБП. Деньги не сгорают." },
  { icon: MessageSquare, title: "Общайтесь с ИИ", text: "Выбирайте модель под задачу. После каждого ответа видно, сколько он стоил." },
];

export function HowItWorks() {
  return (
    <section id="how" className="lx-section">
      <div className="lx-container">
        <SectionHeading
          tag="Как это работает"
          title={<>Три шага <em>до первого ответа</em></>}
          text="Никаких подписок и автосписаний. Баланс тратится только когда вы задаёте вопросы."
        />
        <Stagger className="mt-16 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <StaggerItem key={s.title} className="lx-card lx-card-hover rounded-3xl p-7">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--lx-sand)] text-[var(--lx-clay)]">
                    <Icon size={20} />
                  </span>
                  <span className="lx-display text-[28px] text-[var(--lx-line-2)]">0{i + 1}</span>
                </div>
                <h3 className="mt-6 text-[19px] font-semibold">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--lx-ink-2)]">{s.text}</p>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

/* ───────── Для каких задач ───────── */

const useCases = [
  { icon: Mail, title: "Письма и сообщения", text: "Ответ клиенту, деловое письмо, поздравление — в нужном тоне за секунды." },
  { icon: PenLine, title: "Тексты и посты", text: "Статьи, описания товаров, контент-план и идеи для соцсетей." },
  { icon: BookOpen, title: "Учёба", text: "Объяснит тему простыми словами, проверит решение, поможет с рефератом." },
  { icon: Briefcase, title: "Бизнес", text: "Анализ конкурентов, бизнес-план, договор, ответы на возражения." },
  { icon: Code2, title: "Программирование", text: "Напишет и объяснит код, найдёт ошибку, поможет с формулами Excel." },
  { icon: Languages, title: "Переводы", text: "Переведёт с сохранением смысла и стиля, адаптирует под носителя." },
  { icon: Table2, title: "Таблицы и данные", text: "Структурирует информацию, сделает таблицу, посчитает и сравнит." },
  { icon: Lightbulb, title: "Идеи и советы", text: "Мозговой штурм, подарки, путешествия, рецепты — что угодно." },
];

export function UseCases() {
  return (
    <section id="features" className="lx-section lx-band">
      <div className="lx-container">
        <SectionHeading
          tag="Возможности"
          title={<>Помощник <em>для любых задач</em></>}
          text="Один сервис вместо нескольких подписок: сильные модели для сложного и дешёвые — для повседневного."
        />
        <Stagger className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.map((u) => {
            const Icon = u.icon;
            return (
              <StaggerItem key={u.title} className="lx-card lx-card-hover rounded-3xl p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--lx-sand)] text-[var(--lx-ink-2)]">
                  <Icon size={18} />
                </span>
                <h3 className="mt-5 text-[16.5px] font-semibold">{u.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--lx-ink-2)]">{u.text}</p>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

/* ───────── Модели и цены (живые, из API) ───────── */

/** Обычный ответ: ~800 токенов вопроса с контекстом и ~500 токенов ответа. */
function typical(m: AiModel): string {
  const rub = (800 * parseFloat(m.input_price) + 500 * parseFloat(m.output_price)) / 1_000_000;
  if (rub < 0.01) return "меньше копейки";
  return "≈ " + formatRub(Math.round(rub * 100) / 100);
}

export function ModelPrices() {
  const { data, isLoading } = useQuery({ queryKey: ["chat-config"], queryFn: () => chatApi.config() });
  const models = data?.models ?? [];

  return (
    <section id="prices" className="lx-section">
      <div className="lx-container">
        <SectionHeading
          tag="Модели и цены"
          title={<>Платите <em>только за ответы</em></>}
          text="Цена зависит от модели и длины текста. На 300 ₽ можно задать сотни вопросов быстрым моделям или десятки — самым мощным."
        />

        <Reveal className="mt-14">
          <div className="lx-card overflow-hidden rounded-3xl">
            <div className="hidden grid-cols-[1.4fr_1fr_1fr] gap-4 border-b border-[var(--lx-line)] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--lx-ink-3)] sm:grid">
              <span>Модель</span>
              <span>Обычный ответ</span>
              <span>За 1 млн токенов</span>
            </div>
            {isLoading && <div className="px-6 py-10 text-center text-[15px] text-[var(--lx-ink-3)]">Загружаем цены…</div>}
            {models.map((m) => (
              <div
                key={m.id}
                className="grid gap-1 border-b border-[var(--lx-line)] px-6 py-4 last:border-0 sm:grid-cols-[1.4fr_1fr_1fr] sm:items-center sm:gap-4"
              >
                <div>
                  <div className="text-[15.5px] font-semibold">{m.name}</div>
                  <div className="text-[13.5px] text-[var(--lx-ink-3)]">{m.description}</div>
                </div>
                <div className="text-[15px]">
                  <span className="sm:hidden text-[var(--lx-ink-3)]">Обычный ответ: </span>{typical(m)}
                </div>
                <div className="text-[13.5px] text-[var(--lx-ink-3)]">
                  вопрос {formatRub(Math.round(parseFloat(m.input_price)))} · ответ {formatRub(Math.round(parseFloat(m.output_price)))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-[13px] text-[var(--lx-ink-3)]">
            1 000 токенов — это примерно 2–3 тысячи символов русского текста. Точная стоимость каждого ответа
            видна в чате.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────── Сравнение с подписками ───────── */

export function Compare() {
  return (
    <section className="lx-section pt-0">
      <div className="lx-container grid gap-5 md:grid-cols-2">
        <Reveal className="lx-card rounded-3xl p-8">
          <div className="lx-eyebrow mb-5">Подписки</div>
          <h3 className="text-[22px] font-semibold">Отдельно на каждую нейросеть</h3>
          <ul className="mt-5 space-y-3 text-[15px] text-[var(--lx-ink-2)]">
            <li>— Около $20 в месяц за каждый сервис</li>
            <li>— Нужна зарубежная карта и часто VPN</li>
            <li>— Платите, даже если почти не пользовались</li>
            <li>— Чтобы сравнить ответы, держите открытыми несколько сайтов</li>
          </ul>
        </Reveal>
        <Reveal delay={0.08} className="rounded-3xl border border-[var(--lx-ink)] bg-[var(--lx-ink)] p-8 text-white" >
          <div className="lx-eyebrow mb-5" style={{ color: "rgba(255,255,255,.6)" }}>С нами</div>
          <h3 className="text-[22px] font-semibold">Все модели и оплата по факту</h3>
          <ul className="mt-5 space-y-3 text-[15px] text-white/80">
            <li>+ Пополнение от 100 ₽ российской картой или СБП</li>
            <li>+ Работает из России без VPN</li>
            <li>+ Деньги списываются только за ответы и не сгорают</li>
            <li>+ GPT, Claude, Gemini, DeepSeek и YandexGPT в одном окне</li>
          </ul>
          <Link href="/register" className="lx-btn lx-btn-clay mt-8">
            Попробовать <ArrowRight size={16} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
