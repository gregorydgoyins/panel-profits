import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Shield,
  MapPin,
  Users,
  User,
  Sparkles,
  Compass,
  ArrowUpRight,
  Zap,
  Crosshair,
  Skull,
  HeartHandshake,
  Layers,
  PenTool,
} from "lucide-react";
import { getLoreEntityBySlug, type LoreEntitySummary } from "@/lib/wiki/lore-search";
import { getCreatorBio } from "@/lib/creators/creator-bio-service";
import { createPublicServerClient } from "@/lib/supabase/server";
import { extractEntitiesFromContext } from "@/lib/news/entities";
import { LinkedBriefing } from "@/components/news/linked-briefing";

export const dynamic = "force-dynamic";

function cleanLoreTitle(title: string): string {
  if (!title) return "";
  let clean = title.trim();
  clean = clean.replace(/^[|*]\s*(?:Titles|Aliases|Nicknames|Impersonations)\s*=\s*\*?\s*/i, "");
  clean = clean.replace(/^\*\s*/, "");
  clean = clean.replace(/^(.+?)(City of \1)$/i, "$1");
  clean = clean.replace(/New York CityCity of New York/i, "New York City");
  return clean.trim();
}

export default async function LoreEntityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let entity: LoreEntitySummary | null = getLoreEntityBySlug(slug);

  // Check creator bio authority
  const cleanCreatorSlug = slug.replace(/^creator-/, "");
  const creatorBio = await getCreatorBio(cleanCreatorSlug);
  if (creatorBio && (!entity || slug.startsWith("creator-") || !entity.first_appearance)) {
    entity = {
      slug,
      title: creatorBio.name,
      universe: "CANONICAL",
      type: "creator",
      reality: creatorBio.birthCity ? `Origin: ${creatorBio.birthCity}` : "Comic Creative Architect",
      creators: creatorBio.description || "Comic Book Creative Architect",
      first_appearance: creatorBio.deathDate
        ? `1939–${creatorBio.deathDate.slice(0, 4)}`
        : creatorBio.birthDate
        ? `Active (b. ${creatorBio.birthDate.slice(0, 4)})`
        : "Historic Master Architect",
      summary: creatorBio.bio,
      imageUrl: creatorBio.imageUrl,
      landmark_debuts: [
        {
          title: `All Certified Issues by ${creatorBio.name}`,
          significance: `Search all authenticated comic issues written, illustrated, or edited by ${creatorBio.name}`,
          catalogUrl: `/comics?q=${encodeURIComponent(creatorBio.name)}`,
          era: "AUTHENTIC",
          assetTier: "CREATOR_LINEAGE",
        },
      ],
    };
  }

  if (!entity) {
    try {
      const supabase = createPublicServerClient();
      const { data: page } = await supabase
        .from("ppcf_wiki_pages")
        .select("*")
        .eq("slug", slug.toLowerCase().trim())
        .maybeSingle();

      if (page) {
        const pType = (page.page_type || "").toLowerCase();
        entity = {
          slug: page.slug,
          title: page.display_title,
          universe: page.universe,
          type: (pType === "item" || pType === "vehicle" ? "item" : pType === "location" ? "location" : pType === "team" ? "team" : "character") as LoreEntitySummary["type"],
          reality: page.reality,
          creators: page.creators,
          first_appearance: page.first_appearance,
          summary: page.summary || `Canonical ${page.universe} entry in Panel Profits knowledge database.`,
        };
      }
    } catch {}
  }

  if (!entity) {
    const rawName = decodeURIComponent(slug).replace(/-/g, " ");
    const formattedTitle = rawName.replace(/\b\w/g, (c) => c.toUpperCase());
    entity = {
      slug,
      title: formattedTitle,
      universe: "CANONICAL",
      type: "character",
      summary: `Canonical collectible due diligence dossier for ${formattedTitle} in the Panel Profits sovereign repository.`,
      landmark_debuts: [
        {
          title: formattedTitle,
          significance: `Search sovereign catalog records for ${formattedTitle}`,
          catalogUrl: `/comics?q=${encodeURIComponent(formattedTitle)}`,
          era: "AUTHENTIC",
          assetTier: "SOVEREIGN_EQUITY",
        },
      ],
    };
  }

  const displayTitle = cleanLoreTitle(entity.title);
  const summaryEntities = entity.summary ? extractEntitiesFromContext(entity.summary) : [];

  const renderIcon = () => {
    switch (entity.type) {
      case "creator":
        return <PenTool className="h-6 w-6 text-purple-400" />;
      case "equity":
        return <Layers className="h-6 w-6 text-amber-400" />;
      case "item":
        return <Shield className="h-6 w-6 text-emerald-400" />;
      case "location":
        return <MapPin className="h-6 w-6 text-indigo-400" />;
      case "team":
        return <Users className="h-6 w-6 text-cyan-400" />;
      default:
        return <User className="h-6 w-6 text-cyan-400" />;
    }
  };

  const getUniverseBadgeStyle = () => {
    switch (entity.universe) {
      case "MARVEL":
        return "border-red-500/40 bg-red-950/40 text-red-200";
      case "DC":
        return "border-blue-500/40 bg-blue-950/40 text-blue-200";
      case "STAR_WARS":
        return "border-yellow-500/40 bg-yellow-950/40 text-yellow-200";
      case "IMAGE":
        return "border-purple-500/40 bg-purple-950/40 text-purple-200";
      case "DARK_HORSE":
        return "border-slate-600/40 bg-slate-900 text-slate-200";
      case "TRANSFORMERS":
        return "border-cyan-500/40 bg-cyan-950/40 text-cyan-200";
      case "SPAWN":
        return "border-emerald-600/40 bg-emerald-950/40 text-emerald-200";
      default:
        return "border-slate-700 bg-slate-900/60 text-slate-300";
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <Link
        href="/news"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-cyan-400 hover:text-cyan-200 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Newsroom & Intelligence
      </Link>

      {/* Main Dossier Header */}
      <header className="mt-6 border border-slate-800 bg-[#0B0F18] p-6 sm:p-8 rounded-lg shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-2.5">
            {renderIcon()}
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-slate-400">
              {entity.type === "creator"
                ? "Canonical Creative Architect & Legend Dossier"
                : entity.type === "equity"
                ? "Canonical Media Adaptation & Storyline Equity Dossier"
                : "Canonical Multi-Universe Character Dossier"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {entity.ticker && (
              <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                {entity.ticker}
              </span>
            )}
            <span
              className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider border ${getUniverseBadgeStyle()}`}
            >
              {entity.universe}
            </span>
            <span className="px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider border border-purple-800/60 bg-purple-950/40 text-purple-200">
              {entity.type.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {entity.imageUrl && (
              <div className="shrink-0">
                <img
                  src={entity.imageUrl}
                  alt={entity.title}
                  className="w-24 h-24 sm:w-28 sm:h-28 object-cover object-top rounded-full border-2 border-purple-500/50 shadow-xl bg-purple-950/40 ring-4 ring-purple-500/10"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl sm:text-5xl font-bold text-slate-100 tracking-tight">
                {displayTitle}
              </h1>
              {entity.alter_ego && (
                <p className="mt-1.5 text-base sm:text-lg text-cyan-300 font-medium">
                  Civilian Identity / Alter Ego: <strong className="text-slate-100">{entity.alter_ego}</strong>
                </p>
              )}
              <p className="mt-1 text-xs font-mono text-slate-400 uppercase tracking-widest">
                {entity.type === "creator" ? (
                  <>Role: <span className="text-purple-400 font-semibold">{entity.creators}</span> · Lineage: <span className="text-cyan-400 font-semibold">{entity.first_appearance}</span></>
                ) : entity.type === "equity" ? (
                  <>Asset Class: <span className="text-amber-400 font-semibold">Cinematic & Comic Equity</span> · Reality: {entity.reality || "Canonical Universe"}</>
                ) : (
                  <>Multiverse Reality: {entity.reality || (entity.universe === "MARVEL" ? "Earth-616" : entity.universe === "DC" ? "Prime Earth" : "Canonical Continuity")} · Alignment: <span className="text-emerald-400 font-semibold">{entity.alignment || "Good"}</span></>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/comics?q=${encodeURIComponent(displayTitle)}`}
              className="inline-flex items-center gap-1.5 border border-cyan-500/40 bg-cyan-950/40 px-3.5 py-2 text-xs font-mono uppercase tracking-wider text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/50 transition-all rounded"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> View {displayTitle} Comic Catalog &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Landmark Publication Provenance & Debuts */}
      <section className="mt-6 border border-slate-800 bg-[#0A0E17] p-6 rounded-lg space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-300">
            <BookOpen className="h-4 w-4 text-cyan-400" />
            {entity.type === "creator" ? "Creator Biography & Career Provenance" : "Landmark Publication Provenance & Core Debut"}
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            {entity.type === "creator" ? "Canonical Bio Record" : "Canonical 1st Appearance"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="rounded border border-cyan-500/30 bg-[#070C16] p-4">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
              {entity.type === "creator" ? "Active Eras & Dates" : "1st Canonical Appearance"}
            </span>
            <p className="mt-1 text-base font-bold text-cyan-200">
              {entity.first_appearance && entity.first_appearance.trim().length > 0
                ? entity.first_appearance
                : entity.universe === "MARVEL"
                ? "Marvel Canonical Landmark Debut"
                : entity.universe === "DC"
                ? "Detective Comics #27"
                : "Historical Benchmark Debut Issue"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {entity.type === "creator"
                ? "Historical career timeline recorded in canonical publishing ledger."
                : "Historical milestone debut officially recorded in canonical publishing ledger."}
            </p>
          </div>

          <div className="rounded border border-slate-800 bg-[#070C16] p-4">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
              {entity.type === "creator" ? "Craft & Discipline" : "Creator Lineage"}
            </span>
            <p className="mt-1 text-base font-bold text-slate-200">
              {entity.creators && entity.creators.trim().length > 0
                ? entity.creators
                : entity.universe === "MARVEL"
                ? "Marvel Canonical Creative Teams"
                : entity.universe === "DC"
                ? "DC Canonical Creative Architects"
                : "Foundational Creative Architects"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {entity.type === "creator"
                ? "Discipline, creative role, and industry acclaim."
                : "Foundational architects and iconic writers/pencillers."}
            </p>
          </div>

          <div className="rounded border border-slate-800 bg-[#070C16] p-4">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
              {entity.type === "creator" ? "Origin & Roots" : "Continuity Coordinates"}
            </span>
            <p className="mt-1 text-base font-mono font-bold text-indigo-300">
              {entity.reality && entity.reality.trim().length > 0
                ? entity.reality
                : entity.universe === "MARVEL"
                ? "Earth-616"
                : entity.universe === "DC"
                ? "Prime Earth / New Earth"
                : "Canonical Multiverse"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Universal continuity anchor across multiverse timelines.
            </p>
          </div>
        </div>
      </section>

      {/* Landmark Key Issue Ledger (Direct Comic Catalog Integration) */}
      {entity.landmark_debuts && entity.landmark_debuts.length > 0 && (
        <section className="mt-6 border border-slate-800 bg-[#080C16] p-6 rounded-lg shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-cyan-400 font-semibold flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-cyan-400" />
              LANDMARK KEY ISSUE DEBUTS & EQUITIES ({entity.title.toUpperCase()} BASKET)
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Catalog Market Integration
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {entity.landmark_debuts.map((debut) => (
              <div
                key={debut.title}
                className="flex flex-col justify-between rounded border border-slate-800 bg-[#0B101D] p-4 hover:border-cyan-500/50 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                      {debut.era}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-300">
                      {debut.assetTier}
                    </span>
                  </div>
                  <h4 className="mt-2 text-base font-semibold text-slate-100">
                    {debut.title}
                  </h4>
                  <p className="mt-1 text-xs text-cyan-300/90 leading-snug">
                    {debut.significance}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">
                    Verified Key
                  </span>
                  <Link
                    href={debut.catalogUrl}
                    prefetch
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-200 uppercase tracking-wider font-semibold transition-colors"
                  >
                    View Issue in Catalog <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rogues Gallery & Allies Grids */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Rogues Gallery */}
        {entity.rogues_gallery && entity.rogues_gallery.length > 0 && (
          <section className="border border-slate-800 bg-[#0A0D16] p-6 rounded-lg shadow-xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-rose-400 border-b border-slate-800/80 pb-3 mb-4">
              <Skull className="h-4 w-4 text-rose-400" /> Iconic Rogues Gallery & Arch-Enemies
            </div>
            <div className="flex flex-wrap gap-2">
              {entity.rogues_gallery.map((enemy) => (
                <Link
                  key={enemy}
                  href={`/wiki/entry/${enemy.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")}`}
                  className="rounded border border-rose-900/60 bg-rose-950/20 px-2.5 py-1 text-xs text-rose-200 hover:border-rose-500/60 hover:text-rose-100 transition-colors"
                >
                  {enemy}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Allies & Supporting Cast */}
        {entity.allies && entity.allies.length > 0 && (
          <section className="border border-slate-800 bg-[#0A0D16] p-6 rounded-lg shadow-xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-400 border-b border-slate-800/80 pb-3 mb-4">
              <HeartHandshake className="h-4 w-4 text-cyan-400" /> Allies & Supporting Cast
            </div>
            <div className="flex flex-wrap gap-2">
              {entity.allies.map((ally) => (
                <Link
                  key={ally}
                  href={`/wiki/entry/${ally.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")}`}
                  className="rounded border border-cyan-900/60 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-200 hover:border-cyan-500/60 hover:text-cyan-100 transition-colors"
                >
                  {ally}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Gadgets, Weapons & Strategic Locations */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Signature Gadgets & Vehicles */}
        {entity.gadgets_and_weapons && entity.gadgets_and_weapons.length > 0 && (
          <section className="border border-slate-800 bg-[#0A0D16] p-6 rounded-lg shadow-xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 border-b border-slate-800/80 pb-3 mb-4">
              <Shield className="h-4 w-4 text-emerald-400" /> Signature Gadgets, Vehicles & Arsenal
            </div>
            <div className="flex flex-wrap gap-2">
              {entity.gadgets_and_weapons.map((item) => (
                <span
                  key={item}
                  className="rounded border border-emerald-900/60 bg-emerald-950/20 px-2.5 py-1 text-xs text-emerald-200"
                >
                  ⚡ {item}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Hideouts & Locations */}
        {entity.locations_and_hideouts && entity.locations_and_hideouts.length > 0 && (
          <section className="border border-slate-800 bg-[#0A0D16] p-6 rounded-lg shadow-xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-400 border-b border-slate-800/80 pb-3 mb-4">
              <MapPin className="h-4 w-4 text-indigo-400" /> Strategic Hideouts & Iconic Locations
            </div>
            <div className="flex flex-wrap gap-2">
              {entity.locations_and_hideouts.map((loc) => (
                <span
                  key={loc}
                  className="rounded border border-indigo-900/60 bg-indigo-950/20 px-2.5 py-1 text-xs text-indigo-200"
                >
                  📍 {loc}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Super-Teams & Affiliations */}
      {entity.super_teams && entity.super_teams.length > 0 && (
        <section className="mt-6 border border-slate-800 bg-[#0A0D16] p-6 rounded-lg shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-blue-400 border-b border-slate-800/80 pb-3 mb-4">
            <Users className="h-4 w-4 text-blue-400" />{" "}
            {entity.type === "equity" ? "Key Asset Characters & Ensemble Cast" : "Super-Teams & Major Alliances"}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {entity.super_teams.map((team) => (
              <Link
                key={team}
                href={`/wiki/entry/${team.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`}
                className="rounded border border-blue-900/60 bg-blue-950/30 px-3 py-1 text-xs font-medium text-blue-200 hover:border-blue-500/60 hover:text-blue-100 transition-colors"
              >
                👥 {team}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Narrative Dossier Summary */}
      <section className="mt-6 border border-slate-800 bg-[#0A0D16] p-6 sm:p-8 rounded-lg shadow-xl">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-300 border-b border-slate-800/80 pb-3">
          <Compass className="h-4 w-4 text-cyan-400" /> Encyclopedia Dossier & Character Lineage
        </div>
        <div className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-line">
          <LinkedBriefing text={entity.summary} entities={summaryEntities} />
        </div>
      </section>
    </main>
  );
}
