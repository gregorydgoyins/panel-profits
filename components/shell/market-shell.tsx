import * as React from "react";
import { Header } from "./header";
import { ValuationRail } from "./valuation-rail";
import { Footer } from "./footer";
import { getValuationRailComics } from "@/lib/dashboard/queries";

interface MarketShellProps {
  children: React.ReactNode;
}

export async function MarketShell({ children }: MarketShellProps) {
  const valuationItems = await getValuationRailComics(12);

  return (
    <div className="flex min-h-screen flex-col bg-[#07080B] text-slate-100 antialiased selection:bg-purple-900 selection:text-purple-100">
      <Header />
      <ValuationRail items={valuationItems} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
