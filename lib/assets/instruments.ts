/**
 * Issues assets-rail instruments from real underlying equities using the canon formulas.
 *
 * RULE #1: Equities (individual comic books) are the sole atomic unit of measure.
 * Every single asset issued here across ALL 16 FAMILIES / ALL 65 SURFACES is mathematically
 * derived from live underlying equities (`unders`) and live entity-graph news shocks (`shocks`).
 * Zero hardcoded prices. Zero raw comic books masquerading as assets.
 */
import type { AssetItem } from "./types";
import { SURFACE_ART_MAP, type SurfaceKey } from "./surfaceConfig";
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
  bondLiquiditySpreadFor,
  bondPrice,
  futuresPrice,
  indexFundSharePrice,
  indexLevel,
  liquidationCapacity,
  nftPrice,
  privateCapitalUnitValue,
  requiredYield,
  type Constituent,
} from "./canon-formulas";
import { BENEFACTORS, PRIVATE_ILLIQUIDITY_DISCOUNT } from "./lore-tables";
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
import { issueDerivedSurfaces } from "./derived-surfaces";

const artFor = (key: SurfaceKey) => SURFACE_ART_MAP[key] || `/surface-art/${key.toLowerCase()}.png`;
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

export function issueInstruments(
  unders: Underlying[],
  shocks: ShockMap = new Map(),
  now: number = Date.now(),
  outcomes: Outcome[] = [],
  census: UniverseCensus[] = [],
  roster: RosterCharacter[] = [],
  footprints: Map<string, Footprint> = new Map(),
  universe: UniverseCharacter[] = [],
): AssetItem[] {
  const out: AssetItem[] = [];
  const eligible = unders.filter(derivativeEligible);
  const tkr = (u: Underlying) =>
    `${u.series.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()}${u.issueNumber.replace(/[^0-9A-Za-z]/g, "")}${u.year ? `-${String(u.year).slice(2)}` : ""}`;

  // ── 1. LIQUID-CENTER EQUITY OPTIONS (3rd-Friday monthly expiries, OCC strings, Intrinsic + Time Value) ──
  let i = 0;
  const chains = new Map<string, ReturnType<typeof buildChain>>();
  for (const u of eligible) {
    if (u.sigma > OPTION.gates.aveVolatilityMax) continue; // spec gate: ave_volatility ≤ 0.45
    const ch = buildChain(u, now);
    if (!ch) continue;
    chains.set(u.id, ch);
    const frontLegs = ch.legs.filter((l) => l.expiryDate === ch.frontExpiryDate);
    const atmC =
      frontLegs.find((l) => l.type === "CALL" && Math.abs(l.moneyness - 1) < 0.06) ??
      frontLegs.find((l) => l.type === "CALL");
    const atmP =
      frontLegs.find((l) => l.type === "PUT" && Math.abs(l.moneyness - 1) < 0.06) ??
      frontLegs.find((l) => l.type === "PUT");
    if (!atmC || !atmP) continue;
    const base = {
      formula: "Black–Scholes on skewed σ_eff(K,T_3rdFri); Premium = Intrinsic + TimeValue",
      detailUrl: u.detailUrl,
    };
    const common = {
      underlying: u.label,
      underlyingClass: ch.underlyingClass,
      gradeBasis: ch.gradeBasis,
      S: u.price,
      sigmaReal: u.sigma,
      sources: u.sigmaSources,
      newsShock: u.newsShock,
      contractSize: OPTION_CONTRACT_SIZE_Q,
      atmIv30: ch.atmIv30,
      putCallRatio: ch.putCallRatio,
      openInterestCalls: ch.openInterestCalls,
      openInterestPuts: ch.openInterestPuts,
      trails: u.trails,
      chain: ch.legs,
    };
    for (const leg of [atmC, atmP]) {
      const call = leg.type === "CALL";
      out.push(
        item(
          "OPTIONS",
          i++,
          leg.optionSymbol,
          `${u.label} ${leg.expiryDate} $${leg.strike} ${call ? "Call" : "Put"}`,
          `${ch.gradeBasis} · Exp ${leg.expiryDate} (${leg.expiryDays}d / ${leg.turnsToExpiry}t) · Intr $${leg.intrinsicValue.toFixed(2)} · Time $${leg.timeValue.toFixed(2)} · IV ${(leg.iv * 100).toFixed(0)}% · Δ ${leg.delta.toFixed(2)}`,
          leg.premium,
          { ...base, inputs: { ...common, ...leg } },
        ),
      );
    }
    if (i >= 16) break;
  }

  // ── 2. VOLATILITY: 30-day ATM implied vol index (VIX-style), by cohort ──
  const atmIvOf = (set: Underlying[]) => {
    const ivs = set.map((u) => chains.get(u.id)?.atmIv30).filter((x): x is number => typeof x === "number");
    return ivs.length >= 2 ? { level: (ivs.reduce((s, x) => s + x, 0) / ivs.length) * 100, n: ivs.length } : null;
  };
  const volCohorts: { key: string; name: string; set: Underlying[] }[] = [
    { key: "$VPP", name: "Panel Vol Index", set: unders },
    { key: "$VMRV", name: "Marvel Vol Index", set: unders.filter((u) => (u.publisher || "").toLowerCase().startsWith("marvel")) },
    { key: "$VDC", name: "DC Vol Index", set: unders.filter((u) => (u.publisher || "").toLowerCase().startsWith("dc")) },
    { key: "$VGLD", name: "Golden Age Vol Index", set: unders.filter((u) => u.era === "GOLDEN") },
    { key: "$VSLV", name: "Silver Age Vol Index", set: unders.filter((u) => u.era === "SILVER") },
  ];
  let vi = 0;
  for (const c of volCohorts) {
    const v = atmIvOf(c.set);
    if (!v) continue;
    const pcr = (() => {
      let cc = 0,
        pp = 0;
      for (const u of c.set) {
        const ch = chains.get(u.id);
        if (ch) {
          cc += ch.openInterestCalls;
          pp += ch.openInterestPuts;
        }
      }
      return cc > 0 ? pp / cc : null;
    })();
    out.push(
      item(
        "VOLATILITY",
        vi++,
        c.key,
        c.name,
        `Front-month ATM implied vol across ${v.n} liquid equities${pcr != null ? ` · put/call OI ${pcr.toFixed(2)}` : ""}`,
        v.level,
        { formula: "VolIndex=100·mean(ATM σ_imp,front)", inputs: { constituents: v.n, putCallOpenInterest: pcr } },
      ),
    );
  }

  // ── 3. FUTURES: F0 = S·e^{(r+u−y)T}, three expiries, with basis ─────────
  i = 0;
  let nUnd = 0;
  for (const u of eligible) {
    const store = GAME_DESIGN.storageCostByEra[u.era];
    const conv = GAME_DESIGN.convenienceYieldByTier[u.tier] ?? 0;
    for (const T of GAME_DESIGN.futuresExpiryYears) {
      const r = treasuryYield(T);
      const F0 = futuresPrice(u.price, r, store, conv, T);
      const months = Math.round(T * 12);
      out.push(
        item(
          "FUTURES",
          i++,
          `${tkr(u)}F${months}`,
          `${u.label} ${months}M Future`,
          `Basis ${F0 - u.price >= 0 ? "+" : ""}$${(F0 - u.price).toFixed(2)} · ${F0 >= u.price ? "contango" : "backwardation"}`,
          F0,
          {
            formula: "F0=S0·e^((r+u−y)T)",
            detailUrl: u.detailUrl,
            inputs: {
              underlying: u.label,
              S0: u.price,
              T,
              r,
              storage: store,
              convenienceYield: conv,
              basis: F0 - u.price,
              annualisedBasis: (F0 / u.price - 1) / T,
            },
          },
        ),
      );
    }
    if (++nUnd >= 6) break;
  }

  // ── 4. BONDS: PV of coupons + principal at y_req = y_rf + s_credit + s_liq ─
  i = 0;
  const FACE = 1000;
  for (const u of eligible) {
    if (u.sigma > BOND.aveVolatilityMax) continue;
    const cap = BOND.issuanceCapFraction * u.price;
    const issues: { sub: "INST_ISSUE" | "PUB_ISSUER"; years: number; spread: number }[] = [
      { sub: "INST_ISSUE", years: 5, spread: CREDIT_SPREAD_INSTITUTIONAL[u.era] },
    ];
    if (u.capTier === "MAJOR_X10") {
      issues.push({ sub: "PUB_ISSUER", years: 10, spread: CREDIT_SPREAD_PUBLISHER[u.capTier] });
    }
    let outstanding = 0;
    for (const b of issues) {
      if (outstanding + FACE > cap) break; // Σ principal ≤ 0.40 · WAV
      outstanding += FACE;
      const sLiq = bondLiquiditySpreadFor(u.state, b.years);
      const yReq = requiredYield(b.years, b.spread + u.creditAdd, sLiq);
      const coupon = treasuryYield(b.years) + b.spread;
      const px = bondPrice(FACE, coupon, yReq, b.years);
      out.push(
        item(
          "BOND",
          i++,
          `${tkr(u)}${b.sub === "INST_ISSUE" ? "B5" : "B10"}`,
          `${u.label} ${b.sub === "INST_ISSUE" ? "Institutional" : "Publisher"} ${b.years}Y Note`,
          `${(coupon * 100).toFixed(2)}% annual coupon, $${FACE} face`,
          px,
          {
            formula: "Price=Σ cP/(1+y)^k + P/(1+y)^T",
            detailUrl: u.detailUrl,
            inputs: {
              underlying: u.label,
              subclass: b.sub,
              face: FACE,
              coupon,
              yReq,
              sCredit: b.spread,
              sLiq,
              years: b.years,
              issuanceCap: cap,
            },
          },
        ),
      );
    }
    if (i >= 12) break;
  }

  // ── 5. NFT: Tokenized provenance claims P = P_underlying · λ_prov · λ_liq ─
  // Uses dedicated NFT surface art (never raw comic covers) so it never masquerades as an atomic equity.
  i = 0;
  for (const u of unders) {
    const px = nftPrice(u.price, u.state);
    out.push(
      item(
        "NFT",
        i,
        `${tkr(u)}N`,
        `${u.label} Vault Token`,
        `Tokenised claim · λ_prov=${GAME_DESIGN.lambdaProvenance} · λ_liq=${GAME_DESIGN.lambdaLiquidityByState[u.state]}`,
        px,
        {
          formula: "P_NFT=P_equity·λ_prov·λ_liq",
          detailUrl: u.detailUrl,
          inputs: {
            underlying: u.label,
            S: u.price,
            lambdaProvenance: GAME_DESIGN.lambdaProvenance,
            lambdaLiquidity: GAME_DESIGN.lambdaLiquidityByState[u.state],
            state: u.state,
            trails: u.trails,
          },
        },
      ),
    );
    if (++i >= 8) break;
  }

  // ── 6. INDEX / ETF / FUND: I(t)=I0·Σ w·p(t)/p(0) ────────────────────────
  const withHist = unders.filter((u) => u.history.length >= 2);
  const toConstituents = (set: Underlying[], weightFn: (u: Underlying) => number): { cs: Constituent[]; years: number } | null => {
    const raw = set.map((u) => {
      const first = u.history[0];
      const last = u.history[u.history.length - 1];
      return { u, first, last, w: weightFn(u) };
    });
    const total = raw.reduce((s, x) => s + x.w, 0);
    if (raw.length < 3 || total <= 0) return null;
    const cs = raw.map((x) => ({ price: x.u.price, basePrice: x.first.value, weight: x.w / total }));
    const years = Math.max(...raw.map((x) => x.last.year)) - Math.min(...raw.map((x) => x.first.year));
    return { cs, years: Math.max(1, years) };
  };
  const indexSpecs: { key: string; name: string; set: Underlying[]; fund: FundType }[] = [
    { key: "CE70", name: "CE70 Sovereign Index", set: withHist.slice(0, 70), fund: "INDEX" },
    { key: "GOLD", name: "Golden Age Index", set: withHist.filter((u) => u.era === "GOLDEN"), fund: "INDEX" },
    { key: "SILV", name: "Silver Age Index", set: withHist.filter((u) => u.era === "SILVER"), fund: "INDEX" },
    { key: "MARV", name: "Marvel Index", set: withHist.filter((u) => (u.publisher || "").toLowerCase().startsWith("marvel")), fund: "INDEX" },
    { key: "DCCO", name: "DC Index", set: withHist.filter((u) => (u.publisher || "").toLowerCase().startsWith("dc")), fund: "INDEX" },
    { key: "KEY10", name: "Top 10 Sovereign Keys Index", set: withHist.slice(0, 10), fund: "INDEX" },
  ];
  const createdIndices: AssetItem[] = [];
  i = 0;
  let f = 0;
  for (const spec of indexSpecs) {
    const built = toConstituents(spec.set, (u) => u.price);
    if (!built) continue;
    const level = indexLevel(GAME_DESIGN.indexBase, built.cs);
    const idxAsset = item(
      "INDEX",
      i++,
      `$${spec.key}`,
      spec.name,
      `${built.cs.length} constituents, value-weighted, base ${GAME_DESIGN.indexBase}`,
      level,
      {
        formula: "I(t)=I0·Σ w_i·p_i(t)/p_i(0)",
        inputs: { constituents: built.cs.length, base: GAME_DESIGN.indexBase, years: built.years },
      },
    );
    out.push(idxAsset);
    createdIndices.push(idxAsset);

    const shares = GAME_DESIGN.fundInitialNav / GAME_DESIGN.fundInitialSharePrice;
    const er = FUND.expenseRatioByType[spec.fund];
    const fsp = indexFundSharePrice(built.cs, GAME_DESIGN.fundInitialNav, shares, er, built.years);
    const holdingBid = built.cs.reduce((s, c) => s + c.weight * fsp.nav * 0.98, 0);
    out.push(
      item(
        "ETF",
        f++,
        `${spec.key}X`,
        `${spec.name} ETF`,
        `Tracks ${spec.name}; ER ${(er * 100).toFixed(2)}%`,
        fsp.fsp,
        {
          formula: "FSP=NAV/Shares, NAV=Σq·p−Fees",
          inputs: { nav: fsp.nav, shares, fees: fsp.fees, expenseRatio: er, trackingError: fsp.fsp - level },
          liquidity: { liquidationCapacityOpen: liquidationCapacity(holdingBid, "OPEN") },
        },
      ),
    );
  }

  // Thematic scarcity & active equity funds
  const rankOf: Record<string, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 };
  const scarce = toConstituents(
    withHist.filter((u) => (rankOf[u.tier] ?? 1) >= 3),
    (u) => u.price * (rankOf[u.tier] ?? 1),
  );
  if (scarce) {
    const shares = GAME_DESIGN.fundInitialNav / GAME_DESIGN.fundInitialSharePrice;
    const er = FUND.expenseRatioByType.THEMATIC;
    const fsp = indexFundSharePrice(scarce.cs, GAME_DESIGN.fundInitialNav, shares, er, scarce.years);
    out.push(
      item(
        "FUND",
        0,
        "$SCRC",
        "Scarcity Alpha Fund",
        `Thematic, ${scarce.cs.length} rare-or-scarcer equities, ER ${(er * 100).toFixed(2)}%`,
        fsp.fsp,
        { formula: "FSP=NAV/Shares, NAV=Σq·p−Fees", inputs: { nav: fsp.nav, shares, fees: fsp.fees, expenseRatio: er, fundType: "THEMATIC" } },
      ),
    );
  }
  const blue = toConstituents(withHist.slice(0, 15), () => 1);
  if (blue) {
    const shares = GAME_DESIGN.fundInitialNav / GAME_DESIGN.fundInitialSharePrice;
    const er = FUND.expenseRatioByType.ACTIVE;
    const fsp = indexFundSharePrice(blue.cs, GAME_DESIGN.fundInitialNav, shares, er, blue.years);
    out.push(
      item(
        "FUND",
        1,
        "$BLUE",
        "Blue-Chip Active Fund",
        `Equal-weight top 15 equities, ER ${(er * 100).toFixed(2)}%`,
        fsp.fsp,
        { formula: "FSP=NAV/Shares, NAV=Σq·p−Fees", inputs: { nav: fsp.nav, shares, fees: fsp.fees, expenseRatio: er, fundType: "ACTIVE" } },
      ),
    );
  }

  // ── 7. PRIVATE CAPITAL: benefactor wealth + real collected equities marked to market ──
  i = 0;
  for (const b of BENEFACTORS) {
    const holdings = unders
      .filter((u) => b.collects.some((c) => u.series.toLowerCase().includes(c)))
      .map((u) => ({ q: 1, price: u.price }));
    const flow = conditionsFor(b.node ? shocks.get(b.node) : undefined).flow;
    const v = privateCapitalUnitValue({
      netWorth: b.netWorth * (1 + flow),
      operatingFraction: b.operatingFraction,
      illiquidityDiscount: PRIVATE_ILLIQUIDITY_DISCOUNT,
      holdings,
      units: b.units,
    });
    out.push(
      item(
        "PRIVATE",
        i++,
        `$${b.id.toUpperCase().slice(0, 4)}`,
        b.vehicle,
        `${b.name}'s private vehicle, ${holdings.length} collected equities marked to market`,
        v * marketFactor(`pc:${b.id}`, now, 0.04),
        {
          formula: "NAV_unit=[W(1−k)+Σq·S](1−d)/U",
          inputs: {
            netWorth: b.netWorth,
            capitalFlow: flow,
            operatingFraction: b.operatingFraction,
            illiquidityDiscount: PRIVATE_ILLIQUIDITY_DISCOUNT,
            collectionBooks: holdings.length,
            units: b.units,
            trails: b.node ? (shocks.get(b.node)?.trails ?? []) : [],
          },
        },
      ),
    );
  }

  // ── 8. INSTITUTIONAL CITY BONDS, CDS & REITS (live entity-graph shocks) ─
  out.push(...issueInstitutional(shocks, now));

  // ── 9. CHARACTER EQUITY BASKETS (live footprint NAV + news pressure) ────
  const charItems = issueCharacters(unders, shocks, now, census, roster, footprints, universe);
  out.push(...charItems);

  // ── 10. BATTLE & OUTCOME PREDICTION MARKETS ─────────────────────────────
  out.push(...issuePredictions(outcomes, shocks, now));

  // ── 11. ALL 16 FAMILIES / ALL 65 SURFACES DERIVED FROM EQUITIES & NEWS ──
  const primaryHeroes = charItems.filter((c) => c.assetType === "CHARACTER" || c.assetType === "DC_CHARACTER");
  out.push(
    ...issueDerivedSurfaces({
      unders,
      shocks,
      now,
      indexItems: createdIndices,
      characterItems: primaryHeroes,
    }),
  );

  // Genuine non-zero valuation filter (zero hardcoded floors or caps)
  return out.filter((it) => {
    const p = Number(it.pricing?.fmv_usd ?? it.pricing?.price ?? 0);
    return Number.isFinite(p) && p > 0;
  });
}
