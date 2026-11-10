import * as React from "react";
import Link from "next/link";
import { 
  Layers, 
  Globe2, 
  PenTool, 
  BookOpen, 
  Barcode, 
  Calendar, 
  DollarSign, 
  ExternalLink,
  Sparkles,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { GcdRelationalData } from "@/lib/comics/gcd-relational-service";

interface AtomicVariantsAndInternationalMatrixProps {
  relationalData: GcdRelationalData | null | undefined;
  currentComicId?: string;
  series: string;
  issueNumber: string;
  baseFmv?: number;
}

function getVariantFormulaMultiplier(name: string): { multiplier: number; label: string; badgeColor: string } {
  const n = name.toLowerCase();
  if (n.includes("1:500") || n.includes("1/500")) return { multiplier: 5.0, label: "1:500 Ratio Incentive (5.0x)", badgeColor: "text-amber-300 border-amber-500/50 bg-amber-950/60" };
  if (n.includes("1:100") || n.includes("1/100")) return { multiplier: 4.0, label: "1:100 Ratio Incentive (4.0x)", badgeColor: "text-amber-300 border-amber-500/50 bg-amber-950/60" };
  if (n.includes("1:50") || n.includes("1/50")) return { multiplier: 2.5, label: "1:50 Ratio Incentive (2.5x)", badgeColor: "text-yellow-300 border-yellow-500/50 bg-yellow-950/60" };
  if (n.includes("1:25") || n.includes("1/25")) return { multiplier: 1.75, label: "1:25 Ratio Incentive (1.75x)", badgeColor: "text-yellow-300 border-yellow-500/50 bg-yellow-950/60" };
  if (n.includes("foil")) return { multiplier: 1.5, label: "Foil Edition (1.5x)", badgeColor: "text-purple-300 border-purple-500/50 bg-purple-950/60" };
  if (n.includes("noir")) return { multiplier: 1.25, label: "Noir Edition (1.25x)", badgeColor: "text-slate-300 border-slate-500/50 bg-slate-900/60" };
  if (n.includes("second printing") || n.includes("2nd printing")) return { multiplier: 0.85, label: "2nd Printing (0.85x)", badgeColor: "text-blue-300 border-blue-500/50 bg-blue-950/60" };
  if (n.includes("third printing") || n.includes("3rd printing")) return { multiplier: 0.75, label: "3rd Printing (0.75x)", badgeColor: "text-blue-300 border-blue-500/50 bg-blue-950/60" };
  if (n.includes("fourth printing") || n.includes("4th printing")) return { multiplier: 0.70, label: "4th Printing (0.70x)", badgeColor: "text-blue-300 border-blue-500/50 bg-blue-950/60" };
  if (n.includes("blank")) return { multiplier: 0.80, label: "Blank Sketch Cover (0.80x)", badgeColor: "text-zinc-300 border-zinc-500/50 bg-zinc-900/60" };
  return { multiplier: 1.0, label: "Universal Parity (1.0x)", badgeColor: "text-cyan-300 border-cyan-500/50 bg-cyan-950/60" };
}

export function AtomicVariantsAndInternationalMatrix({
  relationalData,
  currentComicId,
  series,
  issueNumber,
  baseFmv = 0,
}: AtomicVariantsAndInternationalMatrixProps) {
  if (!relationalData) {
    return null;
  }

  const {
    variants,
    foreignEditions,
    stories,
    issueCredits,
    allWriters,
    allPencilers,
    allInkers,
    allColorists,
    allLetterers,
    allEditors,
    allCoverArtists,
  } = relationalData;

  const hasVariants = variants && variants.length > 0;
  const hasForeign = foreignEditions && foreignEditions.length > 0;
  const hasStories = stories && stories.length > 0;
  const hasCredits = (allWriters.length > 0 || allPencilers.length > 0 || allInkers.length > 0 || allColorists.length > 0 || allCoverArtists.length > 0 || allEditors.length > 0);

  if (!hasVariants && !hasForeign && !hasStories && !hasCredits) {
    return null;
  }

  // Country flags/emojis helper
  const getCountryFlag = (country: string) => {
    if (!country) return "🌐";
    const c = country.toLowerCase().trim();
    if (c.includes("germany") || c.includes("deutschland")) return "🇩🇪";
    if (c.includes("brazil") || c.includes("brasil")) return "🇧🇷";
    if (c.includes("france") || c.includes("french")) return "🇫🇷";
    if (c.includes("italy") || c.includes("italia")) return "🇮🇹";
    if (c.includes("spain") || c.includes("españa")) return "🇪🇸";
    if (c.includes("mexico") || c.includes("méxico")) return "🇲🇽";
    if (c.includes("netherlands") || c.includes("holland") || c.includes("dutch")) return "🇳🇱";
    if (c.includes("united kingdom") || c.includes("uk") || c.includes("great britain") || c.includes("england")) return "🇬🇧";
    if (c.includes("united states") || c.includes("usa") || c.includes("us")) return "🇺🇸";
    if (c.includes("canada")) return "🇨🇦";
    if (c.includes("japan")) return "🇯🇵";
    if (c.includes("norway")) return "🇳🇴";
    if (c.includes("sweden")) return "🇸🇪";
    if (c.includes("denmark")) return "🇩🇰";
    if (c.includes("finland")) return "🇫🇮";
    if (c.includes("australia")) return "🇦🇺";
    if (c.includes("argentina")) return "🇦🇷";
    if (c.includes("chile")) return "🇨🇱";
    if (c.includes("colombia")) return "🇨🇴";
    if (c.includes("poland")) return "🇵🇱";
    if (c.includes("turkey") || c.includes("türkiye")) return "🇹🇷";
    if (c.includes("greece")) return "🇬🇷";
    if (c.includes("portugal")) return "🇵🇹";
    if (c.includes("belgium")) return "🇧🇪";
    if (c.includes("austria")) return "🇦🇹";
    if (c.includes("switzerland")) return "🇨🇭";
    return "🌐";
  };

  const internationalEditions = (foreignEditions || []).filter(
    (f) => !f.isDomesticSpecial && f.country !== "United States"
  );
  const domesticSpecialEditions = (foreignEditions || []).filter(
    (f) => f.isDomesticSpecial || f.country === "United States"
  );

  return (
    <div className="space-y-6">
      {/* ── 1. Atomic Tradeable Instrument Matrix: Published Variants ── */}
      {hasVariants && (
        <section aria-labelledby="variants-heading" className="rounded-xl border border-cyan-500/30 bg-[#111319] p-4 sm:p-6 shadow-lg space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-700/80 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <h3 id="variants-heading" className="text-base font-semibold text-slate-100">
                Atomic Tradeable Instruments: Published Variants & Printings
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-cyan-500/40 text-[10px] text-cyan-300 font-mono">
                {variants.length} PUBLISHED EDITIONS
              </Badge>
              <span className="text-xs text-slate-400 font-mono">GCD Canon</span>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Each cover variant, retailer incentive, and subsequent printing represents an independent atomic tradeable instrument with unique supply elasticity, barcode registration, and secondary market demand.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
            {variants.map((v) => {
              const isBase = v.id === relationalData.baseIssueId;
              const formula = getVariantFormulaMultiplier(v.variantName);
              const estFmv = baseFmv > 0 ? baseFmv * formula.multiplier : null;

              return (
                <div
                  key={v.id}
                  className={`rounded-lg border p-3 flex flex-col justify-between transition-colors ${
                    isBase
                      ? "border-cyan-500/50 bg-[#0C1A2E]"
                      : "border-slate-800 bg-[#0E131F] hover:border-slate-700"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-100 line-clamp-2">
                        {v.variantName}
                      </span>
                      {isBase ? (
                        <span className="shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                          PRIMARY
                        </span>
                      ) : (
                        <span className="shrink-0 text-[8.5px] font-mono px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800/60 text-slate-400">
                          VARIANT
                        </span>
                      )}
                    </div>

                    {/* Cover Artist Roster if resolved */}
                    {v.coverArtist && (
                      <div className="text-[10px] font-mono text-cyan-300/90 flex items-center gap-1 line-clamp-1">
                        <PenTool className="h-2.5 w-2.5 shrink-0 text-cyan-400" />
                        <span className="truncate">Cover: {v.coverArtist}</span>
                      </div>
                    )}

                    {/* Pricing Parity Guidance */}
                    <div className="flex items-center justify-between text-[10px] font-mono pt-0.5">
                      <span className="text-slate-400">{isBase ? "Primary Anchor" : "Variant Edition"}</span>
                      {isBase && estFmv !== null ? (
                        <span className="text-emerald-400 font-bold">
                          9.8 Anchor: {formatCurrency(baseFmv)}
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          Separate Comp Series
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 pt-0.5 font-mono">
                      {v.price && (
                        <span className="inline-flex items-center gap-0.5 text-slate-300">
                          <DollarSign className="h-3 w-3 text-emerald-400" />
                          <span>{v.price}</span>
                        </span>
                      )}
                      {v.publicationDate && (
                        <span className="inline-flex items-center gap-0.5 text-slate-400">
                          <Calendar className="h-3 w-3" />
                          <span>{v.publicationDate}</span>
                        </span>
                      )}
                    </div>

                    {v.barcode && (
                      <div className="text-[9.5px] font-mono text-slate-500 flex items-center gap-1 pt-0.5 truncate">
                        <Barcode className="h-3 w-3 shrink-0" />
                        <span className="truncate">{v.barcode}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10.5px]">
                    {v.catalogId ? (
                      <Link
                        href={`/comics/${v.catalogId}`}
                        className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>View Variant #{v.id}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    ) : (
                      <span className="text-slate-500 font-mono text-[9.5px]">
                        GCD Archival #{v.id}
                      </span>
                    )}
                    <Link
                      href={`/comics?q=${encodeURIComponent(series)}`}
                      className="text-slate-400 hover:text-slate-200 font-medium inline-flex items-center gap-0.5 text-[11px]"
                    >
                      <span>Explore Series</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 2. International & Foreign Editions Matrix ── */}
      {internationalEditions.length > 0 && (
        <section aria-labelledby="foreign-heading" className="rounded-xl border border-indigo-500/30 bg-[#111319] p-4 sm:p-6 shadow-lg space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-700/80 pb-3">
            <div className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-indigo-400" />
              <h3 id="foreign-heading" className="text-base font-semibold text-slate-100">
                International & Foreign Language Editions
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-indigo-500/40 text-[10px] text-indigo-300 font-mono">
                {internationalEditions.length} INTERNATIONAL EDITIONS
              </Badge>
              <span className="text-xs text-slate-400 font-mono">Global Arbitrage Pool</span>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Foreign editions (licensed through Panini, Urban Comics, Editorial Novaro, Novedades, Otto Simon, etc.) represent physical tradeable instruments in international secondary markets. Geographic scarcity and currency differentials drive global cross-border arbitrage.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {internationalEditions.map((f) => (
              <div
                key={f.reprintId}
                className="rounded-lg border border-slate-800 bg-[#0E131F] p-3 flex flex-col justify-between hover:border-indigo-500/50 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                      <span>{getCountryFlag(f.country)}</span>
                      <span>{f.country}</span>
                    </span>
                    <Badge variant="secondary" className="text-[9px] font-mono px-1.5 py-0.5">
                      {f.language}
                    </Badge>
                  </div>

                  <p className="text-xs text-indigo-300 font-medium pt-0.5 line-clamp-1">
                    {f.seriesName} #{f.issueNumber}
                  </p>

                  {f.publisherName && (
                    <div className="text-[10px] font-mono text-slate-300">
                      <span className="text-slate-500">Publisher:</span> {f.publisherName}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 font-mono">
                    <span>Pub Date: {f.publicationDate || "Archived Edition"}</span>
                  </div>

                  {f.notes && (
                    <p className="text-[9.5px] font-mono text-indigo-200/80 bg-indigo-950/40 rounded px-2 py-1 border border-indigo-800/30 line-clamp-2">
                      {f.notes}
                    </p>
                  )}

                  <div className="text-[9.5px] font-mono text-emerald-400/90 pt-0.5">
                    Licensed Sovereign Peg · Physical Instrument
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  {f.catalogId ? (
                    <Link
                      href={`/comics/${f.catalogId}`}
                      className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-medium"
                    >
                      <span>View Edition</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  ) : (
                    <span className="text-slate-500 font-mono text-[9.5px]">
                      GCD Reg #{f.targetIssueId}
                    </span>
                  )}
                  <Link
                    href={`/comics?q=${encodeURIComponent(f.seriesName)}`}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Search Edition
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 2b. Domestic Prestige, Alternate Reprints & Special Editions ── */}
      {domesticSpecialEditions.length > 0 && (
        <section aria-labelledby="domestic-special-heading" className="rounded-xl border border-slate-700/60 bg-[#111319] p-4 sm:p-6 shadow-lg space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-700/80 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-amber-400" />
              <h3 id="domestic-special-heading" className="text-base font-semibold text-slate-100">
                Domestic Prestige & Alternate Editions (Reprints & Collections)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-300 font-mono">
                {domesticSpecialEditions.length} DOMESTIC REPRINTS
              </Badge>
              <span className="text-xs text-slate-400 font-mono">Archival Registry</span>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Special black & white noir printings, facsimile editions, and anthology collections licensed or published domestically.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {domesticSpecialEditions.map((f) => (
              <div
                key={f.reprintId}
                className="rounded-lg border border-slate-800 bg-[#0E131F] p-3 flex flex-col justify-between hover:border-amber-500/50 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                      <span>🇺🇸</span>
                      <span>{f.seriesName}</span>
                    </span>
                    <Badge variant="secondary" className="text-[9px] font-mono px-1.5 py-0.5">
                      #{f.issueNumber}
                    </Badge>
                  </div>

                  {f.publisherName && (
                    <div className="text-[10px] font-mono text-slate-300">
                      <span className="text-slate-500">Publisher:</span> {f.publisherName}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 font-mono">
                    <span>Pub Date: {f.publicationDate || "Archived Edition"}</span>
                  </div>

                  {f.notes && (
                    <p className="text-[9.5px] font-mono text-amber-200/80 bg-amber-950/40 rounded px-2 py-1 border border-amber-800/30 line-clamp-2">
                      {f.notes}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  {f.catalogId ? (
                    <Link
                      href={`/comics/${f.catalogId}`}
                      className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 font-medium"
                    >
                      <span>View Issue</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  ) : (
                    <span className="text-slate-500 font-mono text-[9.5px]">
                      GCD Reg #{f.targetIssueId}
                    </span>
                  )}
                  <Link
                    href={`/comics?q=${encodeURIComponent(f.seriesName)}`}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Search Series
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 3. Creator Spotlight & Production Roll ── */}
      {hasCredits && (
        <section aria-labelledby="creators-heading" className="rounded-xl border border-cyan-500/30 bg-[#111319] p-4 sm:p-6 shadow-lg space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-700/80 pb-3">
            <div className="flex items-center gap-2">
              <PenTool className="h-4 w-4 text-cyan-400" />
              <h3 id="creators-heading" className="text-base font-semibold text-slate-100">
                Creator Lineage & Production Roster
              </h3>
            </div>
            <Badge variant="outline" className="border-cyan-500/40 text-[10px] text-cyan-300 font-mono">
              VERIFIED ARCHIVAL CREDITS
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            {allWriters.length > 0 && (
              <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-medium">WRITER / SCRIPT</span>
                <p className="text-slate-100 font-semibold">{allWriters.join(", ")}</p>
              </div>
            )}
            {allPencilers.length > 0 && (
              <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-medium">PENCILER / ARTIST</span>
                <p className="text-slate-100 font-semibold">{allPencilers.join(", ")}</p>
              </div>
            )}
            {allInkers.length > 0 && (
              <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-medium">INKER</span>
                <p className="text-slate-100 font-semibold">{allInkers.join(", ")}</p>
              </div>
            )}
            {allColorists.length > 0 && (
              <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-medium">COLORIST</span>
                <p className="text-slate-100 font-semibold">{allColorists.join(", ")}</p>
              </div>
            )}
            {allLetterers.length > 0 && (
              <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-medium">LETTERER</span>
                <p className="text-slate-100 font-semibold">{allLetterers.join(", ")}</p>
              </div>
            )}
            {allEditors.length > 0 && (
              <div className="rounded bg-graphite-950/80 border border-slate-800/80 p-3 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-medium">EDITORIAL</span>
                <p className="text-slate-100 font-semibold">{allEditors.join(", ")}</p>
              </div>
            )}
          </div>

          {allCoverArtists.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                Cover Artists Roster ({allCoverArtists.length} Artists)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {allCoverArtists.map((artist) => (
                  <span
                    key={artist}
                    className="inline-flex items-center px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-medium"
                  >
                    {artist}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 4. Story Arcs & Character Apperances ── */}
      {hasStories && (
        <section aria-labelledby="story-heading" className="rounded-xl border border-slate-700/80 bg-[#111319] p-4 sm:p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-400" />
              <h3 id="story-heading" className="text-base font-semibold text-slate-100">
                Story Arc & Narrative Contents
              </h3>
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-300 font-mono">
              NARRATIVE ASSET
            </Badge>
          </div>

          <div className="space-y-4">
            {stories.map((story) => (
              <div key={story.id} className="rounded-lg border border-slate-800 bg-[#0E131F] p-4 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-sm font-semibold text-chalk">
                    {story.title || `Sequence #${story.sequenceNumber}`}
                  </h4>
                  {story.pageCount > 0 && (
                    <span className="text-[11px] font-mono text-slate-400">
                      {story.pageCount} pages
                    </span>
                  )}
                </div>

                {story.characters && (
                  <div className="pt-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 block mb-1">
                      Featured Characters & Entities
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {story.characters.split(";").map((c) => c.trim()).filter(Boolean).map((char) => (
                        <span
                          key={char}
                          className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px]"
                        >
                          {char}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {story.synopsis && (
                  <p className="text-xs text-slate-300 pt-1 leading-relaxed">
                    {story.synopsis}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
