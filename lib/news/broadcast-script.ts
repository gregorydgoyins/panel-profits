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

export function buildAnchorScript(story: {
  headline?: string;
  summary?: string | null;
  source?: string;
  published_at?: string | null;
  keywords?: string[];
}): ScriptPacket {
  const headline = normalize(story?.headline || "A market development is coming into focus");
  const body = normalize(story?.summary || "");
  const priority = classifyStoryPriority({ headline, description: body });

  const lead = headlineLead(headline);

  const summary = body
    ? `Here's what matters: ${firstSentence(body)}`
    : `Here's what matters: We're tracking a fresh development with direct relevance to collector and corporate equity markets.`;

  const analysisLine = `Our analysis: ${
    body.length > 80
      ? "This represents an authentic market signal with direct implications for collector awareness and asset positioning."
      : "We're monitoring this report closely for downstream sector movement."
  }`;

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
  const estimatedDurationSec = clamp(Math.round(words / baseDuration), 8, 30);

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
