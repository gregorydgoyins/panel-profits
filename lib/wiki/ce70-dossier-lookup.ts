/**
 * lib/wiki/ce70-dossier-lookup.ts
 *
 * Authoritative lookup & quantitative financial analytics helper for Panel Profits Wiki pages.
 * - Matches any PPCF comic against all 65 certified CE70 constitutional seats + 5 vacant seats
 * - Extracts Bid/Ask spread ladders & ComicBase multi-year valuation curves from raw observations
 * - Computes Realized Volatility (σ), CAGR / Total Return, Liquidity Regime, and live Derived Cross-Asset
 *   instruments (3rd-Friday OCC Options with Intrinsic/Time Value, Futures, Institutional Note, Vault NFT)
 */
import ce70DossiersRaw from "./ce70-constitutional-dossiers.json";
import type { PriceObservation } from "@/lib/sniper/stored-market-evidence";
import { normalizeObservationGrade } from "@/lib/sniper/stored-market-evidence";
import {
  bondLiquiditySpreadFor,
  bondPrice,
  futuresPrice,
  nftPrice,
  realizedVolatility,
  requiredYield,
} from "@/lib/assets/canon-formulas";
import { CREDIT_SPREAD_INSTITUTIONAL, GAME_DESIGN, treasuryYield, type EraKey, type LiquidityState } from "@/lib/assets/canon-params";
import { buildOptionChainFromUnderlying, type ChainLeg, type OptionChain } from "@/lib/assets/option-chain";
import { eraFromYear } from "@/lib/assets/underlyings";

export interface Ce70QualityMetric {
  dimension: string;
  score: string;
  rationale: string;
}

export interface Ce70ConstitutionalDossier {
  seatNumber: number;
  titleLine: string;
  canonicalIssueId: string;
  gcdIssueId: number | null;
  era: string;
  year: number | null;
  publisher: string;
  creators: string;
  status: string;
  gregoryScore: number | null;
  sunOfEra: boolean;
  role: string;
  essay: string;
  qualityRuler: Ce70QualityMetric[];
  ppcfId: string | null;
  series: string;
  issueNumber: string;
  ppSourceId: string | null;
  detailUrl: string | null;
  coverUrl: string | null;
}

const DOSSIERS = ce70DossiersRaw as Ce70ConstitutionalDossier[];
const byPpcf = new Map<string, Ce70ConstitutionalDossier>();
const byGcd = new Map<number, Ce70ConstitutionalDossier>();
const bySeat = new Map<number, Ce70ConstitutionalDossier>();

for (const d of DOSSIERS) {
  bySeat.set(d.seatNumber, d);
  if (d.ppcfId) byPpcf.set(d.ppcfId.toUpperCase(), d);
  if (d.gcdIssueId != null) byGcd.set(d.gcdIssueId, d);
}

export function findCe70Dossier(opts: {
  ppcfId?: string | null;
  gcdIssueId?: number | null;
  seatNumber?: number | null;
}): Ce70ConstitutionalDossier | null {
  if (opts.ppcfId) {
    const hit = byPpcf.get(opts.ppcfId.trim().toUpperCase());
    if (hit) return hit;
  }
  if (opts.gcdIssueId != null) {
    const hit = byGcd.get(Number(opts.gcdIssueId));
    if (hit) return hit;
  }
  if (opts.seatNumber != null) {
    const hit = bySeat.get(Number(opts.seatNumber));
    if (hit) return hit;
  }
  return null;
}

export function getAllCe70ConstitutionalDossiers(): Ce70ConstitutionalDossier[] {
  return DOSSIERS;
}

export interface BidAskRung {
  grade: string;
  bid: number | null;
  fmv: number | null;
  ask: number | null;
  spreadUsd: number | null;
  spreadPct: number | null;
  source: string;
}

export interface AnnualValuationPoint {
  year: number;
  amount: number;
  grade: string;
  yoyPct: number | null;
}

export interface DerivedEquityInstruments {
  anchorPrice: number;
  anchorGrade: string;
  sigma: number;
  era: EraKey;
  liquidityState: LiquidityState;
  frontCall: ChainLeg | null;
  frontPut: ChainLeg | null;
  optionChain: OptionChain | null;
  future6M: number;
  futureBasis: number;
  institutionalBond5Y: { coupon: number; yReq: number; price: number } | null;
  vaultNftPrice: number;
}

export interface WikiFinancialAnalytics {
  bidAskLadder: BidAskRung[];
  annualHistory: AnnualValuationPoint[];
  coverPriceUsd: number | null;
  topPricePaidUsd: number | null;
  highGradeFmv: { grade: string; amount: number; source: string } | null;
  liquidCenterFmv: { grade: string; amount: number; source: string } | null;
  averageSpreadPct: number | null;
  realizedVolAnnualized: number | null;
  multiYearReturnPct: number | null;
  derived: DerivedEquityInstruments | null;
}

export function buildWikiFinancialAnalytics(opts: {
  series: string;
  issueNumber: string;
  year: number | null;
  observations: PriceObservation[];
  censusTotal: number | null;
  nowMs?: number;
}): WikiFinancialAnalytics {
  const { series, issueNumber, year, observations, censusTotal, nowMs = Date.now() } = opts;

  // 1. Extract Bid / FMV / Ask rungs per grade from raw observations
  const rungMap = new Map<string, BidAskRung>();
  const annualMap = new Map<number, { year: number; amount: number; grade: string }>();
  let coverPriceUsd: number | null = null;
  let topPricePaidUsd: number | null = null;

  for (const row of observations) {
    const amt = Number(row.amount);
    if (!(amt > 0) || !Number.isFinite(amt)) continue;
    const pf = String(row.price_field || "");

    if (/^cover price$/i.test(pf)) {
      coverPriceUsd = amt;
      continue;
    }
    if (/^top price paid$/i.test(pf)) {
      topPricePaidUsd = amt;
      continue;
    }

    const vy = pf.match(/value year \d+\s*\((\d{4})\)/i);
    if (vy) {
      const yr = Number(vy[1]);
      const g = normalizeObservationGrade(row.grade_label);
      if (!annualMap.has(yr)) annualMap.set(yr, { year: yr, amount: amt, grade: g });
      continue;
    }

    // Buy / Sell / Value rungs
    let role: "bid" | "fmv" | "ask" | null = null;
    let rawGrade = String(row.grade_label || "");
    if (/_buy$/i.test(pf) || /_BUY$/i.test(rawGrade)) {
      role = "bid";
      rawGrade = rawGrade.replace(/_BUY$/i, "");
    } else if (/_sell$/i.test(pf) || /_SELL$/i.test(rawGrade)) {
      role = "ask";
      rawGrade = rawGrade.replace(/_SELL$/i, "");
    } else if (/_value$/i.test(pf) || /^price$/i.test(pf) || /pricecharting|gpanalysis|heritage|artcurial|az auction|carlo bonte|millon|sotheby|christie|catawiki|abebooks|biblio|mycomicshop|fantagraphics|drawn|ebay|market|auction/i.test(pf)) {
      role = "fmv";
    }

    if (!role) continue;
    const grade = normalizeObservationGrade(rawGrade);
    if (!/^(?:RAW|[0-9]\.[0-9]|10\.0)$/i.test(grade)) continue;

    const isDirectMarketSource = /gpanalysis|heritage|artcurial|az auction|carlo bonte|millon|sotheby|christie|catawiki|abebooks|biblio|mycomicshop|fantagraphics|drawn|ebay|market|auction/i.test(pf);
    const sourceLabel = isDirectMarketSource
      ? pf
      : row.source_system === "COMICBASE"
      ? "ComicBase Catalog"
      : "Panel Profits Guide";

    const existing = rungMap.get(grade) ?? {
      grade,
      bid: null,
      fmv: null,
      ask: null,
      spreadUsd: null,
      spreadPct: null,
      source: sourceLabel,
    };

    if (role === "bid" && existing.bid == null) existing.bid = amt;
    if (role === "ask" && existing.ask == null) existing.ask = amt;
    if (role === "fmv" && (existing.fmv == null || amt > existing.fmv)) {
      existing.fmv = amt;
      existing.source = sourceLabel;
    }
    rungMap.set(grade, existing);
  }

  const gradeRank = (g: string) => (g === "RAW" ? -1 : parseFloat(g) || 0);
  const bidAskLadder = [...rungMap.values()]
    .map((r) => {
      if (r.bid != null && r.ask != null && r.ask > 0) {
        r.spreadUsd = Math.round((r.ask - r.bid) * 100) / 100;
        r.spreadPct = Math.round(((r.ask - r.bid) / r.ask) * 1000) / 10;
      }
      return r;
    })
    .sort((a, b) => gradeRank(b.grade) - gradeRank(a.grade));

  const annualSorted = [...annualMap.values()].sort((a, b) => a.year - b.year);
  const annualHistory: AnnualValuationPoint[] = annualSorted.map((pt, idx) => {
    const prev = idx > 0 ? annualSorted[idx - 1].amount : null;
    const yoyPct = prev && prev > 0 ? Math.round(((pt.amount - prev) / prev) * 1000) / 10 : null;
    return { ...pt, yoyPct };
  });

  const realizedVolAnnualized =
    annualHistory.length >= 3 ? realizedVolatility(annualHistory.map((p) => p.amount), 1) : null;
  const multiYearReturnPct =
    annualHistory.length >= 2 && annualHistory[0].amount > 0
      ? Math.round(((annualHistory[annualHistory.length - 1].amount - annualHistory[0].amount) / annualHistory[0].amount) * 1000) / 10
      : null;

  const withFmv = bidAskLadder.filter((r) => r.fmv != null);
  const highGrade = withFmv[0] ?? null;
  // Liquid Center = highest graded rung that has an active Bid/Ask pair (or middle graded rung)
  const liquidRung =
    bidAskLadder.find((r) => r.grade !== "RAW" && r.bid != null && r.ask != null && r.fmv != null) ??
    withFmv.find((r) => r.grade !== "RAW") ??
    highGrade;

  const spreads = bidAskLadder.map((r) => r.spreadPct).filter((x): x is number => x != null);
  const averageSpreadPct =
    spreads.length > 0 ? Math.round((spreads.reduce((s, x) => s + x, 0) / spreads.length) * 10) / 10 : null;

  // Derive live Cross-Asset Instruments mathematically from the comic's Liquid Center equity price!
  let derived: DerivedEquityInstruments | null = null;
  if (liquidRung?.fmv && liquidRung.fmv > 0) {
    const era = eraFromYear(year);
    const tier =
      censusTotal == null
        ? era === "GOLDEN"
          ? "legendary"
          : "rare"
        : censusTotal <= 25
        ? "mythic"
        : censusTotal <= 100
        ? "legendary"
        : censusTotal <= 500
        ? "rare"
        : "common";
    const floorSigma = GAME_DESIGN.sigmaFloorByTier[tier] ?? 0.14;
    const sigma = Math.min(0.65, Math.max(floorSigma, realizedVolAnnualized ?? floorSigma));
    const state: LiquidityState = GAME_DESIGN.stateByTier[tier] ?? "THIN";
    const root = `${series.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "EQT"}${issueNumber.replace(/[^0-9A-Za-z]/g, "")}`;
    const ch = buildOptionChainFromUnderlying(
      {
        id: `wiki:${root}`,
        root,
        price: liquidRung.fmv,
        sigma,
        state,
        underlyingClass: "EQUITY_LIQUID_CENTER",
        gradeBasis: liquidRung.grade === "RAW" ? "Raw / Ungraded" : `CGC ${liquidRung.grade} (Liquid Center)`,
      },
      nowMs,
      { includeQuarterlyAndLeaps: true },
    );
    const frontLegs = ch ? ch.legs.filter((l) => l.expiryDate === ch.frontExpiryDate) : [];
    const frontCall =
      frontLegs.find((l) => l.type === "CALL" && Math.abs(l.moneyness - 1) < 0.08) ??
      frontLegs.find((l) => l.type === "CALL") ??
      null;
    const frontPut =
      frontLegs.find((l) => l.type === "PUT" && Math.abs(l.moneyness - 1) < 0.08) ??
      frontLegs.find((l) => l.type === "PUT") ??
      null;

    const r6m = treasuryYield(0.5);
    const store = GAME_DESIGN.storageCostByEra[era];
    const conv = GAME_DESIGN.convenienceYieldByTier[tier] ?? 0.012;
    const future6M = futuresPrice(liquidRung.fmv, r6m, store, conv, 0.5);

    const sCredit = CREDIT_SPREAD_INSTITUTIONAL[era];
    const sLiq = bondLiquiditySpreadFor(state, 5);
    const coupon = treasuryYield(5) + sCredit;
    const yReq = requiredYield(5, sCredit, sLiq);
    const bondPx = liquidRung.fmv >= 2500 ? bondPrice(1000, coupon, yReq, 5) : null;

    derived = {
      anchorPrice: liquidRung.fmv,
      anchorGrade: liquidRung.grade === "RAW" ? "Raw" : `CGC ${liquidRung.grade}`,
      sigma,
      era,
      liquidityState: state,
      frontCall,
      frontPut,
      optionChain: ch,
      future6M: Math.round(future6M * 100) / 100,
      futureBasis: Math.round((future6M - liquidRung.fmv) * 100) / 100,
      institutionalBond5Y: bondPx != null ? { coupon, yReq, price: Math.round(bondPx * 100) / 100 } : null,
      vaultNftPrice: Math.round(nftPrice(liquidRung.fmv, state) * 100) / 100,
    };
  }

  return {
    bidAskLadder,
    annualHistory,
    coverPriceUsd,
    topPricePaidUsd,
    highGradeFmv: highGrade?.fmv ? { grade: highGrade.grade, amount: highGrade.fmv, source: highGrade.source } : null,
    liquidCenterFmv: liquidRung?.fmv ? { grade: liquidRung.grade, amount: liquidRung.fmv, source: liquidRung.source } : null,
    averageSpreadPct,
    realizedVolAnnualized,
    multiYearReturnPct,
    derived,
  };
}
