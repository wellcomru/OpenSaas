"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Bot,
  Gift,
  MessageSquare,
  Wallet,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  DollarSign,
} from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";

const userNav = [
  { href: "/chat", label: "Чат с ИИ", icon: MessageSquare },
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/billing", label: "Баланс", icon: Wallet },
  { href: "/referrals", label: "Рефералы", icon: Gift },
  { href: "/settings", label: "Настройки", icon: Settings },
];

const adminNav = [
  { href: "/admin", label: "Админ", icon: ShieldCheck },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/models", label: "Модели ИИ", icon: Bot },
  { href: "/admin/billing", label: "Платежи", icon: DollarSign },
  { href: "/admin/referrals", label: "Выплаты", icon: Gift },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {userNav.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname?.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-card text-foreground shadow-[0_1px_2px_rgba(22,20,15,.06),0_0_0_1px_rgba(22,20,15,.06)]"
                : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
            )}
          >
            <Icon
              className={cn("h-4 w-4 shrink-0", active && "text-clay")}
              strokeWidth={active ? 2 : 1.75}
            />
            {item.label}
          </Link>
        );
      })}

      {user?.role === "admin" && (
        <>
          <div className="my-3 border-t border-border" />
          <div className="px-3 pb-1.5 font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
            Администрирование
          </div>
          {adminNav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(22,20,15,.06),0_0_0_1px_rgba(22,20,15,.06)]"
                    : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-clay")} strokeWidth={active ? 2 : 1.75} />
                {item.label}
              </Link>
            );
          })}
        </>
      )}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Link href="/chat" className="flex h-16 items-center gap-2.5 px-5 no-underline">
        <Image src="/logo.png" alt="" width={28} height={28} className="rounded-lg" />
        <span className="font-display text-[15px] text-foreground">{BRAND_NAME}</span>
      </Link>
      <NavLinks onNavigate={onNavigate} />
    </>
  );
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUiStore();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 border-r border-border bg-secondary/50 md:block">
        <SidebarContent />
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-background shadow-2xl transition-transform duration-300 ease-in-out md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent onNavigate={() => setSidebarOpen(false)} />
      </aside>
    </>
  );
}
