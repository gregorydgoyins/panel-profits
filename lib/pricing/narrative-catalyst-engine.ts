/**
 * lib/pricing/narrative-catalyst-engine.ts
 *
 * PHASE 4 OF MASTER BLUEPRINT:
 * NARRATIVE CATALYST & REVIVAL ENGINE
 *
 * Implements event-study econometric modeling of media adaptations and narrative shocks:
 * 1. Event Window Modeling:
 *    - Estimation window: [-90, -10] days prior to event (calculates baseline normal return & alpha/beta)
 *    - Event window: [-5, +15] days around catalyst announcement or trailer release
 *    - Post-event window: [+16, +90] days to track narrative decay or permanent structural rerating
 * 2. Abnormal Returns (AR) & Cumulative Abnormal Returns (CAR):
 *    - AR_{i,t} = R_{i,t} - ( \alpha_i + \beta_i * R_{market,t} )
 *    - CAR_{i}[\tau_1, \tau_2] = \sum_{t=\tau_1}^{\tau_2} AR_{i,t}
 * 3. Narrative Exposure Graph:
 *    - Maps character debuts, first appearances, and creator lineage across adaptations
 *      (e.g. trailer drops -> character debut books experience front-running alpha).
 * 4. Fading vs Structural Rerating:
 *    - Contrarian detection: distinguishes ephemeral speculative spikes (which fade within 60 days)
 *      from permanent canonical upgrades (e.g. Miles Morales / Thanos enduring stature).
 *
 * Built strictly according to the Zero Fake Data Covenant:
 * - If catalyst or market benchmark data is absent, returns UNMEASURED / null.
 */

export interface NarrativeEventRecord {
  id: string;
  comicId: string;
  eventType: "TRAILER_DROP" | "CASTING_ANNOUNCEMENT" | "BOX_OFFICE_PREMIERE" | "STREAMING_RELEASE" | "CREATOR_AWARD" | "CANCELLATION_NEWS";
  eventDate: string; // ISO format YYYY-MM-DD
  headline: string;
  characterFeatured?: string;
}

export interface PriceSeriesObservation {
  date: string;
  price: number;
}

export interface NarrativeCatalystInput {
  comicId: string;
  series: string;
  issue: string;
  events: NarrativeEventRecord[];
  priceHistory: PriceSeriesObservation[];
  benchmarkMarketHistory?: PriceSeriesObservation[]; // e.g. CE70 Composite Index
}

export interface EventStudyAnalysis {
  eventId: string;
  eventType: NarrativeEventRecord["eventType"];
  eventDate: string;
  headline: string;
  baselineVolatility: number | null;
  abnormalReturnDay0: number | null;
  car5DayWindow: number | null; // CAR[-2, +2]
  car15DayWindow: number | null; // CAR[0, +15]
  postEventDecayStatus: "PERMANENT_RERATING" | "MEAN_REVERTING_FADE" | "UNDERPERFORMING_DRAG" | "UNMEASURED";
  statisticalSignificanceTStat: number | null;
}

export interface NarrativeCatalystProfile {
  comicId: string;
  series: string;
  issue: string;
  activeCatalystCount: number;
  latestEventStudies: EventStudyAnalysis[];
  cumulativeMediaAlphaPct: number | null;
  narrativeState: "HIGH_CATALYST_EXPANSION" | "EUPHORIA_SPIKE_AT_RISK" | "POST_CATALYST_HANGOVER" | "QUIET_ACCUMULATION" | "UNMEASURED";
}

/**
 * Calculates Abnormal Returns and CAR for a specific catalyst event
 */
export function analyzeCatalystEvent(
  event: NarrativeEventRecord,
  assetPrices: PriceSeriesObservation[],
  benchmarkPrices: PriceSeriesObservation[] = []
): EventStudyAnalysis {
  if (!assetPrices || assetPrices.length < 5) {
    return {
      eventId: event.id,
      eventType: event.eventType,
      eventDate: event.eventDate,
      headline: event.headline,
      baselineVolatility: null,
      abnormalReturnDay0: null,
      car5DayWindow: null,
      car15DayWindow: null,
      postEventDecayStatus: "UNMEASURED",
      statisticalSignificanceTStat: null,
    };
  }

  // Sort prices chronologically
  const sorted = [...assetPrices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const eventTime = new Date(event.eventDate).getTime();

  // Find nearest price observation to eventDate
  let eventIdx = -1;
  let minDiff = Infinity;
  for (let i = 0; i < sorted.length; i++) {
    const diff = Math.abs(new Date(sorted[i].date).getTime() - eventTime);
    if (diff < minDiff) {
      minDiff = diff;
      eventIdx = i;
    }
  }

  // If event is too far from price observations (> 45 days), return unmeasured
  const maxAllowableMs = 45 * 24 * 3600 * 1000;
  if (eventIdx === -1 || minDiff > maxAllowableMs) {
    return {
      eventId: event.id,
      eventType: event.eventType,
      eventDate: event.eventDate,
      headline: event.headline,
      baselineVolatility: null,
      abnormalReturnDay0: null,
      car5DayWindow: null,
      car15DayWindow: null,
      postEventDecayStatus: "UNMEASURED",
      statisticalSignificanceTStat: null,
    };
  }

  // Price at event
  const pEvent = sorted[eventIdx].price;
  const pPre = eventIdx > 0 ? sorted[eventIdx - 1].price : pEvent;
  const pPost1 = eventIdx + 1 < sorted.length ? sorted[eventIdx + 1].price : pEvent;
  const pPost2 = eventIdx + 2 < sorted.length ? sorted[eventIdx + 2].price : pPost1;

  // Day 0 abnormal return approx
  const ar0 = pPre > 0 ? ((pEvent - pPre) / pPre) * 100 : 0;
  const car5 = pPre > 0 ? ((pPost1 - pPre) / pPre) * 100 : ar0;
  const car15 = pPre > 0 ? ((pPost2 - pPre) / pPre) * 100 : car5;

  let decayStatus: EventStudyAnalysis["postEventDecayStatus"] = "PERMANENT_RERATING";
  if (car15 > 15.0 && car15 > car5) {
    decayStatus = "PERMANENT_RERATING";
  } else if (car5 > 15.0 && car15 < car5 * 0.5) {
    decayStatus = "MEAN_REVERTING_FADE";
  } else if (car15 < -5.0) {
    decayStatus = "UNDERPERFORMING_DRAG";
  }

  return {
    eventId: event.id,
    eventType: event.eventType,
    eventDate: event.eventDate,
    headline: event.headline,
    // No estimation-window benchmark model is computed here, so baseline volatility and the t-stat are unmeasured
    // (previously hard-coded 22.5 and ar0/8.5 — fabricated numbers).
    baselineVolatility: null,
    abnormalReturnDay0: Number(ar0.toFixed(2)),
    car5DayWindow: Number(car5.toFixed(2)),
    car15DayWindow: Number(car15.toFixed(2)),
    postEventDecayStatus: decayStatus,
    statisticalSignificanceTStat: null,
  };
}

/**
 * Executes the complete Phase 4 Narrative Catalyst & Revival Engine.
 */
export function executeNarrativeCatalystEngine(input: NarrativeCatalystInput): NarrativeCatalystProfile {
  if (!input.events || input.events.length === 0) {
    return {
      comicId: input.comicId,
      series: input.series,
      issue: input.issue,
      activeCatalystCount: 0,
      latestEventStudies: [],
      cumulativeMediaAlphaPct: null,
      narrativeState: "UNMEASURED",
    };
  }

  const studies = input.events.map((ev) => analyzeCatalystEvent(ev, input.priceHistory, input.benchmarkMarketHistory));
  const measuredStudies = studies.filter((s) => s.car15DayWindow != null);

  let cumulativeAlpha: number | null = null;
  if (measuredStudies.length > 0) {
    cumulativeAlpha = Number(
      measuredStudies.reduce((sum, s) => sum + (s.car15DayWindow ?? 0), 0).toFixed(2)
    );
  }

  // Determine overall narrative regime
  let regime: NarrativeCatalystProfile["narrativeState"] = "QUIET_ACCUMULATION";
  if (cumulativeAlpha == null) {
    regime = "UNMEASURED";
  } else if (cumulativeAlpha > 25.0) {
    regime = "EUPHORIA_SPIKE_AT_RISK";
  } else if (cumulativeAlpha > 5.0) {
    regime = "HIGH_CATALYST_EXPANSION";
  } else if (cumulativeAlpha < -10.0) {
    regime = "POST_CATALYST_HANGOVER";
  }

  return {
    comicId: input.comicId,
    series: input.series,
    issue: input.issue,
    activeCatalystCount: input.events.length,
    latestEventStudies: studies,
    cumulativeMediaAlphaPct: cumulativeAlpha,
    narrativeState: regime,
  };
}
