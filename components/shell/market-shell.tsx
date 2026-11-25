import * as React from "react";
import { headers } from "next/headers";
import { Header } from "./header";
import { NewsRail } from "./news-rail";
import { MarketTelemetryRail } from "./market-telemetry-rail";
import { AssetsRail } from "./assets-rail";
import { EquitiesRail } from "./equities-rail";
import { DiaryRail } from "./diary-rail";
import { Footer } from "./footer";
import { getMarketTelemetry } from "@/lib/dashboard/queries";
import { getSovereignEquities } from "@/lib/equity/canonical-equities";
import { TOTAL_CATALOG_UNIVERSE } from "@/lib/equity/continuous-queue-engine";
import { calculateMarketIndices } from "@/lib/market/indices";
import { getNewsStories } from "@/lib/news/feed";
import { RailVisibility } from "./rail-visibility";

interface MarketShellProps {
  children: React.ReactNode;
}

// Standalone public routes that must render completely free of trading rails and app header
const STANDALONE_ROUTES = ["/beta", "/donate", "/book", "/podcasts"];

export async function MarketShell({ children }: MarketShellProps) {
  // Read request pathname passed by middleware (x-panel-profits-path)
  const headersList = await headers();
  const pathname = headersList.get("x-panel-profits-path") || "";

  const isStandalone = STANDALONE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // If visiting /beta, /donate, or /book, render children directly with ZERO market rails or trading headers
  if (isStandalone) {
    return <>{children}</>;
  }

  // Random start across the 115,712 catalog universe in 260-comic chunk steps
  const totalChunks = Math.floor(TOTAL_CATALOG_UNIVERSE / 260);
  const randomChunk = Math.floor(Math.random() * totalChunks);
  const randomInitialOffset = randomChunk * 260;

  // Pure public shell queries
  const [telemetry, newsStories, marketIndices, initialEquities] = await Promise.all([
    getMarketTelemetry(),
    getNewsStories(32),
    calculateMarketIndices(),
    getSovereignEquities(40, randomInitialOffset),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[#07080B] text-slate-100 antialiased selection:bg-purple-900 selection:text-purple-100">
      {/* Sticky Header Group: Identity, Deal Radar, Clocks, Primary Nav, News Wire, and Market Telemetry */}
      <div className="sticky top-0 z-40 w-full shadow-lg">
        <Header indices={marketIndices} />
        <RailVisibility setting="newsTicker"><NewsRail initialStories={newsStories} /></RailVisibility>
        <RailVisibility setting="marketTelemetry"><MarketTelemetryRail telemetry={telemetry} /></RailVisibility>
      </div>

      {/* Non-Sticky Flow Rails: Sovereign Equities Rail, Canonical Assets Rail, and Diary Rail */}
      <RailVisibility setting="equities"><EquitiesRail items={initialEquities} indices={marketIndices} initialOffset={randomInitialOffset} /></RailVisibility>
      <RailVisibility setting="assets"><AssetsRail /></RailVisibility>
      <RailVisibility setting="diary"><DiaryRail /></RailVisibility>

      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
