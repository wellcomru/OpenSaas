import type { Metadata } from "next";
import "./globals.css";

import { Providers } from "@/components/Providers";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${BRAND_NAME} — ChatGPT, Claude, Gemini и DeepSeek в одном чате без подписки`,
  description:
    "Все лучшие нейросети в одном окне. Без VPN и зарубежных карт: пополняйте баланс в рублях от 100 ₽ и платите только за ответы.",
  icons: {
    icon: "/favicon/favicon.ico",
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
