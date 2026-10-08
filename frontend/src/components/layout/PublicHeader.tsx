"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useHasSession } from "@/hooks/useHasSession";
import { BRAND_NAME } from "@/lib/brand";

const navLinks = [
  { href: "/#features", label: "Возможности" },
  { href: "/#how", label: "Как это работает" },
  { href: "/#prices", label: "Модели и цены" },
  { href: "/#faq", label: "Вопросы" },
];

export function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // Вошедшему человеку вместо «Войти / Регистрация» показываем вход в кабинет.
  const loggedIn = useHasSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50 px-3 sm:px-4 pt-3" style={{ fontFamily: "Onest, Geist, sans-serif" }}>
      <div
        className="mx-auto flex items-center justify-between h-[60px] pl-5 pr-2 rounded-full transition-all duration-500"
        style={{
          maxWidth: 1180,
          background: scrolled || open ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.4)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          border: "1px solid rgba(22,20,15,0.08)",
          boxShadow: scrolled ? "0 1px 2px rgba(22,20,15,0.04), 0 16px 40px -16px rgba(22,20,15,0.18)" : "none",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5 no-underline" onClick={() => setOpen(false)}>
          <Image src="/logo.png" alt={BRAND_NAME} width={28} height={28} style={{ borderRadius: 8 }} priority />
          <span className="text-[15px] font-medium tracking-tight text-[#16140f]" style={{ fontFamily: "Unbounded, sans-serif" }}>{BRAND_NAME}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="text-[13px] text-[#4a463e] no-underline transition-colors hover:text-[#16140f]" style={{ fontFamily: "Unbounded, sans-serif", letterSpacing: "-0.01em" }}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          {loggedIn ? (
            <Link href="/chat" className="inline-flex items-center h-10 px-5 rounded-full text-[14px] font-semibold text-white no-underline transition-transform hover:-translate-y-px" style={{ background: "#16140f" }}>
              Открыть чат
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-flex items-center h-10 px-4 rounded-full text-[14px] font-medium text-[#4a463e] no-underline hover:text-[#16140f] hover:bg-black/[0.05] transition-colors">
                Войти
              </Link>
              <Link href="/register" className="inline-flex items-center h-10 px-5 rounded-full text-[14px] font-semibold text-white no-underline transition-transform hover:-translate-y-px" style={{ background: "#16140f" }}>
                Начать
              </Link>
            </>
          )}
          <button
            type="button"
            className="md:hidden inline-flex w-10 h-10 items-center justify-center rounded-full hover:bg-black/[0.05]"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="md:hidden mx-auto mt-2 rounded-3xl p-3 flex flex-col"
          style={{ maxWidth: 1180, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(22,20,15,0.08)", boxShadow: "0 16px 40px -16px rgba(22,20,15,0.18)" }}
        >
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="px-4 py-3 rounded-2xl text-[16px] text-[#16140f] no-underline hover:bg-black/[0.04]">
              {label}
            </Link>
          ))}
          <Link href={loggedIn ? "/chat" : "/login"} onClick={() => setOpen(false)} className="px-4 py-3 rounded-2xl text-[16px] text-[#4a463e] no-underline hover:bg-black/[0.04]">
            {loggedIn ? "Открыть чат" : "Войти"}
          </Link>
        </nav>
      )}
    </header>
  );
}
