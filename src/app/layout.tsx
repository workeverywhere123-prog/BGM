import type { Metadata } from "next";
import { Cormorant_Garamond, Great_Vibes, Cinzel } from "next/font/google";
import "./globals.css";
import Particles from "./particles";
import WelcomeNoticeGate from "@/components/WelcomeNoticeGate";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
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
  description: "Melbourne's premier board game league — rankings, events, and community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${cormorant.variable} ${greatVibes.variable} ${cinzel.variable}`}>
      <body className="antialiased">
        <Particles />
        <WelcomeNoticeGate />
        {children}
      </body>
    </html>
  );
}
