/**
 * News → price model parameters, in one place.
 *
 * These are DESIGN parameters for the simulated "News-adjusted" price. They never touch a real fair-market value:
 * the real 9.8 FMV (PriceCharting) is shown unchanged, and the simulated price is always `realPrice × e^pressure`,
 * labelled as a simulation. With no matched news, pressure is exactly 0 and nothing is shown as a number.
 *
 * Two channels produce signed pressure (a log-premium on market price):
 *  1. Outcomes — who won / who lost (lib/assets/outcomes.ts, PRESSURE_PER_INTENSITY).
 *  2. Catalysts — lexicon-classified stories (lib/assets/shock-propagation.ts): a trailer, casting or film story lifts
 *     the entities it names; real damage or a scare weighs on them. Timing uses the same per-kind time kernels
 *     (market-dynamics.ts timeKernel, which includes the onset ramp from published_at), and the same graph propagation
 *     (edge weight × hop damping) as the stress channel. Unlike the stress channel, the catalyst price channel
 *     classifies and matches entities on the headline + summary lead sentence only (priceText), and listicles /
 *     roundups (LISTICLE_PATTERNS) get no price effect at all.
 * Combined pressure per node, and per comic, is clamped to ±PRESSURE_CAP (0.12, i.e. about ±12%).
 */
import type { EventKind } from "./shock-propagation";

/**
 * Signed price pressure per unit of propagated event effect (effect = intensity × kernel × regime × path weight).
 * HYPE lifts, DAMAGE and SCARE weigh (a scare only a little). MARKET and CAPITAL stories (auctions, census, funding)
 * have no direction we can determine from the headline, so they carry no price pressure.
 */
export const CATALYST_PRICE_STRENGTH: Record<EventKind, number> = {
  HYPE: 0.04,
  DAMAGE: -0.05,
  SCARE: -0.02,
  MARKET: 0,
  CAPITAL: 0,
};

/**
 * Price-channel text scope. The catalyst price channel reads ONLY a story's headline plus the first sentence of its
 * summary (the lead): the kind is classified, and the entities matched, on that text alone. An entity named only
 * deeper in the body gets no price effect (it still feeds the stress/vol channel, which reads the full text).
 * Same boundary as the outcome parser in outcomes.ts.
 */
export function priceText(headline: string | null | undefined, summary: string | null | undefined): string {
  const lead = (summary ?? "").split(/(?<=[.!?])\s+/)[0] ?? "";
  return `${headline ?? ""} ${lead}`.trim();
}

/**
 * Listicles, roundups and retrospective features carry zero price effect: "10 catastrophes that…", "Top 5…",
 * "Every Silver Surfer story, ranked" is a content-marketing frame, not news about the entity. Tested against the
 * headline and the lead sentence (priceText). Patterns are case-insensitive; add here, never inline.
 */
export const LISTICLE_PATTERNS: RegExp[] = [
  // leading number list: "10 Catastrophes…", "30 Years Ago, A Snack Food…", "5 things…" (1–3 digits, so a year like "2026 box office" is not caught)
  /^\s*["'“‘]?\d{1,3}\s+\p{L}/u,
  // "Top 10", "top five"
  /\btop\s+(\d+|ten|five|three|twenty|seven)\b/i,
  // superlative / exhaustive / ranking frames
  /\b(best|worst|every|ranked|ranking|rankings)\b/i,
  // "things you (didn't know / need to know…)"
  /\bthings you\b/i,
  // retrospective and roundup features
  /\byears ago\b/i,
  /\b(round-?up|recap|where are they now)\b/i,
  // Spanish / Portuguese / French / Italian / German leading article + number: "Los 10…", "Las 5…", "Os 7…", "As 10…", "Les 10…", "I 10…", "Die 10…"
  /^\s*(los|las|os|as|les|i|gli|le|die)\s+\d{1,3}\b/i,
  // number + common non-English list nouns anywhere: "10 catástrofes", "5 cosas", "7 coisas", "10 razones/razões", "N curiosidades"
  /\b\d{1,3}\s+(catástrofes|catastrofes|cosas|coisas|razones|razões|curiosidades|choses|cose|dinge)\b/i,
  // non-English superlatives: mejores/peores (es), melhores/piores (pt), meilleurs/pires (fr), migliori/peggiori (it)
  /\b(mejores|peores|melhores|piores|meilleur(e)?s|migliori|peggiori)\b/i,
];

export function isListicle(text: string): boolean {
  return LISTICLE_PATTERNS.some((re) => re.test(text));
}

/** Comic → entity mapping weights: a book's own series hero moves it fully; characters it features, partially. */
export const COMIC_SERIES_ENTITY_WEIGHT = 1.0;
export const COMIC_CHARACTER_ENTITY_WEIGHT = 0.6;
/** Generic group nouns that are aliases in the graph but, as a credits-list tag ("Mutants"), do not name an entity. */
export const COMIC_CHARACTER_ALIAS_STOPLIST: string[] = ["mutants"];
/** At most this many entities per comic (series entities first). */
export const COMIC_MAX_ENTITIES = 8;
/** At most this many contributing stories are listed. */
export const COMIC_MAX_STORIES = 5;
/** Contributions smaller than this (in log-pressure, ≈0.01%) are treated as zero. */
export const PRESSURE_EPSILON = 1e-4;
