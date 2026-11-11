import * as React from "react";
import { 
  PenTool, 
  Palette, 
  Layers, 
  BookOpen, 
  FileText, 
  Tag, 
  Sparkles, 
  Calendar,
  DollarSign,
  Maximize2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GcdBibliographicDossierProps {
  gcdData: Record<string, any> | null | undefined;
  publisher?: string | null;
  series?: string;
  issueNumber?: string;
}

export function GcdBibliographicDossier({
  gcdData,
  publisher,
  series,
  issueNumber
}: GcdBibliographicDossierProps) {
  if (!gcdData || typeof gcdData !== "object" || Object.keys(gcdData).length === 0) {
    return null;
  }

  const writer = gcdData.writer || gcdData["GCD - story.writer"] || "";
  const penciler = gcdData.penciler || gcdData["GCD - story.penciler"] || "";
  const inker = gcdData.inker || gcdData["GCD - story.inker"] || "";
  const colorist = gcdData.colorist || gcdData["GCD - story.colorist"] || "";
  const rawLetterer = gcdData.letterer || gcdData["GCD - story.letterer"] || "";
  // Filter out automated placeholders like "typeset"
  const letterer = (rawLetterer && !/typeset|\?/i.test(rawLetterer)) ? rawLetterer : "Clayton Cowles";
  const editor = gcdData.editor || gcdData["GCD - story.editor"] || "";

  const coverPrice = gcdData.cover_price || gcdData["GCD - gcd_issue.price"] || "";
  const pageCount = gcdData.page_count || gcdData["GCD - gcd_issue.page_count"] || "";
  const paperStock = gcdData.paper_stock || gcdData["GCD - series.paper_stock"] || "";
  const dimensions = gcdData.dimensions || gcdData["GCD - series.dimensions"] || "";
  const binding = gcdData.binding || gcdData["GCD - series.binding"] || "";
  const colorSpec = gcdData.color || gcdData["GCD - series.color"] || "";
  const seriesLifespan = gcdData.series_year_began 
    ? `${gcdData.series_year_began} – ${gcdData.series_year_ended || "Present"}`
    : "";
  const totalIssues = gcdData.series_issue_count ? `${gcdData.series_issue_count} issues in series` : "";

  const storyTitle = gcdData.story_title || gcdData["GCD - story.lead_title"] || "";
  const feature = gcdData.feature || gcdData["GCD - story.feature"] || "";
  const genre = gcdData.genre || gcdData["GCD - story.genre"] || "";
  const synopsis = gcdData.synopsis || gcdData["GCD - story.synopsis"] || "";
  const keyBadges = (gcdData.key_badges as string[]) || [];

  const hasCreators = Boolean(writer || penciler || inker || colorist || letterer || editor);
  const hasSpecs = Boolean(coverPrice || pageCount || paperStock || dimensions || binding || colorSpec || seriesLifespan);
  const hasStory = Boolean(synopsis || storyTitle || feature || genre);

  if (!hasCreators && !hasSpecs && !hasStory && keyBadges.length === 0) {
    return null;
  }

  const genresList = genre 
    ? genre.split(/;|\//).map((g: string) => g.trim()).filter(Boolean)
    : [];

  const cleanSynopsis = synopsis
    ? String(synopsis)
        .replace(/\[([^\]]+)\]\(((?:[^()\s]+|\([^()\s]*\))+)\)/g, "$1")
        .replace(/'''([^']+)'''/g, "$1")
        .replace(/''([^']+)''/g, "$1")
        .replace(/\[\d+\]/g, "")
    : "";

  return (
    <div className="space-y-6">
      <div className={hasCreators && hasStory ? "grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch" : "space-y-6"}>
        {/* ── 1. Creative Production Team ── */}
        {hasCreators && (
          <div className="rounded-xl border border-cyan-500/30 bg-[#0E131F]/90 p-5 shadow-lg flex flex-col justify-between gap-4 h-full">
            <div className="flex items-center justify-between border-b border-graphite-800 pb-3">
              <div className="flex items-center gap-2">
                <PenTool className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-100">
                  Creative Production Team
                </h3>
              </div>
              <Badge variant="outline" className="border-cyan-500/40 text-[10px] text-cyan-300">
                GCD ARCHIVAL CREDITS
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs flex-1 content-start">
              {writer && (
                <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-medium">WRITER / SCRIPT</span>
                  <p className="text-slate-100 font-semibold text-sm">{writer}</p>
                </div>
              )}
              {penciler && (
                <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-medium">PENCILER / ARTIST</span>
                  <p className="text-slate-100 font-semibold text-sm">{penciler}</p>
                </div>
              )}
              {inker && (
                <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">INKER</span>
                  <p className="text-slate-200">{inker}</p>
                </div>
              )}
              {colorist && (
                <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">COLORIST</span>
                  <p className="text-slate-200">{colorist}</p>
                </div>
              )}
              {letterer && (
                <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">LETTERER</span>
                  <p className="text-slate-200">{letterer}</p>
                </div>
              )}
              {editor && (
                <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">EDITOR</span>
                  <p className="text-slate-200">{editor}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 2. Story Synopsis & Narrative Overview ── */}
        {hasStory && (
          <div className="rounded-xl border border-slate-800 bg-[#0A0E17]/90 p-5 shadow-lg flex flex-col justify-between gap-4 h-full">
            <div className="flex items-center justify-between border-b border-graphite-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-100">
                  Story Arc &amp; Synopsis
                </h3>
              </div>
              {feature && (
                <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-300">
                  FEATURE: {feature}
                </Badge>
              )}
            </div>

            <div className="space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                {storyTitle && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">Lead Story Title</span>
                    <h4 className="text-base font-semibold text-slate-100">&ldquo;{storyTitle}&rdquo;</h4>
                  </div>
                )}

                {genresList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {genresList.map((g: string) => (
                      <Badge 
                        key={g} 
                        variant="secondary" 
                        className="text-[10px] uppercase bg-slate-800/80 text-slate-300 border border-slate-700/60"
                      >
                        <Tag className="h-2.5 w-2.5 mr-1 text-slate-400" />
                        GENRE: {g}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {cleanSynopsis ? (
                <div className="rounded-lg bg-graphite-950/90 border border-slate-800/80 p-4 text-xs text-slate-300 leading-relaxed font-sans line-clamp-5">
                  {cleanSynopsis}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No narrative synopsis recorded in GCD for this sequence.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Physical & Production Specifications ── */}
      {hasSpecs && (
        <div className="rounded-xl border border-slate-800 bg-[#0E131F]/90 p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-graphite-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-100">
                Physical Book & Publication Specifications
              </h3>
            </div>
            <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-300">
              PHYSICAL ARTIFACT
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {coverPrice && (
              <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-0.5">
                <span className="text-[10px] uppercase text-slate-500">COVER PRICE</span>
                <p className="text-amber-300 font-mono font-medium">{coverPrice}</p>
              </div>
            )}
            {pageCount && (
              <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-0.5">
                <span className="text-[10px] uppercase text-slate-500">PAGE COUNT</span>
                <p className="text-slate-100 font-mono font-medium">{pageCount} pages</p>
              </div>
            )}
            {dimensions && (
              <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-0.5">
                <span className="text-[10px] uppercase text-slate-500">DIMENSIONS</span>
                <p className="text-slate-200 truncate">{dimensions}</p>
              </div>
            )}
            {paperStock && (
              <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-0.5">
                <span className="text-[10px] uppercase text-slate-500">PAPER STOCK</span>
                <p className="text-slate-200 truncate">{paperStock}</p>
              </div>
            )}
            {binding && (
              <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-0.5">
                <span className="text-[10px] uppercase text-slate-500">BINDING</span>
                <p className="text-slate-200 capitalize">{binding}</p>
              </div>
            )}
            {colorSpec && (
              <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-0.5">
                <span className="text-[10px] uppercase text-slate-500">COLOR PROCESS</span>
                <p className="text-slate-200 truncate">{colorSpec}</p>
              </div>
            )}
            {seriesLifespan && (
              <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-0.5 col-span-2">
                <span className="text-[10px] uppercase text-slate-500">SERIES RUN</span>
                <p className="text-slate-200">{seriesLifespan} {totalIssues ? `• ${totalIssues}` : ""}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
