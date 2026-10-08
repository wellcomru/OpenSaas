"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, DollarSign, Gift, Sparkles, TrendingUp, Wallet } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { adminApi } from "@/api/admin";
import { formatMoney } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminApi.stats(),
  });

  return (
    <>
      <div>
        <h1 className="font-display text-[28px] leading-tight sm:text-[32px]">Админ-панель</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Сводка по системе.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard icon={Users} title="Пользователей" value={String(stats?.total_users ?? 0)} />
        <KpiCard icon={DollarSign} title="Пополнений оплачено" value={formatMoney(stats?.revenue ?? 0)} />
        <KpiCard icon={Wallet} title="Остаток на балансах" value={formatMoney(stats?.total_balance ?? 0)} />
        <KpiCard icon={Sparkles} title="Списано за ИИ" value={formatMoney(stats?.ai_spent ?? 0)} />
        <KpiCard icon={TrendingUp} title="Прибыль с ИИ (наценка)" value={formatMoney(stats?.ai_profit ?? 0)} />
        <KpiCard icon={Gift} title="К выплате рефералам" value={formatMoney(stats?.pending_payouts ?? 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Как считаются деньги</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Пользователь пополняет баланс через Робокассу. За каждый ответ ИИ списывается себестоимость
            токенов в Timeweb AI Gateway плюс наценка (AI_MARKUP_PERCENT, по умолчанию 25%).
          </p>
          <p>
            Себестоимость моделей задаётся в разделе «Модели ИИ». «Прибыль с ИИ» — это наценка без
            учёта комиссии Робокассы и реферальных выплат.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

function KpiCard({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof Users;
  title: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{title}</CardDescription>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="font-display text-2xl">{value}</div>
      </CardContent>
    </Card>
  );
}
