/**
 * Who won, who lost. Some news is not a hit to everyone it names: it is good for one party and bad for another.
 * "Joker wins defamation suit against Harvey Dent and Gotham City" is good for Joker holders, bad for Dent and the
 * Gotham trust — and the loser may be the dangerous one: Dent's defeat is Two-Face's opening.
 *
 * Direction lands as market-price PRESSURE (a premium or discount on top of value, fading), never as value.
 * A loser that carries real money consequences (damages, destruction) also takes stress: the credit/liquidity channel.
 */
import { TRANSFORMS, matchEntitiesWithPos, nodeById } from "./entity-graph";
import { onsetRamp, transmissionDraw } from "./market-dynamics";

export interface Outcome {
  id: string;
  type: "LEGAL" | "COMBAT" | "OUTCOME";
  winners: string[];
  losers: string[];
  intensity: number; // 0..1
  damages: boolean;
  at: number;
  headline: string;
  url?: string;
}

const WIN_VERBS = ["wins", "won", "beats", "defeats", "prevails", "triumphs", "victorious", "acquitted", "cleared", "escapes", "freed", "wins out"];
const LOSS_VERBS = ["loses", "lost", "falls to", "defeated by", "convicted", "arrested", "sentenced", "jailed", "captured", "found liable", "ordered to pay"];

export function parseOutcome(text: string): Pick<Outcome, "type" | "winners" | "losers" | "intensity" | "damages"> | null {
  const t = text.toLowerCase();
  const ents = matchEntitiesWithPos(text);
  if (ents.length === 0) return null;
  const firstAt = (verbs: string[]) => {
    let best: { idx: number; end: number } | null = null;
    for (const v of verbs) {
      const m = new RegExp(`(^|[^a-z])${v}(?![a-z])`).exec(t);
      if (m) {
        const idx = m.index + m[1].length;
        if (!best || idx < best.idx) best = { idx, end: idx + v.length };
      }
    }
    return best;
  };
  const win = firstAt(WIN_VERBS);
  const loss = firstAt(LOSS_VERBS);
  const verb = win && (!loss || win.idx <= loss.idx) ? { ...win, kind: "win" as const } : loss ? { ...loss, kind: "loss" as const } : null;
  if (!verb) return null;
  const before = ents.filter((e) => e.end <= verb.idx).map((e) => e.id);
  const after = ents.filter((e) => e.idx >= verb.end).map((e) => e.id);
  const subjects = before.length ? before.slice(-1) : [];
  let winners: string[] = [];
  let losers: string[] = [];
  if (verb.kind === "win") {
    winners = subjects;
    losers = after;
  } else {
    losers = subjects;
    winners = after;
  }
  if (winners.length === 0 && losers.length === 0) return null;
  const legal = /\b(suit|lawsuit|court|trial|verdict|ruling|defamation|libel|judge|jury|settlement|appeal)\b/.test(t);
  const combat = /\b(battle|fight|duel|brawl|showdown)\b/.test(t);
  const damages = /\b(damages|awarded|settlement|million|billion|liable|ordered to pay)\b/.test(t);
  let intensity = legal ? 0.5 : combat ? 0.6 : 0.45;
  if (/\b(landslide|crushing|decisive|stunning|shock|upset)\b/.test(t)) intensity += 0.15;
  if (damages) intensity += 0.1;
  return { type: legal ? "LEGAL" : combat ? "COMBAT" : "OUTCOME", winners, losers, intensity: Math.min(1, intensity), damages };
}

export function outcomesFromArticles(
  articles: { id?: string | number; headline?: string | null; summary?: string | null; url?: string | null; published_at: string }[],
): Outcome[] {
  const out: Outcome[] = [];
  for (const a of articles) {
    const p = parseOutcome(`${a.headline ?? ""} ${a.summary ?? ""}`);
    if (!p) continue;
    out.push({ id: String(a.id ?? a.url ?? a.headline), ...p, at: Date.parse(a.published_at), headline: a.headline ?? "", url: a.url ?? undefined });
  }
  return out;
}

/** Pressure: log-premium on market price. Biggest outcome moves a price about 6%; stacked, capped at 12%. */
export const PRESSURE_PER_INTENSITY = 0.12;
export const PRESSURE_CAP = 0.12;
// lands, firms up a touch, fades. onsetRamp makes it 0 at published_at (ramping in over ~NEWS_ONSET_TAU_HOURS) and 0 for future-dated stories.
const kernel = (ageDays: number) => onsetRamp(ageDays) * Math.exp(-Math.max(0, ageDays) / 8) * (1 + 0.25 * Math.min(1, Math.max(0, ageDays) / 1.5));

export interface OutcomeEffect {
  pressure: number;
  stress: number;
  hype: number;
  benefit: number;
  trail: { eventId: string; headline: string; url?: string; path: string[]; effect: number };
}

/** Direct effects of one outcome on each node it touches. */
export function effectsOfOutcome(o: Outcome, now: number): Map<string, OutcomeEffect> {
  const fx = new Map<string, OutcomeEffect>();
  const age = (now - o.at) / 86_400_000;
  const k = kernel(age);
  const base = o.intensity * k;
  if (base < 0.01) return fx;
  const add = (id: string, d: Partial<Omit<OutcomeEffect, "trail">>, path: string[]) => {
    const node = nodeById(id);
    if (!node || node.fixed) return;
    const draw = transmissionDraw(o.id, id, "OUTCOME", 0); // deterministic: every real outcome lands per its parsed winner/loser sign
    const cur = fx.get(id) ?? { pressure: 0, stress: 0, hype: 0, benefit: 0, trail: { eventId: o.id, headline: o.headline, url: o.url, path, effect: 0 } };
    cur.pressure += (d.pressure ?? 0) * draw;
    cur.stress += (d.stress ?? 0) * Math.abs(draw);
    cur.hype += (d.hype ?? 0) * Math.abs(draw);
    cur.benefit += (d.benefit ?? 0) * Math.abs(draw);
    cur.trail.effect = cur.pressure;
    fx.set(id, cur);
  };
  for (const w of o.winners) add(w, { pressure: PRESSURE_PER_INTENSITY * base, benefit: 0.3 * base }, [w]);
  for (const l of o.losers) {
    const node = nodeById(l);
    const money = o.damages && (node?.kind === "LOCATION" || node?.kind === "COMPANY" || node?.kind === "BENEFACTOR");
    add(l, { pressure: -PRESSURE_PER_INTENSITY * base, stress: money ? 0.5 * base : 0.15 * base }, [l]);
    // the loser may be the dangerous one
    const v = node?.traits?.vindictive ?? 0;
    if (v > 0) add(l, { hype: 0.5 * v * base }, [l]);
    const persona = TRANSFORMS[l];
    if (persona) {
      const pv = nodeById(persona)?.traits?.vindictive ?? v;
      add(persona, { pressure: PRESSURE_PER_INTENSITY * 1.4 * Math.max(v, pv) * base, hype: 0.7 * Math.max(v, pv) * base }, [l, persona]);
    }
  }
  return fx;
}

/**
 * @deprecated Crowd sentiment wobble was a hash-seeded 15-minute jitter on prediction odds — a fake price move. It now
 * always returns 0 and is no longer used; kept only so the exported signature stays stable.
 */
export function crowdWobble(key: string, now: number, sd = 0.4): number {
  void key;
  void now;
  void sd;
  return 0;
}
