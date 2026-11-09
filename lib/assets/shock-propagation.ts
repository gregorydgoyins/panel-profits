/**
 * Butterfly propagation. News and game events name entities; their intensity travels along the graph edges,
 * damped per hop and decaying over time, and lands as market conditions on the nodes it reaches:
 * volatility, liquidity stress, credit spreads, and (where an edge carries benefit) capital flows.
 *
 * Canon boundary: narrative sets velocity and risk — volatility, liquidity, credit — it never sets fundamental value.
 * The only place a shock moves a value is a capital-flow edge into a benefactor (Gotham relief funding to Wayne).
 */
import { EDGES, NODES, matchEntities, nodeById, type GraphEdge } from "./entity-graph";
import type { LiquidityState } from "./canon-params";
import { regimeMultiplier, timeKernel, transmissionDraw } from "./market-dynamics";
import { PRESSURE_CAP, effectsOfOutcome, type Outcome } from "./outcomes";
import { CATALYST_PRICE_STRENGTH, isListicle, priceText } from "./news-price-params";

export type EventKind = "DAMAGE" | "SCARE" | "HYPE" | "MARKET" | "CAPITAL";
export interface MarketEvent {
  id: string;
  kind: EventKind;
  /** origin nodes the event names */
  origins: string[];
  /** 0..1 */
  intensity: number;
  at: number; // ms
  headline: string;
  url?: string;
  source: "wire" | "game";
  /**
   * Signed catalyst price channel scope. Wire stories set this from headline + lead sentence only (see
   * news-price-params.ts priceText / isListicle): `null` means the story carries no price effect (listicle, or no
   * entity/kind in the headline or lead). Undefined (e.g. game events) means the price channel uses kind/origins/intensity.
   */
  price?: { kind: EventKind; intensity: number; origins: string[] } | null;
}

/** Half-life in days by kind. */
export const HALF_LIFE_DAYS: Record<EventKind, number> = { SCARE: 3, DAMAGE: 14, HYPE: 5, MARKET: 7, CAPITAL: 10 };
export const HOP_DAMPING = 0.7;
export const MAX_HOPS = 4;

/**
 * Severity tiers. A threat or a scare is not damage: it barely moves a price. Real harm moves it more, and
 * only wholesale destruction moves it a lot. (A war scare lifts oil a few percent; an actual outage lifts it tens.)
 */
const LEXICON: { kind: EventKind; base: number; terms: string[] }[] = [
  { kind: "SCARE", base: 0.15, terms: ["scare", "threat", "threatens", "rumor", "rumour", "warns", "warning", "tension", "fears", "standoff", "plot", "unrest"] },
  { kind: "DAMAGE", base: 0.5, terms: ["attack", "explosion", "bomb", "rampage", "riot", "hostage", "destroy", "collapse", "flood", "burn", "wreck", "damage", "siege"] },
  { kind: "DAMAGE", base: 0.85, terms: ["devastat", "leveled", "levelled", "citywide", "invasion", "massacre", "obliterat"] },
  { kind: "HYPE", base: 0.4, terms: ["casting", "trailer", "movie", "film", "series", "box office", "adaptation", "reboot", "announced", "debut", "disney+"] },
  { kind: "MARKET", base: 0.3, terms: ["auction", "record sale", "sold for", "heritage", "sells for", "cgc", "census"] },
  { kind: "CAPITAL", base: 0.25, terms: ["ipo", "bond", "raises", "funding", "acquire", "acquisition", "merger", "invest"] },
];

export function classifyText(text: string): { kind: EventKind; intensity: number } | null {
  const t = text.toLowerCase();
  let best: { kind: EventKind; intensity: number } | null = null;
  for (const l of LEXICON) {
    const hits = l.terms.filter((w) => t.includes(w)).length;
    if (hits === 0) continue;
    const intensity = Math.min(1, l.base + Math.min(0.15, 0.05 * (hits - 1)));
    if (!best || intensity > best.intensity) best = { kind: l.kind, intensity };
  }
  return best;
}

export function eventsFromArticles(
  articles: { id?: string | number; headline?: string | null; summary?: string | null; url?: string | null; published_at: string }[],
): MarketEvent[] {
  const out: MarketEvent[] = [];
  for (const a of articles) {
    const text = `${a.headline ?? ""} ${a.summary ?? ""}`;
    const origins = matchEntities(text);
    const cls = classifyText(text);
    if (origins.length === 0 || !cls) continue;
    // price channel: headline + lead sentence only; the entity must be named there; listicles move no price
    const pt = priceText(a.headline, a.summary);
    const pOrigins = matchEntities(pt);
    const pCls = classifyText(pt);
    const price = pOrigins.length > 0 && pCls && !isListicle(pt) ? { kind: pCls.kind, intensity: pCls.intensity, origins: pOrigins } : null;
    out.push({
      id: String(a.id ?? a.url ?? a.headline),
      kind: cls.kind, origins, intensity: cls.intensity,
      at: Date.parse(a.published_at), headline: a.headline ?? "", url: a.url ?? undefined, source: "wire",
      price,
    });
  }
  return out;
}

export interface NodeShock {
  /** Σ stress (≥0) and hype (≥0), benefit (≥0) reaching the node, each clipped to 1 */
  stress: number;
  hype: number;
  benefit: number;
  /** Signed log-premium on market price from who-won-who-lost news and directional catalysts (hype/damage/scare). Never value. */
  pressure: number;
  /**
   * The strongest causal trails, for the newsroom's wikilinks and due diligence. `at` is the story's published time (ms);
   * `pressure` is the signed price pressure this story contributed at this node (0 or absent for non-directional stories).
   */
  trails: { eventId: string; headline: string; url?: string; path: string[]; effect: number; at?: number; pressure?: number }[];
}
export type ShockMap = Map<string, NodeShock>;

const OUT = new Map<string, GraphEdge[]>();
for (const e of EDGES) OUT.set(e.from, [...(OUT.get(e.from) ?? []), e]);

/** Trails rank by the price pressure they explain first, then by raw shock effect (stress/hype-only stories). */
const byImpact = (a: NodeShock["trails"][number], b: NodeShock["trails"][number]) =>
  Math.abs(b.pressure ?? 0) - Math.abs(a.pressure ?? 0) || Math.abs(b.effect) - Math.abs(a.effect);

export function propagate(events: MarketEvent[], now: number, outcomes: Outcome[] = []): ShockMap {
  const shocks: ShockMap = new Map();
  const get = (id: string) => {
    let s = shocks.get(id);
    if (!s) shocks.set(id, (s = { stress: 0, hype: 0, benefit: 0, pressure: 0, trails: [] }));
    return s;
  };
  const regime = regimeMultiplier(events.reduce((a, e) => a + e.intensity * timeKernel(e.kind, (now - e.at) / 86_400_000), 0));
  // fatigue: how many similar events hit the same entities in the 14 days before this one
  const priorCount = (ev: MarketEvent) =>
    events.filter((o) => o !== ev && o.kind === ev.kind && o.at < ev.at && ev.at - o.at <= 14 * 86_400_000 && o.origins.some((x) => ev.origins.includes(x))).length;
  // strongest path from the origins to each reachable node (by absolute effect)
  const spread = (origins: string[], start: number) => {
    const best = new Map<string, { eff: number; path: string[] }>();
    let frontier: { id: string; eff: number; path: string[] }[] = origins.map((o) => ({ id: o, eff: start, path: [o] }));
    for (const f of frontier) best.set(f.id, { eff: f.eff, path: f.path });
    for (let hop = 0; hop < MAX_HOPS && frontier.length; hop++) {
      const next: typeof frontier = [];
      for (const f of frontier) {
        for (const e of OUT.get(f.id) ?? []) {
          if (nodeById(e.to)?.fixed) continue;
          const eff = f.eff * e.weight * HOP_DAMPING;
          if (Math.abs(eff) < 0.01) continue;
          const cur = best.get(e.to);
          if (!cur || Math.abs(eff) > Math.abs(cur.eff)) {
            const item = { id: e.to, eff, path: [...f.path, e.to] };
            best.set(e.to, { eff, path: item.path });
            next.push(item);
          }
        }
      }
      frontier = next;
    }
    return best;
  };
  for (const ev of events) {
    const prior = priorCount(ev);
    const ageDays = (now - ev.at) / 86_400_000; // future-dated stories give timeKernel 0
    const kernel = timeKernel(ev.kind, ageDays);
    const start = ev.intensity * kernel * regime;
    // stress / hype / benefit channel: full text (unchanged)
    const best = Math.abs(start) < 0.01 ? new Map<string, { eff: number; path: string[] }>() : spread(ev.origins, start);
    // directional catalyst price channel (see news-price-params.ts): headline + lead only, listicles excluded;
    // hype lifts, damage/scare weigh; clamped like outcomes
    const pc = ev.price === undefined ? { kind: ev.kind, intensity: ev.intensity, origins: ev.origins } : ev.price;
    const priceStart = pc && CATALYST_PRICE_STRENGTH[pc.kind] !== 0 ? pc.intensity * timeKernel(pc.kind, ageDays) * regime : 0;
    const priceBest = pc && Math.abs(priceStart) >= 0.01 ? spread(pc.origins, priceStart) : new Map<string, { eff: number; path: string[] }>();
    for (const id of new Set([...best.keys(), ...priceBest.keys()])) {
      const node = nodeById(id);
      if (!node || node.fixed) continue;
      const s = get(id);
      const sb = best.get(id);
      let eff = 0;
      if (sb) {
        eff = sb.eff * transmissionDraw(ev.id, id, ev.kind, prior);
        const hype = ev.kind === "HYPE" || ev.kind === "MARKET" || ev.kind === "CAPITAL";
        if (eff < 0) s.benefit = 1 - (1 - s.benefit) * (1 - -eff);
        else if (hype) s.hype = 1 - (1 - s.hype) * (1 - eff);
        else s.stress = 1 - (1 - s.stress) * (1 - eff);
      }
      const pb = priceBest.get(id);
      const px = pb && pc ? CATALYST_PRICE_STRENGTH[pc.kind] * pb.eff * transmissionDraw(ev.id, id, pc.kind, prior) : 0;
      s.pressure = Math.max(-PRESSURE_CAP, Math.min(PRESSURE_CAP, s.pressure + px));
      s.trails.push({ eventId: ev.id, headline: ev.headline, url: ev.url, path: (px !== 0 && pb ? pb.path : sb?.path) ?? [id], effect: eff, at: ev.at, pressure: px });
    }
  }
  for (const o of outcomes) {
    for (const [id, fx] of effectsOfOutcome(o, now)) {
      const s = get(id);
      s.pressure = Math.max(-PRESSURE_CAP, Math.min(PRESSURE_CAP, s.pressure + fx.pressure));
      s.stress = 1 - (1 - s.stress) * (1 - Math.min(0.95, fx.stress));
      s.hype = 1 - (1 - s.hype) * (1 - Math.min(0.95, fx.hype));
      s.benefit = 1 - (1 - s.benefit) * (1 - Math.min(0.95, fx.benefit));
      s.trails.push(fx.trail);
    }
  }
  for (const s of shocks.values()) s.trails.sort(byImpact), (s.trails = s.trails.slice(0, 5));
  return shocks;
}

// ─── how a shock lands as market conditions ─────────────────────────────────

/**
 * How hard a unit of shock hits. Tuned so a headline-grade crisis moves things the way a real stressed market does:
 * volatility up by roughly half, municipal spreads out by tens of basis points, a city trust down by low double digits.
 */
export const SENSITIVITY = {
  volStress: 0.5,
  volHype: 0.4,
  creditStress: 0.01,
  /** hazard multiplier: λ = λ0 · (1 + hazardStress · stress) */
  hazardStress: 1.5,
  /** REIT: occupancy loss and cap-rate widening per unit of stress */
  reitOccupancyLoss: 0.05,
  reitCapWidening: 0.004,
  reitCreditPassThrough: 0.1,
};

export interface Conditions {
  volMult: number;
  stateSteps: number; // how many liquidity states worse (0..2)
  creditAdd: number; // decimal spread added
  /** relative change in a benefactor's wealth from capital flows */
  flow: number;
  /** signed log-premium on market price */
  pressure: number;
}

export function conditionsFor(s: NodeShock | undefined): Conditions {
  if (!s) return { volMult: 1, stateSteps: 0, creditAdd: 0, flow: 0, pressure: 0 };
  return {
    volMult: Math.min(1.75, 1 + SENSITIVITY.volStress * s.stress + SENSITIVITY.volHype * s.hype),
    stateSteps: s.stress >= 0.9 ? 2 : s.stress >= 0.6 ? 1 : 0,
    creditAdd: Math.max(0, SENSITIVITY.creditStress * s.stress - 0.002 * s.benefit),
    flow: 0.04 * s.benefit,
    pressure: s.pressure,
  };
}

const ORDER: LiquidityState[] = ["OPEN", "THIN", "STRESSED"];
export function degradeState(state: LiquidityState, steps: number): LiquidityState {
  if (state === "LOCKED") return state;
  return ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(state) + steps)];
}

/** Combined conditions for a set of nodes (a book touches its hero, team and so on): worst stress, summed hype/benefit. */
export function conditionsForNodes(ids: string[], shocks: ShockMap): Conditions & { trails: NodeShock["trails"] } {
  const merged: NodeShock = { stress: 0, hype: 0, benefit: 0, pressure: 0, trails: [] };
  for (const id of ids) {
    const s = shocks.get(id);
    if (!s) continue;
    merged.stress = Math.max(merged.stress, s.stress);
    merged.hype = Math.min(1, merged.hype + s.hype);
    merged.benefit = Math.min(1, merged.benefit + s.benefit);
    merged.pressure = Math.max(-PRESSURE_CAP, Math.min(PRESSURE_CAP, merged.pressure + s.pressure));
    merged.trails.push(...s.trails);
  }
  merged.trails.sort(byImpact);
  return { ...conditionsFor(merged), trails: merged.trails.slice(0, 5) };
}

export { NODES };
