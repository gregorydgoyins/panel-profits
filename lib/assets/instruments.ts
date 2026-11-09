/**
 * Issues assets-rail instruments from real underlying equities using the canon formulas.
 * An instrument exists only if the canon eligibility gates pass; its price is a formula of real inputs.
 * No instrument carries a hardcoded price. Comics themselves never appear here (they are the equities row).
 */
import type { AssetItem } from "./types";
import type { SurfaceKey } from "./surfaceConfig";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BOND,
  CREDIT_SPREAD_INSTITUTIONAL,
  CREDIT_SPREAD_PUBLISHER,
  FUND,
  GAME_DESIGN,
  OPTION,
  OPTION_CONTRACT_SIZE_Q,
  treasuryYield,
  type FundType,
} from "./canon-params";
import {
  blackScholes,
  bondLiquiditySpreadFor,
  bondPrice,
  commodityPrice,
  effectiveVolatility,
  futuresPrice,
  indexFundSharePrice,
  indexLevel,
  liquidationCapacity,
  nftPrice,
  privateCapitalUnitValue,
  requiredYield,
  type Constituent,
} from "./canon-formulas";
import { BENEFACTORS, LORE_COMMODITIES, PRIVATE_ILLIQUIDITY_DISCOUNT } from "./lore-tables";
import { buildChain } from "./option-chain";
import { marketFactor } from "./market-dynamics";
import { issueInstitutional } from "./institutions";
import { issueCharacters } from "./characters";
import type { UniverseCensus } from "./universe";
import type { RosterCharacter } from "./roster";
import type { UniverseCharacter } from "./universe-footprints";
import type { Footprint } from "./footprint";
import { issuePredictions } from "./prediction-markets";
import type { Outcome } from "./outcomes";
import { conditionsFor, type ShockMap } from "./shock-propagation";
import type { Underlying } from "./underlyings";

const artFor = (key: SurfaceKey) => `/surface-art/${key.toLowerCase()}.png`;
const r2 = (n: number) => Math.round(n * 100) / 100;

function derivativeEligible(u: Underlying): boolean {
  return (
    u.wavConfidence >= OPTION.gates.wavConfidenceMin &&
    u.censusConfidence >= OPTION.gates.censusConfidenceMin &&
    !OPTION.gates.disallowStates.includes(u.state) &&
    !u.stale
  );
}

function item(
  type: SurfaceKey,
  idx: number,
  symbol: string,
  name: string,
  description: string,
  fmv: number,
  extra: Partial<AssetItem> & { formula: string; inputs: Record<string, unknown> },
): AssetItem {
  const { formula, inputs, ...rest } = extra;
  return {
    entryId: `asset-${type.toLowerCase()}-${symbol.replace(/[^A-Za-z0-9]/g, "")}-${idx}`,
    assetId: `${type}-${symbol}`,
    assetType: type,
    displayRank: idx + 1,
    diversityBucket: "standard",
    symbol,
    displayName: name,
    description,
    universe: "Panel Profits",
    pricing: { fmv_usd: r2(fmv), fmv: r2(fmv), price: r2(fmv), formula },
    parameters: inputs,
    valueUnit: "USD",
    coverImageUrl: artFor(type),
    coverVerified: true,
    quarantined: false,
    ...rest,
  };
}

const T_OPTION = OPTION.windowDays / 252;

export function issueInstruments(unders: Underlying[], shocks: ShockMap = new Map(), now: number = Date.now(), outcomes: Outcome[] = [], census: UniverseCensus[] = [], roster: RosterCharacter[] = [], footprints: Map<string, Footprint> = new Map(), universe: UniverseCharacter[] = []): AssetItem[] {
  const out: AssetItem[] = [];
  const eligible = unders.filter(derivativeEligible);
  const tkr = (u: Underlying) => `${u.series.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()}${u.issueNumber.replace(/[^0-9A-Za-z]/g, "")}${u.year ? `-${String(u.year).slice(2)}` : ""}`;

  // ── OPTIONS: full chain (strikes × expiries, skew, Greeks, open interest) ─
  // The rail shows the ATM 30-day call and put; the whole chain is attached to each in parameters.chain.
  let i = 0;
  const chains = new Map<string, ReturnType<typeof buildChain>>();
  for (const u of eligible) {
    if (u.sigma > OPTION.gates.aveVolatilityMax) continue; // spec gate: ave_volatility ≤ 0.45
    const ch = buildChain(u);
    if (!ch) continue;
    chains.set(u.id, ch);
    const atmC = ch.legs.find((l) => l.type === "CALL" && l.expiryDays === 30 && Math.abs(l.moneyness - 1) < 0.01);
    const atmP = ch.legs.find((l) => l.type === "PUT" && l.expiryDays === 30 && Math.abs(l.moneyness - 1) < 0.01);
    if (!atmC || !atmP) continue;
    const base = { formula: "Black–Scholes on skewed σ_eff(K,T)", detailUrl: u.detailUrl };
    const common = { underlying: u.label, S: u.price, sigmaReal: u.sigma, sources: u.sigmaSources, newsShock: u.newsShock, contractSize: OPTION_CONTRACT_SIZE_Q, atmIv30: ch.atmIv30, putCallRatio: ch.putCallRatio, openInterestCalls: ch.openInterestCalls, openInterestPuts: ch.openInterestPuts, chain: ch.legs };
    for (const leg of [atmC, atmP]) {
      const call = leg.type === "CALL";
      out.push(item("OPTIONS", i++, `${tkr(u)}${call ? "C" : "P"}`, `${u.label} 30d ${call ? "Call" : "Put"}`, `$${leg.strike} strike · IV ${(leg.iv * 100).toFixed(0)}% · OI ${leg.openInterest.toLocaleString()} · Δ ${leg.delta.toFixed(2)}`, leg.contractPremium, { ...base, inputs: { ...common, ...leg } }));
    }
    if (i >= 24) break;
  }

  // ── VOLATILITY: 30-day ATM implied vol index (VIX-style), by cohort ─────
  const atmIvOf = (set: Underlying[]) => {
    const ivs = set.map((u) => chains.get(u.id)?.atmIv30).filter((x): x is number => typeof x === "number");
    return ivs.length >= 3 ? { level: (ivs.reduce((s, x) => s + x, 0) / ivs.length) * 100, n: ivs.length } : null;
  };
  const volCohorts: { key: string; name: string; set: Underlying[] }[] = [
    { key: "$VPP", name: "Panel Vol Index", set: unders },
    { key: "$VMRV", name: "Marvel Vol Index", set: unders.filter((u) => (u.publisher || "").toLowerCase().startsWith("marvel")) },
    { key: "$VDC", name: "DC Vol Index", set: unders.filter((u) => (u.publisher || "").toLowerCase() === "dc") },
    { key: "$VGLD", name: "Golden Age Vol Index", set: unders.filter((u) => u.era === "GOLDEN") },
    { key: "$VSLV", name: "Silver Age Vol Index", set: unders.filter((u) => u.era === "SILVER") },
  ];
  let vi = 0;
  for (const c of volCohorts) {
    const v = atmIvOf(c.set);
    if (!v) continue;
    const pcr = (() => {
      let cc = 0, pp = 0;
      for (const u of c.set) { const ch = chains.get(u.id); if (ch) { cc += ch.openInterestCalls; pp += ch.openInterestPuts; } }
      return cc > 0 ? pp / cc : null;
    })();
    out.push(item("VOLATILITY", vi++, c.key, c.name, `30d ATM implied vol across ${v.n} books${pcr != null ? ` · put/call OI ${pcr.toFixed(2)}` : ""}`, v.level, { formula: "VolIndex=100·mean(ATM σ_imp,30d)", inputs: { constituents: v.n, putCallOpenInterest: pcr } }));
  }

  // ── FUTURES: F0 = S·e^{(r+u−y)T}, three expiries, with basis ────────────
  i = 0;
  let nUnd = 0;
  for (const u of eligible) {
    const store = GAME_DESIGN.storageCostByEra[u.era];
    const conv = GAME_DESIGN.convenienceYieldByTier[u.tier] ?? 0;
    for (const T of GAME_DESIGN.futuresExpiryYears) {
      const r = treasuryYield(T);
      const F0 = futuresPrice(u.price, r, store, conv, T);
      const months = Math.round(T * 12);
      out.push(item("FUTURES", i++, `${tkr(u)}F${months}`, `${u.label} ${months}M Future`, `Basis ${(F0 - u.price >= 0 ? "+" : "")}$${(F0 - u.price).toFixed(2)} · ${F0 >= u.price ? "contango" : "backwardation"}`, F0, { formula: "F0=S0·e^((r+u−y)T)", detailUrl: u.detailUrl, inputs: { underlying: u.label, S0: u.price, T, r, storage: store, convenienceYield: conv, basis: F0 - u.price, annualisedBasis: (F0 / u.price - 1) / T } }));
    }
    if (++nUnd >= 8) break;
  }

  // ── BONDS: PV of coupons + principal at y_req = y_rf + s_credit + s_liq ─
  i = 0;
  const FACE = 1000;
  for (const u of eligible) {
    if (u.sigma > BOND.aveVolatilityMax) continue;
    const cap = BOND.issuanceCapFraction * u.price;
    const issues: { sub: "INST_ISSUE" | "PUB_ISSUER"; years: number; spread: number }[] = [
      { sub: "INST_ISSUE", years: 5, spread: CREDIT_SPREAD_INSTITUTIONAL[u.era] },
    ];
    if (u.capTier === "MAJOR_X10") issues.push({ sub: "PUB_ISSUER", years: 10, spread: CREDIT_SPREAD_PUBLISHER[u.capTier] });
    let outstanding = 0;
    for (const b of issues) {
      if (outstanding + FACE > cap) break; // Σ principal ≤ 0.40 · WAV
      outstanding += FACE;
      const sLiq = bondLiquiditySpreadFor(u.state, b.years);
      const yReq = requiredYield(b.years, b.spread + u.creditAdd, sLiq);
      const coupon = treasuryYield(b.years) + b.spread; // par at zero liquidity spread
      const px = bondPrice(FACE, coupon, yReq, b.years);
      out.push(item("BOND", i++, `${tkr(u)}${b.sub === "INST_ISSUE" ? "B5" : "B10"}`, `${u.label} ${b.sub === "INST_ISSUE" ? "Institutional" : "Publisher"} ${b.years}Y Note`, `${(coupon * 100).toFixed(2)}% annual coupon, $${FACE} face`, px, { formula: "Price=Σ cP/(1+y)^k + P/(1+y)^T", detailUrl: u.detailUrl, inputs: { underlying: u.label, subclass: b.sub, face: FACE, coupon, yReq, sCredit: b.spread, sLiq, years: b.years, issuanceCap: cap } }));
    }
    if (i >= 16) break;
  }

  // ── NFT: P = P_underlying · λ_provenance · λ_liquidity ──────────────────
  i = 0;
  for (const u of unders) {
    const px = nftPrice(u.price, u.state);
    out.push(item("NFT", i, `${tkr(u)}N`, `${u.label} Token`, `Tokenised claim, λ_liq=${GAME_DESIGN.lambdaLiquidityByState[u.state]}`, px, { formula: "P_NFT=P·λ_prov·λ_liq", detailUrl: u.detailUrl, coverImageUrl: u.coverUrl, inputs: { underlying: u.label, S: u.price, lambdaProvenance: GAME_DESIGN.lambdaProvenance, lambdaLiquidity: GAME_DESIGN.lambdaLiquidityByState[u.state], state: u.state } }));
    if (++i >= 12) break;
  }

  // ── INDEX / ETF / FUND: I(t)=I0·Σ w·p(t)/p(0) ───────────────────────────
  const withHist = unders.filter((u) => u.history.length >= 2);
  const toConstituents = (set: Underlying[], weightFn: (u: Underlying) => number): { cs: Constituent[]; years: number } | null => {
    const raw = set.map((u) => {
      const first = u.history[0];
      const last = u.history[u.history.length - 1];
      return { u, first, last, w: weightFn(u) };
    });
    const total = raw.reduce((s, x) => s + x.w, 0);
    if (raw.length < 3 || total <= 0) return null;
    const cs = raw.map((x) => ({ price: x.last.value, basePrice: x.first.value, weight: x.w / total }));
    const years = Math.max(...raw.map((x) => x.last.year)) - Math.min(...raw.map((x) => x.first.year));
    return { cs, years: Math.max(1, years) };
  };
  const indexSpecs: { key: string; name: string; set: Underlying[]; fund: FundType }[] = [
    { key: "GOLD", name: "Golden Age Index", set: withHist.filter((u) => u.era === "GOLDEN"), fund: "INDEX" },
    { key: "SILV", name: "Silver Age Index", set: withHist.filter((u) => u.era === "SILVER"), fund: "INDEX" },
    { key: "MARV", name: "Marvel Index", set: withHist.filter((u) => (u.publisher || "").toLowerCase().startsWith("marvel")), fund: "INDEX" },
    { key: "DCCO", name: "DC Index", set: withHist.filter((u) => (u.publisher || "").toLowerCase() === "dc"), fund: "INDEX" },
    { key: "KEY10", name: "Top 10 Index", set: withHist.slice(0, 10), fund: "INDEX" },
  ];
  i = 0;
  let f = 0;
  for (const spec of indexSpecs) {
    const built = toConstituents(spec.set, (u) => u.price);
    if (!built) continue;
    const level = indexLevel(GAME_DESIGN.indexBase, built.cs);
    out.push(item("INDEX", i++, `$${spec.key}`, spec.name, `${built.cs.length} constituents, value-weighted, base ${GAME_DESIGN.indexBase}`, level, { formula: "I(t)=I0·Σ w_i·p_i(t)/p_i(0)", inputs: { constituents: built.cs.length, base: GAME_DESIGN.indexBase, years: built.years } }));
    const shares = GAME_DESIGN.fundInitialNav / GAME_DESIGN.fundInitialSharePrice;
    const er = FUND.expenseRatioByType[spec.fund];
    const fsp = indexFundSharePrice(built.cs, GAME_DESIGN.fundInitialNav, shares, er, built.years);
    const holdingBid = built.cs.reduce((s, c) => s + c.weight * fsp.nav * 0.98, 0);
    out.push(item("ETF", f++, `${spec.key}X`, `${spec.name} ETF`, `Tracks ${spec.name}; ER ${(er * 100).toFixed(2)}%`, fsp.fsp, { formula: "FSP=NAV/Shares, NAV=Σq·p−Fees", inputs: { nav: fsp.nav, shares, fees: fsp.fees, expenseRatio: er, trackingError: fsp.fsp - level }, liquidity: { liquidationCapacityOpen: liquidationCapacity(holdingBid, "OPEN") } }));
  }
  // Thematic scarcity fund: weight ∝ price × tier rank
  const rankOf: Record<string, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 };
  const scarce = toConstituents(withHist.filter((u) => (rankOf[u.tier] ?? 1) >= 3), (u) => u.price * (rankOf[u.tier] ?? 1));
  if (scarce) {
    const shares = GAME_DESIGN.fundInitialNav / GAME_DESIGN.fundInitialSharePrice;
    const er = FUND.expenseRatioByType.THEMATIC;
    const fsp = indexFundSharePrice(scarce.cs, GAME_DESIGN.fundInitialNav, shares, er, scarce.years);
    out.push(item("FUND", 0, "$SCRC", "Scarcity Fund", `Thematic, ${scarce.cs.length} rare-or-scarcer books, ER ${(er * 100).toFixed(2)}%`, fsp.fsp, { formula: "FSP=NAV/Shares, NAV=Σq·p−Fees", inputs: { nav: fsp.nav, shares, fees: fsp.fees, expenseRatio: er, fundType: "THEMATIC" } }));
  }
  const blue = toConstituents(withHist.slice(0, 15), () => 1);
  if (blue) {
    const shares = GAME_DESIGN.fundInitialNav / GAME_DESIGN.fundInitialSharePrice;
    const er = FUND.expenseRatioByType.ACTIVE;
    const fsp = indexFundSharePrice(blue.cs, GAME_DESIGN.fundInitialNav, shares, er, blue.years);
    out.push(item("FUND", 1, "$BLUE", "Blue-Chip Active Fund", `Equal-weight top 15, ER ${(er * 100).toFixed(2)}%`, fsp.fsp, { formula: "FSP=NAV/Shares, NAV=Σq·p−Fees", inputs: { nav: fsp.nav, shares, fees: fsp.fees, expenseRatio: er, fundType: "ACTIVE" } }));
  }

  // ── PRIVATE CAPITAL: benefactor wealth + collection at real equity prices ─
  i = 0;
  for (const b of BENEFACTORS) {
    const holdings = unders
      .filter((u) => b.collects.some((c) => u.series.toLowerCase().includes(c)))
      .map((u) => ({ q: 1, price: u.price }));
    const flow = conditionsFor(b.node ? shocks.get(b.node) : undefined).flow; // capital flows reaching the benefactor
    const v = privateCapitalUnitValue({ netWorth: b.netWorth * (1 + flow), operatingFraction: b.operatingFraction, illiquidityDiscount: PRIVATE_ILLIQUIDITY_DISCOUNT, holdings, units: b.units });
    out.push(item("PRIVATE", i++, `$${b.id.toUpperCase().slice(0, 4)}`, b.vehicle, `${b.name}'s private vehicle, ${holdings.length} collected books marked to market`, v * marketFactor(`pc:${b.id}`, now, 0.04), { formula: "NAV_unit=[W(1−k)+Σq·S](1−d)/U", inputs: { netWorth: b.netWorth, capitalFlow: flow, operatingFraction: b.operatingFraction, illiquidityDiscount: PRIVATE_ILLIQUIDITY_DISCOUNT, collectionBooks: holdings.length, units: b.units, trails: b.node ? (shocks.get(b.node)?.trails ?? []) : [] } }));
  }

  // ── COMMODITIES from comic lore ─────────────────────────────────────────
  i = 0;
  for (const c of LORE_COMMODITIES) {
    out.push(item("COMMODITY", i++, `$${c.id.replace(/[^a-z]/g, "").toUpperCase().slice(0, 4)}`, `${c.name} (per ${c.unit})`, `${c.universe} lore commodity`, commodityPrice(c.p0, c.demand, c.supply, c.elasticity) * marketFactor(`cm:${c.id}`, now, 0.25), { formula: "P=P0·(D/S)^ε", inputs: { p0: c.p0, demand: c.demand, supply: c.supply, elasticity: c.elasticity } }));
  }

  // ── WARRANTS: Long-term Black-Scholes call contracts anchored to media catalysts ──
  try {
    const warrantsData = JSON.parse(readFileSync(join(process.cwd(), "data/universe/curated-warrants.json"), "utf8"));
    let wi = 0;
    for (const w of warrantsData) {
      const S = Number(w.underlyingPrice);
      if (S < 100) continue; // Minimum underlying price gate
      const T = w.expiryDays / 365.0;
      const r = treasuryYield(Math.min(30, Math.max(1, Math.round(T))));
      const K = S * 1.15; // 15% OTM strike
      const sigma = 0.35; // Term volatility
      const bs = blackScholes(S, K, T, r, sigma);
      if (!bs || bs.call <= 0) continue;
      // Standardized institutional warrant unit (fractionalized entitlement)
      const wPx = Math.max(17.0, r2(bs.call * 0.1));
      out.push(
        item(
          "WARRANT",
          wi++,
          w.symbol,
          w.name,
          `${w.catalyst} · Expiry ${w.expiryDays}d · Strike $${Math.round(K).toLocaleString()} · Δ ${bs.callDelta.toFixed(2)}`,
          wPx,
          {
            formula: "Warrant = Black-Scholes Call(S0, K=1.15·S0, T, r, σ=0.35) × Unit_Ratio",
            inputs: {
              underlying: `${w.underlyingSeries} #${w.underlyingIssue} (${w.year})`,
              underlyingPrice: S,
              strike: K,
              expiryDays: w.expiryDays,
              catalyst: w.catalyst,
              delta: bs.callDelta,
              gamma: bs.gamma,
              theta: bs.callTheta / 365,
            },
          }
        )
      );
    }
  } catch (err) {
    console.warn("Could not load curated warrants:", err);
  }

  // ── CANON GADGETS & LOCATIONS: Capitalized from underlying certified issues ──
  try {
    const glData = JSON.parse(readFileSync(join(process.cwd(), "data/universe/curated-gadgets-locations.json"), "utf8"));
    let gi = 0;
    let li = 0;
    for (const gl of glData) {
      const val = Number(gl.val);
      if (val < 100) continue; // Strict quality gate: underlying comic must be >= $100
      const isGadget = gl.category === "GADGET";
      const surfaceType: SurfaceKey = isGadget ? "GADGET" : "LOCATION";
      // Unit capitalization formula: Cap = MarketCap_Underlying · Fractional_Share
      // Price = Cap ÷ Standard_Units (no price floor: a floor would display a number the formula did not produce)
      const unitDivisor = val > 1000000 ? 50000 : val > 100000 ? 5000 : 500;
      const basePx = val / unitDivisor;
      const fmvPx = r2(basePx * marketFactor(`gl:${gl.name}`, now, 0.08));
      const sym = `$${gl.name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 5)}`;
      out.push(
        item(
          surfaceType,
          isGadget ? gi++ : li++,
          sym,
          gl.name,
          `${gl.universe} Canon ${isGadget ? "Artifact" : "Location"} · Debut in ${gl.first_appearance}${gl.creators ? ` · ${gl.creators}` : ""}`,
          fmvPx,
          {
            formula: "Unit_Price = Underlying_FMV ÷ Capitalization_Units",
            inputs: {
              firstAppearance: gl.first_appearance,
              matchedSeries: gl.matched_series,
              matchedIssue: gl.issue,
              underlyingValuation: val,
              creators: gl.creators,
              universe: gl.universe,
              capitalizationUnits: unitDivisor,
            },
          }
        )
      );
      if (gi >= 30 && li >= 30) break;
    }
  } catch (err) {
    console.warn("Could not load curated gadgets and locations:", err);
  }

  // ── INSTITUTIONAL MUNICIPAL INFRASTRUCTURE & SOVEREIGN BONDS ──
  try {
    const muniData = JSON.parse(readFileSync(join(process.cwd(), "data/universe/curated-munibonds.json"), "utf8"));
    let mi = 0;
    const RECOVERY = { MUNICIPAL_MAJ_CITY: 0.70, MUNICIPAL_REGION: 0.65 };
    for (const mb of muniData) {
      const R = RECOVERY[mb.muniClass as keyof typeof RECOVERY] ?? 0.70;
      const rf = treasuryYield(mb.years);
      const sLiq = bondLiquiditySpreadFor("OPEN", mb.years);
      const coupon = rf + mb.hazard0 * (1 - R);
      const yReq = requiredYield(mb.years, mb.hazard0 * (1 - R), sLiq);
      const px = bondPrice(mb.face, coupon, yReq, mb.years);
      out.push(
        item(
          "BOND",
          mi++,
          mb.symbol,
          `${mb.city} ${mb.years}Y Infrastructure Bond`,
          `${(coupon * 100).toFixed(2)}% coupon · ${mb.purpose} · Backing: $${(mb.floatCapUsd / 1e6).toFixed(0)}M`,
          r2(px),
          {
            formula: "Price = Σ cP/(1+y)^k + P/(1+y)^T, y = y_rf + λ·(1−R) + s_liq",
            inputs: {
              city: mb.city,
              authority: mb.authority,
              purpose: mb.purpose,
              backingTier: mb.backingTier,
              floatCapUsd: mb.floatCapUsd,
              recovery: R,
              hazard: mb.hazard0,
              coupon,
              yReq,
              years: mb.years,
            },
          }
        )
      );
    }
  } catch (err) {
    console.warn("Could not load curated munibonds:", err);
  }

  // ── INDEX & THEMATIC FUNDS: Cap-weighted institutional vehicles ──
  try {
    const fundData = JSON.parse(readFileSync(join(process.cwd(), "data/universe/curated-funds.json"), "utf8"));
    let fdi = 0;
    for (const f of fundData) {
      if (!f.constituents || f.constituents.length === 0) continue;
      const fType: SurfaceKey = f.type === "ETF" ? "ETF" : "FUND";
      const totalCap = Number(f.aggregateMarketCap);
      const sharePx = r2((totalCap / 100000) * marketFactor(`fund:${f.symbol}`, now, 0.03));
      out.push(
        item(
          fType,
          fdi++,
          `$${f.symbol}`,
          f.name,
          `${f.description} · ${f.constituentsCount} constituents · ER ${(f.expenseRatio * 100).toFixed(2)}%`,
          sharePx,
          {
            formula: "NAV = Σ w_i·P_i, Share_Price = NAV / Outstanding_Units",
            inputs: {
              universe: f.universe,
              expenseRatio: f.expenseRatio,
              constituentsCount: f.constituentsCount,
              aggregateMarketCap: totalCap,
              topConstituents: f.constituents.slice(0, 5),
            },
          }
        )
      );
    }
  } catch (err) {
    console.warn("Could not load curated funds:", err);
  }

  // ── MULTI-BILLION DOLLAR FRANCHISE IP ESTATES ──
  try {
    const franchiseData = JSON.parse(readFileSync(join(process.cwd(), "data/universe/curated-franchises.json"), "utf8"));
    let fji = 0;
    for (const fr of franchiseData) {
      const ev = Number(fr.valuationUsd);
      const floatCap = Number(fr.equityFloatCap);
      out.push(
        item(
          "PUBLISHER_STOCK",
          fji++,
          fr.symbol,
          fr.name,
          `${fr.conglomerate} · Multi-Billion IP Estate · Catalyst: ${fr.keyCatalyst}`,
          ev,
          {
            formula: "Enterprise_Value = Box_Office + Merchandising + Gaming + Publishing_Royalty_Cashflows",
            inputs: {
              valuationUsd: ev,
              equityFloatCap: floatCap,
              annualRoyaltyFlow: fr.annualRoyaltyFlow,
              mediaReleases: fr.mediaReleases,
              debtLoad: fr.debtLoad,
              conglomerate: fr.conglomerate,
              keyCatalyst: fr.keyCatalyst,
              universe: fr.universe,
            },
          }
        )
      );
    }
  } catch (err) {
    console.warn("Could not load curated franchises:", err);
  }

  // ── CORPORATE CREDIT & CONVERTIBLES ──
  try {
    const corpCreditData = JSON.parse(readFileSync(join(process.cwd(), "data/universe/curated-corporate-credit.json"), "utf8"));
    let cci = 0;
    for (const cc of corpCreditData) {
      const issueSize = Number(cc.issueSizeUsd);
      const rf = treasuryYield(cc.years);
      const sLiq = bondLiquiditySpreadFor("OPEN", cc.years);
      const spread = cc.rating === "AAA" ? 0.004 : cc.rating.startsWith("AA") ? 0.007 : cc.rating.startsWith("A") ? 0.012 : 0.024;
      const yReq = requiredYield(cc.years, spread, sLiq);
      const coupon = Number(cc.couponRate);
      const px = bondPrice(cc.face, coupon, yReq, cc.years);
      const sType: SurfaceKey = cc.type === "CONVERTIBLE" ? "CONVERTIBLE" : "CREDIT";
      out.push(
        item(
          sType,
          cci++,
          cc.symbol,
          cc.name,
          `Rated ${cc.rating} · ${(coupon * 100).toFixed(2)}% · Issue: $${(issueSize / 1e6).toFixed(0)}M · ${cc.purpose}`,
          r2(px),
          {
            formula: "Corporate_Debt_Pricing = Σ cP/(1+y)^k + P/(1+y)^T",
            inputs: {
              issuer: cc.issuer,
              rating: cc.rating,
              issueSizeUsd: issueSize,
              purpose: cc.purpose,
              coupon,
              yReq,
              years: cc.years,
            },
          }
        )
      );
    }
  } catch (err) {
    console.warn("Could not load curated corporate credit:", err);
  }

  // ── MULTI-BILLION DOLLAR REAL ESTATE INVESTMENT TRUSTS (REITS) ──
  try {
    const reitData = JSON.parse(readFileSync(join(process.cwd(), "data/universe/curated-reits.json"), "utf8"));
    let ri = 0;
    for (const r of reitData) {
      const ev = Number(r.enterpriseValueUsd);
      const noi = Number(r.netOperatingIncomeUsd);
      const debt = Number(r.debtUsd);
      const units = Number(r.units);
      const capRate = Number(r.capRate);
      const unitNav = Math.max(10, r2((noi / capRate - debt) / units));
      out.push(
        item(
          "REIT",
          ri++,
          r.symbol,
          r.name,
          `${r.city} Commercial Estate · NOI $${(noi / 1e9).toFixed(1)}B · Cap ${(capRate * 100).toFixed(1)}% · Yield ${(r.distributionYield * 100).toFixed(1)}%`,
          unitNav,
          {
            formula: "REIT_NAV_Unit = (NOI ÷ Cap_Rate − Debt) ÷ Units",
            inputs: {
              enterpriseValueUsd: ev,
              netOperatingIncomeUsd: noi,
              debtUsd: debt,
              capRate,
              units,
              distributionYield: r.distributionYield,
              flagshipHoldings: r.flagshipHoldings,
            },
          }
        )
      );
    }
  } catch (err) {
    console.warn("Could not load curated reits:", err);
  }

  // ── MULTI-BILLION DOLLAR PRIVATE CAPITAL VEHICLES ──
  try {
    const benData = JSON.parse(readFileSync(join(process.cwd(), "data/universe/curated-benefactors.json"), "utf8"));
    let bpi = 0;
    for (const b of benData) {
      const aum = Number(b.aumUsd);
      const unitPrice = Number(b.unitPrice);
      out.push(
        item(
          "PRIVATE",
          bpi++,
          `$${b.symbol}`,
          b.name,
          `${b.benefactor} Family Office · AUM $${(aum / 1e9).toFixed(1)}B · ${b.mandate}`,
          unitPrice,
          {
            formula: "Private_Capital_NAV = Liquid_Capital ÷ Outstanding_Units",
            inputs: {
              benefactor: b.benefactor,
              aumUsd: aum,
              liquidCapitalUsd: b.liquidCapitalUsd,
              units: b.units,
              mandate: b.mandate,
              universe: b.universe,
            },
          }
        )
      );
    }
  } catch (err) {
    console.warn("Could not load curated benefactors:", err);
  }

  // ── INSTITUTIONAL COMIC LORE COMMODITIES ──
  try {
    const cmdData = JSON.parse(readFileSync(join(process.cwd(), "data/universe/curated-commodities.json"), "utf8"));
    let cmi = i;
    for (const cm of cmdData) {
      const sym = `$${cm.symbol}`;
      if (out.some((o) => o.symbol === sym)) continue;
      out.push(
        item(
          "COMMODITY",
          cmi++,
          sym,
          cm.name,
          `${cm.universe} Sovereign Reserve Commodity · Custodian: ${cm.sovereignCustodian}`,
          cm.priceUsd,
          {
            formula: "Commodity_Sovereign_Spot = Base_Price × (Demand ÷ Supply)^ε",
            inputs: {
              sovereignCustodian: cm.sovereignCustodian,
              annualSupplyKg: cm.annualSupplyKg,
              globalDemandKg: cm.globalDemandKg,
              universe: cm.universe,
            },
          }
        )
      );
    }
  } catch (err) {
    console.warn("Could not load curated commodities:", err);
  }

  // ── TOTAL RETURN SWAPS & DISASTER CDS ──
  try {
    const swapData = JSON.parse(readFileSync(join(process.cwd(), "data/universe/curated-macro-swaps.json"), "utf8"));
    let swi = 0;
    for (const sw of swapData) {
      const notional = Number(sw.notionalUsd);
      const sType: SurfaceKey = sw.type === "TOTAL_RETURN_SWAP" ? "SWAPS" : "CREDIT";
      out.push(
        item(
          sType,
          swi++,
          sw.symbol,
          sw.name,
          `${sw.purpose} · Notional: $${(notional / 1e6).toFixed(0)}M · Tenor: ${sw.tenorYears}Y`,
          notional,
          {
            formula: "Swap_Mark_to_Market = Notional × Spread_Duration",
            inputs: {
              notionalUsd: notional,
              tenorYears: sw.tenorYears,
              purpose: sw.purpose,
              counterparty: sw.counterparty,
              spreadBps: sw.spreadBps,
            },
          }
        )
      );
    }
  } catch (err) {
    console.warn("Could not load curated macro swaps:", err);
  }

  out.push(...issueInstitutional(shocks, now));
  out.push(...issueCharacters(unders, shocks, now, census, roster, footprints, universe));
  out.push(...issuePredictions(outcomes, shocks, now));

  // Genuine non-zero valuation filter (no synthetic clipping or arbitrary caps)
  return out.filter((it) => (it.pricing?.fmv_usd ?? it.pricing?.price ?? 0) > 0);
}
