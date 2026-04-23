import type { Metadata } from "next";
import "./globals.css";
import Particles from "./particles";

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
    <html lang="ko">
      <body className="antialiased">
        <Particles />
        {children}
      </body>
    </html>
  );
}
