import { describe, expect, it } from "vitest";
import spec from "../lib/assets/canon/PP_Parameter_Spec_v1.0.0_LOCKED.json";
import {
  blackScholes, bondPrice, effectiveVolatility, futuresPrice, indexLevel, indexFundSharePrice, normCdf,
  newsShockMultiplier, realizedVolatility, realizedVolatilityDated, requiredYield, redemptionGate,
  privateCapitalUnitValue, commodityPrice, combineSourceVolatilities,
} from "../lib/assets/canon-formulas";
import {
  ANNUALIZATION_A, CREDIT_SPREAD_INSTITUTIONAL, CREDIT_SPREAD_PUBLISHER, FUND, OPTION, RECOVERY_INST_ISSUE, treasuryYield, bondLiquiditySpread,
} from "../lib/assets/canon-params";
import { buildChain } from "../lib/assets/option-chain";

describe("params match the locked spec", () => {
  it("globals, credit, recovery, option, fund tables", () => {
    expect(ANNUALIZATION_A).toBe(spec.globals.annualization_factor_A);
    expect(CREDIT_SPREAD_INSTITUTIONAL).toEqual(spec.bonds.credit_spreads.institutional_by_era);
    expect(CREDIT_SPREAD_PUBLISHER).toEqual(spec.bonds.credit_spreads.publisher_by_cap_tier);
    expect(RECOVERY_INST_ISSUE).toEqual(spec.bonds.recovery_rates.INST_ISSUE);
    expect(OPTION.sigmaEffPhi).toEqual(spec.options.volatility.sigma_eff_multiplier_by_liquidity_state_phi);
    expect(OPTION.gates.aveVolatilityMax).toBe(spec.options.issuance_gates.require_ave_volatility_max);
    expect(FUND.haircut).toEqual(spec.funds.redemption_gating.liquidation_capacity_cap_i.haircuts);
    expect(FUND.stressCorrelationPsi).toEqual(spec.funds.stress_correlation_multiplier_psi);
  });
  it("treasury curve steps", () => {
    expect([0.5, 1, 2, 4, 8, 15].map(treasuryYield)).toEqual([0.035, 0.035, 0.038, 0.04, 0.042, 0.044]);
  });
});

describe("formulas", () => {
  it("normal cdf", () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6);
    expect(normCdf(1.96)).toBeCloseTo(0.975, 4);
  });
  it("Black–Scholes known value and put–call parity", () => {
    const S = 100, K = 100, T = 1, r = 0.05, s = 0.2;
    const bs = blackScholes(S, K, T, r, s)!;
    expect(bs.call).toBeCloseTo(10.4506, 3);
    expect(bs.put).toBeCloseTo(5.5735, 3);
    expect(bs.call - bs.put).toBeCloseTo(S - K * Math.exp(-r * T), 6);
    expect(bs.gamma).toBeGreaterThan(0);
    expect(bs.callTheta).toBeLessThan(0);
  });
  it("rejects degenerate inputs", () => {
    expect(blackScholes(100, 100, 0, 0.05, 0.2)).toBeNull();
    expect(blackScholes(100, 100, 1, 0.05, 0)).toBeNull();
  });
  it("realised vol uses sample variance and sqrt(A)", () => {
    const px = [100, 110, 99, 105];
    const lr = [Math.log(1.1), Math.log(99 / 110), Math.log(105 / 99)];
    const m = lr.reduce((a, b) => a + b) / 3;
    const v = lr.reduce((a, b) => a + (b - m) ** 2, 0) / 2;
    expect(realizedVolatility(px, 252)).toBeCloseTo(Math.sqrt(v) * Math.sqrt(252), 10);
    expect(realizedVolatility([100, 101], 252)).toBeNull();
  });
  it("dated vol needs three points and scales with spacing", () => {
    const d = 86_400_000;
    expect(realizedVolatilityDated([{ t: 0, v: 100 }, { t: d, v: 101 }])).toBeNull();
    const daily = realizedVolatilityDated([{ t: 0, v: 100 }, { t: d, v: 103 }, { t: 2 * d, v: 99 }])!;
    const weekly = realizedVolatilityDated([{ t: 0, v: 100 }, { t: 7 * d, v: 103 }, { t: 14 * d, v: 99 }])!;
    expect(daily).toBeGreaterThan(weekly);
  });
  it("sigma_eff liquidity multiplier", () => {
    expect(effectiveVolatility(0.2, "STRESSED")).toBeCloseTo(0.27, 10);
  });
  it("source vols: worst of the sources, floored", () => {
    expect(combineSourceVolatilities([0.1, 0.3, null], 0.08)).toEqual({ sigma: 0.3, fromHistory: true });
    expect(combineSourceVolatilities([null], 0.08)).toEqual({ sigma: 0.08, fromHistory: false });
  });
  it("news shock is 1 for quiet wire and capped", () => {
    expect(newsShockMultiplier(0, 0)).toBe(1);
    expect(newsShockMultiplier(1, 1)).toBe(1);
    expect(newsShockMultiplier(10_000, 0)).toBe(2.5);
  });
  it("bond prices at par when y equals coupon, below par with liquidity spread", () => {
    expect(bondPrice(1000, 0.05, 0.05, 5)).toBeCloseTo(1000, 6);
    const y = requiredYield(5, 0.004, bondLiquiditySpread(25, 0.4, 5));
    expect(bondPrice(1000, 0.04 + 0.004, y, 5)).toBeLessThanOrEqual(1000.0001);
  });
  it("futures cost of carry", () => {
    expect(futuresPrice(100, 0.04, 0.01, 0.01, 1)).toBeCloseTo(100 * Math.exp(0.04), 8);
  });
  it("index and index-fund", () => {
    const cs = [{ price: 110, basePrice: 100, weight: 0.5 }, { price: 90, basePrice: 100, weight: 0.5 }];
    expect(indexLevel(100, cs)).toBeCloseTo(100, 10);
    const f = indexFundSharePrice(cs, 1_000_000, 10_000, 0.0025, 3);
    expect(f.fees).toBeCloseTo(7500, 6);
    expect(f.fsp).toBeCloseTo(100 - 0.75, 6);
  });
  it("redemption gating", () => {
    expect(redemptionGate(100, 200)).toEqual({ paid: 100, deferred: 0, g: 1 });
    const g = redemptionGate(200, 100);
    expect(g.g).toBe(0.5);
    expect(g.paid + g.deferred).toBeCloseTo(200, 10);
  });
  it("private capital and commodity", () => {
    expect(privateCapitalUnitValue({ netWorth: 1e9, operatingFraction: 0.5, illiquidityDiscount: 0.25, holdings: [{ q: 1, price: 1_000_000 }], units: 1e6 })).toBeCloseTo(((5e8 + 1e6) * 0.75) / 1e6, 6);
    expect(commodityPrice(1000, 2, 1, 1)).toBe(2000);
  });
});

describe("option chain", () => {
  const u: any = { id: "x", price: 5000, sigma: 0.2, state: "OPEN", label: "t" };
  it("builds skewed chain with parity-consistent legs and open interest", () => {
    const ch = buildChain(u)!;
    expect(ch.legs.length).toBe(2 * 7 * 3);
    const lowK = ch.legs.find((l) => l.type === "PUT" && l.expiryDate === ch.frontExpiryDate && l.moneyness < 0.85)!;
    const atm = ch.legs.find((l) => l.type === "PUT" && l.expiryDate === ch.frontExpiryDate && Math.abs(l.moneyness - 1) < 0.01)!;
    expect(lowK.iv).toBeGreaterThan(atm.iv); // downside skew
    expect(Math.abs(atm.intrinsicValue + atm.timeValue - atm.premium)).toBeLessThan(1e-6);
    // Live exchange open interest starts at 0 until real contracts are written (Zero Fake Data Covenant)
    expect(ch.openInterestCalls).toBe(0);
    expect(ch.openInterestPuts).toBe(0);
    expect(ch.putCallRatio).toBeNull();
  });
  it("no chain for LOCKED books", () => {
    expect(buildChain({ ...u, state: "LOCKED" })).toBeNull();
  });
});
