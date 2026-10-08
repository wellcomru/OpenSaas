"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { ArrowRight, Wallet } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PaymentHistory } from "@/components/billing/PaymentHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBalance, useTransactions } from "@/hooks/useBilling";
import { billingApi } from "@/api/billing";
import { chatApi } from "@/api/chat";
import { cn, formatDateTime, formatRub } from "@/lib/utils";

function PaymentStatusHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();

  useEffect(() => {
    // Робокасса возвращает на Success URL с OutSum/InvId, на Fail URL — тоже,
    // поэтому различаем по нашему ?status=, а без него просто обновляем данные.
    const status = params.get("status");
    if (!status && !params.get("InvId")) return;

    if (status === "failed") {
      toast.error("Платёж не прошёл. Попробуйте ещё раз.");
    } else {
      toast.success("Спасибо! Деньги поступят на баланс в течение минуты.");
    }
    qc.invalidateQueries({ queryKey: ["balance"] });
    qc.invalidateQueries({ queryKey: ["payments"] });
    qc.invalidateQueries({ queryKey: ["balance-transactions"] });
    router.replace("/billing");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

const KIND_LABELS: Record<string, string> = {
  topup: "Пополнение",
  bonus: "Бонус",
  admin: "Корректировка",
};

export default function BillingPage() {
  const { data: balance } = useBalance();
  const { data: usage } = useQuery({ queryKey: ["chat-usage"], queryFn: () => chatApi.usage() });
  const { data: transactions } = useTransactions();
  const [amount, setAmount] = useState("500");

  const min = balance ? parseFloat(balance.topup_min) : 100;
  const max = balance ? parseFloat(balance.topup_max) : 100000;
  const value = parseFloat(amount.replace(",", "."));
  const valid = !Number.isNaN(value) && value >= min && value <= max;

  const topup = useMutation({
    mutationFn: () => billingApi.topup(Math.round(value * 100) / 100, "robokassa"),
    onSuccess: (r) => {
      window.location.href = r.payment_url;
    },
    onError: (e) => {
      const err = e as AxiosError<{ detail?: string }>;
      toast.error(err.response?.data?.detail ?? "Не удалось создать платёж");
    },
  });

  return (
    <>
      <Suspense>
        <PaymentStatusHandler />
      </Suspense>

      <PageHeader
        title="Баланс"
        description="Пополняйте баланс и платите только за ответы ИИ, без подписок."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-foreground p-6 text-background">
          <div className="flex items-center gap-2 text-sm text-background/70">
            <Wallet className="h-4 w-4" />
            На балансе
          </div>
          <div className="mt-3 font-display text-[40px] leading-none">
            {balance ? formatRub(balance.balance) : "…"}
          </div>
          <div className="mt-3 text-sm text-background/70">
            Потрачено на ИИ: {usage ? formatRub(usage.total_spent) : "…"}
          </div>
          <Link href="/chat" className="mt-5 inline-flex items-center gap-1.5 text-sm text-background no-underline hover:underline">
            Перейти в чат
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Пополнить баланс</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {(balance?.topup_presets ?? [300, 500, 1000, 3000]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(String(p))}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors",
                    value === p
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card hover:border-foreground/30",
                  )}
                >
                  {p.toLocaleString("ru-RU")} ₽
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                  aria-label="Сумма пополнения"
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ₽
                </span>
              </div>
              <Button onClick={() => topup.mutate()} disabled={!valid || topup.isPending}>
                {topup.isPending ? "Переходим…" : "Оплатить"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              От {min.toLocaleString("ru-RU")} до {max.toLocaleString("ru-RU")} ₽. Оплата картой или СБП через
              Робокассу, деньги поступают сразу после оплаты.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Пополнения и бонусы</CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пополнений пока не было.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2">Дата</th>
                    <th className="py-2">Операция</th>
                    <th className="py-2 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-3">{formatDateTime(t.created_at)}</td>
                      <td className="py-3">
                        {KIND_LABELS[t.kind] ?? t.kind}
                        {t.description && t.kind !== "topup" && (
                          <span className="text-muted-foreground"> · {t.description}</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "py-3 text-right font-medium",
                          parseFloat(t.amount) < 0 ? "text-destructive" : "text-sage",
                        )}
                      >
                        {parseFloat(t.amount) > 0 ? "+" : ""}
                        {formatRub(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentHistory />
    </>
  );
}
