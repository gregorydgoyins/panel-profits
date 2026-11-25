"use client";

import * as React from "react";
import Link from "next/link";
import { Boxes, Sparkles, Layers } from "lucide-react";
import type { CanonicalAssetSurface } from "@/lib/equity/canonical-equities";
import {
  FAMILY_ORDER,
  FAMILY_MEMBERS,
  FAMILY_HEADER,
  SURFACE_ART_MAP,
  SURFACE_COLORS,
  SURFACE_ICONS,
  SURFACE_LABELS,
  type SurfaceKey,
} from "@/lib/assets/surfaceConfig";
import { AssetTickerHeader } from "@/components/tickers/asset-ticker-header";
import { AssetCard } from "@/components/tickers/asset-card";
import type { AssetItem, AssetResponse } from "@/lib/assets/types";
import { getEraColors } from "@/lib/design-system/colors";

import { INITIAL_SURFACE_ASSETS } from "@/lib/assets/initial-assets";

const CARD_W = 227; // 215px card + 12px gap
const SCROLL_SPEED = 32; // px/s (calm, steady, readable pace for asset classes)
const FETCH_MS = 5 * 60 * 1000;

interface AssetsRailProps {
  items?: CanonicalAssetSurface[];
}

export function AssetsRail({ items }: AssetsRailProps = {}) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [selectedFamily, setSelectedFamily] = React.useState<string | null>(null);

  const [allSurfaces, setAllSurfaces] = React.useState<Partial<Record<SurfaceKey, AssetItem[]>>>({});
  const [assetItems, setAssetItems] = React.useState<AssetItem[]>(INITIAL_SURFACE_ASSETS);
  const [surfaceCounts, setSurfaceCounts] = React.useState<Partial<Record<SurfaceKey, number>>>({});
  const [errored, setErrored] = React.useState(false);

  // Filter items by selected family if chosen (full surface pool when a family is selected; balanced cross-family rail when unfiltered)
  const filteredItems = React.useMemo(() => {
    if (selectedFamily) {
      const members = FAMILY_MEMBERS[selectedFamily as keyof typeof FAMILY_MEMBERS] || [];
      const fromSurfaces: AssetItem[] = [];
      for (const m of members) {
        const list = allSurfaces[m];
        if (list?.length) fromSurfaces.push(...list);
      }
      if (fromSurfaces.length > 0) return fromSurfaces;
      const baseList = assetItems.length > 0 ? assetItems : INITIAL_SURFACE_ASSETS;
      return baseList.filter((it) => members.includes(it.assetType as SurfaceKey));
    }
    return assetItems.length > 0 ? assetItems : INITIAL_SURFACE_ASSETS;
  }, [allSurfaces, assetItems, selectedFamily]);

  // Adjust duration dynamically on item count with a generous minimum so it never flies
  React.useLayoutEffect(() => {
    if (!trackRef.current || filteredItems.length === 0) return;
    const duration = Math.max(90, (filteredItems.length * CARD_W) / SCROLL_SPEED);
    const elapsedSeconds = (Date.now() / 1000) % duration;
    trackRef.current.style.animationDuration = `${duration}s`;
    trackRef.current.style.animationDelay = `-${elapsedSeconds}s`;
  }, [filteredItems.length]);

  // Background fetch to enrich surfaces from /api/asset/ticker
  const fetchSurfaces = React.useCallback(async () => {
    try {
      const res = await fetch("/api/asset/ticker", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: AssetResponse = await res.json();

      const counts: Partial<Record<SurfaceKey, number>> = {};
      const bySurface: Partial<Record<SurfaceKey, AssetItem[]>> = {};

      if (json.surfaces) {
        for (const [key, data] of Object.entries(json.surfaces)) {
          const valid = (data?.items ?? []).filter((it) => (it.pricing?.fmv_usd ?? it.pricing?.fmv ?? it.pricing?.price ?? 0) > 0);
          if (valid.length > 0) {
            counts[key as SurfaceKey] = valid.length;
            bySurface[key as SurfaceKey] = valid;
          }
        }
      }

      // Balanced round-robin across all 16 families so no single surface (like characters) drowns out bonds, options, swaps, futures, funds, crypto, or NFTs.
      const MAX_PER_SURFACE_IN_UNFILTERED_RAIL = 4;
      const familyQueues: AssetItem[][] = FAMILY_ORDER.map((fam) => {
        const members = FAMILY_MEMBERS[fam] || [];
        const famPool: AssetItem[] = [];
        for (const m of members) {
          const itemsForSurface = bySurface[m];
          if (itemsForSurface?.length) {
            famPool.push(...itemsForSurface.slice(0, MAX_PER_SURFACE_IN_UNFILTERED_RAIL));
          }
        }
        return famPool;
      }).filter((q) => q.length > 0);

      const interleavedItems: AssetItem[] = [];
      let round = 0;
      let added = true;
      while (added) {
        added = false;
        for (const q of familyQueues) {
          if (round < q.length) {
            interleavedItems.push(q[round]);
            added = true;
          }
        }
        round++;
      }

      setSurfaceCounts(counts);
      setAllSurfaces(bySurface);
      if (interleavedItems.length > 0) {
        React.startTransition(() => {
          setAssetItems(interleavedItems);
        });
      }
      setErrored(false);
    } catch {
      setErrored(true);
    }
  }, []);

  React.useEffect(() => {
    fetchSurfaces();
    const id = setInterval(fetchSurfaces, FETCH_MS);
    return () => clearInterval(id);
  }, [fetchSurfaces]);

  // Pause on hover via direct DOM style manipulation — zero React re-renders
  const handleEnter = React.useCallback(() => {
    if (trackRef.current) trackRef.current.style.animationPlayState = "paused";
  }, []);

  const handleLeave = React.useCallback(() => {
    if (trackRef.current) trackRef.current.style.animationPlayState = "running";
  }, []);

  return (
    <aside
      aria-label="16 Canonical Comic Asset Classes Surveillance Rail"
      className="border-b border-slate-800/80 bg-[#060910] text-xs text-slate-300 shadow-md select-none overflow-hidden"
    >
      {/* ── Top Header Bar ── */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-1.5 sm:px-4 border-b border-slate-800/60">
        {/* Left Anchor */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/assets"
            className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-cyan-400 hover:text-cyan-300 transition-colors"
            title="Open 16 Canonical Collectible Asset Classes Registry"
          >
            <Boxes className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">NON-EQUITY ASSETS</span>
            <span className="rounded bg-cyan-950/70 border border-cyan-500/40 px-1.5 py-0.2 text-[9px] text-cyan-300 font-bold">
              16 FAMILIES · 65 SURFACES
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-mono text-cyan-400/80 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded">
            <span>DERIVATIVES · FUNDS · INDICES · MUNI BONDS · ALTER EGOS</span>
          </div>
        </div>

        {/* Right Info Chip */}
        <div className="hidden sm:flex items-center gap-2 text-[9px] font-mono text-slate-500">
          <span className="text-cyan-400/90 font-semibold flex items-center gap-1">
            <Layers className="h-3 w-3 text-cyan-400" />
            Alter Egos (355 Firms) · Muni Bonds · Media IP · Derivatives · Volatility
          </span>
          <span className="text-slate-600 hidden md:inline">· Hover to Pause</span>
        </div>
      </div>

      {/* ── Subheader with Family Filter Chips ── */}
      <AssetTickerHeader
        totalShowing={filteredItems.length}
        surfaceCounts={surfaceCounts}
        stalled={errored}
        selectedFamily={selectedFamily}
        onFamilySelect={setSelectedFamily}
        onRetry={fetchSurfaces}
      />

      {/* ── Continuously Animated Constituents / Asset Classes Marquee Rail ── */}
      <div
        className="assets-marquee relative min-w-0 overflow-hidden py-3 bg-[#04060C]"
        role="region"
        aria-label="Certified Asset Surfaces Ticker"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {/* Left & Right Ambient Fade Scrims */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-[#04060C] via-[#04060C]/80 to-transparent z-20" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-[#04060C] via-[#04060C]/80 to-transparent z-20" />

        {filteredItems.length > 0 && (
          <div
            ref={trackRef}
            className="assets-marquee-track flex w-max items-center will-change-transform"
            style={{
              display: "flex",
              width: "max-content",
              willChange: "transform",
              animation: `panel-profits-assets-marquee 180s linear infinite`,
              backfaceVisibility: "hidden",
            }}
          >
            {(["a", "b"] as const).map((copy) => (
              <div key={copy} style={{ display: "flex", gap: "12px", paddingLeft: "16px", paddingRight: "12px", flexShrink: 0 }}>
                {filteredItems.slice(0, 36).map((item, i) => (
                  <AssetCard
                    key={`${copy}-${i}`}
                    item={item}
                    assetType={item.assetType}
                    index={copy === "a" ? i : i + Math.min(filteredItems.length, 36)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
