import { NextResponse } from "next/server";
import { getContinuousQueueSlice, getCatalogUniverseTotal } from "@/lib/equity/continuous-queue-engine";
import { getAuthoritativeCoverStrict } from "@/lib/comics/cover-authority";
import { resolveAuthoritativePublisher } from "@/lib/comics/publisher-authority";
import { formatComicEquityTicker } from "@/lib/equity/ticker-formatting";
import {
  resolveHistoricalKeyBadge,
  resolveHistoricalScarcityTier,
  resolveHistoricalMarketClass,
} from "@/lib/equity/significance-classifier";
import type { EquityItem, EquityResponse } from "@/lib/equity/ticker-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = Math.min(Math.max(parseInt(searchParams.get("limit") || "80", 10), 10), 200);
  const offsetParam = parseInt(searchParams.get("offset") || "0", 10);
  const eraParam = searchParams.get("era") || undefined;
  const randomStart = searchParams.get("randomStart") === "1" || searchParams.get("reload") === "1";

  let effectiveOffset = offsetParam;
  if (randomStart) {
    const totalChunks = Math.max(1, Math.floor((await getCatalogUniverseTotal(eraParam)) / 260));
    const randomChunk = Math.floor(Math.random() * totalChunks);
    effectiveOffset = randomChunk * 260;
  }

  // Stream continuous 5,000-comic blocks across 115,712 catalog
  const queueResult = await getContinuousQueueSlice(effectiveOffset, limitParam, eraParam);
  const baseItems = queueResult.items;

  // Pre-Queue verification gate: cover must be valid image URL
  const validBaseItems = baseItems.filter((item) => {
    const authoritativePublisher = resolveAuthoritativePublisher(item.series, item.publisher);
    const cover = item.coverUrl || getAuthoritativeCoverStrict(item.series, item.issueNumber, authoritativePublisher, item.year || 1990);
    if (!cover) return false;
    if (cover.includes("svg") || cover.startsWith("data:image/svg")) return false;
    return true;
  });

  const formattedItems: EquityItem[] = validBaseItems.map((item, idx) => {
    const eraKey = (item.productionAge || item.originEra || "modern")
      .toLowerCase()
      .replace(/_age$/, "")
      .replace(/\s+age$/, "");

    const itemGrade = item.referenceGrade ? String(item.referenceGrade).trim() : null;

    // Strict Sovereign Constitutional Gating:
    // "soverign is a direct universal bluelabel 9.8 comic"
    // Strictly requires grade 9.8, direct edition (no variants, newsstands, reprints), and universal label.
    const isTrulySovereign = itemGrade === "9.8" && !item.variant && Boolean(
      (item as any).isSovereign === true ||
      (String(item.id).startsWith("seat-") && (item as any).seatNumber <= 65)
    );

    // Enforce Price Firewall & Market Class:
    // - otc is less than 25.00
    // - standard is 25.00 to 44.99
    // - premium is 45.00 to infinity
    // - soverign is a direct universal bluelabel 9.8 comic
    const keyBadge = item.keyBadge || resolveHistoricalKeyBadge(item.series, item.issueNumber);
    const tier = resolveHistoricalScarcityTier({
      year: item.year,
      era: eraKey,
      keyBadge,
      isSovereign: isTrulySovereign,
      variant: item.variant,
    });
    const marketClass = resolveHistoricalMarketClass({
      isSovereign: isTrulySovereign,
      fmv: item.referenceFmvUsd,
      keyBadge,
      year: item.year,
      era: eraKey,
      variant: item.variant,
    });
    const effectiveAssetClass = isTrulySovereign ? "SOV" : marketClass;

    const authoritativePublisher = resolveAuthoritativePublisher(item.series, item.publisher);
    const resolvedCover = item.coverUrl || getAuthoritativeCoverStrict(item.series, item.issueNumber, authoritativePublisher, item.year || 1990);
    const canonicalTicker = formatComicEquityTicker(item.series, item.issueNumber);

    const vLower = (item.variant || "").toLowerCase();
    const editionForm = vLower.includes("newsstand")
      ? "NEWSSTAND"
      : vLower.includes("print")
      ? "REPRINT"
      : item.variant
      ? "VARIANT"
      : "DIRECT";

    return {
      entryId: `eq-${item.id || idx}`,
      coverImageUrl: resolvedCover,
      pricing: {
        fmv_usd: item.referenceFmvUsd,
        grade: itemGrade,
        delta_24: item.deltaPercent ?? null,
        delta_30: null,
        delta_90: null,
        asset_class: effectiveAssetClass,
      },
      identity: {
        assetId: canonicalTicker,
        productName: item.variant
          ? `${item.series} #${item.issueNumber} [${item.variant}]`
          : `${item.series} #${item.issueNumber}`,
        year: item.year ?? null,
        publisher: authoritativePublisher,
        variant: item.variant || null,
        productionAge: eraKey,
        scarcityTier: tier,
        // pp-<id> keys are unique per book; tickers collide across volumes, so they are never used for these.
        detailUrl: String(item.id).startsWith("pp-")
          ? `/comics/${item.id}`
          : `/comics/${encodeURIComponent(canonicalTicker || item.canonicalIssueId || item.id)}`,
        assetClass: effectiveAssetClass,
        marketPriceClass: marketClass,
        isSovereign: isTrulySovereign,
        certificationState: isTrulySovereign ? "SOVEREIGN_BLUE_LABEL" : "OBSERVED",
        editionForm,
        coverVerified: Boolean(resolvedCover),
        yearDivergence: false,
        coverSuppressReason: null,
        identityConfidence: isTrulySovereign ? 100 : (item as any).identityConfidence ?? null,
        quarantined: false,
        writer: (item as any).writer || (item as any).creators || null,
        penciler: (item as any).penciler || null,
        keyBadge: keyBadge || (item as any).keyBadge || null,
        genre: (item as any).genre || null,
      },
    };
  });

  // Next continuous batch advances by 260 comics to load non-overlapping fresh pieces
  const nextOffset = (effectiveOffset + 260) % queueResult.totalEligible;

  const response: EquityResponse = {
    surface: "EQUITY",
    tickId: Math.floor(Date.now() / 30000),
    marketRegime: null,
    showing: formattedItems.length,
    totalEligible: queueResult.totalEligible,
    totalInQueue: queueResult.totalInBlock,
    offset: offsetParam,
    nextOffset: queueResult.nextOffset,
    hasMore: true,
    items: formattedItems,
    eraTotals: queueResult.eraTotals,
    scarcityTotals: queueResult.scarcityTotals,
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
