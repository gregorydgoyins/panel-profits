import * as React from "react";
import { Header } from "./header";
import { IntelligenceRail } from "./intelligence-rail";
import { ValuationRail } from "./valuation-rail";
import { Footer } from "./footer";
import { getIntelligenceRailComics, getValuationRailComics } from "@/lib/dashboard/queries";

interface MarketShellProps {
  children: React.ReactNode;
}

export async function MarketShell({ children }: MarketShellProps) {
  // Fetch bounded rails concurrently
  const [intelligenceItems, valuationItems] = await Promise.all([
    getIntelligenceRailComics(12),
    getValuationRailComics(12),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[#07080B] text-slate-100 antialiased selection:bg-purple-900 selection:text-purple-100">
      <Header />
      <IntelligenceRail items={intelligenceItems} />
      <ValuationRail items={valuationItems} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
