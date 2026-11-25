/**
 * Option chains: strikes × monthly 3rd-Friday expiries priced with Black–Scholes at a skewed,
 * term-structured σ_eff driven by underlying equity volatility + live entity-graph news shocks.
 *
 * Every option leg exposes:
 * - True OCC-style option string: <ROOT>-<YYMMDD><C|P><STRIKE>
 * - Exact 3rd-Friday monthly expiration date (calendar DTE & game turns)
 * - Explicit decomposition: Premium = Intrinsic Value + Time Value (Extrinsic)
 * - Full Greeks (delta, gamma, vega, thetaPerDay, rho) and open interest
 * - Anchored to Liquid Center Grade equities, canonical indices (CE70 / era / publisher), or derived assets
 */
import { GAME_DESIGN, OPTION, OPTION_CONTRACT_SIZE_Q, treasuryYield, type LiquidityState } from "./canon-params";
import { blackScholes, effectiveVolatility } from "./canon-formulas";
import type { Underlying } from "./underlyings";

export interface ThirdFridayExpiry {
  expiryDate: string; // YYYY-MM-DD (3rd Friday of month)
  occDate: string; // YYMMDD
  expiryDays: number; // calendar DTE
  turnsToExpiry: number; // game-turn horizon (1 turn = 1 trading day)
  T: number; // annualized time to expiry (expiryDays / 365)
}

/**
 * Computes the next `count` monthly 3rd-Friday expiration dates strictly at least `minDte` days ahead.
 * Standard equity options expire on the 3rd Friday of the expiration month.
 */
export function nextThirdFridays(nowMs: number = Date.now(), count: number = 3, minDte: number = 7): ThirdFridayExpiry[] {
  const out: ThirdFridayExpiry[] = [];
  const base = new Date(nowMs);
  let year = base.getUTCFullYear();
  let month = base.getUTCMonth(); // 0..11

  for (let guard = 0; guard < 18 && out.length < count; guard++) {
    // 1st day of (year, month) in UTC
    const first = new Date(Date.UTC(year, month, 1, 21, 0, 0)); // 4pm EST / 21:00 UTC expiry close
    const dow = first.getUTCDay(); // 0=Sun..5=Fri..6=Sat
    const firstFriday = 1 + ((5 - dow + 7) % 7);
    const thirdFridayDay = firstFriday + 14;
    const expiry = new Date(Date.UTC(year, month, thirdFridayDay, 21, 0, 0));
    const diffDays = Math.ceil((expiry.getTime() - nowMs) / 86_400_000);
    if (diffDays >= minDte) {
      const yyyy = String(expiry.getUTCFullYear());
      const mm = String(expiry.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(expiry.getUTCDate()).padStart(2, "0");
      const tradingTurns = Math.max(1, Math.round((diffDays * 252) / 365));
      out.push({
        expiryDate: `${yyyy}-${mm}-${dd}`,
        occDate: `${yyyy.slice(2)}${mm}${dd}`,
        expiryDays: diffDays,
        turnsToExpiry: tradingTurns,
        T: diffDays / 365,
      });
    }
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return out;
}

/** Formats a canonical OCC-style option string: ROOT-YYMMDD{C|P}STRIKE */
export function formatOptionSymbol(root: string, occDate: string, type: "CALL" | "PUT", strike: number): string {
  const cleanRoot = root.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
  const strikeStr = strike >= 1000 ? String(Math.round(strike)) : strike >= 10 ? String(Math.round(strike)) : strike.toFixed(1);
  return `${cleanRoot}-${occDate}${type === "CALL" ? "C" : "P"}${strikeStr}`;
}

/** Rounds strikes to realistic option-ladder increments based on underlying price. */
export function roundStrike(price: number): number {
  if (price >= 10_000) return Math.max(100, Math.round(price / 250) * 250);
  if (price >= 1_000) return Math.max(25, Math.round(price / 50) * 50);
  if (price >= 200) return Math.max(5, Math.round(price / 10) * 10);
  if (price >= 50) return Math.max(2.5, Math.round(price / 5) * 5);
  if (price >= 10) return Math.max(1, Math.round(price));
  return Math.max(0.5, Math.round(price * 2) / 2);
}

/** Infers the Liquid Center Grade for an equity based on era & price source (deepest active census grade). */
export function liquidCenterGradeFor(u: Pick<Underlying, "era" | "priceSource">): string {
  if (u.priceSource === "pricecharting") return "9.8 (Liquid Center)";
  switch (u.era) {
    case "GOLDEN":
      return "6.0–7.5 (Liquid Center)";
    case "SILVER":
      return "8.0–8.5 (Liquid Center)";
    case "EARLY_BRONZE":
      return "9.0–9.2 (Liquid Center)";
    case "LATE_BRONZE_COPPER":
      return "9.4–9.6 (Liquid Center)";
    default:
      return "9.8 (Liquid Center)";
  }
}

export interface ChainLeg {
  optionSymbol: string;
  type: "CALL" | "PUT";
  expiryDate: string; // YYYY-MM-DD (3rd Friday)
  expiryDays: number;
  turnsToExpiry: number;
  T: number;
  moneyness: number;
  strike: number;
  iv: number;
  /** Per-unit option premium (quoted per 1 equity/index/asset share) */
  premium: number;
  /** Intrinsic value: max(0, S - K) for CALL, max(0, K - S) for PUT */
  intrinsicValue: number;
  /** Time (extrinsic) value: max(0, premium - intrinsicValue) */
  timeValue: number;
  /** Full institutional contract notional premium (× Q) */
  contractPremium: number;
  delta: number;
  gamma: number;
  vega: number;
  thetaPerDay: number;
  rho: number;
  openInterest: number;
}

export interface OptionChain {
  underlyingId: string;
  underlyingRoot: string;
  underlyingClass: "EQUITY_LIQUID_CENTER" | "INDEX" | "DERIVED_ASSET";
  gradeBasis: string;
  S: number;
  atmIv30: number;
  frontExpiryDate: string;
  frontExpiryDays: number;
  legs: ChainLeg[];
  openInterestCalls: number;
  openInterestPuts: number;
  putCallRatio: number | null;
}

export function skewedSigma(sigmaEff: number, moneyness: number, expiryDays: number): number {
  const lm = Math.log(Math.max(0.25, moneyness));
  const t0 = GAME_DESIGN.chainExpiryDays[0];
  const factor =
    1 +
    GAME_DESIGN.skewSlope * lm +
    GAME_DESIGN.smileCurve * lm * lm +
    GAME_DESIGN.termSlope * Math.log(Math.max(1, expiryDays) / t0);
  return sigmaEff * Math.max(0.5, factor);
}

export function openInterest(u: Pick<Underlying, "state">, moneyness: number, expiryDays: number): number {
  const w = GAME_DESIGN.openInterestKernelWidth;
  const lm = Math.log(Math.max(0.25, moneyness));
  const kernel = Math.exp(-(lm * lm) / (2 * w * w));
  const decay = GAME_DESIGN.chainExpiryDays[0] / Math.max(7, expiryDays);
  return Math.round(
    GAME_DESIGN.openInterestBase * GAME_DESIGN.openInterestStateFactor[u.state] * kernel * (0.5 + 0.5 * decay),
  );
}

export interface SyntheticChainUnderlying {
  id: string;
  root: string;
  price: number;
  sigma: number;
  state: LiquidityState;
  underlyingClass: "EQUITY_LIQUID_CENTER" | "INDEX" | "DERIVED_ASSET";
  gradeBasis: string;
}

/**
 * Core option-chain builder for any equity, index, or derived asset underlying.
 * Uses 3rd-Friday monthly expiries, Black–Scholes with skewed IV, and explicit intrinsic/time split.
 */
export function buildOptionChainFromUnderlying(
  u: SyntheticChainUnderlying,
  nowMs: number = Date.now(),
): OptionChain | null {
  if (!(u.price > 0) || !(u.sigma > 0)) return null;
  if (OPTION.gates.disallowStates.includes(u.state)) return null;
  const cappedSigma = Math.min(u.sigma, 1.2);
  const sigmaEff = effectiveVolatility(cappedSigma, u.state);
  const expiries = nextThirdFridays(nowMs, 3, 7);
  if (expiries.length === 0) return null;

  const legs: ChainLeg[] = [];
  let oiC = 0;
  let oiP = 0;
  let atmFront = sigmaEff;

  for (let ei = 0; ei < expiries.length; ei++) {
    const exp = expiries[ei];
    const r = treasuryYield(exp.T);
    const seenStrikes = new Set<number>();

    for (const m of GAME_DESIGN.chainMoneyness) {
      const K = roundStrike(u.price * m);
      if (seenStrikes.has(K)) continue;
      seenStrikes.add(K);

      const actualMoneyness = K / u.price;
      const iv = skewedSigma(sigmaEff, actualMoneyness, exp.expiryDays);
      const bs = blackScholes(u.price, K, exp.T, r, iv);
      if (!bs) continue;

      if (ei === 0 && Math.abs(m - 1) < 0.01) atmFront = iv;
      const oi = openInterest(u, actualMoneyness, exp.expiryDays);

      const mk = (type: "CALL" | "PUT"): ChainLeg => {
        const call = type === "CALL";
        const prem = call ? bs.call : bs.put;
        const intrinsic = call ? Math.max(0, u.price - K) : Math.max(0, K - u.price);
        const timeVal = Math.max(0, prem - intrinsic);
        return {
          optionSymbol: formatOptionSymbol(u.root, exp.occDate, type, K),
          type,
          expiryDate: exp.expiryDate,
          expiryDays: exp.expiryDays,
          turnsToExpiry: exp.turnsToExpiry,
          T: exp.T,
          moneyness: actualMoneyness,
          strike: K,
          iv,
          premium: prem,
          intrinsicValue: intrinsic,
          timeValue: timeVal,
          contractPremium: prem * OPTION_CONTRACT_SIZE_Q,
          delta: call ? bs.callDelta : bs.putDelta,
          gamma: bs.gamma,
          vega: bs.vega / 100,
          thetaPerDay: (call ? bs.callTheta : bs.putTheta) / 365,
          rho: (call ? bs.callRho : bs.putRho) / 100,
          openInterest: Math.round(oi * (call ? (K >= u.price ? 1 : 0.6) : K <= u.price ? 1 : 0.6)),
        };
      };

      const c = mk("CALL");
      const p = mk("PUT");
      oiC += c.openInterest;
      oiP += p.openInterest;
      legs.push(c, p);
    }
  }

  if (legs.length === 0) return null;
  return {
    underlyingId: u.id,
    underlyingRoot: u.root,
    underlyingClass: u.underlyingClass,
    gradeBasis: u.gradeBasis,
    S: u.price,
    atmIv30: atmFront,
    frontExpiryDate: expiries[0].expiryDate,
    frontExpiryDays: expiries[0].expiryDays,
    legs,
    openInterestCalls: oiC,
    openInterestPuts: oiP,
    putCallRatio: oiC > 0 ? oiP / oiC : null,
  };
}

/**
 * Builds an option chain for a Liquid-Center atomic equity underlying.
 */
export function buildChain(u: Underlying, nowMs: number = Date.now()): OptionChain | null {
  if (OPTION.gates.disallowStates.includes(u.state) || u.sigma > OPTION.gates.aveVolatilityMax) return null;
  const seriesPart = (u.series || u.id || "OPT").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "OPT";
  const issuePart = (u.issueNumber || "").replace(/[^0-9A-Za-z]/g, "");
  const root = `${seriesPart}${issuePart}`;
  return buildOptionChainFromUnderlying(
    {
      id: u.id,
      root,
      price: u.price,
      sigma: u.sigma,
      state: u.state,
      underlyingClass: "EQUITY_LIQUID_CENTER",
      gradeBasis: liquidCenterGradeFor(u),
    },
    nowMs,
  );
}
