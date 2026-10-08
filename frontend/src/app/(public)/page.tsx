import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { LandingShell } from "@/components/landing/LandingShell";
import { AiHero } from "@/components/landing/ai/AiHero";
import { Compare, HowItWorks, ModelPrices, UseCases } from "@/components/landing/ai/AiSections";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";

/** Воронка: обещание и демо → задачи → как начать → цены → сравнение → вопросы → призыв. */
export default function LandingPage() {
  return (
    <LandingShell>
      <PublicHeader />
      <main>
        <AiHero />
        <UseCases />
        <HowItWorks />
        <ModelPrices />
        <Compare />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </LandingShell>
  );
}
