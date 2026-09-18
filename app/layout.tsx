import type { Metadata } from "next";
import { Hind } from "next/font/google";
import "./globals.css";
import { MarketShell } from "@/components/shell/market-shell";

const hind = Hind({
  weight: ["300"],
  subsets: ["latin"],
  variable: "--font-hind",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Panel Profits | Comic Market Intelligence & Valuation",
  description:
    "Production comic-book financial information and market intelligence platform indexing 3,481,445 authoritative comic records.",
  keywords: [
    "Panel Profits",
    "Comic Book Valuation",
    "Comic Catalog",
    "Comic Market Intelligence",
    "CGC 9.8 Pricing",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${hind.variable}`}>
      <body className="flex min-h-screen flex-col bg-[#07080B] text-slate-100 antialiased">
        <MarketShell>{children}</MarketShell>
      </body>
    </html>
  );
}
