import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function CTA() {
  return (
    <section className="lx-section pt-8">
      <div className="lx-container">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-[40px] px-6 py-20 sm:py-28 text-center lx-grain"
            style={{ background: "radial-gradient(ellipse 80% 90% at 50% 110%, #eab79c 0%, #f3dccd 35%, #f8f1ea 70%, #fbf8f4 100%)", border: "1px solid var(--lx-line)" }}
          >
            <div aria-hidden className="absolute inset-0 lx-grid-lines opacity-40 pointer-events-none" style={{ maskImage: "radial-gradient(ellipse 60% 60% at 50% 40%, #000, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 40%, #000, transparent 80%)" }} />
            <div className="relative mx-auto" style={{ maxWidth: 860 }}>
              <h2 className="lx-display" style={{ fontSize: "clamp(2.1rem, 4.6vw, 4rem)", lineHeight: 1.05 }}>
                Задайте первый вопрос <em>прямо сейчас</em>
              </h2>
              <p className="lx-lead mx-auto mt-7" style={{ maxWidth: 560 }}>
                Регистрация за минуту, пополнение от 100 ₽. Все нейросети в одном окне и оплата только за ответы.
              </p>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link href="/register" className="lx-btn lx-btn-ink">
                  Начать общение <ArrowRight size={16} />
                </Link>
                <a href="#prices" className="lx-btn lx-btn-ghost">
                  Посмотреть цены
                </a>
              </div>

              <p className="mt-6 text-[13px] text-[var(--lx-ink-3)]">Без подписки · Без VPN · Оплата в рублях</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
