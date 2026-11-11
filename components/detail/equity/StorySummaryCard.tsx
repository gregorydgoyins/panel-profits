import Link from "next/link";
import { getStorySummary, type StorySummary, type StoryEntityLink } from "@/lib/comics/story-summary";
import { slugifyCreatorName } from "@/lib/creators/creator-bio-service";
import { BookOpen, Sparkles, Users, MapPin, Wrench, Quote, PenTool, Palette } from "lucide-react";
import { VersusMatchupWidget } from "@/components/versus/VersusMatchupWidget";

interface StorySummaryCardProps {
  series: string;
  issueNumber: string;
  year: number | null;
  publisher: string | null;
  volume?: number | null;
  accent: string;
  fandomData?: {
    synopsis?: string | null;
    firstAppearances?: string[] | null;
    characters?: string[] | null;
    credits?: Record<string, string[]> | null;
  } | null;
  authoritativeData?: {
    synopsis?: string | null;
    characters?: string | string[] | null;
    credits?: {
      writer?: string[];
      penciler?: string[];
      inker?: string[];
      colorist?: string[];
      letterer?: string[];
      editor?: string[];
    } | null;
    source?: string;
    sourceUrl?: string;
    license?: string | null;
  } | null;
  canonicalVariants?: Array<{
    id: number;
    variantName: string;
    coverArtist?: string;
    catalogId?: string;
    coverUrl?: string;
  }> | null;
}

function toCanonicalSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveInternalLoreUrl(url: string, fallbackLabel: string): { href: string; external: boolean } {
  if (!url) {
    const fallbackSlug = toCanonicalSlug(fallbackLabel);
    return { href: fallbackSlug ? `/wiki/entry/${encodeURIComponent(fallbackSlug)}` : "/wiki", external: false };
  }
  if (url.startsWith("#")) {
    return { href: url, external: false };
  }
  if (url.startsWith("/wiki/entry/") || url.startsWith("/comics")) {
    return { href: url, external: false };
  }
  if (url.startsWith("/wiki?q=")) {
    const qVal = decodeURIComponent(url.replace(/^\/wiki\?q=/, "")).trim();
    const slug = toCanonicalSlug(qVal || fallbackLabel);
    return { href: slug ? `/wiki/entry/${encodeURIComponent(slug)}` : url, external: false };
  }
  if (/^https?:\/\//i.test(url) && !/\.fandom\.com\/wiki\//i.test(url)) {
    return { href: url, external: true };
  }
  if (/\.fandom\.com\/wiki\//i.test(url) && /#Continuity_Notes$/i.test(url)) {
    return { href: "#lore-continuity-notes", external: false };
  }
  const wikiPath = url.includes("/wiki/") ? url.split("/wiki/").pop() || "" : url.split("/").pop() || "";
  const pagePart = decodeURIComponent(wikiPath.split("#")[0] || "").replace(/_/g, " ").trim();
  const queryTerm = pagePart || fallbackLabel;
  const slug = toCanonicalSlug(queryTerm);
  if (slug) {
    return { href: `/wiki/entry/${encodeURIComponent(slug)}`, external: false };
  }
  return { href: `/wiki?q=${encodeURIComponent(queryTerm)}`, external: false };
}

function cleanDialogueQuote(raw: string): string {
  if (!raw) return "";
  let clean = raw.trim();
  // Strip outer quotes and curled quotes
  clean = clean.replace(/^[“"«'‘]+/, "").replace(/[”"»'’]+$/, "").trim();
  return clean;
}

/**
 * Robust markdown formatter that renders internal links (including URLs with nested parentheses like (Earth-616))
 * alongside bold **word**, italic *word*, and superscript footnote citations [1].
 */
function renderRichDialogueText(text: string): React.ReactNode {
  if (!text) return null;

  const tokens: React.ReactNode[] = [];
  // Matches [Label](url) where url may contain balanced parentheses like (Earth-616) or (Symbiote)_(Earth-616)
  const linkRegex = /\[([^\]]+)\]\(((?:[^()\s]+|\([^()\s]*\))+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  function parseFormatting(segment: string, keyPrefix: string): React.ReactNode[] {
    if (!segment) return [];
    const parts: React.ReactNode[] = [];
    const formatRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[(\d+)\])/g;
    let sLastIndex = 0;
    let fMatch: RegExpExecArray | null;

    while ((fMatch = formatRegex.exec(segment)) !== null) {
      if (fMatch.index > sLastIndex) {
        parts.push(segment.slice(sLastIndex, fMatch.index));
      }
      if (fMatch[2]) {
        parts.push(
          <strong key={`${keyPrefix}-b-${fMatch.index}`} className="font-semibold text-cyan-200">
            {fMatch[2]}
          </strong>
        );
      } else if (fMatch[3]) {
        parts.push(
          <em key={`${keyPrefix}-i-${fMatch.index}`} className="italic text-cyan-100">
            {fMatch[3]}
          </em>
        );
      } else if (fMatch[4]) {
        parts.push(
          <a
            key={`${keyPrefix}-ref-${fMatch.index}`}
            href="#lore-references"
            className="text-[10px] font-mono text-cyan-400 hover:text-cyan-200 align-super ml-0.5 px-1 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30 no-underline"
            title={`Jump to Reference [${fMatch[4]}]`}
          >
            [{fMatch[4]}]
          </a>
        );
      }
      sLastIndex = formatRegex.lastIndex;
    }
    if (sLastIndex < segment.length) {
      parts.push(segment.slice(sLastIndex));
    }
    return parts;
  }

  let chunkIdx = 0;
  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(...parseFormatting(text.slice(lastIndex, match.index), `txt-${chunkIdx++}`));
    }
    const label = match[1];
    const rawUrl = match[2];
    const resolved = resolveInternalLoreUrl(rawUrl, label);

    if (resolved.external) {
      tokens.push(
        <a
          key={`ext-${resolved.href}-${match.index}`}
          href={resolved.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-300 hover:text-cyan-200 underline decoration-cyan-400/60 underline-offset-4 font-medium transition-colors"
        >
          {label} ↗
        </a>
      );
    } else {
      tokens.push(
        <Link
          key={`link-${resolved.href}-${match.index}`}
          href={resolved.href}
          className="text-cyan-300 hover:text-cyan-200 underline decoration-cyan-400/60 underline-offset-4 font-medium transition-colors"
        >
          {label}
        </Link>
      );
    }
    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(...parseFormatting(text.slice(lastIndex), `txt-tail`));
  }

  return tokens;
}

/**
 * Safely parse markdown-style links `[Label](url)` and render as internal clickable React elements.
 */
function renderMarkdownWithLinks(text: string) {
  return renderRichDialogueText(text);
}

function CreatorCreditPill({ role, names, roleColor }: { role: string; names: string[]; roleColor: string }) {
  if (!names || names.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0d131f] border border-slate-800 text-xs font-mono shadow-sm hover:border-slate-700 transition-colors">
      <span className={`font-semibold uppercase tracking-wider text-[11px] ${roleColor}`}>{role}:</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {names.map((name, idx) => {
          const cleanName = name.trim();
          const slug = slugifyCreatorName(cleanName);
          const creatorUrl = `/wiki/entry/${slug}`;

          return (
            <span key={`${role}-${cleanName}-${idx}`} className="inline-flex items-center gap-1">
              <Link
                href={creatorUrl}
                className="text-slate-200 hover:text-cyan-300 underline underline-offset-2 hover:decoration-cyan-400 font-medium transition-colors"
                title={`View ${cleanName} creator biography, portrait, and credits`}
              >
                {cleanName}
              </Link>
              {idx < names.length - 1 && <span className="text-slate-600">,</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function EntityBadge({ entity, badgeColor }: { entity: StoryEntityLink; badgeColor: string }) {
  const resolved = resolveInternalLoreUrl(entity.url, entity.target || entity.label);

  return (
    <Link
      href={resolved.href}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-all hover:scale-105 ${badgeColor}`}
      title={entity.target}
    >
      {entity.isFirstApp && <span className="text-amber-400 font-bold">★</span>}
      <span>{entity.label}</span>
      {entity.note ? (
        <span className="text-[10px] text-slate-400 opacity-85">({entity.note})</span>
      ) : (
        <>
          {entity.isFlashback && <span className="text-[10px] text-slate-400 opacity-75">(flashback)</span>}
          {entity.isMentioned && <span className="text-[10px] text-slate-400 opacity-75">(mentioned)</span>}
        </>
      )}
    </Link>
  );
}

/**
 * Rich encyclopedic collectible due diligence dossier for issue detail pages and sniper modals.
 * Features: Story title, key epigraph quote, creative credits, entity census (1st appearances,
 * heroes, antagonists, other characters, races & species, locations, items, vehicles, events),
 * full hyperlinked narrative synopsis, solicit synopsis, notes with embedded YouTube trailer,
 * continuity notes, references, variant covers, and complete category index.
 */
export default async function StorySummaryCard({
  series,
  issueNumber,
  year,
  publisher,
  volume,
  accent,
  fandomData,
  authoritativeData,
  canonicalVariants,
}: StorySummaryCardProps) {
  let summary: StorySummary | null = null;
  try {
    summary = await getStorySummary({ series, issueNumber, year, publisher, volume });
  } catch {
    summary = null;
  }

  // Fallback to GCD / sovereign catalog data only when no Fandom issue dossier was resolved
  if (!summary && (authoritativeData?.synopsis || fandomData?.synopsis)) {
    const synopsis = authoritativeData?.synopsis || fandomData?.synopsis || "";
    const characterNames = Array.isArray(authoritativeData?.characters)
      ? authoritativeData.characters
      : typeof authoritativeData?.characters === "string"
        ? authoritativeData.characters.split(/[;,]/).map((name) => name.trim()).filter(Boolean)
        : [];
    const rawFirstApps = (fandomData?.firstAppearances || []).map((name) => ({
      target: name,
      label: name,
      url: `/wiki/entry/${encodeURIComponent(name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`,
      isFirstApp: true,
    }));
    const rawFeatured = [...characterNames, ...(fandomData?.characters || [])].map((name) => ({
      target: name,
      label: name,
      url: `/wiki/entry/${encodeURIComponent(name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`,
    }));

    summary = {
      text: synopsis,
      storyTitle: `${series} #${issueNumber}`,
      quote: null,
      entities: {
        firstAppearances: rawFirstApps,
        featuredCharacters: rawFeatured,
        antagonists: [],
        otherCharacters: [],
        racesAndSpecies: [],
        realities: [],
        locations: [],
        items: [],
        vehicles: [],
      },
      credits: authoritativeData?.credits || fandomData?.credits ? {
        coverArtists: [],
        writers: authoritativeData?.credits?.writer || fandomData?.credits?.writer || [],
        pencilers: authoritativeData?.credits?.penciler || fandomData?.credits?.penciler || fandomData?.credits?.artist || [],
        inkers: authoritativeData?.credits?.inker || fandomData?.credits?.inker || [],
        colorists: authoritativeData?.credits?.colorist || fandomData?.credits?.colorist || [],
        letterers: authoritativeData?.credits?.letterer || fandomData?.credits?.letterer || [],
        editors: authoritativeData?.credits?.editor || fandomData?.credits?.editor || [],
      } : undefined,
      source: authoritativeData?.source || "Sovereign Catalog",
      sourceUrl: authoritativeData?.sourceUrl || `/comics?q=${encodeURIComponent(series)}`,
      license: authoritativeData?.license ?? null,
      referenceYear: year,
    };
  } else if (summary && authoritativeData?.credits) {
    // Supplement any missing credit roles from GCD without overwriting Fandom credits
    summary.credits = {
      ...summary.credits,
      writers: summary.credits?.writers?.length ? summary.credits.writers : authoritativeData.credits.writer || [],
      pencilers: summary.credits?.pencilers?.length ? summary.credits.pencilers : authoritativeData.credits.penciler || [],
      inkers: summary.credits?.inkers?.length ? summary.credits.inkers : authoritativeData.credits.inker || [],
      colorists: summary.credits?.colorists?.length ? summary.credits.colorists : authoritativeData.credits.colorist || [],
      letterers: summary.credits?.letterers?.length ? summary.credits.letterers : authoritativeData.credits.letterer || [],
      editors: summary.credits?.editors?.length ? summary.credits.editors : authoritativeData.credits.editor || [],
    };
  }

  if (!summary) return null;

  const paragraphs = summary.text
    .replace(/\r\n/g, "\n")
    .replace(/\s+-\s+/g, " — ")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const solicitParagraphs = summary.solicitSynopsis
    ? summary.solicitSynopsis
        .replace(/\r\n/g, "\n")
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];
  const entities = summary.entities;
  const credits = summary.credits;
  const quote = summary.quote;

  const hasFirstApps = (entities?.firstAppearances?.length ?? 0) > 0;
  const hasFeatured = (entities?.featuredCharacters?.length ?? 0) > 0;
  const hasSupporting = (entities?.supportingCharacters?.length ?? 0) > 0;
  const hasAntagonists = (entities?.antagonists?.length ?? 0) > 0;
  const hasOtherCharacters = (entities?.otherCharacters?.length ?? 0) > 0;
  const hasRaces = (entities?.racesAndSpecies?.length ?? 0) > 0;
  const hasItems = (entities?.items?.length ?? 0) > 0;
  const hasVehicles = (entities?.vehicles?.length ?? 0) > 0;
  const hasEvents = (entities?.events?.length ?? 0) > 0;
  const hasLocations = (entities?.locations?.length ?? 0) > 0;

  return (
    <section
      aria-label="Story description and due diligence dossier"
      className="rounded-xl p-5 sm:p-6 bg-[#0a0e14] border shadow-2xl relative overflow-hidden"
      style={{ borderColor: `${accent}40` }}
    >
      {/* Background ambient gradient */}
      <div
        className="absolute top-0 right-0 w-96 h-96 pointer-events-none opacity-10 blur-3xl -z-0"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }}
      />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
            <BookOpen className="h-4 w-4" />
          </span>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400 font-semibold block">
              Collectible Due Diligence Dossier · {summary.fandomPageTitle || `${series} Vol ${volume || 1} ${issueNumber}`}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
              {summary.storyTitle ? `1. “${summary.storyTitle}”` : `${series} #${issueNumber} Narrative`}
            </h2>
            <div className="mt-1 flex items-center gap-2 text-[11px] font-mono text-cyan-400">
              <a href="#lore-appearances" className="hover:text-cyan-200 underline underline-offset-2">
                Appearances
              </a>
              <span className="text-slate-600">·</span>
              <a href="#lore-synopsis" className="hover:text-cyan-200 underline underline-offset-2">
                Synopsis
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider font-mono">
          {summary.storyArc && (
            <Link
              href={`/wiki/entry/${encodeURIComponent(toCanonicalSlug(summary.storyArc))}`}
              className="px-2.5 py-1 rounded bg-purple-950/50 border border-purple-500/40 text-purple-200 hover:border-purple-400 hover:text-purple-100 transition-colors"
            >
              Part of the {summary.storyArc}
            </Link>
          )}
          <span className="px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> VERIFIED LORE
          </span>
        </div>
      </div>

      {/* Issue Metadata & Chronology Infobox Strip */}
      {(summary.releaseDate || summary.coverDate || summary.previousIssue || summary.nextIssue || summary.marvelUnlimitedId || summary.pages || summary.rating || summary.originalPrice) && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-3.5 rounded-lg bg-[#0d131f] border border-slate-800/90 text-xs font-mono relative z-10">
          {summary.releaseDate && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Release Date</span>
              <span className="text-slate-200 font-semibold">{summary.releaseDate}</span>
            </div>
          )}
          {summary.coverDate && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Cover Date</span>
              <span className="text-slate-200 font-semibold">{summary.coverDate}</span>
            </div>
          )}
          {summary.previousIssue && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Previous Issue</span>
              <Link
                href={`/comics?q=${encodeURIComponent(summary.previousIssue.replace(/\s*\(Story\)/i, ""))}`}
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-semibold"
              >
                {summary.previousIssue}
              </Link>
            </div>
          )}
          {summary.nextIssue && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Next Issue</span>
              <Link
                href={`/comics?q=${encodeURIComponent(summary.nextIssue)}`}
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-semibold"
              >
                {summary.nextIssue}
              </Link>
            </div>
          )}
          {summary.marvelUnlimitedId && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Marvel Unlimited</span>
              <a
                href={`https://www.marvel.com/comics/issue/${summary.marvelUnlimitedId}/read`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 font-semibold"
              >
                Available (#{summary.marvelUnlimitedId}) ↗
              </a>
            </div>
          )}
          {(summary.pages || summary.rating || summary.originalPrice) && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Issue Specs</span>
              <span className="text-slate-200 font-semibold">
                {[
                  summary.pages ? `${summary.pages} pp` : null,
                  summary.rating ? `Rated ${summary.rating}` : null,
                  summary.originalPrice || null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Key Epigraph / Quotation Banner */}
      {quote && quote.text && (
        <div className="mt-4 p-4 rounded-lg bg-[#0e1420]/90 border border-cyan-500/30 relative z-10 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-cyan-500/20 text-[10px] font-mono tracking-widest uppercase">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Quote className="h-3.5 w-3.5" /> Iconic Climax Dialogue
            </span>
            <span className="text-slate-400">MediaWiki Canon</span>
          </div>
          <div className="space-y-2">
            <blockquote className="text-sm sm:text-base italic leading-relaxed text-cyan-100 font-serif">
              “{renderRichDialogueText(cleanDialogueQuote(quote.text))}”
            </blockquote>
            {quote.speaker && (
              <p className="text-xs font-mono uppercase tracking-wider text-cyan-400 text-right">
                — {renderRichDialogueText(cleanDialogueQuote(quote.speaker))}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Creative Credits Lineage (Interactive Creator Dossier Links) */}
      {credits && Object.keys(credits).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono relative z-10">
          {credits.coverArtists && credits.coverArtists.length > 0 && (
            <CreatorCreditPill role="Cover Art" names={credits.coverArtists} roleColor="text-amber-300" />
          )}
          {credits.writers && credits.writers.length > 0 && (
            <CreatorCreditPill role="Writer(s)" names={credits.writers} roleColor="text-cyan-400" />
          )}
          {credits.pencilers && credits.pencilers.length > 0 && (
            <CreatorCreditPill role="Penciler(s)" names={credits.pencilers} roleColor="text-purple-400" />
          )}
          {credits.inkers && credits.inkers.length > 0 && (
            <CreatorCreditPill role="Inker(s)" names={credits.inkers} roleColor="text-indigo-400" />
          )}
          {credits.colorists && credits.colorists.length > 0 && (
            <CreatorCreditPill role="Colorist(s)" names={credits.colorists} roleColor="text-amber-400" />
          )}
          {credits.letterers && credits.letterers.length > 0 && (
            <CreatorCreditPill role="Letterer(s)" names={credits.letterers} roleColor="text-emerald-400" />
          )}
          {credits.editors && credits.editors.length > 0 && (
            <CreatorCreditPill role="Editor(s)" names={credits.editors} roleColor="text-rose-400" />
          )}
          {credits.editorInChief && credits.editorInChief.length > 0 && (
            <CreatorCreditPill role="Editor-in-Chief" names={credits.editorInChief} roleColor="text-slate-300" />
          )}
        </div>
      )}

      {/* Entity Census (Interactive Categorized Badges) */}
      {entities && (
        <div id="lore-appearances" className="mt-5 space-y-4 pt-4 border-t border-slate-800/80 relative z-10 scroll-mt-24">
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
            Appearing in {summary.storyTitle ? `“${summary.storyTitle}”` : `${series} #${issueNumber}`}
          </div>

          {/* 1st Appearances & Key Debuts */}
          {hasFirstApps && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400 uppercase tracking-wider font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>1st Appearance Key Debuts ({entities.firstAppearances!.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entities.firstAppearances!.map((e, idx) => (
                  <EntityBadge
                    key={`fa-${e.target}-${idx}`}
                    entity={e}
                    badgeColor="bg-amber-950/60 border border-amber-500/50 text-amber-200 hover:border-amber-400"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Featured Characters */}
          {hasFeatured && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                <Users className="h-3.5 w-3.5" />
                <span>Featured Characters ({entities.featuredCharacters!.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entities.featuredCharacters!.map((e, idx) => (
                  <EntityBadge
                    key={`feat-${e.target}-${idx}`}
                    entity={e}
                    badgeColor="bg-cyan-950/50 border border-cyan-500/40 text-cyan-200 hover:border-cyan-400"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Supporting Characters */}
          {hasSupporting && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-teal-400 uppercase tracking-wider font-semibold">
                <Users className="h-3.5 w-3.5" />
                <span>Supporting Characters ({entities.supportingCharacters!.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entities.supportingCharacters!.map((e, idx) => (
                  <EntityBadge
                    key={`supp-${e.target}-${idx}`}
                    entity={e}
                    badgeColor="bg-teal-950/50 border border-teal-500/40 text-teal-200 hover:border-teal-400"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Antagonists */}
          {hasAntagonists && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-rose-400 uppercase tracking-wider font-semibold">
                <span>⚔ Antagonists ({entities.antagonists!.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entities.antagonists!.map((e, idx) => (
                  <EntityBadge
                    key={`antag-${e.target}-${idx}`}
                    entity={e}
                    badgeColor="bg-rose-950/50 border border-rose-500/40 text-rose-200 hover:border-rose-400"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Characters */}
          {hasOtherCharacters && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-sky-400 uppercase tracking-wider font-semibold">
                <Users className="h-3.5 w-3.5" />
                <span>Other Characters ({entities.otherCharacters!.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entities.otherCharacters!.map((e, idx) => (
                  <EntityBadge
                    key={`other-${e.target}-${idx}`}
                    entity={e}
                    badgeColor="bg-sky-950/40 border border-sky-500/35 text-sky-200 hover:border-sky-400"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Races and Species */}
          {hasRaces && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-purple-400 uppercase tracking-wider font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Races and Species ({entities.racesAndSpecies!.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entities.racesAndSpecies!.map((e, idx) => (
                  <EntityBadge
                    key={`race-${e.target}-${idx}`}
                    entity={e}
                    badgeColor="bg-purple-950/40 border border-purple-500/35 text-purple-200 hover:border-purple-400"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Landmark Locations & Realms (Unclipped) */}
          {hasLocations && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-indigo-400 uppercase tracking-wider font-semibold">
                <MapPin className="h-3.5 w-3.5" />
                <span>Locations ({entities.locations!.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entities.locations!.map((e, idx) => (
                  <EntityBadge
                    key={`loc-${e.target}-${idx}`}
                    entity={e}
                    badgeColor="bg-indigo-950/50 border border-indigo-500/40 text-indigo-200 hover:border-indigo-400"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Items */}
          {hasItems && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                <Wrench className="h-3.5 w-3.5" />
                <span>Items ({entities.items!.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entities.items!.map((e, idx) => (
                  <EntityBadge
                    key={`item-${e.target}-${idx}`}
                    entity={e}
                    badgeColor="bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 hover:border-emerald-400"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Vehicles */}
          {hasVehicles && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-teal-300 uppercase tracking-wider font-semibold">
                <Wrench className="h-3.5 w-3.5" />
                <span>Vehicles ({entities.vehicles!.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entities.vehicles!.map((e, idx) => (
                  <EntityBadge
                    key={`veh-${e.target}-${idx}`}
                    entity={e}
                    badgeColor="bg-teal-950/50 border border-teal-500/40 text-teal-200 hover:border-teal-400"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Events */}
          {hasEvents && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-amber-300 uppercase tracking-wider font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Events ({entities.events!.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entities.events!.map((e, idx) => (
                  <EntityBadge
                    key={`evt-${e.target}-${idx}`}
                    entity={e}
                    badgeColor="bg-amber-950/40 border border-amber-500/40 text-amber-200 hover:border-amber-400"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Interactive Hyperlinked Synopsis */}
      <div id="lore-synopsis" className="mt-6 pt-5 border-t border-slate-800/80 relative z-10 scroll-mt-24">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-xs sm:text-sm font-mono uppercase tracking-widest text-cyan-400 font-semibold">
            Synopsis for {summary.storyTitle ? `“${summary.storyTitle}”` : `${series} #${issueNumber}`}
          </h3>
          <span className="text-[10px] font-mono text-slate-400">
            {paragraphs.length} {paragraphs.length === 1 ? "Paragraph" : "Paragraphs"}
          </span>
        </div>
        <div className="rounded-xl bg-[#0d131f]/90 border border-cyan-500/20 p-4 sm:p-6 space-y-4 shadow-inner">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-sm sm:text-[15px] leading-7 text-slate-100 tracking-[0.01em] font-normal"
            >
              {renderMarkdownWithLinks(p)}
            </p>
          ))}
        </div>
      </div>



      {/* Notes, Official YouTube Promotional Trailer & Continuity Notes */}
      {(summary.notes || summary.youtubeTrailer || summary.continuityNotes) && (
        <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-4 relative z-10">
          {(summary.notes || summary.youtubeTrailer) && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold">
                Notes &amp; Official Promotional Trailer
              </h3>
              {summary.notes && (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {renderMarkdownWithLinks(summary.notes)}
                </p>
              )}
              {summary.youtubeTrailer && (
                <div className="rounded-lg border border-cyan-500/30 bg-[#0d131f] p-3.5 space-y-2.5 max-w-2xl">
                  <div className="flex items-center justify-between gap-2 text-xs font-mono">
                    <span className="text-cyan-300 font-semibold">{summary.youtubeTrailer.title}</span>
                    <a
                      href={summary.youtubeTrailer.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-200 underline text-[11px]"
                    >
                      Watch on YouTube ↗
                    </a>
                  </div>
                  <div className="aspect-video w-full rounded overflow-hidden border border-slate-800 bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${summary.youtubeTrailer.videoId}`}
                      title={summary.youtubeTrailer.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {summary.continuityNotes && (
            <div id="lore-continuity-notes" className="space-y-1.5 p-3.5 rounded-lg bg-rose-950/20 border border-rose-500/30 scroll-mt-24">
              <h4 className="text-xs font-mono uppercase tracking-wider text-rose-300 font-semibold">
                Continuity Notes
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {renderMarkdownWithLinks(summary.continuityNotes)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footnote References & Citations */}
      {summary.references && summary.references.length > 0 && (
        <div id="lore-references" className="mt-5 pt-4 border-t border-slate-800/80 relative z-10 scroll-mt-24">
          <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2 font-semibold">
            Links and References
          </h3>
          <ol className="list-decimal list-inside space-y-1.5 text-xs font-mono text-slate-300">
            {summary.references.map((ref, idx) => (
              <li key={idx} className="leading-relaxed">
                {ref.url ? (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
                  >
                    {ref.text} ↗
                  </a>
                ) : (
                  <span>{ref.text}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Alternate / Variant Covers Registry */}
      {canonicalVariants && canonicalVariants.length > 0 ? (
        <div className="mt-5 pt-4 border-t border-slate-800/80 relative z-10">
          <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2.5 font-semibold">
            Alternate Covers &amp; Printings ({canonicalVariants.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {canonicalVariants.map((cv) => {
              const href = cv.catalogId
                ? `/comics/${cv.catalogId}`
                : `/comics?q=${encodeURIComponent(`${series} #${issueNumber}`)}`;
              return (
                <Link
                  key={cv.id}
                  href={href}
                  className="px-2.5 py-1 rounded bg-[#0d131f] border border-slate-800 hover:border-cyan-500/60 hover:bg-cyan-950/30 text-[11px] font-mono text-slate-300 hover:text-cyan-200 transition-colors"
                  title={`${cv.variantName}${cv.coverArtist ? ` · Cover by ${cv.coverArtist}` : ""}`}
                >
                  {cv.variantName}
                  {cv.coverArtist && !cv.variantName.toLowerCase().includes(cv.coverArtist.toLowerCase())
                    ? ` (${cv.coverArtist})`
                    : ""}
                </Link>
              );
            })}
          </div>
        </div>
      ) : summary.variantCovers && summary.variantCovers.length > 0 ? (
        <div className="mt-5 pt-4 border-t border-slate-800/80 relative z-10">
          <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2.5 font-semibold">
            Alternate Covers &amp; Printings ({summary.variantCovers.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {summary.variantCovers.map((vc, idx) => (
              <Link
                key={`${vc.image}-${idx}`}
                href={`/comics?q=${encodeURIComponent(`${series} #${issueNumber}`)}`}
                className="px-2.5 py-1 rounded bg-[#0d131f] border border-slate-800 hover:border-cyan-500/60 hover:bg-cyan-950/30 text-[11px] font-mono text-slate-300 hover:text-cyan-200 transition-colors"
                title={vc.image}
              >
                {vc.label}
                {vc.artist ? ` (${vc.artist})` : ""}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* See Also */}
      {summary.seeAlso && summary.seeAlso.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-800/80 relative z-10">
          <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2 font-semibold">
            See Also
          </h3>
          <div className="flex flex-wrap gap-3 text-xs font-mono">
            {summary.seeAlso.map((sa, idx) => (
              <a
                key={idx}
                href={sa.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
              >
                {sa.label} ↗
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Attribution & Provenance Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 relative z-10 font-mono">
        <div>
          Source:{" "}
          <a href={summary.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-white font-mono underline hover:text-cyan-300">
            Marvel Database (Fandom) — {series} Vol 1 {issueNumber}
          </a>
          {" "}· Text licensed under{" "}
          <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">
            CC BY-SA 3.0
          </a>
        </div>
        <div className="font-mono text-cyan-400/80">
          PANEL PROFITS CANON &amp; LORE
        </div>
      </div>
    </section>
  );
}
