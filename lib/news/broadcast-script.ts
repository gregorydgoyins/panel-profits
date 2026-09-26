const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const normalize = (value = "") =>
  value.replace(/\s+/g, " ").replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'").trim();

const splitSentences = (value = "") =>
  normalize(value).split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

const firstSentence = (value = "", fallback = "") => {
  const sentences = splitSentences(value);
  return sentences[0] || fallback;
};

const headlineLead = (headline = "") => {
  const h = normalize(headline);
  const lower = h.toLowerCase();

  if (/(auction|record|sale|pricing|reset|fmv|cgc)/.test(lower))
    return `We're watching a notable pricing and valuation signal take shape today, as ${lower.replace(/\.$/, "")}.`;
  if (/(return|comeback|revival|relaunch|reset|announces|debut)/.test(lower))
    return `We're tracking a fresh development in the market narrative today, as ${lower.replace(/\.$/, "")}.`;
  if (/(film|tv|streaming|series|animation|rights|studio|merger|acquisition|wbd|paramount|disney)/.test(lower))
    return `There's a media and corporate catalyst in focus right now, with ${lower.replace(/\.$/, "")}.`;
  if (/(variant|cover|artist|exclusive|incentive)/.test(lower))
    return `Our market desk is flagging a notable collector development: ${lower.replace(/\.$/, "")}.`;
  if (/(manga|anime|shonen|crunchyroll|viz)/.test(lower))
    return `From our international animation and manga wire: ${lower.replace(/\.$/, "")}.`;

  return `Our lead report on the wire today: ${h.replace(/\.$/, "")}.`;
};

export type StoryPriority = "breaking" | "developing" | "background";

export function classifyStoryPriority(story: { headline: string; description?: string | null }): StoryPriority {
  const text = `${story.headline} ${story.description || ""}`.toLowerCase();
  if (/(breaking|just in|urgent|confirmed|announced today|exclusive|box office|merger)/.test(text)) return "breaking";
  if (/(developing|emerging|sources say|reportedly|may|could|rumor|chatter)/.test(text)) return "developing";
  return "background";
}

export interface SubtitleCue {
  id: string;
  text: string;
  start: number;
  end: number;
}

export interface ScriptPacket {
  headline: string;
  sourceLine: string;
  fullScript: string;
  estimatedDurationSec: number;
  cues: SubtitleCue[];
  priority: StoryPriority;
}

export type MarketTrendDirection = "upward" | "downward" | "sideways" | "catalyst";

export function analyzeStoryMarketMetrics(text: string): {
  trend: MarketTrendDirection;
  affectedEntities: string[];
  investopediaTerm: { term: string; explanation: string };
} {
  const lower = text.toLowerCase();

  // 1. Determine Market Trend Direction based on exact story context
  let trend: MarketTrendDirection = "catalyst";
  if (/(record|surge|soar|high|bull|breakout|boom|jump|spike|outperform|peak)/.test(lower)) {
    trend = "upward";
  } else if (/(drop|fall|dip|decline|bear|slump|plunge|loss|soften|discount)/.test(lower)) {
    trend = "downward";
  } else if (/(flat|steady|stable|range|hold|unchanged|consolidat|sideways)/.test(lower)) {
    trend = "sideways";
  }

  // 2. Identify affected entities (Publishers, Franchises, Creators)
  const affectedEntities: string[] = [];
  if (/\bmarvel\b|avengers|spider-man|x-men|wolverine|deadpool/i.test(text)) affectedEntities.push("Marvel Universe Equities");
  if (/\bdc comics?\b|action comics|detective comics|batman|superman|wonder woman|justice league/i.test(text)) affectedEntities.push("DC Franchise Assets");
  if (/\bdisney\b|wbd|warner|sony|paramount|skydance/i.test(text)) affectedEntities.push("Corporate Media Parent Stocks");
  if (/\bmanga\b|anime|crunchyroll|viz|shonen/i.test(text)) affectedEntities.push("International Manga & Anime Wires");
  if (/\bstan lee\b|\bjack kirby\b|\btodd mcfarlane\b|\bsteve ditko\b|\bfrank miller\b/i.test(text)) affectedEntities.push("Creator Lineage Assets");
  if (!affectedEntities.length) affectedEntities.push("Collectible Asset Float");

  // 3. Select relevant Investopedia Equity Concept
  let investopediaTerm = {
    term: "FMV Liquidity Spread",
    explanation: "the delta between fair market value expectations and actual transaction realizations in auction channels.",
  };

  if (/(cgc|census|population|slab|grade 9\.8|float)/.test(lower)) {
    investopediaTerm = {
      term: "Census Float",
      explanation: "the total verified population of graded slab copies available in public and private hands.",
    };
  } else if (/(key issue|first appearance|debut|origin|milestone)/.test(lower)) {
    investopediaTerm = {
      term: "Key Issue Premium",
      explanation: "the structural price multiplier assigned to historical milestone issues and character debuts.",
    };
  } else if (/(variant|incentive|cover|1:25|1:100)/.test(lower)) {
    investopediaTerm = {
      term: "Variant Ratio Dilution",
      explanation: "the supply-side elasticity and secondary market impact caused by tier-incentive cover prints.",
    };
  } else if (/(creator|writer|artist|kirby|ditko|lee|mcfarlane|miller)/.test(lower)) {
    investopediaTerm = {
      term: "Creator Lineage Multiplier",
      explanation: "the fundamental price momentum and collector elasticity tied to legendary creative runs.",
    };
  } else if (/(pedigree|church|mile high|collection|provenance)/.test(lower)) {
    investopediaTerm = {
      term: "Pedigree Provenance",
      explanation: "the historical origin premium attached to elite original-owner collections.",
    };
  }

  return { trend, affectedEntities, investopediaTerm };
}

export function buildAnchorScript(story: {
  headline?: string;
  summary?: string | null;
  source?: string;
  published_at?: string | null;
  keywords?: string[];
}): ScriptPacket {
  const headline = normalize(story?.headline || "A market development is coming into focus");
  const body = normalize(story?.summary || "");
  const fullText = `${headline} ${body}`;
  const priority = classifyStoryPriority({ headline, description: body });
  const metrics = analyzeStoryMarketMetrics(fullText);

  const lead = headlineLead(headline);

  const summarySentences = splitSentences(body);
  const summaryBody = summarySentences.length > 1
    ? summarySentences.slice(0, 3).join(" ")
    : firstSentence(body);

  const summary = summaryBody
    ? `Here's what matters: ${summaryBody}`
    : `Here's what matters: We're tracking a fresh development with direct relevance to collector and corporate equity markets.`;

  // Dynamic Spoken Market Analysis based on trend & affected entities
  let trendStatement = "";
  if (metrics.trend === "upward") {
    trendStatement = `Market indicators are trending upward, reflecting positive price momentum for affected assets including ${metrics.affectedEntities.join(" and ")}.`;
  } else if (metrics.trend === "downward") {
    trendStatement = `Market signals reflect downward price pressure or valuation softening for affected sectors including ${metrics.affectedEntities.join(" and ")}.`;
  } else if (metrics.trend === "sideways") {
    trendStatement = `Valuations are trading sideways in a tight consolidation band across ${metrics.affectedEntities.join(" and ")}, as buyers await clear catalog direction.`;
  } else {
    trendStatement = `This catalyst event directly impacts asset positioning across ${metrics.affectedEntities.join(" and ")}.`;
  }

  const analysisLine = `Our Market Desk analysis: ${trendStatement} In Investopedia equity terms, this directly impacts the ${metrics.investopediaTerm.term}—which measures ${metrics.investopediaTerm.explanation}`;

  const consequenceLine =
    priority === "breaking"
      ? "This matters right now because the primary information window is active and early market positioning carries weight."
      : priority === "developing"
      ? "This matters because the broader market is still digesting these terms as secondary confirmations emerge."
      : "This matters because long-term collectors and equity observers position quietly around structural industry shifts.";

  const segments = [lead, summary, analysisLine, consequenceLine];
  const fullScript = segments.join(" ");
  const words = fullScript.split(/\s+/).filter(Boolean).length;

  const baseDuration = priority === "breaking" ? 2.6 : priority === "developing" ? 2.8 : 3.0;
  const estimatedDurationSec = clamp(Math.round(words / baseDuration), 8, 45);

  const timestampLabel = story?.published_at
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
        new Date(story.published_at)
      )
    : "";

  return {
    headline,
    sourceLine: [story?.source, timestampLabel].filter(Boolean).join(" • "),
    fullScript,
    estimatedDurationSec,
    cues: buildSubtitleCues(fullScript, estimatedDurationSec),
    priority,
  };
}

export function buildSubtitleCues(text: string, durationSec: number): SubtitleCue[] {
  const segments = splitSentences(text);
  const totalWords = normalize(text).split(/\s+/).filter(Boolean).length || 1;
  let cursor = 0;

  return segments.map((segment, index) => {
    const segmentWords = segment.split(/\s+/).filter(Boolean).length || 1;
    const segmentDuration =
      index === segments.length - 1
        ? Math.max(1.25, durationSec - cursor)
        : (segmentWords / totalWords) * durationSec;

    const cue: SubtitleCue = {
      id: `cue-${index}`,
      text: segment,
      start: Number(cursor.toFixed(2)),
      end: Number((cursor + segmentDuration).toFixed(2)),
    };
    cursor += segmentDuration;
    return cue;
  });
}
