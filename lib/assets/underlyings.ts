/**
 * Underlying equities for the assets rail: real FMV from verified_equities joined to the rail_books
 * price history (ComicBase yearly values), census and scarcity tier. Everything priced on the assets rail
 * is derived from these rows — the assets rail never holds a price of its own.
 */
import { createAdminServerClient } from "@/lib/supabase/admin";
import { fetchRosterRaw } from "./roster";
import { createCachedQuery } from "@/lib/cache/wrapper";
import { GAME_DESIGN, type EraKey, type LiquidityState, type PublisherCapTier } from "./canon-params";
import { KEY_ISSUES } from "./key-issues";
import { CHARACTER_BOOKS, entitiesForSeries } from "./entity-graph";
import { conditionsForNodes, degradeState, type ShockMap } from "./shock-propagation";
import { marketFactor, onsetRamp } from "./market-dynamics";
import { combineSourceVolatilities, newsShockMultiplier, realizedVolatility, realizedVolatilityDated } from "./canon-formulas";

export interface Underlying {
  id: string;
  ticker: string | null;
  series: string;
  issueNumber: string;
  year: number | null;
  publisher: string | null;
  /** S — market price, USD (value × market texture once applyShocks has run). */
  price: number;
  /** Fundamental value from the stored sources, USD. */
  value: number;
  /** Which stored source set S ("pricecharting" 9.8 or "comicbase"). */
  priceSource: "pricecharting" | "comicbase";
  coverUrl: string;
  era: EraKey;
  capTier: PublisherCapTier;
  tier: string;
  state: LiquidityState;
  /** Year → ComicBase value, ascending by year. */
  history: { year: number; value: number }[];
  /** σ_real: worst of the independent source vols, floored by scarcity tier, then scaled by news shock. */
  sigma: number;
  /** True when σ came from real price history rather than the tier floor alone. */
  sigmaFromHistory: boolean;
  /** Which price sources contributed a realised σ. */
  sigmaSources: string[];
  /** News shock multiplier applied to σ (1 = no unusual news). */
  newsShock: number;
  censusPop: number | null;
  wavConfidence: number;
  /** Stored ids */
  ppId: string | null;
  /** Graph nodes whose news moves this book */
  entityIds: string[];
  /** Credit spread added by graph shocks (decimal) */
  creditAdd: number;
  /** Causal trails from the graph, for newsroom wikilinks */
  trails: { eventId: string; headline: string; url?: string; path: string[]; effect: number }[];
  censusConfidence: number;
  stale: boolean;
  detailUrl: string;
  label: string;
}

export function eraFromYear(year: number | null): EraKey {
  if (year == null) return "MODERN_MAINSTREAM_KEY";
  if (year < 1956) return "GOLDEN";
  if (year < 1970) return "SILVER";
  if (year < 1980) return "EARLY_BRONZE";
  if (year < 1992) return "LATE_BRONZE_COPPER";
  return "MODERN_MAINSTREAM_KEY";
}

const MAJOR = new Set(["marvel", "dc", "dc comics", "marvel comics"]);
const UPPER = new Set(["image", "dark horse", "idw", "valiant", "boom! studios", "dynamite", "archie", "malibu"]);
const MID = new Set(["fantagraphics", "iDW", "aftershock", "oni press", "vertigo", "wildstorm", "topps", "eclipse", "first comics", "now comics"].map((s) => s.toLowerCase()));

export function capTierFromPublisher(publisher: string | null): PublisherCapTier {
  const p = (publisher || "").trim().toLowerCase();
  if (MAJOR.has(p)) return "MAJOR_X10";
  if (UPPER.has(p)) return "UPPER_INDIE_X6";
  if (MID.has(p)) return "MID_X4";
  return "MICRO_X3";
}

export function tierFromPop(pop: number | null, stored: string | null): string {
  if (stored && GAME_DESIGN.sigmaFloorByTier[stored] != null) return stored;
  if (pop == null) return "common";
  if (pop <= 5) return "mythic";
  if (pop <= 25) return "legendary";
  if (pop <= 100) return "rare";
  if (pop <= 500) return "uncommon";
  return "common";
}

function parseHistory(raw: unknown): { year: number; value: number }[] {
  if (!raw || typeof raw !== "object") return [];
  return Object.entries(raw as Record<string, unknown>)
    .map(([y, v]) => ({ year: Number(y), value: Number(v) }))
    .filter((p) => Number.isFinite(p.year) && p.value > 0)
    .sort((a, b) => a.year - b.year);
}

/**
 * Half-life (hours) of a story's weight in the news-mention count that scales σ. Chosen as 48·ln 2 ≈ 33.3 h so a steady
 * stream of stories yields the same decayed count as the old hard 48-hour window (∫ 2^(−t/h) dt = h/ln 2 = 48 h), but
 * without the cliff: a story's weight fades continuously instead of dropping from 1 to 0 at hour 48.
 */
export const MENTION_HALF_LIFE_HOURS = 48 * Math.LN2;

export interface UnderlyingInputs {
  rail: any[]; // rail_books rows
  ppHistory: { pp_id: unknown; snapshot_date: string; pp_price_9_8: unknown }[];
  news: { headline?: string | null; summary?: string | null; published_at: string }[];
  now?: number;
}

/**
 * Best stored price for a book. PriceCharting 9.8 where it exists; ComicBase when there is no 9.8
 * (pre-1975 books often have none) or when the PriceCharting row is under a tenth of ComicBase,
 * which is the signature of a reprint matched to the original.
 */
export function pickPrice(row: any): { price: number; source: "pricecharting" | "comicbase" } | null {
  const pp = row.pp_ladder ? Number(row.pp_ladder["9.8"]) : NaN;
  const cb = Number(row.cb_price);
  const hasPp = Number.isFinite(pp) && pp > 0;
  const hasCb = Number.isFinite(cb) && cb > 0;
  if (hasPp && hasCb) return pp < cb * 0.1 ? { price: cb, source: "comicbase" } : { price: pp, source: "pricecharting" };
  if (hasPp) return { price: pp, source: "pricecharting" };
  if (hasCb) return { price: cb, source: "comicbase" };
  return null;
}

/** Pure: raw rows → priced, vol-estimated underlyings. Recomputed on every refresh, so nightly snapshots and daily prints flow straight in. */
export function buildUnderlyings(inp: UnderlyingInputs): Underlying[] {
  const now = inp.now ?? Date.now();
  const ppSeries = new Map<string, { t: number; v: number }[]>();
  for (const h of inp.ppHistory) {
    const k = String(h.pp_id);
    const arr = ppSeries.get(k) ?? [];
    arr.push({ t: Date.parse(h.snapshot_date), v: Number(h.pp_price_9_8) });
    ppSeries.set(k, arr);
  }
  const wire = inp.news.map((n) => ({ text: `${n.headline ?? ""} ${n.summary ?? ""}`.toLowerCase(), t: Date.parse(n.published_at) }));
  const mentions = (series: string) => {
    const key = series.trim().toLowerCase();
    if (key.length < 4) return { last48h: 0, baselinePerDay: 0 };
    // Smooth weights from published_at (no hard 48h cutoff): each story contributes a decayed weight d = 2^(−age/h) to
    // the recent count (times the onset ramp, so it is 0 at publish) and the remainder 1 − d to the 28-day baseline.
    // Future-dated stories contribute nothing.
    let recent = 0;
    let prior = 0;
    for (const w of wire) {
      if (!w.text.includes(key)) continue;
      const ageHours = (now - w.t) / 3_600_000;
      if (!Number.isFinite(ageHours) || ageHours < 0) continue;
      const d = Math.pow(2, -ageHours / MENTION_HALF_LIFE_HOURS);
      recent += onsetRamp(ageHours / 24) * d;
      prior += 1 - d;
    }
    // `last48h` is now the decayed, 48h-equivalent mention count (kept as the field name newsShockMultiplier expects)
    return { last48h: recent, baselinePerDay: prior / 28 };
  };

  // one book per (series, issue, year): prefer rows with a census, then the higher price
  const best = new Map<string, { row: any; px: NonNullable<ReturnType<typeof pickPrice>> }>();
  for (const row of inp.rail) {
    const px = pickPrice(row);
    if (!px || !row.cover_url) continue;
    const key = `${String(row.series).toLowerCase()}|${row.issue_number}|${row.year ?? ""}`;
    const cur = best.get(key);
    const better =
      !cur ||
      (row.cgc_total != null) > (cur.row.cgc_total != null) ||
      ((row.cgc_total != null) === (cur.row.cgc_total != null) && px.price > cur.px.price);
    if (better) best.set(key, { row, px });
  }

  const out: Underlying[] = [];
  for (const { row: rb, px } of best.values()) {
    const year = rb.year != null ? Number(rb.year) : null;
    const pop = rb.cgc_total != null ? Number(rb.cgc_total) : null;
    const tier = tierFromPop(pop, rb.scarcity_tier ?? null);
    const history = parseHistory(rb.cb_values);
    const sigmaCb = history.length >= 3 ? realizedVolatility(history.map((h) => h.value), 1) : null;
    const sigmaPp = rb.pp_id != null ? realizedVolatilityDated(ppSeries.get(String(rb.pp_id)) ?? []) : null;
    const floor = GAME_DESIGN.sigmaFloorByTier[tier] ?? 0.08;
    const combined = combineSourceVolatilities([sigmaCb, sigmaPp], floor);
    const m = mentions(String(rb.series));
    const newsShock = newsShockMultiplier(m.last48h, m.baselinePerDay);
    // WAV confidence: independent sources behind the price
    const hasPp = rb.pp_ladder && Object.keys(rb.pp_ladder).length > 0;
    const wav = 0.25 + (hasPp ? 0.3 : 0) + (history.length >= 3 ? 0.3 : 0) + (pop != null ? 0.15 : 0);
    const id = String(rb.comics_id);
    out.push({
      id,
      ticker: null,
      series: String(rb.series),
      issueNumber: String(rb.issue_number),
      year,
      publisher: rb.publisher ?? null,
      price: px.price,
      value: px.price,
      priceSource: px.source,
      coverUrl: String(rb.cover_url),
      era: eraFromYear(year),
      capTier: capTierFromPublisher(rb.publisher ?? null),
      tier,
      state: GAME_DESIGN.stateByTier[tier] ?? "OPEN",
      history,
      sigma: combined.sigma * newsShock,
      sigmaFromHistory: combined.fromHistory,
      sigmaSources: [sigmaCb != null ? "comicbase" : null, sigmaPp != null ? "pricecharting" : null].filter(Boolean) as string[],
      newsShock,
      censusPop: pop,
      wavConfidence: Math.min(0.95, wav),
      ppId: rb.pp_id != null ? String(rb.pp_id) : null,
      entityIds: entitiesForSeries(String(rb.series)),
      creditAdd: 0,
      trails: [],
      censusConfidence: pop != null && pop > 0 ? 0.9 : 0.5,
      stale: false,
      detailUrl: id.startsWith("gcs:") && rb.pp_id ? `/comics/${rb.pp_id}` : `/comics/${id}`,
      label: `${rb.series} #${rb.issue_number}${year ? ` (${year})` : ""}`,
    });
  }
  return out.sort((a, b) => b.price - a.price);
}

/** Applies butterfly-propagated conditions: volatility up, liquidity degraded, credit widened. Never touches price. */
export function applyShocks(unders: Underlying[], shocks: ShockMap, now: number = Date.now()): Underlying[] {
  return unders.map((u) => {
    const c = u.entityIds.length ? conditionsForNodes(u.entityIds, shocks) : null;
    const sigma = c ? u.sigma * c.volMult : u.sigma;
    // market price = value × e^(news pressure); marketFactor is exactly 1 (no synthetic texture); news never changes value
    const pressure = c ? c.pressure : 0;
    const price = u.value * Math.exp(pressure) * marketFactor(`book:${u.id}`, now, Math.min(sigma, 0.6));
    if (!c || (c.volMult === 1 && c.stateSteps === 0 && c.creditAdd === 0 && c.pressure === 0)) return { ...u, price, sigma };
    return { ...u, price, sigma, state: degradeState(u.state, c.stateSteps), creditAdd: c.creditAdd, trails: c.trails };
  });
}

const RAIL_COLS = "comics_id,series,issue_number,year,publisher,cover_url,pp_id,pp_ladder,cb_price,cb_values,cgc_total,scarcity_tier";

async function fetchUnderlyingsRaw(): Promise<Underlying[]> {
  const supabase = createAdminServerClient();
  // 1. landmark books by (series, issue)
  const wanted = [...KEY_ISSUES, ...Object.values(CHARACTER_BOOKS).flat()];
  const names = [...new Set(wanted.map((k) => k.series))];
  const issues = [...new Set(wanted.map((k) => k.issue))];
  const { data: keyRows } = await supabase.from("rail_books").select(RAIL_COLS).in("series", names).in("issue_number", issues);
  const keySet = new Set(wanted.map((k) => `${k.series.toLowerCase()}|${k.issue}|${k.year}`));
  const landmarks = ((keyRows ?? []) as any[]).filter((r) => keySet.has(`${String(r.series).toLowerCase()}|${r.issue_number}|${r.year}`));

  // 2. the highest-valued verified equities, joined to their rail rows
  const { data: eq } = await supabase
    .from("verified_equities")
    .select("id")
    .gt("fmv_usd", 0)
    .order("fmv_usd", { ascending: false })
    .limit(150);
  const ids = (eq ?? []).map((r: any) => String(r.id));
  const { data: topRows } = ids.length ? await supabase.from("rail_books").select(RAIL_COLS).in("comics_id", ids) : { data: [] as any[] };

  // 3. first-appearance books of the roster's characters
  const roster = await fetchRosterRaw().catch(() => []);
  const rosterIds = [...new Set(roster.map((r) => r.comicsId))];
  const { data: rosterRows } = rosterIds.length ? await supabase.from("rail_books").select(RAIL_COLS).in("comics_id", rosterIds) : { data: [] as any[] };

  const seen = new Set<string>();
  const rail = [...landmarks, ...((topRows ?? []) as any[]), ...((rosterRows ?? []) as any[])].filter((r) => (seen.has(r.comics_id) ? false : (seen.add(r.comics_id), true)));
  if (rail.length === 0) return [];

  const ppIds = [...new Set(rail.map((r: any) => r.pp_id).filter((x: any) => x != null))];
  const { data: hist } = ppIds.length
    ? await supabase.from("pp_price_history").select("pp_id,snapshot_date,pp_price_9_8").in("pp_id", ppIds as any[]).gt("pp_price_9_8", 0)
    : { data: [] as any[] };
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: news } = await supabase.from("news_articles").select("headline,summary,published_at").gte("published_at", since).limit(2000);
  return buildUnderlyings({ rail, ppHistory: (hist ?? []) as any[], news: (news ?? []) as any[] });
}

export const getUnderlyings = createCachedQuery(fetchUnderlyingsRaw, "asset-underlyings", {
  // ≤ 5 minutes so news-driven σ (mention counts) and fresh price prints show up promptly
  ttlSeconds: 300,
  staleWhileRevalidateSeconds: 900,
  tags: ["assets", "pricing"],
});
