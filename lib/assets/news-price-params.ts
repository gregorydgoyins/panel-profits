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
 *     (edge weight × hop damping) as the stress channel.
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
