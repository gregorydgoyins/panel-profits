import type { Metadata } from "next";
import { Hind } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/comics/header";

const hind = Hind({
  weight: ["300"],
  subsets: ["latin"],
  variable: "--font-hind",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Panel Profits | Comic Market Intelligence & Catalog",
  description:
    "Production comic-book financial information and market platform indexing over 3.48 million comic records.",
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
      <body className="flex min-h-screen flex-col bg-[#0A0A0C] text-slate-100 font-sans antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-800/80 bg-[#0E0E12] py-6 text-center text-xs text-slate-400">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-200">PANEL PROFITS</span>
              <span>· PRODUCTION COMIC SURVEILLANCE</span>
            </div>
            <div className="text-[11px] text-slate-400">
              OPERATIONAL DATABASE: PANEL PROFITS CLEAN (3,481,445 RECORDS) · HIND 300 CANON
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
