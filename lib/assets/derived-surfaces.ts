/**
 * lib/assets/derived-surfaces.ts
 *
 * RULE #1 CANONICAL ASSET DERIVATION ENGINE (ALL 16 FAMILIES · ALL 65 SURFACES)
 *
 * Equities (individual comic books) are the sole atomic unit of measure.
 * Every instrument emitted here is mathematically derived from live underlying equities
 * (`unders`) and live entity-graph news shocks (`shocks` & `outcomes`).
 *
 * Zero hardcoded prices. Zero raw comics on the Assets Rail.
 * When news mentions a hero, villain, city, or title, the shock ripples through:
 *   underlying equity spot & σ -> Options (IV & Time Value), Warrants, Convertibles,
 *   Structured Notes, Bonds/Treasury/War Bonds, Swaps/TRS/CDS, Futures/Forwards/Commodities,
 *   Funds/ETFs/Indices, REITs/Citadel REITs, Private Capital/Conglomerates, Franchise IP,
 *   Teams/Events/Crossovers/Villains/Nemesis, Artifacts/Locations/Arcs, Crypto/NFTs/Macro/Quant/Strategies/Creators.
 */
import type { AssetItem } from "./types";
import { SURFACE_ART_MAP, type SurfaceKey } from "./surfaceConfig";
import {
  CREDIT_SPREAD_INSTITUTIONAL,
  FUND,
  GAME_DESIGN,
  treasuryYield,
  type LiquidityState,
} from "./canon-params";
import {
  blackScholes,
  bondLiquiditySpreadFor,
  bondPrice,
  cdsSpread,
  commodityPrice,
  futuresPrice,
  requiredYield,
} from "./canon-formulas";
import { buildOptionChainFromUnderlying } from "./option-chain";
import { conditionsFor, conditionsForNodes, degradeState, SENSITIVITY, type ShockMap } from "./shock-propagation";
import { LORE_CITIES, LORE_COMMODITIES } from "./lore-tables";
import type { Underlying } from "./underlyings";

const r2 = (n: number) => Math.round(n * 100) / 100;
const artFor = (key: SurfaceKey): string => SURFACE_ART_MAP[key] || `/surface-art/${key.toLowerCase()}.png`;

function mkAsset(
  type: SurfaceKey,
  idx: number,
  symbol: string,
  name: string,
  description: string,
  fmv: number,
  universe: "DC" | "Marvel" | "Composite" | "Asset Class" | "Derivative" | "Panel Profits",
  formula: string,
  inputs: Record<string, unknown>,
  detailUrl?: string,
): AssetItem {
  const cleanFmv = r2(Math.max(0.01, fmv));
  return {
    entryId: `asset-${type.toLowerCase()}-${symbol.replace(/[^A-Za-z0-9]/g, "")}-${idx}`,
    assetId: `${type}-${symbol}`,
    assetType: type,
    displayRank: idx + 1,
    diversityBucket: "standard",
    symbol,
    displayName: name,
    description,
    universe,
    pricing: { fmv_usd: cleanFmv, fmv: cleanFmv, price: cleanFmv, formula },
    parameters: inputs,
    valueUnit: "USD",
    coverImageUrl: artFor(type),
    coverVerified: true,
    quarantined: false,
    ...(detailUrl ? { detailUrl } : {}),
  };
}

/** Selects a cohort of atomic underlying equities matching a predicate (falling back cleanly to the broad market). */
function pickCohort(unders: Underlying[], pred: (u: Underlying) => boolean, minCount = 1): Underlying[] {
  const matched = unders.filter(pred);
  return matched.length >= minCount ? matched : unders.slice(0, Math.min(10, unders.length));
}

/** Computes aggregate equity basket statistics from real atomic underlyings + live entity-graph shocks. */
function basketStats(cohort: Underlying[], nodes: string[], shocks: ShockMap) {
  const n = Math.max(1, cohort.length);
  const sumPrice = cohort.reduce((s, u) => s + u.price, 0);
  const meanPrice = sumPrice / n;
  const meanSigma = cohort.reduce((s, u) => s + u.sigma, 0) / n;
  const meanNewsShock = cohort.reduce((s, u) => s + u.newsShock, 0) / n;
  const avgReturn =
    cohort.reduce((s, u) => {
      if (u.history.length >= 2 && u.history[0].value > 0) {
        return s + (u.price / u.history[0].value - 1);
      }
      return s;
    }, 0) / n;
  const nodeCond = nodes.length ? conditionsForNodes(nodes, shocks) : null;
  const cond = nodeCond ?? conditionsFor(undefined);
  const trails = nodeCond?.trails ?? [];
  const effectiveSigma = Math.min(1.1, Math.max(0.08, meanSigma * cond.volMult));
  const stress = Math.min(1, cond.creditAdd / Math.max(0.001, SENSITIVITY.creditStress));
  const state: LiquidityState = degradeState(
    meanSigma > 0.3 ? "STRESSED" : meanSigma > 0.18 ? "THIN" : "OPEN",
    cond.stateSteps,
  );
  // Normalize large sumPrice into tradeable per-unit basket share price (log-scaled divisor keeps unit prices realistic across eras)
  const units = sumPrice > 5_000_000 ? 100_000 : sumPrice > 500_000 ? 10_000 : sumPrice > 50_000 ? 1_000 : 100;
  const unitNav = (sumPrice / units) * Math.exp(cond.pressure);
  return {
    n: cohort.length,
    sumPrice,
    meanPrice,
    meanSigma,
    effectiveSigma,
    meanNewsShock,
    avgReturn,
    units,
    unitNav,
    cond,
    stress,
    state,
    trails,
    constituents: cohort.slice(0, 6).map((u) => u.label),
  };
}

export interface DerivedSurfaceContext {
  unders: Underlying[];
  shocks: ShockMap;
  now: number;
  indexItems: AssetItem[];
  characterItems: AssetItem[];
}

/**
 * Derives all cross-asset surfaces across the 16 canonical families directly from live atomic equities
 * and live news-graph shocks so that all 65 surfaces are populated and mathematically intertwined.
 */
export function issueDerivedSurfaces(ctx: DerivedSurfaceContext): AssetItem[] {
  const { unders, shocks, now, indexItems, characterItems } = ctx;
  if (unders.length === 0) return [];

  const out: AssetItem[] = [];
  const marvelUnders = pickCohort(unders, (u) => (u.publisher || "").toLowerCase().includes("marvel"));
  const dcUnders = pickCohort(unders, (u) => (u.publisher || "").toLowerCase().startsWith("dc"));
  const indieUnders = pickCohort(
    unders,
    (u) => !(u.publisher || "").toLowerCase().includes("marvel") && !(u.publisher || "").toLowerCase().startsWith("dc"),
  );
  const goldenUnders = pickCohort(unders, (u) => u.era === "GOLDEN");
  const silverUnders = pickCohort(unders, (u) => u.era === "SILVER");
  const bronzeUnders = pickCohort(unders, (u) => u.era === "EARLY_BRONZE" || u.era === "LATE_BRONZE_COPPER");
  const modernUnders = pickCohort(unders, (u) => u.era === "MODERN_MAINSTREAM_KEY" || u.era === "INDEPENDENT_ELIGIBLE");

  const globalStress = (() => {
    let s = 0;
    let count = 0;
    for (const sh of shocks.values()) {
      s += sh.stress;
      count++;
    }
    return count > 0 ? Math.min(1, s / Math.max(3, count)) : 0;
  })();

  const globalHype = (() => {
    let h = 0;
    let count = 0;
    for (const sh of shocks.values()) {
      h += sh.hype;
      count++;
    }
    return count > 0 ? Math.min(1, h / Math.max(3, count)) : 0;
  })();

  const mktStats = basketStats(unders, [], shocks);

  // ── FAMILY 1: MUNI_DEBT (MUNI_REVENUE, MUNI_INFRASTRUCTURE) ─────────────
  // Bond PV anchored to city's linked equity basket collateral & news-shocked municipal hazard.
  const cityEquityMatch: Record<string, (u: Underlying) => boolean> = {
    gotham: (u) => /batman|detective/i.test(u.series),
    metropolis: (u) => /superman|action/i.test(u.series),
    nyc: (u) => /spider-man|daredevil|fantastic|avengers/i.test(u.series),
    wakanda: (u) => /black panther|fantastic|avengers/i.test(u.series),
  };

  let mrIdx = 0;
  let miIdx = 0;
  for (const city of LORE_CITIES) {
    const cohort = pickCohort(unders, cityEquityMatch[city.id] || (() => true));
    const st = basketStats(cohort, [city.node], shocks);
    const R = city.muniClass === "MUNICIPAL_MAJ_CITY" ? 0.7 : 0.65;
    const eqVolSpread = Math.min(0.03, st.effectiveSigma * 0.04);
    const hazard = city.hazard0 * (1 + SENSITIVITY.hazardStress * st.stress);
    const sLiq = bondLiquiditySpreadFor(st.state, 7);
    const couponRev = treasuryYield(7) + city.hazard0 * (1 - R) + 0.004;
    const yRev = requiredYield(7, hazard * (1 - R) + eqVolSpread + st.cond.creditAdd, sLiq);
    const pxRev = bondPrice(1000, couponRev, yRev, 7) * Math.exp(st.cond.pressure * 0.35);
    const tag = city.id.toUpperCase().slice(0, 4);

    out.push(
      mkAsset(
        "MUNI_REVENUE",
        mrIdx++,
        `${tag}RV7`,
        `${city.name} 7Y Transit & Revenue Bond`,
        `Backed by ${st.n} linked equities · Yield ${(yRev * 100).toFixed(2)}% · Equity σ ${(st.effectiveSigma * 100).toFixed(0)}%`,
        pxRev,
        city.universe,
        "PV = Σ cP/(1+y)^k + P/(1+y)^T; y = y_rf + λ_shocked(1−R) + 0.04·σ_eq + s_liq",
        { city: city.name, coupon: couponRev, yReq: yRev, years: 7, linkedEquities: st.constituents, equitySigma: st.effectiveSigma, trails: st.trails },
      ),
    );

    const couponInf = treasuryYield(15) + city.hazard0 * (1 - R) + 0.0065;
    const yInf = requiredYield(15, hazard * (1 - R) + eqVolSpread * 1.15 + st.cond.creditAdd, bondLiquiditySpreadFor(st.state, 15));
    const pxInf = bondPrice(1000, couponInf, yInf, 15) * Math.exp(st.cond.pressure * 0.4);

    out.push(
      mkAsset(
        "MUNI_INFRASTRUCTURE",
        miIdx++,
        `${tag}IN15`,
        `${city.name} 15Y Civic Infrastructure Note`,
        `Collateralized by ${st.n} local equities · Yield ${(yInf * 100).toFixed(2)}% · Hazard ${(hazard * 100).toFixed(2)}%`,
        pxInf,
        city.universe,
        "PV = Σ cP/(1+y)^k + P/(1+y)^15; spread derived from linked equity σ and city news stress",
        { city: city.name, coupon: couponInf, yReq: yInf, years: 15, linkedEquities: st.constituents, trails: st.trails },
      ),
    );
  }

  // ── FAMILY 2: SOVEREIGN_REALM (TREASURY, SOVEREIGN_NOTE, WAR_BOND) ──────
  const eraBonds: { key: string; label: string; cohort: Underlying[]; era: keyof typeof CREDIT_SPREAD_INSTITUTIONAL; years: number; nodes: string[] }[] = [
    { key: "UST2", label: "CBSE 2Y Sovereign Treasury Bill", cohort: unders, era: "GOLDEN", years: 2, nodes: [] },
    { key: "UST5", label: "CBSE 5Y Sovereign Benchmark Treasury", cohort: goldenUnders, era: "GOLDEN", years: 5, nodes: [] },
    { key: "UST10", label: "CBSE 10Y Long Sovereign Treasury", cohort: silverUnders, era: "SILVER", years: 10, nodes: [] },
  ];
  eraBonds.forEach((eb, idx) => {
    const st = basketStats(eb.cohort, eb.nodes, shocks);
    const rf = treasuryYield(eb.years);
    const yReq = requiredYield(eb.years, CREDIT_SPREAD_INSTITUTIONAL[eb.era] * 0.4 + globalStress * 0.008, bondLiquiditySpreadFor("OPEN", eb.years));
    const px = bondPrice(1000, rf + 0.002, yReq, eb.years);
    out.push(
      mkAsset(
        "TREASURY",
        idx,
        eb.key,
        eb.label,
        `Risk-free benchmark backed by ${st.n} sovereign equities · Yield ${(yReq * 100).toFixed(2)}%`,
        px,
        "Composite",
        "Treasury_PV = Σ cP/(1+y_rf+s_macro)^k + P/(1+y)^T",
        { years: eb.years, yReq, coupon: rf + 0.002, globalStress, constituents: st.constituents },
      ),
    );
  });

  const sovereignRealms: { sym: string; name: string; universe: "Marvel" | "DC"; cohort: Underlying[]; nodes: string[]; years: number }[] = [
    { sym: "WAKSN", name: "Wakanda Sovereign Vault 10Y Note", universe: "Marvel", cohort: pickCohort(unders, (u) => /black panther|fantastic|avengers/i.test(u.series)), nodes: ["wakanda", "black_panther"], years: 10 },
    { sym: "LATSN", name: "Latveria Sovereign Crown 10Y Note", universe: "Marvel", cohort: pickCohort(unders, (u) => /fantastic|doom/i.test(u.series)), nodes: ["doom", "fantastic_four"], years: 10 },
    { sym: "THEMSN", name: "Themyscira Sovereign 10Y Note", universe: "DC", cohort: pickCohort(unders, (u) => /wonder woman|justice|all-star/i.test(u.series)), nodes: ["justice_league"], years: 10 },
    { sym: "ASGSN", name: "Asgardian Realm 10Y Note", universe: "Marvel", cohort: pickCohort(unders, (u) => /thor|journey|avengers/i.test(u.series)), nodes: ["avengers"], years: 10 },
  ];
  sovereignRealms.forEach((sr, idx) => {
    const st = basketStats(sr.cohort, sr.nodes, shocks);
    const spread = 0.005 + st.effectiveSigma * 0.05 + st.cond.creditAdd;
    const coupon = treasuryYield(sr.years) + 0.008;
    const yReq = requiredYield(sr.years, spread, bondLiquiditySpreadFor(st.state, sr.years));
    const px = bondPrice(1000, coupon, yReq, sr.years) * Math.exp(st.cond.pressure * 0.35);
    out.push(
      mkAsset(
        "SOVEREIGN_NOTE",
        idx,
        sr.sym,
        sr.name,
        `${st.n} realm equities · Spread ${(spread * 10000).toFixed(0)} bps · Yield ${(yReq * 100).toFixed(2)}%`,
        px,
        sr.universe,
        "Sovereign_Note_PV = BondPV(1000, c, y_rf + 0.05·σ_realm + s_shock + s_liq, T)",
        { years: sr.years, spreadBps: spread * 10000, yReq, linkedEquities: st.constituents, trails: st.trails },
      ),
    );
  });

  const warBonds: { sym: string; name: string; universe: "Marvel" | "DC"; cohort: Underlying[]; nodes: string[] }[] = [
    { sym: "SHLDWB", name: "S.H.I.E.L.D. Helicarrier Defense War Bond", universe: "Marvel", cohort: marvelUnders, nodes: ["avengers", "iron_man", "new_york"], },
    { sym: "JLAWB", name: "Watchtower Crisis Defense War Bond", universe: "DC", cohort: dcUnders, nodes: ["justice_league", "batman", "superman", "gotham"], },
    { sym: "KRAWWB", name: "Krakoan Mutant Defense War Bond", universe: "Marvel", cohort: pickCohort(unders, (u) => /x-men|wolverine/i.test(u.series)), nodes: ["x_men", "wolverine"], },
  ];
  warBonds.forEach((wb, idx) => {
    const st = basketStats(wb.cohort, wb.nodes, shocks);
    const warHazard = 0.015 + globalStress * 0.04 + st.stress * 0.05;
    const coupon = treasuryYield(5) + 0.025;
    const yReq = requiredYield(5, warHazard + st.effectiveSigma * 0.04, bondLiquiditySpreadFor(st.state, 5));
    const px = bondPrice(1000, coupon, yReq, 5) * Math.exp(st.cond.pressure * 0.3);
    out.push(
      mkAsset(
        "WAR_BOND",
        idx,
        wb.sym,
        wb.name,
        `Crisis-sensitive 5Y bond · Hazard ${(warHazard * 100).toFixed(1)}% · Yield ${(yReq * 100).toFixed(2)}%`,
        px,
        wb.universe,
        "WarBond_PV = BondPV(1000, c, y_rf + λ_crisis(newsStress) + 0.04·σ_eq + s_liq, 5)",
        { warHazard, yReq, coupon, equitySigma: st.effectiveSigma, linkedEquities: st.constituents, trails: st.trails },
      ),
    );
  });

  // ── FAMILY 3: CORPORATE_CREDIT (CONVERTIBLE, STRUCTURED, DEBENTURE) ─────
  // Convertible = Straight Bond PV + Embedded Black–Scholes Call on the issuer's live equity basket!
  const corpIssuers: { sym: string; name: string; universe: "Marvel" | "DC"; cohort: Underlying[]; nodes: string[]; baseSpread: number }[] = [
    { sym: "WAYN", name: "Wayne Enterprises", universe: "DC", cohort: pickCohort(unders, (u) => /batman|detective/i.test(u.series)), nodes: ["wayne_enterprises", "batman", "gotham"], baseSpread: 0.008 },
    { sym: "STARK", name: "Stark Industries", universe: "Marvel", cohort: pickCohort(unders, (u) => /iron man|avengers|tales of suspense/i.test(u.series)), nodes: ["stark_industries", "iron_man"], baseSpread: 0.009 },
    { sym: "LEXC", name: "LexCorp International", universe: "DC", cohort: pickCohort(unders, (u) => /superman|action/i.test(u.series)), nodes: ["lexcorp", "lex_luthor", "metropolis"], baseSpread: 0.014 },
    { sym: "OSCP", name: "Oscorp Biogenetics", universe: "Marvel", cohort: pickCohort(unders, (u) => /spider-man/i.test(u.series)), nodes: ["oscorp", "green_goblin", "spider_man"], baseSpread: 0.018 },
  ];
  corpIssuers.forEach((ci, idx) => {
    const st = basketStats(ci.cohort, ci.nodes, shocks);
    const sCredit = ci.baseSpread + st.effectiveSigma * 0.03 + st.cond.creditAdd;
    const yReq = requiredYield(5, sCredit, bondLiquiditySpreadFor(st.state, 5));
    const bondFloor = bondPrice(1000, treasuryYield(5) + ci.baseSpread * 0.7, yReq, 5);
    const convK = st.unitNav * 1.15;
    const convRatio = 1000 / Math.max(1, convK);
    const bs = blackScholes(st.unitNav, convK, 5, treasuryYield(5), st.effectiveSigma);
    const callValue = bs ? bs.call * convRatio : 0;
    const convPrice = bondFloor + callValue;

    out.push(
      mkAsset(
        "CONVERTIBLE",
        idx,
        `${ci.sym}CV5`,
        `${ci.name} 5Y Equity-Convertible Note`,
        `Bond Floor $${bondFloor.toFixed(0)} + Option $${callValue.toFixed(0)} · σ ${(st.effectiveSigma * 100).toFixed(0)}% · ${st.n} books`,
        convPrice,
        ci.universe,
        "Convertible = Bond_Floor_PV + ConversionRatio × BS_Call(S_basket, 1.15·S, 5y, r, σ_shocked)",
        { bondFloor: r2(bondFloor), embeddedOptionValue: r2(callValue), underlyingNav: r2(st.unitNav), strike: r2(convK), sigma: st.effectiveSigma, linkedEquities: st.constituents, trails: st.trails },
      ),
    );

    // Subordinated Debenture
    const ySub = requiredYield(7, sCredit * 1.65, bondLiquiditySpreadFor(st.state, 7));
    const debPx = bondPrice(1000, treasuryYield(7) + ci.baseSpread * 1.5, ySub, 7);
    out.push(
      mkAsset(
        "DEBENTURE",
        idx,
        `${ci.sym}DB7`,
        `${ci.name} 7Y Subordinated Debenture`,
        `Unsecured · Yield ${(ySub * 100).toFixed(2)}% · Credit Spread ${(sCredit * 16500).toFixed(0)} bps`,
        debPx,
        ci.universe,
        "Debenture_PV = BondPV(1000, c_sub, y_rf + 1.65·(s_base + 0.03·σ_eq + s_shock) + s_liq, 7)",
        { yReq: ySub, spreadBps: sCredit * 16500, linkedEquities: st.constituents, trails: st.trails },
      ),
    );
  });

  // STRUCTURED: Principal-Protected Equity-Linked Notes (Zero-Coupon Bond + Participation × Call on live Index!)
  const structCohorts: { sym: string; name: string; cohort: Underlying[]; nodes: string[] }[] = [
    { sym: "STRCE70", name: "CE70 Principal-Protected Equity Note (3Y)", cohort: unders.slice(0, 20), nodes: [] },
    { sym: "STRMRV", name: "Marvel Hero Upside Participation Note (3Y)", cohort: marvelUnders, nodes: ["spider_man", "avengers", "x_men"] },
    { sym: "STRDC", name: "DC Trinity Barrier Reverse Convertible (3Y)", cohort: dcUnders, nodes: ["batman", "superman", "justice_league"] },
  ];
  structCohorts.forEach((sc, idx) => {
    const st = basketStats(sc.cohort, sc.nodes, shocks);
    const r = treasuryYield(3);
    const zcb = 1000 / Math.pow(1 + r + st.cond.creditAdd, 3);
    const bs = blackScholes(st.unitNav, st.unitNav * 1.05, 3, r, st.effectiveSigma);
    const partValue = bs ? (0.75 * (1000 / Math.max(1, st.unitNav))) * bs.call : 0;
    const notePx = zcb + partValue;
    out.push(
      mkAsset(
        "STRUCTURED",
        idx,
        sc.sym,
        sc.name,
        `ZCB Floor $${zcb.toFixed(0)} + 75% Call Upside $${partValue.toFixed(0)} · σ ${(st.effectiveSigma * 100).toFixed(0)}%`,
        notePx,
        "Derivative",
        "Structured_Note = 1000/(1+r)^3 + 0.75 × (1000/S) × BS_Call(S_basket, 1.05·S, 3y, r, σ_shocked)",
        { zcbFloor: r2(zcb), upsideOptionValue: r2(partValue), underlyingNav: r2(st.unitNav), sigma: st.effectiveSigma, linkedEquities: st.constituents, trails: st.trails },
      ),
    );
  });

  // ── FAMILY 4: OPTIONS_VOLATILITY (Index & Hero Derived Options + Live Equity-Derived Warrants) ──
  // 4A. Index & Hero Option Chains (3rd-Friday monthly expiries, OCC strings, Intrinsic + Time Value)
  let optIdx = 100;
  for (const idxItem of indexItems.slice(0, 5)) {
    const spot = Number(idxItem.pricing?.fmv_usd ?? 0);
    if (!(spot > 0)) continue;
    const idxRoot = idxItem.symbol.replace(/^\$/, "");
    const ch = buildOptionChainFromUnderlying(
      {
        id: `idx:${idxRoot}`,
        root: idxRoot,
        price: spot,
        sigma: Math.min(0.45, Math.max(0.12, mktStats.effectiveSigma * (1 + 0.25 * globalHype))),
        state: "OPEN",
        underlyingClass: "INDEX",
        gradeBasis: "Index Level (Value-Weighted Equity Basket)",
      },
      now,
    );
    if (!ch) continue;
    const front = ch.legs.filter((l) => l.expiryDate === ch.frontExpiryDate);
    const atmC = front.find((l) => l.type === "CALL" && Math.abs(l.moneyness - 1) < 0.06) ?? front.find((l) => l.type === "CALL");
    const atmP = front.find((l) => l.type === "PUT" && Math.abs(l.moneyness - 1) < 0.06) ?? front.find((l) => l.type === "PUT");
    for (const leg of [atmC, atmP].filter(Boolean) as typeof front) {
      out.push(
        mkAsset(
          "OPTIONS",
          optIdx++,
          leg.optionSymbol,
          `${idxItem.displayName} ${leg.expiryDate} $${leg.strike} ${leg.type === "CALL" ? "Call" : "Put"}`,
          `Exp ${leg.expiryDate} (${leg.expiryDays}d / ${leg.turnsToExpiry}t) · Intr $${leg.intrinsicValue.toFixed(2)} · Time $${leg.timeValue.toFixed(2)} · IV ${(leg.iv * 100).toFixed(0)}% · Δ ${leg.delta.toFixed(2)}`,
          leg.premium,
          "Derivative",
          "BS(S_index, K, T_3rdFri, r, σ_skewed); Premium = Intrinsic + TimeValue",
          {
            underlying: idxItem.displayName,
            underlyingClass: "INDEX",
            gradeBasis: ch.gradeBasis,
            S: spot,
            ...leg,
            chain: ch.legs,
          },
        ),
      );
    }
  }

  // 4B. Hero / Derived Asset Options (top live character baskets react immediately to hero news!)
  for (const hero of characterItems.slice(0, 6)) {
    const spot = Number(hero.pricing?.fmv_usd ?? 0);
    if (!(spot >= 5)) continue;
    const heroSigma = Number((hero.parameters as any)?.sigma ?? mktStats.effectiveSigma);
    const heroRoot = hero.symbol.replace(/^\$/, "");
    const ch = buildOptionChainFromUnderlying(
      {
        id: `char:${heroRoot}`,
        root: heroRoot,
        price: spot,
        sigma: Math.min(0.85, Math.max(0.15, heroSigma)),
        state: "OPEN",
        underlyingClass: "DERIVED_ASSET",
        gradeBasis: "Derived Equity Basket NAV",
      },
      now,
    );
    if (!ch) continue;
    const front = ch.legs.filter((l) => l.expiryDate === ch.frontExpiryDate);
    const atmC = front.find((l) => l.type === "CALL" && Math.abs(l.moneyness - 1) < 0.08) ?? front.find((l) => l.type === "CALL");
    const atmP = front.find((l) => l.type === "PUT" && Math.abs(l.moneyness - 1) < 0.08) ?? front.find((l) => l.type === "PUT");
    for (const leg of [atmC, atmP].filter(Boolean) as typeof front) {
      out.push(
        mkAsset(
          "OPTIONS",
          optIdx++,
          leg.optionSymbol,
          `${hero.displayName} ${leg.expiryDate} $${leg.strike} ${leg.type === "CALL" ? "Call" : "Put"}`,
          `Hero Option · Exp ${leg.expiryDate} (${leg.expiryDays}d) · Intr $${leg.intrinsicValue.toFixed(2)} · Time $${leg.timeValue.toFixed(2)} · IV ${(leg.iv * 100).toFixed(0)}% · Δ ${leg.delta.toFixed(2)}`,
          leg.premium,
          hero.universe === "DC" ? "DC" : "Marvel",
          "BS(S_heroBasket, K, T_3rdFri, r, σ_hero_newsShocked); Premium = Intrinsic + TimeValue",
          {
            underlying: hero.displayName,
            underlyingClass: "DERIVED_ASSET",
            gradeBasis: ch.gradeBasis,
            S: spot,
            ...leg,
            trails: (hero.parameters as any)?.trails ?? [],
            chain: ch.legs,
          },
          hero.detailUrl,
        ),
      );
    }
  }

  // 4C. WARRANTS: 1Y & 2Y Long-Dated Black-Scholes Call Warrants derived strictly from LIVE atomic equities (zero static prices!)
  const warrantUnderlyings = unders.filter((u) => u.price >= 50 && u.sigma > 0).slice(0, 10);
  warrantUnderlyings.forEach((u, idx) => {
    const T = idx % 2 === 0 ? 1.0 : 2.0;
    const r = treasuryYield(T);
    const K = r2(u.price * 1.15);
    const sigma = Math.min(0.85, Math.max(0.14, u.sigma));
    const bs = blackScholes(u.price, K, T, r, sigma);
    if (!bs || bs.call <= 0) return;
    // Fractional warrant unit (1/10th share entitlement so warrants trade cleanly against underlying shares)
    const unitRatio = u.price > 50_000 ? 0.001 : u.price > 5_000 ? 0.01 : 0.1;
    const wPx = bs.call * unitRatio;
    const intrinsic = Math.max(0, u.price - K) * unitRatio;
    const timeVal = Math.max(0, wPx - intrinsic);
    const root = `${u.series.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()}${u.issueNumber.replace(/[^0-9A-Za-z]/g, "")}`;
    out.push(
      mkAsset(
        "WARRANT",
        idx,
        `WRN-${root}`,
        `${u.label} ${T}Y Catalyst Warrant`,
        `Strike $${Math.round(K).toLocaleString()} · Intr $${intrinsic.toFixed(2)} · Time $${timeVal.toFixed(2)} · IV ${(sigma * 100).toFixed(0)}% · Δ ${bs.callDelta.toFixed(2)}`,
        wPx,
        (u.publisher || "").toLowerCase().includes("marvel") ? "Marvel" : (u.publisher || "").toLowerCase().startsWith("dc") ? "DC" : "Derivative",
        "Warrant = BS_Call(S_live, K=1.15·S_live, T, r, σ_live_newsShocked) × UnitRatio",
        {
          underlying: u.label,
          underlyingPrice: u.price,
          strike: K,
          expiryYears: T,
          sigma,
          newsShock: u.newsShock,
          unitRatio,
          intrinsicValue: r2(intrinsic),
          timeValue: r2(timeVal),
          delta: bs.callDelta,
          gamma: bs.gamma,
          thetaPerDay: bs.callTheta / 365,
          trails: u.trails,
        },
        u.detailUrl,
      ),
    );
  });

  // ── FAMILY 5: SWAPS_CDS (SWAPS, TOTAL_RETURN_SWAP) ──────────────────────
  // Mark-to-Market NPV per $100,000 unit notional (NEVER raw $250M notional!).
  const swapUnitNotional = 100_000;
  LORE_CITIES.forEach((city, idx) => {
    const sh = shocks.get(city.node);
    const st = basketStats(pickCohort(unders, cityEquityMatch[city.id] || (() => true)), [city.node], shocks);
    const R = city.muniClass === "MUNICIPAL_MAJ_CITY" ? 0.7 : 0.65;
    const hazardLive = city.hazard0 * (1 + SENSITIVITY.hazardStress * st.stress);
    const rf5 = treasuryYield(5);
    const sBase = cdsSpread(city.hazard0, R, 5, rf5);
    const sLive = cdsSpread(hazardLive + st.effectiveSigma * 0.015, R, 5, rf5);
    // Annualized protection leg value per $100k notional (strictly > 0, moves dynamically with city news + equity vol)
    const swapMtm = Math.max(25, sLive * swapUnitNotional * (1 + 0.5 * st.stress));
    const tag = city.id.toUpperCase().slice(0, 4);
    out.push(
      mkAsset(
        "SWAPS",
        idx,
        `SWP-${tag}5Y`,
        `${city.name} 5Y Credit-Volatility Swap`,
        `Live Spread ${(sLive * 10000).toFixed(0)} bps (Base ${(sBase * 10000).toFixed(0)} bps) · Per $100k unit · σ ${(st.effectiveSigma * 100).toFixed(0)}%`,
        swapMtm,
        city.universe,
        "Swap_Price = CDS_Spread(λ_shocked + 0.015·σ_eq, R, 5Y) × $100k_Unit",
        { city: city.name, spreadBps: sLive * 10000, baseSpreadBps: sBase * 10000, unitNotional: swapUnitNotional, equitySigma: st.effectiveSigma, trails: sh?.trails ?? [] },
      ),
    );
  });

  const trsSpecs: { sym: string; name: string; universe: "Marvel" | "DC" | "Composite"; cohort: Underlying[]; nodes: string[] }[] = [
    { sym: "TRS-MRV", name: "Marvel Equity Basket Total Return Swap", universe: "Marvel", cohort: marvelUnders, nodes: ["spider_man", "avengers", "x_men"] },
    { sym: "TRS-DC", name: "DC Equity Basket Total Return Swap", universe: "DC", cohort: dcUnders, nodes: ["batman", "superman", "justice_league"] },
    { sym: "TRS-GLD", name: "Golden Age Sovereign Total Return Swap", universe: "Composite", cohort: goldenUnders, nodes: [] },
    { sym: "TRS-SLV", name: "Silver Age Key Equity Total Return Swap", universe: "Composite", cohort: silverUnders, nodes: [] },
  ];
  trsSpecs.forEach((ts, idx) => {
    const st = basketStats(ts.cohort, ts.nodes, shocks);
    const fundingCost = treasuryYield(1) + 0.008 + st.cond.creditAdd;
    // Mark-to-market TRS unit = Base $1,000 unit × (1 + equityReturn - fundingCost) × newsPressure
    const trsValue = Math.max(50, 1000 * (1 + Math.max(-0.5, Math.min(2.0, st.avgReturn)) - fundingCost) * Math.exp(st.cond.pressure));
    out.push(
      mkAsset(
        "TOTAL_RETURN_SWAP",
        idx,
        ts.sym,
        ts.name,
        `${st.n} underlying equities · Funding ${(fundingCost * 100).toFixed(2)}% · Basket Ret ${(st.avgReturn * 100).toFixed(1)}%`,
        trsValue,
        ts.universe,
        "TRS_Unit = $1000 × (1 + R_equityBasket − (y_rf + s_fund + s_shock)) × e^(newsPressure)",
        { fundingRate: fundingCost, basketReturn: st.avgReturn, constituents: st.constituents, trails: st.trails },
      ),
    );
  });

  // ── FAMILY 6: FUTURES_COMMODITY (COMMODITY shocked by equities+news, FORWARD) ──
  // Lore commodities linked directly to their franchise equity momentum & entity-graph news shocks!
  const commodityNodes: Record<string, { nodes: string[]; match: (u: Underlying) => boolean }> = {
    vibranium: { nodes: ["vibranium", "wakanda", "black_panther"], match: (u) => /black panther|fantastic|avengers/i.test(u.series) },
    adamantium: { nodes: ["wolverine", "x_men"], match: (u) => /x-men|wolverine|hulk/i.test(u.series) },
    uru: { nodes: ["avengers"], match: (u) => /thor|journey|avengers/i.test(u.series) },
    kryptonite: { nodes: ["kryptonite", "superman", "lex_luthor"], match: (u) => /superman|action/i.test(u.series) },
    "nth-metal": { nodes: ["justice_league"], match: (u) => /flash|hawkman|justice|all-star/i.test(u.series) },
    "element-x": { nodes: ["batman", "justice_league"], match: (u) => /new gods|batman|justice/i.test(u.series) },
  };
  LORE_COMMODITIES.forEach((c, idx) => {
    const link = commodityNodes[c.id] || { nodes: [], match: () => true };
    const st = basketStats(pickCohort(unders, link.match), link.nodes, shocks);
    // Demand scales dynamically with linked hero/franchise news hype, stress, and equity momentum
    const shockedDemand = c.demand * (1 + 0.35 * (st.cond.volMult - 1) + Math.max(-0.25, Math.min(0.5, st.avgReturn * 0.25)));
    const spotPx = commodityPrice(c.p0, Math.max(0.2, shockedDemand), c.supply, c.elasticity) * Math.exp(st.cond.pressure);
    out.push(
      mkAsset(
        "COMMODITY",
        idx,
        `$${c.id.replace(/[^a-z]/g, "").toUpperCase().slice(0, 4)}`,
        `${c.name} (per ${c.unit})`,
        `${c.universe} commodity · Linked to ${st.n} equities · DemandIdx ${shockedDemand.toFixed(2)} · σ ${(st.effectiveSigma * 100).toFixed(0)}%`,
        spotPx,
        c.universe,
        "P = P0 · (D_equityShocked / S)^ε × e^(newsPressure)",
        { p0: c.p0, baseDemand: c.demand, shockedDemand, supply: c.supply, elasticity: c.elasticity, linkedEquities: st.constituents, trails: st.trails },
      ),
    );
  });

  // FORWARD: Physical-Delivery OTC Forward Contracts on Era Equity Baskets
  const fwdSpecs: { sym: string; name: string; cohort: Underlying[]; era: keyof typeof GAME_DESIGN.storageCostByEra; months: number }[] = [
    { sym: "FWD-GLD6M", name: "Golden Age Vault Basket 6M Forward", cohort: goldenUnders, era: "GOLDEN", months: 6 },
    { sym: "FWD-SLV6M", name: "Silver Age Key Basket 6M Forward", cohort: silverUnders, era: "SILVER", months: 6 },
    { sym: "FWD-BRZ12M", name: "Bronze Age Run Basket 12M Forward", cohort: bronzeUnders, era: "EARLY_BRONZE", months: 12 },
    { sym: "FWD-MOD6M", name: "Modern Key Basket 6M Forward", cohort: modernUnders, era: "MODERN_MAINSTREAM_KEY", months: 6 },
  ];
  fwdSpecs.forEach((fw, idx) => {
    const st = basketStats(fw.cohort, [], shocks);
    const T = fw.months / 12;
    const r = treasuryYield(T);
    const store = GAME_DESIGN.storageCostByEra[fw.era];
    const conv = 0.015;
    const f0 = futuresPrice(st.unitNav, r, store, conv, T);
    out.push(
      mkAsset(
        "FORWARD",
        idx,
        fw.sym,
        fw.name,
        `OTC ${fw.months}M Forward · Spot $${st.unitNav.toFixed(2)} · Basis ${(f0 - st.unitNav >= 0 ? "+" : "")}$${(f0 - st.unitNav).toFixed(2)}`,
        f0,
        "Derivative",
        "F_fwd = Basket_NAV × e^((r + u_storage − y_conv)T)",
        { spotNav: r2(st.unitNav), forwardPrice: r2(f0), basis: r2(f0 - st.unitNav), months: fw.months, constituents: st.constituents },
      ),
    );
  });

  // ── FAMILY 8: REITS_FACILITIES (CITADEL_REIT) ───────────────────────────
  const citadels: { sym: string; name: string; universe: "Marvel" | "DC"; cohort: Underlying[]; nodes: string[] }[] = [
    { sym: "CIT-AVNG", name: "Avengers Tower Citadel REIT", universe: "Marvel", cohort: pickCohort(unders, (u) => /avengers|iron man/i.test(u.series)), nodes: ["avengers", "stark_industries", "new_york"] },
    { sym: "CIT-BAXT", name: "Baxter Building Citadel REIT", universe: "Marvel", cohort: pickCohort(unders, (u) => /fantastic four/i.test(u.series)), nodes: ["fantastic_four", "new_york"] },
    { sym: "CIT-XAVR", name: "Xavier Institute Estate REIT", universe: "Marvel", cohort: pickCohort(unders, (u) => /x-men|wolverine/i.test(u.series)), nodes: ["x_men", "wolverine"] },
    { sym: "CIT-WMAN", name: "Wayne Manor & Batcave Fortress REIT", universe: "DC", cohort: pickCohort(unders, (u) => /batman|detective/i.test(u.series)), nodes: ["batman", "wayne_enterprises", "gotham"] },
    { sym: "CIT-HALL", name: "Hall of Justice & Watchtower REIT", universe: "DC", cohort: pickCohort(unders, (u) => /justice|superman|batman/i.test(u.series)), nodes: ["justice_league", "superman", "metropolis"] },
  ];
  citadels.forEach((ct, idx) => {
    const st = basketStats(ct.cohort, ct.nodes, shocks);
    const capRate = 0.055 + st.cond.creditAdd + SENSITIVITY.reitCapWidening * st.stress;
    // Unit NAV anchored to the underlying equity basket NAV capitalized at real-estate cap rate
    const unitPx = Math.max(15, (st.unitNav * 0.08) / capRate * (1 - 0.15 * st.stress));
    out.push(
      mkAsset(
        "CITADEL_REIT",
        idx,
        ct.sym,
        ct.name,
        `${st.n} franchise equities · Cap ${(capRate * 100).toFixed(2)}% · Yield ${(0.08 * 100).toFixed(1)}%`,
        unitPx,
        ct.universe,
        "Citadel_Unit = (0.08 × LinkedEquityBasket_NAV ÷ CapRate_shocked) × (1 − 0.15·Stress)",
        { capRate, linkedNav: r2(st.unitNav), stress: st.stress, constituents: st.constituents, trails: st.trails },
      ),
    );
  });

  // ── FAMILY 9: PRIVATE_CAPITAL (CONGLOMERATE) ────────────────────────────
  const conglomerates: { sym: string; name: string; universe: "Marvel" | "DC"; cohort: Underlying[]; nodes: string[] }[] = [
    { sym: "CONG-WAYN", name: "Wayne Consolidated Holding Group", universe: "DC", cohort: dcUnders, nodes: ["wayne_enterprises", "wayne_capital", "batman"] },
    { sym: "CONG-STRK", name: "Stark Resilient Global Holdings", universe: "Marvel", cohort: marvelUnders, nodes: ["stark_industries", "stark_capital", "iron_man"] },
    { sym: "CONG-LEX", name: "LexCorp Industrial Conglomerate", universe: "DC", cohort: pickCohort(unders, (u) => /superman|action/i.test(u.series)), nodes: ["lexcorp", "lex_luthor", "metropolis"] },
    { sym: "CONG-OSCP", name: "Oscorp Defense & Biotech Group", universe: "Marvel", cohort: pickCohort(unders, (u) => /spider-man/i.test(u.series)), nodes: ["oscorp", "green_goblin", "spider_man"] },
  ];
  conglomerates.forEach((cg, idx) => {
    const st = basketStats(cg.cohort, cg.nodes, shocks);
    const holdingNav = st.unitNav * (1 + st.cond.flow) * (1 - 0.15); // 15% conglomerate holding discount
    out.push(
      mkAsset(
        "CONGLOMERATE",
        idx,
        cg.sym,
        cg.name,
        `Holding Co. NAV across ${st.n} equities · 15% holding discount · σ ${(st.effectiveSigma * 100).toFixed(0)}%`,
        holdingNav,
        cg.universe,
        "Conglomerate_Unit = EquityBasket_NAV × (1 + CapitalFlow_shock) × (1 − 0.15_HoldingDiscount)",
        { linkedNav: r2(st.unitNav), capitalFlow: st.cond.flow, constituents: st.constituents, trails: st.trails },
      ),
    );
  });

  // ── FAMILY 10: FRANCHISE_IP (PUBLISHER_STOCK, FILM, FRANCHISE_ESTATE) ───
  const pubStocks: { sym: string; name: string; universe: "Marvel" | "DC" | "Composite"; cohort: Underlying[]; nodes: string[] }[] = [
    { sym: "PUB-MRVL", name: "Marvel Publishing Equity Composite", universe: "Marvel", cohort: marvelUnders, nodes: ["spider_man", "avengers", "x_men"] },
    { sym: "PUB-DC", name: "DC Comics Publishing Equity Composite", universe: "DC", cohort: dcUnders, nodes: ["batman", "superman", "justice_league"] },
    { sym: "PUB-INDY", name: "Independent & Sovereign Publishers Composite", universe: "Composite", cohort: indieUnders, nodes: [] },
  ];
  pubStocks.forEach((ps, idx) => {
    const st = basketStats(ps.cohort, ps.nodes, shocks);
    out.push(
      mkAsset(
        "PUBLISHER_STOCK",
        idx,
        ps.sym,
        ps.name,
        `Derived from ${st.n} live publisher equities · σ ${(st.effectiveSigma * 100).toFixed(0)}% · News ×${st.meanNewsShock.toFixed(2)}`,
        st.unitNav,
        ps.universe,
        "Publisher_Composite = (Σ Equity_FMV_publisher ÷ Units) × e^(newsPressure)",
        { constituentsCount: st.n, aggregateEquityFmv: r2(st.sumPrice), sigma: st.effectiveSigma, newsShock: st.meanNewsShock, constituents: st.constituents, trails: st.trails },
      ),
    );
  });

  const filmSlates: { sym: string; name: string; universe: "Marvel" | "DC"; cohort: Underlying[]; nodes: string[] }[] = [
    { sym: "FLM-SPID", name: "Spider-Verse Box Office Royalty Unit", universe: "Marvel", cohort: pickCohort(unders, (u) => /spider-man/i.test(u.series)), nodes: ["spider_man", "green_goblin"] },
    { sym: "FLM-BAT", name: "Dark Knight Cinema Royalty Unit", universe: "DC", cohort: pickCohort(unders, (u) => /batman|detective/i.test(u.series)), nodes: ["batman", "joker"] },
    { sym: "FLM-AVNG", name: "Avengers Tentpole Cinema Royalty Unit", universe: "Marvel", cohort: pickCohort(unders, (u) => /avengers|iron man|thor/i.test(u.series)), nodes: ["avengers", "iron_man"] },
    { sym: "FLM-XMEN", name: "Mutant Saga Cinema Royalty Unit", universe: "Marvel", cohort: pickCohort(unders, (u) => /x-men|wolverine/i.test(u.series)), nodes: ["x_men", "wolverine"] },
    { sym: "FLM-SUP", name: "Man of Steel Cinema Royalty Unit", universe: "DC", cohort: pickCohort(unders, (u) => /superman|action/i.test(u.series)), nodes: ["superman", "lex_luthor"] },
  ];
  filmSlates.forEach((fl, idx) => {
    const st = basketStats(fl.cohort, fl.nodes, shocks);
    const hypeBoost = 1 + 0.45 * (st.cond.volMult - 1) + 0.25 * globalHype;
    const filmUnit = st.unitNav * 0.4 * hypeBoost;
    out.push(
      mkAsset(
        "FILM",
        idx,
        fl.sym,
        fl.name,
        `Media royalty unit · ${st.n} debut equities · Hype Mult ×${hypeBoost.toFixed(2)}`,
        filmUnit,
        fl.universe,
        "Film_Unit = 0.40 × LinkedEquityBasket_NAV × (1 + 0.45·NewsVolBoost + 0.25·GlobalHype)",
        { linkedNav: r2(st.unitNav), hypeBoost, constituents: st.constituents, trails: st.trails },
      ),
    );

    // FRANCHISE_ESTATE: Full-lifecycle IP Royalty Trust (publishing + licensing + film)
    const estateUnit = st.unitNav * 1.25 * (1 + 0.2 * (st.cond.volMult - 1));
    out.push(
      mkAsset(
        "FRANCHISE_ESTATE",
        idx,
        fl.sym.replace("FLM-", "EST-"),
        fl.name.replace("Box Office Royalty Unit", "IP Estate Trust").replace("Cinema Royalty Unit", "IP Estate Trust"),
        `Full IP estate backed by ${st.n} equities · News-linked valuation`,
        estateUnit,
        fl.universe,
        "Franchise_Estate = 1.25 × LinkedEquityBasket_NAV × (1 + 0.20·NewsVolBoost)",
        { linkedNav: r2(st.unitNav), constituents: st.constituents, trails: st.trails },
      ),
    );
  });

  // ── FAMILY 11 & 12: MARVEL & DC HERO SURFACES (ALIAS, TEAM, TEAM_UP, EVENT, CROSSOVER, DC_TEAM) ──
  const basketConfigs: {
    surface: SurfaceKey;
    sym: string;
    name: string;
    universe: "Marvel" | "DC" | "Composite";
    match: (u: Underlying) => boolean;
    nodes: string[];
  }[] = [
    // ALIAS (Marvel secret identities / alter egos)
    { surface: "ALIAS", sym: "AL-PARKR", name: "Peter Parker Alter-Ego Basket", universe: "Marvel", match: (u) => /spider-man/i.test(u.series), nodes: ["peter_parker", "spider_man"] },
    { surface: "ALIAS", sym: "AL-STARK", name: "Tony Stark Alter-Ego Basket", universe: "Marvel", match: (u) => /iron man|tales of suspense/i.test(u.series), nodes: ["iron_man", "stark_industries"] },
    { surface: "ALIAS", sym: "AL-BANNR", name: "Bruce Banner Alter-Ego Basket", universe: "Marvel", match: (u) => /hulk/i.test(u.series), nodes: ["hulk"] },
    // TEAM (Marvel)
    { surface: "TEAM", sym: "TM-AVNG", name: "The Avengers Team Equity Basket", universe: "Marvel", match: (u) => /avengers/i.test(u.series), nodes: ["avengers", "iron_man", "hulk"] },
    { surface: "TEAM", sym: "TM-XMEN", name: "X-Men Mutant Team Equity Basket", universe: "Marvel", match: (u) => /x-men/i.test(u.series), nodes: ["x_men", "wolverine"] },
    { surface: "TEAM", sym: "TM-FF4", name: "Fantastic Four First Family Basket", universe: "Marvel", match: (u) => /fantastic four/i.test(u.series), nodes: ["fantastic_four", "doom"] },
    // TEAM_UP
    { surface: "TEAM_UP", sym: "TU-SPID", name: "Marvel Team-Up & Duo Basket", universe: "Marvel", match: (u) => /team-up|spider-man|avengers/i.test(u.series), nodes: ["spider_man", "daredevil", "fantastic_four"] },
    { surface: "TEAM_UP", sym: "TU-WFIN", name: "World's Finest Hero Duo Basket", universe: "DC", match: (u) => /world's finest|batman|superman/i.test(u.series), nodes: ["batman", "superman"] },
    // EVENT
    { surface: "EVENT", sym: "EV-SWAR", name: "Secret Wars & Cosmic Event Basket", universe: "Marvel", match: (u) => /secret wars|infinity|crisis/i.test(u.series), nodes: ["spider_man", "avengers", "fantastic_four"] },
    { surface: "EVENT", sym: "EV-CRSS", name: "Crisis & Multiverse Event Basket", universe: "DC", match: (u) => /crisis|justice|watchmen/i.test(u.series), nodes: ["justice_league", "batman", "superman"] },
    // CROSSOVER
    { surface: "CROSSOVER", sym: "XO-MRVDC", name: "Cross-Title Mega-Crossover Basket", universe: "Composite", match: (u) => /x-men|avengers|justice|spider-man/i.test(u.series), nodes: ["avengers", "x_men", "justice_league"] },
    { surface: "CROSSOVER", sym: "XO-STLK", name: "Street-Level Defenders Crossover Basket", universe: "Marvel", match: (u) => /daredevil|spider-man|punisher/i.test(u.series), nodes: ["daredevil", "spider_man", "kingpin"] },
    // DC_TEAM
    { surface: "DC_TEAM", sym: "DCT-JLA", name: "Justice League of America Basket", universe: "DC", match: (u) => /justice|brave and the bold|batman|superman/i.test(u.series), nodes: ["justice_league", "batman", "superman"] },
    { surface: "DC_TEAM", sym: "DCT-TTNS", name: "Teen Titans & Young Heroes Basket", universe: "DC", match: (u) => /titans|robin|batman/i.test(u.series), nodes: ["robin", "batman"] },
    { surface: "DC_TEAM", sym: "DCT-JSA", name: "Justice Society Golden Age Basket", universe: "DC", match: (u) => /all-star|flash|green lantern/i.test(u.series), nodes: ["justice_league"] },
    // FAMILY 13: VILLAIN_TEAM, NEMESIS, COSMIC
    { surface: "VILLAIN_TEAM", sym: "VT-SIN6", name: "Sinister Six Syndicate Basket", universe: "Marvel", match: (u) => /spider-man/i.test(u.series), nodes: ["green_goblin", "spider_man"] },
    { surface: "VILLAIN_TEAM", sym: "VT-DOOM", name: "Legion of Doom Syndicate Basket", universe: "DC", match: (u) => /batman|superman|justice/i.test(u.series), nodes: ["lex_luthor", "joker"] },
    { surface: "COSMIC", sym: "CSM-GAL", name: "Galactus & Cosmic Entities Basket", universe: "Marvel", match: (u) => /fantastic four|silver surfer|warlock|infinity/i.test(u.series), nodes: ["galactus", "silver_surfer"] },
    { surface: "COSMIC", sym: "CSM-NEWG", name: "Fourth World & Darkseid Cosmic Basket", universe: "DC", match: (u) => /new gods|forever people|mister miracle/i.test(u.series), nodes: ["justice_league", "superman"] },
    // FAMILY 14: GADGET, WEAPON, REALITY, LEGACY, SIDEKICK
    { surface: "GADGET", sym: "GDG-BAT", name: "Bat-Tech & Utility Arsenal Basket", universe: "DC", match: (u) => /batman|detective/i.test(u.series), nodes: ["batman", "wayne_enterprises"] },
    { surface: "GADGET", sym: "GDG-WEB", name: "Web-Shooters & Stark Tech Basket", universe: "Marvel", match: (u) => /spider-man|iron man/i.test(u.series), nodes: ["spider_man", "iron_man"] },
    { surface: "WEAPON", sym: "WPN-SHLD", name: "Vibranium Shield & Cosmic Weapons Basket", universe: "Marvel", match: (u) => /captain america|thor|avengers/i.test(u.series), nodes: ["avengers", "vibranium"] },
    { surface: "WEAPON", sym: "WPN-RING", name: "Power Ring & Lasso Artifacts Basket", universe: "DC", match: (u) => /green lantern|wonder woman/i.test(u.series), nodes: ["justice_league"] },
    { surface: "REALITY", sym: "RLT-616", name: "Earth-616 Continuity Prime Index", universe: "Marvel", match: (u) => (u.publisher || "").toLowerCase().includes("marvel"), nodes: ["spider_man", "avengers", "x_men"] },
    { surface: "REALITY", sym: "RLT-PRME", name: "DC Prime Earth Continuity Index", universe: "DC", match: (u) => (u.publisher || "").toLowerCase().startsWith("dc"), nodes: ["batman", "superman", "justice_league"] },
    { surface: "LEGACY", sym: "LGC-MANT", name: "Heroic Mantle & Legacy Torch Basket", universe: "Composite", match: (u) => /flash|green lantern|spider-man|batman/i.test(u.series), nodes: ["robin", "batman", "spider_man"] },
    { surface: "SIDEKICK", sym: "SDK-ROBN", name: "Robin & Partner Sidekick Equity Basket", universe: "DC", match: (u) => /detective|batman|robin/i.test(u.series), nodes: ["robin", "alfred", "batman"] },
    { surface: "SIDEKICK", sym: "SDK-BUCK", name: "Bucky & Marvel Sidekick Equity Basket", universe: "Marvel", match: (u) => /captain america|avengers/i.test(u.series), nodes: ["avengers"] },
    // FAMILY 15: LOCATION, STORY_ARC, ORIGIN_STORY
    { surface: "LOCATION", sym: "LOC-GOTH", name: "Gotham City Canon Equity Footprint", universe: "DC", match: (u) => /batman|detective/i.test(u.series), nodes: ["gotham", "batman", "joker"] },
    { surface: "LOCATION", sym: "LOC-METR", name: "Metropolis Canon Equity Footprint", universe: "DC", match: (u) => /superman|action/i.test(u.series), nodes: ["metropolis", "superman", "lex_luthor"] },
    { surface: "LOCATION", sym: "LOC-NYC", name: "Marvel Manhattan Canon Footprint", universe: "Marvel", match: (u) => /spider-man|daredevil|fantastic|avengers/i.test(u.series), nodes: ["new_york", "spider_man", "daredevil"] },
    { surface: "LOCATION", sym: "LOC-WAK", name: "Wakanda Canon Equity Footprint", universe: "Marvel", match: (u) => /black panther|fantastic|avengers/i.test(u.series), nodes: ["wakanda", "black_panther", "vibranium"] },
    { surface: "STORY_ARC", sym: "ARC-PHNX", name: "Dark Phoenix & Mutant Arc Basket", universe: "Marvel", match: (u) => /x-men/i.test(u.series), nodes: ["x_men", "wolverine"] },
    { surface: "STORY_ARC", sym: "ARC-DKR", name: "Dark Knight & Year One Arc Basket", universe: "DC", match: (u) => /batman|dark knight|detective/i.test(u.series), nodes: ["batman", "joker"] },
    { surface: "STORY_ARC", sym: "ARC-GAL", name: "Galactus Trilogy Story Arc Basket", universe: "Marvel", match: (u) => /fantastic four|silver surfer/i.test(u.series), nodes: ["fantastic_four", "silver_surfer"] },
    { surface: "ORIGIN_STORY", sym: "ORG-GOLD", name: "Golden Age First-Appearance Origin Basket", universe: "Composite", match: (u) => u.era === "GOLDEN", nodes: ["batman", "superman"] },
    { surface: "ORIGIN_STORY", sym: "ORG-SLV", name: "Silver Age First-Appearance Origin Basket", universe: "Composite", match: (u) => u.era === "SILVER", nodes: ["spider_man", "fantastic_four", "x_men"] },
    { surface: "SECRET_IDENTITY", sym: "SID-WAYNE", name: "Bruce Wayne Dual-Identity Risk Basket", universe: "DC", match: (u) => /batman|detective/i.test(u.series), nodes: ["bruce_wayne", "batman"] },
    { surface: "SECRET_IDENTITY", sym: "SID-KENT", name: "Clark Kent Dual-Identity Risk Basket", universe: "DC", match: (u) => /superman|action/i.test(u.series), nodes: ["clark_kent", "superman"] },
  ];

  const surfCounter = new Map<SurfaceKey, number>();
  for (const bc of basketConfigs) {
    const cohort = pickCohort(unders, bc.match);
    const st = basketStats(cohort, bc.nodes, shocks);
    const idx = surfCounter.get(bc.surface) ?? 0;
    surfCounter.set(bc.surface, idx + 1);
    out.push(
      mkAsset(
        bc.surface,
        idx,
        bc.sym,
        bc.name,
        `${st.n} underlying equities · Basket σ ${(st.effectiveSigma * 100).toFixed(0)}% · News ×${st.cond.volMult.toFixed(2)}`,
        st.unitNav,
        bc.universe,
        "Basket_NAV = (Σ Equity_FMV_linked ÷ Units) × e^(newsPressure)",
        { constituentsCount: st.n, aggregateEquityFmv: r2(st.sumPrice), units: st.units, sigma: st.effectiveSigma, newsVolMult: st.cond.volMult, constituents: st.constituents, trails: st.trails },
      ),
    );
  }

  // NEMESIS: Long Hero / Short Villain spread pair derivatives!
  const nemesisPairs: { sym: string; name: string; universe: "Marvel" | "DC"; heroNode: string; villainNode: string; match: (u: Underlying) => boolean }[] = [
    { sym: "NEM-BATJOK", name: "Batman vs. Joker Nemesis Spread", universe: "DC", heroNode: "batman", villainNode: "joker", match: (u) => /batman|detective/i.test(u.series) },
    { sym: "NEM-SPDGOB", name: "Spider-Man vs. Green Goblin Spread", universe: "Marvel", heroNode: "spider_man", villainNode: "green_goblin", match: (u) => /spider-man/i.test(u.series) },
    { sym: "NEM-SUPLEX", name: "Superman vs. Lex Luthor Spread", universe: "DC", heroNode: "superman", villainNode: "lex_luthor", match: (u) => /superman|action/i.test(u.series) },
    { sym: "NEM-FFDOOM", name: "Fantastic Four vs. Doctor Doom Spread", universe: "Marvel", heroNode: "fantastic_four", villainNode: "doom", match: (u) => /fantastic four/i.test(u.series) },
  ];
  nemesisPairs.forEach((np, idx) => {
    const st = basketStats(pickCohort(unders, np.match), [np.heroNode, np.villainNode], shocks);
    const hPress = conditionsFor(shocks.get(np.heroNode)).pressure;
    const vPress = conditionsFor(shocks.get(np.villainNode)).pressure;
    const spreadPx = Math.max(5, st.unitNav * Math.exp(hPress - vPress));
    out.push(
      mkAsset(
        "NEMESIS",
        idx,
        np.sym,
        np.name,
        `Relative pair derivative · Hero/Villain pressure Δ ${(hPress - vPress >= 0 ? "+" : "")}${((hPress - vPress) * 100).toFixed(1)}%`,
        spreadPx,
        np.universe,
        "Nemesis_Spread = EquityBasket_NAV × e^(Pressure_Hero − Pressure_Villain)",
        { heroNode: np.heroNode, villainNode: np.villainNode, heroPressure: hPress, villainPressure: vPress, constituents: st.constituents, trails: st.trails },
      ),
    );
  });

  // ── FAMILY 16: PREDICTION_DIGITAL (ALL 16 SURFACES IN FAMILY 16) ────────
  // 16A. PREDICTION: Always emit equity-catalyst & volatility binary markets derived from live shocks + equities
  const catalystPredictions: { sym: string; name: string; node: string; cohort: Underlying[] }[] = [
    { sym: "PRD-BATV", name: "Batman Equity Vol > 25% by Next 3rd Friday", node: "batman", cohort: pickCohort(unders, (u) => /batman|detective/i.test(u.series)) },
    { sym: "PRD-SPDV", name: "Spider-Man Basket Outperforms CE70 This Month", node: "spider_man", cohort: pickCohort(unders, (u) => /spider-man/i.test(u.series)) },
    { sym: "PRD-GOTH", name: "Gotham Muni Spread Widens > 25bps This Cycle", node: "gotham", cohort: dcUnders },
  ];
  catalystPredictions.forEach((cp, idx) => {
    const st = basketStats(cp.cohort, [cp.node], shocks);
    const prob = Math.min(0.95, Math.max(0.05, 0.5 + st.cond.pressure * 0.8 + (st.effectiveSigma - 0.2) * 0.6));
    const px = prob * 100; // USD per $100 binary payout
    out.push(
      mkAsset(
        "PREDICTION",
        100 + idx,
        cp.sym,
        cp.name,
        `Implied Prob ${(prob * 100).toFixed(1)}% · Pays $100 if Yes · Driven by live σ & news`,
        px,
        "Derivative",
        "P_yes = clamp(0.50 + 0.8·NewsPressure + 0.6·(σ_eq − 0.20), 0.05, 0.95) × $100",
        { impliedProbability: prob, sigma: st.effectiveSigma, newsPressure: st.cond.pressure, constituents: st.constituents, trails: st.trails },
      ),
    );
  });

  // 16B. MACRO: Cross-Era Breadth & Market Regime Indicators
  const macroSpecs = [
    { sym: "MAC-STRS", name: "Panel Systemic Volatility & Stress Gauge", val: 100 * (1 + mktStats.effectiveSigma + globalStress), desc: `Aggregate equity σ ${(mktStats.effectiveSigma * 100).toFixed(1)}% · Stress ${(globalStress * 100).toFixed(1)}%` },
    { sym: "MAC-LIQ", name: "Comic Market Liquidity Breadth Index", val: 100 * (unders.filter((u) => u.state === "OPEN").length / Math.max(1, unders.length) + 0.5), desc: `${unders.filter((u) => u.state === "OPEN").length}/${unders.length} equities in OPEN liquidity state` },
  ];
  macroSpecs.forEach((ms, idx) => {
    out.push(
      mkAsset("MACRO", idx, ms.sym, ms.name, ms.desc, ms.val, "Composite", "Macro_Gauge = f(Aggregate_Equity_σ, Liquidity_State_Breadth, Graph_Stress)", {
        equityCount: unders.length,
        avgSigma: mktStats.effectiveSigma,
        globalStress,
        globalHype,
      }),
    );
  });

  // 16C. QUANT: Systematic Factor Portfolios derived from real underlying equities
  const lowVol = unders.slice().sort((a, b) => a.sigma - b.sigma).slice(0, 12);
  const highMom = unders
    .slice()
    .sort((a, b) => {
      const ra = a.history.length >= 2 ? a.price / a.history[0].value : 1;
      const rb = b.history.length >= 2 ? b.price / b.history[0].value : 1;
      return rb - ra;
    })
    .slice(0, 12);
  [
    { sym: "QNT-LVOL", name: "Low-Volatility Quality Factor Basket", cohort: lowVol },
    { sym: "QNT-MOMO", name: "Multi-Year Equity Momentum Factor Basket", cohort: highMom },
  ].forEach((q, idx) => {
    const st = basketStats(q.cohort, [], shocks);
    out.push(
      mkAsset("QUANT", idx, q.sym, q.name, `Systematic ${st.n}-equity factor · Avg σ ${(st.effectiveSigma * 100).toFixed(1)}%`, st.unitNav, "Asset Class", "Factor_NAV = (Σ w_factor · Equity_FMV ÷ Units)", {
        constituents: st.constituents,
        sigma: st.effectiveSigma,
      }),
    );
  });

  // 16D. HEDGE, LONG_SHORT, MANAGED_FUTURES, CONCENTRATED, DISTRESSED, MERGER_ARB, SPECIAL_SITUATIONS, CATALYST
  const strategySpecs: { surface: SurfaceKey; sym: string; name: string; cohort: Underlying[]; mult: number; formula: string; note: string }[] = [
    { surface: "HEDGE", sym: "HDG-ALPH", name: "Sovereign All-Weather Comic Hedge Fund", cohort: unders.slice(0, 15), mult: 1 - FUND.expenseRatioByType.HEDGED, formula: "Hedge_NAV = EquityBasket_NAV × (1 − ER_hedged)", note: "Multi-era hedged equity exposure" },
    { surface: "LONG_SHORT", sym: "LS-MRVDC", name: "Long Marvel / Short DC Relative Value Fund", cohort: marvelUnders.slice(0, 12), mult: Math.max(0.5, 1 + (basketStats(marvelUnders, [], shocks).avgReturn - basketStats(dcUnders, [], shocks).avgReturn) * 0.2), formula: "LS_NAV = LongBasket_NAV × (1 + 0.2·(R_Marvel − R_DC))", note: "Market-neutral publisher spread" },
    { surface: "MANAGED_FUTURES", sym: "MF-CARRY", name: "CTA Managed Comic Futures Carry Fund", cohort: unders.slice(0, 12), mult: Math.exp((treasuryYield(0.5) + 0.008) * 0.5), formula: "CTA_NAV = Σ Futures_F0(S, r, u, y, 6M) ÷ Units", note: "Systematic futures carry & trend" },
    { surface: "CONCENTRATED", sym: "CNC-TOP5", name: "Top-5 High-Conviction Sovereign Fund", cohort: unders.slice(0, 5), mult: 1 - FUND.expenseRatioByType.ACTIVE, formula: "Conc_NAV = Top5_Equities_NAV × (1 − ER_active)", note: "Concentrated 5-book blue-chip conviction" },
    { surface: "DISTRESSED", sym: "DST-THIN", name: "Stressed & Thin-Float Liquidity Recovery Fund", cohort: pickCohort(unders, (u) => u.state === "STRESSED" || u.state === "THIN"), mult: 0.72, formula: "Distressed_NAV = StressedEquities_NAV × 0.72_LiquidityHaircut", note: "Acquires stressed/thin float at 28% haircut" },
    { surface: "MERGER_ARB", sym: "MARB-IP", name: "Media Conglomerate IP Merger Arb Fund", cohort: pickCohort(unders, (u) => /x-men|fantastic|spider-man|batman/i.test(u.series)), mult: 1 + 0.15 * globalHype, formula: "MergerArb_NAV = CrossoverEquities_NAV × (1 + 0.15·GlobalHype)", note: "Captures studio consolidation & rights convergence" },
    { surface: "SPECIAL_SITUATIONS", sym: "SPCL-EV", name: "Grading & Pedigree Special Situations Fund", cohort: pickCohort(unders, (u) => u.tier === "mythic" || u.tier === "legendary"), mult: 1.05, formula: "SpecialSit_NAV = MythicLegendary_NAV × 1.05_PedigreeFactor", note: "Targets pedigree & grade-bump catalysts" },
    { surface: "CATALYST", sym: "CAT-NEWS", name: "Breaking News Catalyst Momentum Fund", cohort: pickCohort(unders, (u) => u.newsShock > 1.0 || u.trails.length > 0), mult: 1 + 0.3 * globalHype, formula: "Catalyst_NAV = NewsShockedEquities_NAV × (1 + 0.30·GlobalHype)", note: "Dynamic basket of actively news-shocked equities" },
  ];
  strategySpecs.forEach((sp, idx) => {
    const st = basketStats(sp.cohort, [], shocks);
    out.push(
      mkAsset(
        sp.surface,
        idx,
        sp.sym,
        sp.name,
        `${sp.note} · ${st.n} live equities · σ ${(st.effectiveSigma * 100).toFixed(0)}%`,
        st.unitNav * sp.mult,
        "Asset Class",
        sp.formula,
        { constituentsCount: st.n, baseNav: r2(st.unitNav), multiplier: sp.mult, sigma: st.effectiveSigma, constituents: st.constituents },
      ),
    );
  });

  // 16E. CRYPTO: Equity-Reserve Backed Liquidity Tokens
  const cryptoPools: { sym: string; name: string; universe: "Marvel" | "DC" | "Composite"; cohort: Underlying[]; nodes: string[] }[] = [
    { sym: "PPX-ETH", name: "Panel Reserve Liquidity Token (PPX)", universe: "Composite", cohort: unders.slice(0, 20), nodes: [] },
    { sym: "MRV-LP", name: "Marvel Vault Reserve Token (MRVL-LP)", universe: "Marvel", cohort: marvelUnders, nodes: ["spider_man", "avengers"] },
    { sym: "DCV-LP", name: "DC Sovereign Reserve Token (DCV-LP)", universe: "DC", cohort: dcUnders, nodes: ["batman", "superman"] },
  ];
  cryptoPools.forEach((cp, idx) => {
    const st = basketStats(cp.cohort, cp.nodes, shocks);
    const tokenPx = (st.unitNav / 10) * (1 + 0.25 * st.effectiveSigma);
    out.push(
      mkAsset(
        "CRYPTO",
        idx,
        cp.sym,
        cp.name,
        `Backed by ${st.n} vaulted equities · Reserve NAV/Token · σ ${(st.effectiveSigma * 100).toFixed(0)}%`,
        tokenPx,
        cp.universe,
        "Token_Price = (ReserveEquityBasket_NAV ÷ 10) × (1 + 0.25·σ_shocked)",
        { reserveNav: r2(st.unitNav), sigma: st.effectiveSigma, constituents: st.constituents, trails: st.trails },
      ),
    );
  });

  // 16F. BATTLE_STATS: Elo-Weighted Combat Power Indices derived from Hero/Villain Baskets
  const battleSpecs: { sym: string; name: string; universe: "Marvel" | "DC"; cohort: Underlying[]; nodes: string[] }[] = [
    { sym: "BTL-OMEGA", name: "Omega-Level Combat Power Index", universe: "Marvel", cohort: pickCohort(unders, (u) => /x-men|hulk|thor|silver surfer/i.test(u.series)), nodes: ["hulk", "x_men", "galactus"] },
    { sym: "BTL-TRIN", name: "DC Trinity Combat Efficiency Index", universe: "DC", cohort: pickCohort(unders, (u) => /batman|superman|wonder woman|justice/i.test(u.series)), nodes: ["batman", "superman", "justice_league"] },
  ];
  battleSpecs.forEach((bs, idx) => {
    const st = basketStats(bs.cohort, bs.nodes, shocks);
    const powerIdx = 100 * Math.exp(st.cond.pressure) * (1 + st.effectiveSigma * 0.5);
    out.push(
      mkAsset(
        "BATTLE_STATS",
        idx,
        bs.sym,
        bs.name,
        `Derived from ${st.n} combatant equities · Pressure ×${Math.exp(st.cond.pressure).toFixed(2)}`,
        powerIdx,
        bs.universe,
        "Battle_Index = 100 × e^(NewsOutcomePressure) × (1 + 0.5·σ_equities)",
        { constituents: st.constituents, pressure: st.cond.pressure, sigma: st.effectiveSigma, trails: st.trails },
      ),
    );
  });

  // 16G. CURRENCY: Universe Settlement Basket FX Units pegged to equity purchasing power & credit spreads
  const fxSpecs: { sym: string; name: string; universe: "Marvel" | "DC"; cohort: Underlying[]; nodes: string[] }[] = [
    { sym: "FX-GOTH", name: "Gotham Dollar Settlement Unit (GTD)", universe: "DC", cohort: dcUnders, nodes: ["gotham", "wayne_enterprises"] },
    { sym: "FX-WAK", name: "Wakandan Vibranium Standard (WKV)", universe: "Marvel", cohort: marvelUnders, nodes: ["wakanda", "vibranium"] },
    { sym: "FX-LATV", name: "Latverian Franc Settlement Unit (LTF)", universe: "Marvel", cohort: pickCohort(unders, (u) => /fantastic four/i.test(u.series)), nodes: ["doom", "fantastic_four"] },
  ];
  fxSpecs.forEach((fx, idx) => {
    const st = basketStats(fx.cohort, fx.nodes, shocks);
    // Pegged around $100 par purchasing power basket, moving with equity return and credit stress
    const fxRate = 100 * Math.exp(st.cond.pressure * 0.5 - st.cond.creditAdd * 8) * (1 + Math.max(-0.2, Math.min(0.4, st.avgReturn * 0.1)));
    out.push(
      mkAsset(
        "CURRENCY",
        idx,
        fx.sym,
        fx.name,
        `FX basket vs USD · Credit Δ ${(st.cond.creditAdd * 10000).toFixed(0)} bps · ${st.n} equities`,
        fxRate,
        fx.universe,
        "FX_Rate = 100 × e^(0.5·NewsPressure − 8·CreditSpread) × (1 + 0.1·R_basket)",
        { creditAddBps: st.cond.creditAdd * 10000, pressure: st.cond.pressure, constituents: st.constituents, trails: st.trails },
      ),
    );
  });

  // 16H. CREATOR: Creator Royalty Indices derived strictly from each creator's landmark underlying comics
  const creatorSpecs: { sym: string; name: string; match: (u: Underlying) => boolean; nodes: string[] }[] = [
    { sym: "CR-KIRBY", name: "Jack Kirby Sovereign Creator Index", match: (u) => /fantastic four|avengers|x-men|captain america|new gods|thor/i.test(u.series), nodes: ["fantastic_four", "avengers", "x_men"] },
    { sym: "CR-DITKO", name: "Steve Ditko Sovereign Creator Index", match: (u) => /spider-man|strange tales|amazing fantasy/i.test(u.series), nodes: ["spider_man"] },
    { sym: "CR-MILLR", name: "Frank Miller Noir Creator Index", match: (u) => /daredevil|batman|dark knight|wolverine/i.test(u.series), nodes: ["batman", "daredevil", "wolverine"] },
    { sym: "CR-MOORE", name: "Alan Moore Literary Creator Index", match: (u) => /watchmen|swamp thing|miracleman|batman/i.test(u.series), nodes: ["batman"] },
    { sym: "CR-CLARM", name: "Chris Claremont Mutant Era Index", match: (u) => /x-men|wolverine/i.test(u.series), nodes: ["x_men", "wolverine"] },
  ];
  creatorSpecs.forEach((cr, idx) => {
    const st = basketStats(pickCohort(unders, cr.match), cr.nodes, shocks);
    out.push(
      mkAsset(
        "CREATOR",
        idx,
        cr.sym,
        cr.name,
        `Creator equity index across ${st.n} signature books · σ ${(st.effectiveSigma * 100).toFixed(0)}%`,
        st.unitNav,
        "Composite",
        "Creator_Index = (Σ Creator_Signature_Equity_FMV ÷ Units) × e^(newsPressure)",
        { constituentsCount: st.n, aggregateEquityFmv: r2(st.sumPrice), sigma: st.effectiveSigma, constituents: st.constituents, trails: st.trails },
      ),
    );
  });

  return out;
}
