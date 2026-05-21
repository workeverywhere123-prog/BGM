import type { Metadata } from "next";
import { Cormorant_Garamond, Great_Vibes, Cinzel } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Particles from "./particles";
import WelcomeNoticeGate from "@/components/WelcomeNoticeGate";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-great-vibes",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-cinzel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BGM – Boardgame in Melbourne",
  description: "멜버른 한인 보드게임 모임 — 리그, 모임 일정, 랭킹",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BGM",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${cormorant.variable} ${greatVibes.variable} ${cinzel.variable}`}>
      <head>
        <link rel="preconnect" href="https://khvkuowhnavsaorgjpyo.supabase.co" />
        <link rel="dns-prefetch" href="https://khvkuowhnavsaorgjpyo.supabase.co" />
        <meta name="theme-color" content="#0b2218" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        <Particles />
        <Suspense fallback={null}>
          <WelcomeNoticeGate />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
