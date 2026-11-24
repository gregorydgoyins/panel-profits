"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { PODCAST_HERO_IMAGE_B64 } from "@/lib/podcasts/hero-image";

interface Episode {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  duration: string;
  slug: string;
  audioFile: string;
  description: string;
  tag: string;
}

const EPISODES: Episode[] = [
  {
    id: "ep-01",
    number: 1,
    title: "The $130 Dollar Check That Bought Superman",
    subtitle: "The Genesis of Sequential Art Equities",
    duration: "34m 40s",
    slug: "the-130-dollar-check-that-bought-superman",
    audioFile: "/audio/podcasts/the-130-dollar-check-that-bought-superman.m4a",
    description: "Marcus Vance and Elena Rostov dissect the fateful 1938 check cut to Jerry Siegel and Joe Shuster, tracing how an unheralded 10-cent pamphlet became the most valuable paper asset in human history.",
    tag: "ORIGIN & PROPERTY RIGHTS"
  },
  {
    id: "ep-02",
    number: 2,
    title: "Why Ten-Cent Comics Rival Fine Art",
    subtitle: "Mechanical Reproduction vs. The Salon Vitrine",
    duration: "36m 12s",
    slug: "why-ten-cent-comics-rival-fine-art",
    audioFile: "/audio/podcasts/why-ten-cent-comics-rival-fine-art.m4a",
    description: "An actuarial investigation into Walter Benjamin's theory of mechanical reproduction. Why mass-printed wood pulp shattered the private dealer oligopoly and outpaced traditional European masters.",
    tag: "FINE ART PARITY"
  },
  {
    id: "ep-03",
    number: 3,
    title: "Why Action Comics Outpriced Picasso",
    subtitle: "Condition Scarcity & The Parity Inversion",
    duration: "30m 05s",
    slug: "why-action-comics-outpriced-picasso",
    audioFile: "/audio/podcasts/why-action-comics-outpriced-picasso.m4a",
    description: "Picasso painted for sovereign dynasties and private salons. Action Comics #1 was printed for millions and pulped by millions. How survival attrition created unprecedented exponential value.",
    tag: "AUCTION FORENSICS"
  },
  {
    id: "ep-04",
    number: 4,
    title: "How Comic Books Beat Salvador Dalí",
    subtitle: "Surrealism, Destino, and Sequential Currency",
    duration: "42m 45s",
    slug: "how-comic-books-beat-salvador-dali",
    audioFile: "/audio/podcasts/how-comic-books-beat-salvador-dali.m4a",
    description: "Dissecting the surrealist collision: Dalí's aborted Destino project, comic page grammar as subconscious dream architecture, and how comic grails outstripped post-war surrealist canvases.",
    tag: "SURREALIST ARBITRAGE"
  },
  {
    id: "ep-05",
    number: 5,
    title: "How Warhol Turned Cheap Comics Into Millions",
    subtitle: "The Pop Vitrine & The Re-Appropriation Tax",
    duration: "22m 51s (3m Preview)",
    slug: "how-warhol-turned-cheap-comics-into-millions",
    audioFile: "/audio/podcasts/how-warhol-turned-cheap-comics-into-millions-preview.m4a?v=20261124",
    description: "Pop art lifted panel art from newsstand pulp to museum pedestals. But the underlying source material—the raw comic books—eventually outperformed the Pop canvases that copied them.",
    tag: "POP ART REVERSAL"
  },
  {
    id: "ep-06",
    number: 6,
    title: "Valuing Comic Books Like Rembrandt",
    subtitle: "Condition Convexity, Chiaroscuro & Pulp Preservation",
    duration: "8m 40s",
    slug: "valuing-comic-books-like-rembrandt",
    audioFile: "/audio/podcasts/valuing-comic-books-like-rembrandt.m4a",
    description: "Prologue to Panel Profits: The Valhalla of American Gods. Why CGC 9.8 condition grades command higher market liquidity than seventeenth-century Dutch Golden Age oil etchings.",
    tag: "BOOK PROLOGUE"
  },
  {
    id: "ep-07",
    number: 7,
    title: "Why Blank Space Makes Comics Valuable",
    subtitle: "Cognitive Closure & McCloud's Actuarial Gutter",
    duration: "38m 55s",
    slug: "why-blank-space-makes-comics-valuable",
    audioFile: "/audio/podcasts/why-blank-space-makes-comics-valuable.m4a",
    description: "The economic value of what is not drawn. Examining Nick Sousanis's Unflattening, Scott McCloud's gutter mechanics, and how cognitive participation drives psychological and financial lock-in.",
    tag: "COGNITIVE VALUATION"
  },
  {
    id: "ep-08",
    number: 8,
    title: "How Rare Comic Books Became Sovereign Assets",
    subtitle: "From Dime Racks to Institutional Vaults",
    duration: "19m 10s",
    slug: "how-rare-comic-books-became-sovereign-assets",
    audioFile: "/audio/podcasts/how-rare-comic-books-became-sovereign-assets.m4a",
    description: "The migration of certified sequential art into Swiss freeports, offshore trust funds, and actuarial balance sheets as an uncorrelated alternative store of value.",
    tag: "INSTITUTIONAL FINANCE"
  },
  {
    id: "ep-09",
    number: 9,
    title: "Why America Burned Its Comic Books",
    subtitle: "Fredric Wertham, Senate Crucible & Supply Destruction",
    duration: "38m 50s",
    slug: "why-america-burned-its-comic-books",
    audioFile: "/audio/podcasts/why-america-burned-its-comic-books.m4a",
    description: "The 1954 moral panic and Senate hearings ignited community bonfires across America. How catastrophic supply destruction laid the mathematical foundation for surviving pre-Code grails.",
    tag: "SUPPLY CRUCIBLE"
  },
  {
    id: "ep-10",
    number: 10,
    title: "Why Action Comics 1 Is Worth Millions",
    subtitle: "The 0.1% Survival Metric & The Nicolas Cage Copy",
    duration: "36m 45s",
    slug: "why-action-comics-1-is-worth-millions",
    audioFile: "/audio/podcasts/why-action-comics-1-is-worth-millions.m4a",
    description: "Tracing the verified 2026 fifteen-million-dollar private sale of the Nicolas Cage CGC 9.0 copy. Why survival attrition and global character equity converge into the pinnacle blue-chip asset.",
    tag: "CENSUS LEDGER"
  },
  {
    id: "ep-11",
    number: 11,
    title: "How Action Comics 1 Survived Mass Pulping",
    subtitle: "World War II Paper Drives & Organic Lignin Decay",
    duration: "16m 10s",
    slug: "how-action-comics-1-survived-mass-pulping",
    audioFile: "/audio/podcasts/how-action-comics-1-survived-mass-pulping.m4a",
    description: "Wartime scrap drives shredded over 90% of Golden Age print runs. How the survivors escaped pulping and slow acid self-destruction to become the rarest modern cultural artifacts.",
    tag: "SURVIVOR ARCHAEOLOGY"
  },
  {
    id: "ep-12",
    number: 12,
    title: "The 32-Dimensional Math of Market Progression",
    subtitle: "State Manifolds & Non-Linear Valuation Mechanics",
    duration: "17m 05s",
    slug: "the-32-dimensional-math-of-market-progression",
    audioFile: "/audio/podcasts/the-32-dimensional-math-of-market-progression.m4a",
    description: "Marcus Vance presents the quantitative mathematical engine from Chapter 07: moving beyond simple linear sales averages to multi-dimensional state spaces and volatility surfaces.",
    tag: "QUANTITATIVE ENGINE"
  },
  {
    id: "ep-13",
    number: 13,
    title: "Why Crumbling Comic Books Outperform Gold",
    subtitle: "Macroeconomic Inelasticity & The Alpha of Imperfection",
    duration: "40m 10s",
    slug: "why-crumbling-comic-books-outperform-gold",
    audioFile: "/audio/podcasts/why-crumbling-comic-books-outperform-gold.m4a",
    description: "Comparing 50-year compound annual growth rates of investment-grade comics against bullion, the S&P 500, and commercial real estate. Why non-reproducible cultural supply creates true alpha.",
    tag: "MACRO ALPHA"
  },
  {
    id: "ep-14",
    number: 14,
    title: "The Brutal Economics of Vintage Comics",
    subtitle: "Dealer War Stories, Shadow Spreads & Liquidity Traps",
    duration: "28m 15s",
    slug: "the-brutal-economics-of-vintage-comics",
    audioFile: "/audio/podcasts/the-brutal-economics-of-vintage-comics.m4a",
    description: "Elena and Marcus lift the veil on backstage convention floor deals, hidden auction shill rings, and the bid-ask spreads that catch amateur collectors off guard.",
    tag: "DEALER FORENSICS"
  },
  {
    id: "ep-15",
    number: 15,
    title: "How Wall Street Trades Rare Comic Books",
    subtitle: "Order Book Microstructure & Actuarial Depth",
    duration: "40m 35s",
    slug: "how-wall-street-trades-rare-comic-books",
    audioFile: "/audio/podcasts/how-wall-street-trades-rare-comic-books.m4a",
    description: "Translating proprietary trading desk methodologies—limit orders, margin haircuts, and liquidity pooling—into the Comic Book Stock Exchange terminal.",
    tag: "MARKET MICROSTRUCTURE"
  },
  {
    id: "ep-16",
    number: 16,
    title: "Why Wall Street Banned Action Comics 1",
    subtitle: "Regulatory Jurisprudence & Tangible Asset Classification",
    duration: "32m 50s",
    slug: "why-wall-street-banned-action-comics-1",
    audioFile: "/audio/podcasts/why-wall-street-banned-action-comics-1.m4a",
    description: "The historical friction between traditional securities regulators and alternative collectible funds: custody protocols, authentication mandates, and the battle over fractionalization.",
    tag: "REGULATORY COMPLIANCE"
  },
  {
    id: "ep-17",
    number: 17,
    title: "How Comic Books Become Museum Art",
    subtitle: "Institutional Curatorial Validation & Academic Chairs",
    duration: "16m 45s",
    slug: "how-comic-books-become-museum-art",
    audioFile: "/audio/podcasts/how-comic-books-become-museum-art.m4a",
    description: "From the Whitney to the Louvre: how sequential art transitioned from gutter ephemera to major retrospective exhibitions and permanent institutional collections.",
    tag: "CURATORIAL FIT"
  },
  {
    id: "ep-18",
    number: 18,
    title: "Measuring Comic Books Against Fine Art",
    subtitle: "The 20-Metric Canonical Scorecard",
    duration: "33m 40s",
    slug: "measuring-comic-books-against-fine-art",
    audioFile: "/audio/podcasts/measuring-comic-books-against-fine-art.m4a",
    description: "A masterclass on the CBSE 20-Metric Appraisal Apparatus: auditing historical significance, emotional intensity, character durability, and certified slab census.",
    tag: "APPRAISAL METRICS"
  },
  {
    id: "ep-19",
    number: 19,
    title: "Why Disposable 1938 Comics Sell for Millions",
    subtitle: "The Paradox of the Ephemeral Masterpiece",
    duration: "25m 10s",
    slug: "why-disposable-1938-comics-sell-for-millions",
    audioFile: "/audio/podcasts/why-disposable-1938-comics-sell-for-millions.m4a",
    description: "The psychological and sociological drivers that transformed disposable Depression-era entertainment into holy relics of twentieth-century American mythology.",
    tag: "MYTHOLOGICAL VALUE"
  },
  {
    id: "ep-20",
    number: 20,
    title: "How Disposable Comics Became Million Dollar Assets",
    subtitle: "The Five Platform Supply Regimes",
    duration: "36m 30s",
    slug: "how-disposable-comics-became-million-dollar-assets",
    audioFile: "/audio/podcasts/how-disposable-comics-became-million-dollar-assets.m4a",
    description: "Tracing the five historical eras: Golden Age, Silver Age, Bronze Age, Copper Age, and Modern Era. How each regime's print run size and paper chemistry dictated its modern valuation floor.",
    tag: "SUPPLY REGIMES"
  },
  {
    id: "ep-21",
    number: 21,
    title: "The High Finance of Vintage Comic Books",
    subtitle: "Leverage, Collateralized Lending & Title Insurance",
    duration: "36m 30s",
    slug: "the-high-finance-of-vintage-comic-books",
    audioFile: "/audio/podcasts/the-high-finance-of-vintage-comic-books.m4a",
    description: "How modern high-net-worth collectors borrow against multi-million dollar comic vaults, utilize specialty title insurance, and execute tax-deferred asset exchanges.",
    tag: "LENDING & COLLATERAL"
  },
  {
    id: "ep-22",
    number: 22,
    title: "Turning Comic Books Into Financial Assets",
    subtitle: "Securitization, Indexes & Structured Products",
    duration: "22m 55s",
    slug: "turning-comic-books-into-financial-assets",
    audioFile: "/audio/podcasts/turning-comic-books-into-financial-assets.m4a",
    description: "Designing the CBSE Tri-Index: the Sovereign Grail Index, the Mid-Tier Liquidity Index, and the Speculative Bronze Index. Mathematical portfolio construction for sequential art.",
    tag: "INDEX ARCHITECTURE"
  },
  {
    id: "ep-23",
    number: 23,
    title: "How Decaying Comics Outvalued Fine Art",
    subtitle: "The Entropy Arbitrage & The Physical Clock",
    duration: "17m 15s",
    slug: "how-decaying-comics-outvalued-fine-art",
    audioFile: "/audio/podcasts/how-decaying-comics-outvalued-fine-art.m4a",
    description: "Oil paintings can be restored for centuries. Wood-pulp newsprint has a terminal lifespan. Why the unstoppable physical decay of comic books accelerates their financial value.",
    tag: "ENTROPY ARBITRAGE"
  },
  {
    id: "ep-24",
    number: 24,
    title: "How Disposable Comics Become Fine Art",
    subtitle: "The Final Consecration of Sequential Art",
    duration: "40m 20s",
    slug: "how-disposable-comics-become-fine-art",
    audioFile: "/audio/podcasts/how-disposable-comics-become-fine-art.m4a",
    description: "Marcus and Elena conclude the master series: sequential art as the supreme narrative achievement of modern civilization, standing alongside Greek drama and Renaissance frescoes.",
    tag: "MASTER SYNTHESIS"
  }
];

export default function PodcastsPage() {
  const [featuredEpisode, setFeaturedEpisode] = useState<Episode>(EPISODES[0]);
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    // Check if user already unlocked in this browser
    const stored = localStorage.getItem("cbse_podcast_vault_unlocked");
    if (stored === "true") {
      setIsUnlocked(true);
    }
    // Randomly rotate the featured episode on each page load
    const randomIndex = Math.floor(Math.random() * EPISODES.length);
    setFeaturedEpisode(EPISODES[randomIndex]);
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setSubmitError("Please provide a valid email address.");
      return;
    }
    if (!name.trim()) {
      setSubmitError("Please enter your name.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/leads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PODCAST_VAULT_UNLOCK",
          name,
          email,
          phone,
          metadata: { source: "gated_podcasts_vault" }
        })
      });

      const data = await res.json();
      if (data.ok) {
        localStorage.setItem("cbse_podcast_vault_unlocked", "true");
        localStorage.setItem("cbse_podcast_user_email", email);
        setIsUnlocked(true);
      } else {
        setSubmitError(data.error || "Failed to unlock vault. Please try again.");
      }
    } catch (err: any) {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlayEpisode = (ep: Episode) => {
    setActiveEpisode(ep);
    setIsPlaying(true);
  };

  return (
    <div className="relative min-h-screen text-[#f8fafc] font-light selection:bg-emerald-500 selection:text-black">
      {/* High-Resolution Cinematic Opening Still Full-Page Background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-95 transition-opacity duration-700"
        style={{
          backgroundImage: `url('/brand/cbse-beta-access-tickers-bg.jpg?v=20261124_clean')`,
        }}
      />
      {/* Minimal atmospheric vignette overlay allowing full background visibility across the entire page */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#05080e]/20 via-transparent to-[#05080e]/60" />

      {/* Interactive Page Container directly overlaid on top of the cinematic still */}
      <div className="relative z-10">
        {/* Top Banner Navigation - Compact & Tight */}
        <nav className="border-b border-emerald-500/20 bg-[#060b14]/40 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="text-emerald-400 font-normal tracking-widest text-xs uppercase px-2 py-0.5 border border-emerald-500/40 rounded bg-emerald-950/40">CBSE</span>
              <span className="text-white tracking-widest text-xs sm:text-sm font-light uppercase drop-shadow">Comic Book Stock Exchange</span>
            </Link>
            <div className="flex items-center gap-5 text-xs uppercase tracking-wider text-slate-300">
              <Link href="/excerpts" className="hover:text-emerald-400 transition-colors">Excerpts</Link>
              <Link href="/book" className="hover:text-emerald-400 transition-colors">Monograph</Link>
              <Link href="/beta" className="text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded hover:bg-emerald-500/20 bg-emerald-950/40 transition-colors text-[11px]">Private Beta</Link>
            </div>
          </div>
        </nav>

        {/* Hero Header with SeaDance / Elena & Marcus Artwork - Transparent Glass Section */}
        <section className="relative overflow-hidden py-6 md:py-8 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            {/* Frosted glass badge around the text only - happy medium blur & transparency */}
            <div className="inline-block p-6 md:p-8 rounded-2xl bg-[#060b14]/50 backdrop-blur-2xl border border-emerald-500/30 shadow-2xl shadow-black/60 space-y-4">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-[11px] tracking-widest uppercase backdrop-blur-md">
                <span>◆</span> OFFICIAL PODCAST ARCHIVE // 24 COMPLETE VOLUMES
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-white tracking-wide uppercase leading-tight drop-shadow-lg">
                Sequential Art Equities <br />
                <span className="text-emerald-400">Master Audio Broadcasts</span>
              </h1>
              <p className="text-slate-100 text-sm md:text-base leading-relaxed max-w-2xl font-light drop-shadow">
                Forensic market telemetry, actuarial pricing models, and unvarnished dealer history. Hosted by <strong className="text-white font-normal">Marcus Vance</strong> (Quantitative Finance Lead) and <strong className="text-white font-normal">Elena Rostov</strong> (Art History &amp; Pedigree Provenance).
              </p>
              <div className="flex flex-wrap gap-4 pt-1 text-[11px] uppercase tracking-wider text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> 24 Master Episodes</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> 100% Open Access</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Zero Corporate Shilling</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 relative">
            <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 shadow-2xl shadow-black/80 group bg-slate-900/40 backdrop-blur-xl max-w-[280px] lg:max-w-none mx-auto aspect-square">
              <img 
                src={PODCAST_HERO_IMAGE_B64} 
                alt="Marcus Vance & Elena Rostov - Comic Book Stock Exchange" 
                className="w-full h-full object-cover block"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#05080e]/80 via-transparent to-transparent opacity-60 pointer-events-none"></div>
              <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-[#060b14]/60 backdrop-blur-xl border border-emerald-500/40 flex justify-between items-center text-[11px] uppercase tracking-wider">
                <div>
                  <div className="text-emerald-400 font-normal">Marcus Vance &amp; Elena Rostov</div>
                  <div className="text-slate-300 text-[10px]">CBSE Research Desk</div>
                </div>
                <div className="text-emerald-300 font-mono text-[10px]">24 VOLUMES</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 md:py-10">

        {/* ROTATING FEATURED OPEN PREVIEW (FREE FOR ALL VISITORS WITHOUT ENTERING INFO) */}
        <div className="mb-10 p-5 md:p-6 rounded-xl bg-[#060b14]/50 backdrop-blur-2xl border border-emerald-500/50 shadow-2xl shadow-black/50 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] uppercase tracking-widest font-mono">
                  ROTATING OPEN PREVIEW • NO GATE
                </span>
                <span className="text-slate-300 text-xs font-mono">VOL. {String(featuredEpisode.number).padStart(2, "0")}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-light text-white uppercase tracking-wide">
                {featuredEpisode.title}
              </h2>
              <div className="text-emerald-400 text-xs uppercase tracking-wider">{featuredEpisode.subtitle}</div>
              <p className="text-slate-200 text-xs md:text-sm font-light leading-relaxed pt-1">
                {featuredEpisode.description}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
              <span className="text-xs text-slate-300 font-mono">RUNTIME: {featuredEpisode.duration}</span>
              <button
                onClick={() => handlePlayEpisode(featuredEpisode)}
                className="px-5 py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-normal uppercase tracking-widest text-xs transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <span>▶</span> STREAM THIS BROADCAST
              </button>
            </div>
          </div>
        </div>

        {/* Floating Active Player (if episode selected) */}
        {activeEpisode && (
          <div className="sticky top-20 z-30 mb-10 p-6 rounded-xl bg-[#060b14]/50 border border-emerald-500/50 shadow-2xl shadow-black/80 backdrop-blur-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-emerald-400 text-xs uppercase tracking-widest">NOW PLAYING • VOL. {String(activeEpisode.number).padStart(2, "0")}</span>
                <h3 className="text-xl font-normal text-white uppercase tracking-wide mt-1">{activeEpisode.title}</h3>
                <p className="text-xs text-slate-300 mt-0.5">{activeEpisode.subtitle} — {activeEpisode.duration}</p>
              </div>
              <audio 
                controls 
                autoPlay={isPlaying}
                src={activeEpisode.audioFile} 
                className="w-full md:w-96 rounded-lg bg-black/40"
              />
            </div>
          </div>
        )}

        {/* GATED ACCESS & 101MB MASTER ARCHIVE DOWNLOAD WALL */}
        {!isUnlocked ? (
          <div className="mb-14 rounded-2xl border border-emerald-500/40 bg-[#060b14]/55 backdrop-blur-2xl p-8 md:p-10 shadow-2xl shadow-black/60 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="max-w-2xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs tracking-widest uppercase">
                <span>🔒</span> GATED RESEARCH VAULT &bull; FULL 101MB MASTER
              </div>
              <h2 className="text-2xl sm:text-3xl font-light text-white tracking-wide uppercase">
                Unlock The Complete 101MB Master Broadcast
              </h2>
              <p className="text-slate-200 font-light text-xs sm:text-sm leading-relaxed">
                Enjoying the audio preview? Enter your credentials to immediately unlock the full uncompressed 101MB master archive for Episode 18 (Warhol Pop Art Reversal) plus the remaining 23 complete chapter broadcasts.
              </p>

              <form onSubmit={handleUnlock} className="space-y-3.5 pt-2 text-left max-w-md mx-auto">
                {submitError && (
                  <div className="p-3 rounded bg-red-950/60 border border-red-500/50 text-red-300 text-xs uppercase tracking-wider">
                    {submitError}
                  </div>
                )}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Marcus Vance"
                    className="w-full px-4 py-2 rounded bg-[#050a14]/60 backdrop-blur-md border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="marcus@comicbookstockexchange.com"
                    className="w-full px-4 py-2 rounded bg-[#050a14]/60 backdrop-blur-md border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-300 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-2 rounded bg-[#050a14]/60 backdrop-blur-md border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-6 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium uppercase tracking-widest text-xs transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-1"
                >
                  {isSubmitting ? "UNLOCKING ARCHIVE..." : "UNLOCK 101MB MASTER ARCHIVE"}
                </button>
                <p className="text-center text-[10px] text-slate-400 tracking-wider uppercase">
                  Zero spam. Direct streaming &bull; Instant uncompressed access.
                </p>
              </form>
            </div>
          </div>
        ) : (
          <div className="mb-10 p-5 rounded-xl bg-[#060b14]/55 backdrop-blur-2xl border border-emerald-500/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
              <div>
                <div className="text-xs uppercase tracking-wider text-emerald-300 font-medium">
                  Vault Unlocked &bull; Full 101MB Master Access Granted
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  Episode 18 (Warhol Pop Art Reversal) Uncompressed Master File
                </div>
              </div>
            </div>
            <a
              href="/audio/podcasts/how-warhol-turned-cheap-comics-into-millions-full.mp4"
              download
              className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium uppercase tracking-wider text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-lg"
            >
              <span>⬇</span> DOWNLOAD FULL 101MB MASTER (.MP4)
            </a>
          </div>
        )}

        {/* Episode Catalog Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20">
            <h2 className="text-xs uppercase tracking-widest text-slate-300">Master Broadcast Catalog ({EPISODES.length} Episodes)</h2>
            <span className="text-xs uppercase tracking-widest text-emerald-400">Chapter Order</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EPISODES.map((ep) => {
              const isThisFeatured = ep.id === featuredEpisode.id;

              return (
                <div 
                  key={ep.id}
                  className={`group p-5 rounded-lg bg-[#060b14]/45 backdrop-blur-xl border ${
                    isThisFeatured ? "border-emerald-500/70 ring-1 ring-emerald-500/40 bg-[#060b14]/55" : "border-slate-800/60"
                  } hover:border-emerald-500/50 hover:bg-[#060b14]/60 transition-all flex flex-col justify-between`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-mono">VOL. {String(ep.number).padStart(2, "0")}</span>
                        {isThisFeatured && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                            FEATURED
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-900/60 backdrop-blur-md border border-slate-800 text-slate-300">{ep.tag}</span>
                    </div>
                    <h3 className="text-base font-normal text-white uppercase tracking-wide group-hover:text-emerald-300 transition-colors">
                      {ep.title}
                    </h3>
                    <div className="text-xs text-emerald-400 font-light tracking-wide">{ep.subtitle}</div>
                    <p className="text-xs text-slate-300 leading-relaxed font-light line-clamp-3 pt-1">
                      {ep.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">{ep.duration}</span>

                    <button
                      onClick={() => handlePlayEpisode(ep)}
                      className="px-3.5 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/40 text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <span>▶</span> LISTEN NOW
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer - Compact floating frosted glass card allowing trading floor backdrop to remain visible */}
      <footer className="mt-20 mb-10 max-w-xl mx-auto px-6 py-4 rounded-xl border border-emerald-500/20 bg-[#060b14]/50 backdrop-blur-xl text-center text-xs uppercase tracking-widest text-slate-300 shadow-2xl">
        <p className="mb-1 text-slate-200">Comic Book Stock Exchange • Sequential Art Equities</p>
        <p className="text-slate-400 text-[10px]">Actuarial Ledger • Zero Corporate Kickbacks</p>
      </footer>
      </div>
    </div>
  );
}
