import * as React from "react";
import { Header } from "./header";
import { IntelligenceRail } from "./intelligence-rail";
import { ValuationRail } from "./valuation-rail";
import { MarketTelemetryRail } from "./market-telemetry-rail";
import { MarketTicker } from "./market-ticker";
import { AssetsRail } from "./assets-rail";
import { EquitiesRail } from "./equities-rail";
import { DiaryRail } from "./diary-rail";
import { Footer } from "./footer";
import { getCleanAssetSurfaces, getIntelligenceRailComics, getMarketTelemetry, getValuationRailComics } from "@/lib/dashboard/queries";
import { getCurrentUser } from "@/lib/account/queries";
import { getDiaryEntries } from "@/lib/panel-profits/queries";
import { headers } from "next/headers";
import { AuthFrontDoor } from "@/components/auth/front-door";

interface MarketShellProps {
  children: React.ReactNode;
}

export async function MarketShell({ children }: MarketShellProps) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-panel-profits-path") || "";
  const isFrontDoor = pathname === "/sign-in" || pathname === "/sign-up";
  if (isFrontDoor) return <AuthFrontDoor>{children}</AuthFrontDoor>;

  // Fetch bounded rails concurrently
  const user = await getCurrentUser();
  const [telemetry, intelligenceItems, assetsItems, valuationItems, diaryEntries] = await Promise.all([
    getMarketTelemetry(),
    getIntelligenceRailComics(12),
    getCleanAssetSurfaces(24),
    getValuationRailComics(12),
    user ? getDiaryEntries(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[#07080B] text-slate-100 antialiased selection:bg-purple-900 selection:text-purple-100">
      <Header />
      <MarketTicker state={telemetry} broadIndex={null} qualityIndex={null} />
      <MarketTelemetryRail telemetry={telemetry} />
      <IntelligenceRail items={intelligenceItems} />
      <AssetsRail items={assetsItems} />
      <EquitiesRail items={valuationItems} />
      <DiaryRail entries={diaryEntries} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
