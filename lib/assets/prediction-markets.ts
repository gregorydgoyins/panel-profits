/**
 * Prediction markets spun out of outcomes. When a vindictive party loses, the market asks how they answer:
 * will Two-Face retaliate against Joker, who wins the rematch. Prices are probabilities (USD per $100 payout)
 * built from grievance, temperament and a rating system. Odds move only from real outcomes and news attention (no crowd jitter).
 */
import type { AssetItem } from "./types";
import { TRANSFORMS, nodeById } from "./entity-graph";
import type { Outcome } from "./outcomes";
import { conditionsFor, type ShockMap } from "./shock-propagation";

const logit = (p: number) => Math.log(p / (1 - p));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function retaliationProbability(grievance: number, vindictive: number): number {
  return 1 - Math.exp(-1.5 * vindictive * grievance);
}
export function eloWinProbability(rA: number, rB: number): number {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

export function issuePredictions(outcomes: Outcome[], shocks: ShockMap, now: number): AssetItem[] {
  const recent = outcomes.filter((o) => now - o.at <= 30 * 86_400_000 && o.winners.length && o.losers.length);
  if (recent.length === 0) return [];
  // grievance[loserPersona][winner] and ratings
  const grievance = new Map<string, number>();
  const rating = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string, d: number) => m.set(k, (m.get(k) ?? 0) + d);
  for (const o of recent) {
    const age = (now - o.at) / 86_400_000;
    for (const l of o.losers) {
      const persona = TRANSFORMS[l] ?? l;
      for (const w of o.winners) {
        bump(grievance, `${persona}>${w}`, o.intensity * Math.exp(-age / 10));
        bump(rating, w, 120 * o.intensity * Math.exp(-age / 20));
        bump(rating, persona, -120 * o.intensity * Math.exp(-age / 20) * 0.5);
      }
    }
  }
  const out: AssetItem[] = [];
  let i = 0;
  const push = (sym: string, name: string, desc: string, p: number, formula: string, params: Record<string, unknown>) => {
    const price = Math.round(clamp(p, 0.02, 0.98) * 10000) / 100; // USD per $100 payout
    out.push({
      entryId: `asset-prediction-${sym}-${i}`, assetId: `PREDICTION-${sym}`, assetType: "PREDICTION", displayRank: ++i,
      diversityBucket: "standard", symbol: sym, displayName: name, description: desc, universe: "Panel Profits",
      pricing: { fmv_usd: price, fmv: price, price, formula }, parameters: params, valueUnit: "USD",
      coverImageUrl: "/surface-art/prediction.png", coverVerified: true, quarantined: false,
    });
  };
  for (const [key, g] of grievance) {
    const [actor, target] = key.split(">");
    const a = nodeById(actor);
    const t = nodeById(target);
    const v = a?.traits?.vindictive ?? 0;
    if (!a || !t || v <= 0) continue;
    const buzz = conditionsFor(shocks.get(actor)).volMult - 1; // attention on the actor lifts the market's conviction
    const pBase = retaliationProbability(g, v);
    const pMkt = sigmoid(logit(clamp(pBase, 0.03, 0.97)) + 0.8 * buzz);
    push(`${actor}${target}RET`.toUpperCase().replace(/_/g, "").slice(0, 12), `${a.name} retaliates against ${t.name} within 30 days`, "Battle Arena prediction · pays $100 if yes", pMkt, "P=1−e^(−1.5·v·grievance), attention-adjusted", { grievance: g, temperament: v, trails: shocks.get(actor)?.trails ?? [] });
    const rA = 1500 + (rating.get(actor) ?? 0);
    const rT = 1500 + (rating.get(target) ?? 0);
    const pWin = clamp(eloWinProbability(rA, rT), 0.05, 0.95);
    push(`${actor}${target}WIN`.toUpperCase().replace(/_/g, "").slice(0, 12), `Rematch: ${a.name} beats ${t.name}`, "Battle Arena prediction · pays $100 if yes", pWin, "Elo with outcome-driven ratings", { ratingActor: rA, ratingTarget: rT });
  }
  return out;
}
