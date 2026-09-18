import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/comics/header";

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
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col bg-[#0D0D0E] text-chalk font-sans antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-graphite-800 bg-graphite-950 py-6 text-center text-xs font-mono text-graphite-400">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-chalk">PANEL PROFITS</span>
              <span>· FIRST PRODUCTION MILESTONE</span>
            </div>
            <div className="text-[11px] text-graphite-500">
              OPERATIONAL DATABASE: PANEL PROFITS CLEAN (3,481,445 RECORDS)
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
