"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Gift, MessageSquare, Settings, Sparkles, TrendingDown, Wallet } from "lucide-react";

import { EmailBanner } from "@/components/EmailBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { chatApi } from "@/api/chat";
import { formatDateTime, formatRub } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

const quickActions = [
  { href: "/chat", icon: MessageSquare, label: "Новый чат", hint: "Спросить ИИ" },
  { href: "/billing", icon: Wallet, label: "Пополнить", hint: "Карта или СБП" },
  { href: "/referrals", icon: Gift, label: "Рефералы", hint: "Приглашайте друзей" },
  { href: "/settings", icon: Settings, label: "Настройки", hint: "Профиль и пароль" },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: usage } = useQuery({ queryKey: ["chat-usage"], queryFn: () => chatApi.usage() });
  const { data: chats } = useQuery({ queryKey: ["chats"], queryFn: () => chatApi.listChats() });

  const firstName = user?.profile?.first_name;

  const statCards = [
    { label: "Баланс", value: usage ? formatRub(usage.balance) : "…", icon: Wallet, href: "/billing" },
    { label: "Потрачено на ИИ", value: usage ? formatRub(usage.total_spent) : "…", icon: TrendingDown, href: "/chat" },
  ];

  return (
    <>
      <PageHeader
        title={firstName ? `Здравствуйте, ${firstName}` : "Главная"}
        description="Баланс, последние чаты и быстрые действия."
        actions={
          <Link href="/chat">
            <Button>
              <Sparkles className="h-4 w-4" />
              Открыть чат
            </Button>
          </Link>
        }
      />

      <EmailBanner />

      <div className="grid gap-4 md:grid-cols-2">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-2xl border border-border bg-card p-6 no-underline shadow-[0_1px_2px_rgba(22,20,15,.04),0_12px_32px_-16px_rgba(22,20,15,.12)] transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{card.label}</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-clay">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
              </div>
              <div className="mt-4 font-display text-[32px] leading-none text-foreground">{card.value}</div>
            </Link>
          );
        })}
      </div>

      <div>
        <h2 className="mb-4 font-display text-lg">Быстрые действия</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.href}
                href={q.href}
                className="group flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 no-underline transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[0_18px_40px_-24px_rgba(22,20,15,.35)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors group-hover:bg-clay-soft group-hover:text-clay-ink">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-foreground">{q.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{q.hint}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-clay" />
              </Link>
            );
          })}
        </div>
      </div>

      {chats && chats.length > 0 && (
        <div>
          <h2 className="mb-4 font-display text-lg">Последние чаты</h2>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {chats.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                href={`/chat?c=${c.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm no-underline transition-colors hover:bg-secondary/50"
              >
                <span className="truncate text-foreground">{c.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(c.updated_at)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
