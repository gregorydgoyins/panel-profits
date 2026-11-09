/**
 * News pressure on a comic: maps a book to the graph entities it is about (its series hero, plus the characters it
 * features) and reads the signed price pressure the live shock map holds for them.
 *
 * This produces a SIMULATED "news-adjusted" factor only. Callers multiply a real price by `factor` for a clearly
 * labelled simulation; the real FMV itself is never altered. No matched entities → null. No live pressure → 0
 * (callers show "no matched news", not a number).
 */
import { NODES, entitiesForSeries, nodeById } from "./entity-graph";
import { PRESSURE_CAP, type Outcome } from "./outcomes";
import type { ShockMap } from "./shock-propagation";
import {
  COMIC_CHARACTER_ALIAS_STOPLIST,
  COMIC_CHARACTER_ENTITY_WEIGHT,
  COMIC_MAX_ENTITIES,
  COMIC_MAX_STORIES,
  COMIC_SERIES_ENTITY_WEIGHT,
  PRESSURE_EPSILON,
} from "./news-price-params";

export interface ComicNewsTrail {
  eventId: string;
  headline: string;
  url?: string;
  /** ISO time the story was published, when known. */
  publishedAt: string | null;
  /** Signed contribution to the comic's price, in percent of price (log-pressure × 100, before the cap). */
  effectPct: number;
  /** Entity path the story travelled (node ids). */
  path: string[];
}

export interface ComicNewsPressure {
  /** Entity ids the comic maps to, series entities first. */
  ids: string[];
  /** Signed log-premium, clamped to ±PRESSURE_CAP. Exactly 0 when no matched story is live. */
  pressure: number;
  /** e^pressure: multiply a REAL price by this for the simulated news-adjusted price. */
  factor: number;
  trails: ComicNewsTrail[];
}

export interface ComicNewsInput {
  series?: string | null;
  characters?: (string | null | undefined)[] | null;
}

export interface ComicNewsState {
  shocks: ShockMap;
  outcomes?: Outcome[];
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
/** Exact name/alias → node, for character lists. Publishers (fixed anchors) and generic group nouns are left out. */
const CHARACTER_INDEX = new Map<string, string>();
for (const node of NODES) {
  if (node.fixed) continue;
  for (const a of [node.name, ...node.aliases].map(norm)) {
    if (a.length >= 4 && !COMIC_CHARACTER_ALIAS_STOPLIST.includes(a) && !CHARACTER_INDEX.has(a)) CHARACTER_INDEX.set(a, node.id);
  }
}

/**
 * Entity ids (with weights) for a comic: series entities at full weight, character-derived ones at partial weight.
 * Character entries match exactly on a name or alias, including a bracketed or parenthesised identity
 * ("Silver Surfer (Norrin Radd)" → silver_surfer), so "Heralds of Galactus" or "Knull's Armor" do not count.
 */
export function comicEntities(input: ComicNewsInput): { id: string; weight: number }[] {
  const out = new Map<string, number>();
  for (const id of input.series ? entitiesForSeries(input.series) : []) {
    if (!nodeById(id)?.fixed) out.set(id, COMIC_SERIES_ENTITY_WEIGHT);
  }
  for (const entry of input.characters ?? []) {
    if (!entry || typeof entry !== "string") continue;
    for (const part of entry.split(/[;()[\]]/)) {
      const id = CHARACTER_INDEX.get(norm(part));
      if (id && !out.has(id)) out.set(id, COMIC_CHARACTER_ENTITY_WEIGHT);
    }
  }
  return [...out].slice(0, COMIC_MAX_ENTITIES).map(([id, weight]) => ({ id, weight }));
}

const clamp = (x: number) => Math.max(-PRESSURE_CAP, Math.min(PRESSURE_CAP, x));

/**
 * Pure: the comic's news pressure from a shock map. `now` is accepted for API symmetry (the shock map is already
 * evaluated at its own clock); stories published after `now` are excluded from the list defensively.
 */
export function comicNewsPressure(input: ComicNewsInput, state: ComicNewsState | null | undefined, now: number = Date.now()): ComicNewsPressure | null {
  const ents = comicEntities(input);
  if (ents.length === 0) return null;
  const ids = ents.map((e) => e.id);
  const shocks = state?.shocks;
  if (!shocks) return { ids, pressure: 0, factor: 1, trails: [] };

  const atById = new Map<string, number>();
  for (const o of state?.outcomes ?? []) atById.set(o.id, o.at);

  let raw = 0;
  const byStory = new Map<string, ComicNewsTrail & { at?: number }>();
  for (const { id, weight } of ents) {
    const s = shocks.get(id);
    if (!s) continue;
    raw += weight * s.pressure;
    for (const t of s.trails) {
      const p = (t.pressure ?? 0) * weight;
      if (Math.abs(p) < PRESSURE_EPSILON) continue;
      const at = t.at ?? atById.get(t.eventId);
      if (at !== undefined && Number.isFinite(at) && at > now) continue;
      const cur = byStory.get(t.eventId);
      if (cur) {
        cur.effectPct += p * 100;
        if (t.path.length < cur.path.length) cur.path = t.path;
      } else {
        byStory.set(t.eventId, {
          eventId: t.eventId,
          headline: t.headline,
          url: t.url,
          at,
          publishedAt: at !== undefined && Number.isFinite(at) ? new Date(at).toISOString() : null,
          effectPct: p * 100,
          path: t.path,
        });
      }
    }
  }
  const pressure = Math.abs(raw) < PRESSURE_EPSILON ? 0 : clamp(raw);
  const trails = [...byStory.values()]
    .sort((a, b) => Math.abs(b.effectPct) - Math.abs(a.effectPct))
    .slice(0, COMIC_MAX_STORIES)
    .map((t) => ({ eventId: t.eventId, headline: t.headline, url: t.url, publishedAt: t.publishedAt, effectPct: t.effectPct, path: t.path }));
  return { ids, pressure, factor: Math.exp(pressure), trails };
}
