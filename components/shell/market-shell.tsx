import * as React from "react";
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
import { MarketShellClient } from "./market-shell-client";

interface MarketShellProps {
  children: React.ReactNode;
}

export async function MarketShell({ children }: MarketShellProps) {
  // Random start across the 115,712 catalog universe in 260-comic chunk steps
  const totalChunks = Math.floor(TOTAL_CATALOG_UNIVERSE / 260);
  const randomChunk = Math.floor(Math.random() * totalChunks);
  const randomInitialOffset = randomChunk * 260;

  // Pure public shell queries - zero cookie/header inspection here so Next.js and Cloudflare can cache at the edge.
  const [telemetry, newsStories, marketIndices, initialEquities] = await Promise.all([
    getMarketTelemetry(),
    getNewsStories(32),
    calculateMarketIndices(),
    getSovereignEquities(40, randomInitialOffset),
  ]);

  const header = <Header />;
  const rails = (
    <>
      <RailVisibility setting="newsTicker"><NewsRail initialStories={newsStories} /></RailVisibility>
      <RailVisibility setting="marketTelemetry"><MarketTelemetryRail telemetry={telemetry} /></RailVisibility>
      <RailVisibility setting="equities"><EquitiesRail items={initialEquities} indices={marketIndices} initialOffset={randomInitialOffset} /></RailVisibility>
      <RailVisibility setting="assets"><AssetsRail /></RailVisibility>
      <RailVisibility setting="diary"><DiaryRail /></RailVisibility>
    </>
  );
  const footer = <Footer />;

  return (
    <MarketShellClient header={header} rails={rails} footer={footer}>
      {children}
    </MarketShellClient>
  );
}
