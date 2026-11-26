"use client";

import React, { useState, useEffect, useRef } from "react";
import { PODCAST_HERO_IMAGE_B64 } from "@/lib/podcasts/hero-image";
import EditorialStickyNav from "@/components/navigation/EditorialStickyNav";

const PREVIEW_LIMIT_SECONDS = 120;

type PodcastCollection = "season-1" | "season-2" | "specials";

interface Episode {
  id: string;
  number: number;
  code: string;
  collection: PodcastCollection;
  title: string;
  subtitle: string;
  duration: string;
  slug: string;
  driveFileId: string;
  audioFile?: string;
  description: string;
  tag: string;
}

const DRIVE_FOLDER_URL =
  "https://drive.google.com/drive/folders/1DPUJCRCBx5gU3Y1kAS8_YWohYlKl9OE2";

const drivePreviewUrl = (fileId: string) =>
  `https://drive.google.com/file/d/${fileId}/preview`;

const driveViewUrl = (fileId: string) =>
  `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

const driveDownloadUrl = (fileId: string) =>
  `https://drive.google.com/uc?export=download&id=${fileId}`;

const EPISODES: Episode[] = [
  // ── SEASON 1 (24 FULL 1080P VIDEO BROADCASTS) ─────────────────────────────
  {
    id: "ep-01",
    number: 1,
    code: "S1 · EP 01",
    collection: "season-1",
    title: "The $130 Check That Bought Superman",
    subtitle: "The Genesis of Sequential Art Equities",
    duration: "48m 09s",
    slug: "the-130-dollar-check-that-bought-superman",
    driveFileId: "1uHeu-HExGOcDQaF2ynry73DP4WJzUG7t",
    audioFile: "/audio/podcasts/the-130-dollar-check-that-bought-superman.m4a",
    description:
      "Marcus Vance and Elena Rostov dissect the fateful 1938 check cut to Jerry Siegel and Joe Shuster, tracing how an unheralded 10-cent pamphlet became the most valuable paper asset in human history.",
    tag: "ORIGIN & PROPERTY RIGHTS",
  },
  {
    id: "ep-02",
    number: 2,
    code: "S1 · EP 02",
    collection: "season-1",
    title: "Why Ten-Cent Comics Rival Fine Art",
    subtitle: "Mechanical Reproduction vs. The Salon Vitrine",
    duration: "51m 43s",
    slug: "why-ten-cent-comics-rival-fine-art",
    driveFileId: "1EctBRxQauYaKgIuekGHckL0A7fJTzPLE",
    audioFile: "/audio/podcasts/why-ten-cent-comics-rival-fine-art.m4a",
    description:
      "An actuarial investigation into Walter Benjamin's theory of mechanical reproduction. Why mass-printed wood pulp shattered the private dealer oligopoly and outpaced traditional European masters.",
    tag: "FINE ART PARITY",
  },
  {
    id: "ep-03",
    number: 3,
    code: "S1 · EP 03",
    collection: "season-1",
    title: "Why Action Comics Outpriced Picasso",
    subtitle: "Condition Scarcity & The Parity Inversion",
    duration: "42m 13s",
    slug: "why-action-comics-outpriced-picasso",
    driveFileId: "14vDCJzrwhYk4cDGVvTR9fVcwq2-lphly",
    audioFile: "/audio/podcasts/why-action-comics-outpriced-picasso.m4a",
    description:
      "Picasso painted for sovereign dynasties and private salons. Action Comics #1 was printed for millions and pulped by millions. How survival attrition created unprecedented exponential value.",
    tag: "AUCTION FORENSICS",
  },
  {
    id: "ep-04",
    number: 4,
    code: "S1 · EP 04",
    collection: "season-1",
    title: "How Comic Books Beat Salvador Dalí",
    subtitle: "Surrealism, Destino, and Sequential Currency",
    duration: "1h 00m 52s",
    slug: "how-comic-books-beat-salvador-dali",
    driveFileId: "1Qfes_hLQAxYSjLhqbnWpLgMxj2Qwfc8S",
    audioFile: "/audio/podcasts/how-comic-books-beat-salvador-dali.m4a",
    description:
      "Dissecting the surrealist collision: Dalí's aborted Destino project, comic page grammar as subconscious dream architecture, and how comic grails outstripped post-war surrealist canvases.",
    tag: "SURREALIST ARBITRAGE",
  },
  {
    id: "ep-05",
    number: 5,
    code: "S1 · EP 05",
    collection: "season-1",
    title: "How Warhol Turned Cheap Comics Into Millions",
    subtitle: "The Pop Vitrine & The Re-Appropriation Tax",
    duration: "24m 55s",
    slug: "how-warhol-turned-cheap-comics-into-millions",
    driveFileId: "1jjNsYJJK0Bk-KhroRlFnNpNb4iscFhkq",
    audioFile: "/audio/podcasts/how-warhol-turned-cheap-comics-into-millions.m4a",
    description:
      "Pop art lifted panel art from newsstand pulp to museum pedestals. But the underlying source material—the raw comic books—eventually outperformed the Pop canvases that copied them.",
    tag: "POP ART REVERSAL",
  },
  {
    id: "ep-06",
    number: 6,
    code: "S1 · EP 06",
    collection: "season-1",
    title: "Valuing Comic Books Like Rembrandt",
    subtitle: "Condition Convexity, Chiaroscuro & Pulp Preservation",
    duration: "13m 55s",
    slug: "valuing-comic-books-like-rembrandt",
    driveFileId: "1MEMCoSsmk5oXFPoTrVOr4VlDIPDIGFxn",
    audioFile: "/audio/podcasts/valuing-comic-books-like-rembrandt.m4a",
    description:
      "Prologue to Panel Profits: The Valhalla of American Gods. Why CGC 9.8 condition grades command higher market liquidity than seventeenth-century Dutch Golden Age oil etchings.",
    tag: "BOOK PROLOGUE",
  },
  {
    id: "ep-07",
    number: 7,
    code: "S1 · EP 07",
    collection: "season-1",
    title: "Why Blank Space Makes Comics Valuable",
    subtitle: "Cognitive Closure & McCloud's Actuarial Gutter",
    duration: "54m 01s",
    slug: "why-blank-space-makes-comics-valuable",
    driveFileId: "1hpDqB3duJlnfifnJnVWtgCr2DfMdb3qs",
    audioFile: "/audio/podcasts/why-blank-space-makes-comics-valuable.m4a",
    description:
      "The economic value of what is not drawn. Examining Nick Sousanis's Unflattening, Scott McCloud's gutter mechanics, and how cognitive participation drives psychological and financial lock-in.",
    tag: "COGNITIVE VALUATION",
  },
  {
    id: "ep-08",
    number: 8,
    code: "S1 · EP 08",
    collection: "season-1",
    title: "How Rare Comic Books Became Sovereign Assets",
    subtitle: "From Dime Racks to Institutional Vaults",
    duration: "28m 49s",
    slug: "how-rare-comic-books-became-sovereign-assets",
    driveFileId: "1obV31QZcSmeE3RaO3_gowe8jyjGE2JFH",
    audioFile: "/audio/podcasts/how-rare-comic-books-became-sovereign-assets.m4a",
    description:
      "The migration of certified sequential art into Swiss freeports, offshore trust funds, and actuarial balance sheets as an uncorrelated alternative store of value.",
    tag: "INSTITUTIONAL FINANCE",
  },
  {
    id: "ep-09",
    number: 9,
    code: "S1 · EP 09",
    collection: "season-1",
    title: "Why America Burned Its Comic Books",
    subtitle: "Fredric Wertham, Senate Crucible & Supply Destruction",
    duration: "53m 28s",
    slug: "why-america-burned-its-comic-books",
    driveFileId: "1fyruMagGJ9_X0ZUmOeSVccodaqvUC73D",
    audioFile: "/audio/podcasts/why-america-burned-its-comic-books.m4a",
    description:
      "The 1954 moral panic and Senate hearings ignited community bonfires across America. How catastrophic supply destruction laid the mathematical foundation for surviving pre-Code grails.",
    tag: "SUPPLY CRUCIBLE",
  },
  {
    id: "ep-10",
    number: 10,
    code: "S1 · EP 10",
    collection: "season-1",
    title: "Why Action Comics #1 Is Worth Millions",
    subtitle: "The 0.1% Survival Metric & The Nicolas Cage Copy",
    duration: "50m 51s",
    slug: "why-action-comics-1-is-worth-millions",
    driveFileId: "1L8QVi4nrMQm34myWvujVicafYqvD2PSm",
    audioFile: "/audio/podcasts/why-action-comics-1-is-worth-millions.m4a",
    description:
      "Tracing the verified 2026 fifteen-million-dollar private sale of the Nicolas Cage CGC 9.0 copy. Why survival attrition and global character equity converge into the pinnacle blue-chip asset.",
    tag: "CENSUS LEDGER",
  },
  {
    id: "ep-11",
    number: 11,
    code: "S1 · EP 11",
    collection: "season-1",
    title: "How Action Comics #1 Survived Mass Pulping",
    subtitle: "World War II Paper Drives & Organic Lignin Decay",
    duration: "23m 02s",
    slug: "how-action-comics-1-survived-mass-pulping",
    driveFileId: "1JXyEECDlJCzWmWtFrt5GlXH5foPUjSKh",
    audioFile: "/audio/podcasts/how-action-comics-1-survived-mass-pulping.m4a",
    description:
      "Wartime scrap drives shredded over 90% of Golden Age print runs. How the survivors escaped pulping and slow acid self-destruction to become the rarest modern cultural artifacts.",
    tag: "SURVIVOR ARCHAEOLOGY",
  },
  {
    id: "ep-12",
    number: 12,
    code: "S1 · EP 12",
    collection: "season-1",
    title: "The 32-Dimensional Math of Market Progression",
    subtitle: "State Manifolds & Non-Linear Valuation Mechanics",
    duration: "25m 17s",
    slug: "the-32-dimensional-math-of-market-progression",
    driveFileId: "1W5CpiN6WKp9a3rtCHgSxQrKbuBBPfGtv",
    audioFile: "/audio/podcasts/the-32-dimensional-math-of-market-progression.m4a",
    description:
      "Marcus Vance presents the quantitative mathematical engine from Chapter 07: moving beyond simple linear sales averages to multi-dimensional state spaces and volatility surfaces.",
    tag: "QUANTITATIVE ENGINE",
  },
  {
    id: "ep-13",
    number: 13,
    code: "S1 · EP 13",
    collection: "season-1",
    title: "Why Crumbling Comic Books Outperform Gold",
    subtitle: "Macroeconomic Inelasticity & The Alpha of Imperfection",
    duration: "56m 55s",
    slug: "why-crumbling-comic-books-outperform-gold",
    driveFileId: "1jpD2tKGLDMsVOJgHeIthZ0ZNORh85yW0",
    audioFile: "/audio/podcasts/why-crumbling-comic-books-outperform-gold.m4a",
    description:
      "Comparing 50-year compound annual growth rates of investment-grade comics against bullion, the S&P 500, and commercial real estate. Why non-reproducible cultural supply creates true alpha.",
    tag: "MACRO ALPHA",
  },
  {
    id: "ep-14",
    number: 14,
    code: "S1 · EP 14",
    collection: "season-1",
    title: "The Brutal Economics of Vintage Comics",
    subtitle: "Dealer War Stories, Shadow Spreads & Liquidity Traps",
    duration: "42m 55s",
    slug: "the-brutal-economics-of-vintage-comics",
    driveFileId: "1RggOjhAQVKwnvjceUKLfF-W-22tuKwYs",
    audioFile: "/audio/podcasts/the-brutal-economics-of-vintage-comics.m4a",
    description:
      "Elena and Marcus lift the veil on backstage convention floor deals, hidden auction shill rings, and the bid-ask spreads that catch amateur collectors off guard.",
    tag: "DEALER FORENSICS",
  },
  {
    id: "ep-15",
    number: 15,
    code: "S1 · EP 15",
    collection: "season-1",
    title: "How Wall Street Trades Rare Comic Books",
    subtitle: "Order Book Microstructure & Actuarial Depth",
    duration: "59m 31s",
    slug: "how-wall-street-trades-rare-comic-books",
    driveFileId: "1m_GspxRFRscfTFRPvuQWH-ZzFqxir7dc",
    audioFile: "/audio/podcasts/how-wall-street-trades-rare-comic-books.m4a",
    description:
      "Translating proprietary trading desk methodologies—limit orders, margin haircuts, and liquidity pooling—into the Comic Book Stock Exchange terminal.",
    tag: "MARKET MICROSTRUCTURE",
  },
  {
    id: "ep-16",
    number: 16,
    code: "S1 · EP 16",
    collection: "season-1",
    title: "Why Wall Street Banned Action Comics #1",
    subtitle: "Regulatory Jurisprudence & Tangible Asset Classification",
    duration: "48m 53s",
    slug: "why-wall-street-banned-action-comics-1",
    driveFileId: "1jstXuO6RRn2s9bJ73kTQwvRiBXyL4vBZ",
    audioFile: "/audio/podcasts/why-wall-street-banned-action-comics-1.m4a",
    description:
      "The historical friction between traditional securities regulators and alternative collectible funds: custody protocols, authentication mandates, and the battle over fractionalization.",
    tag: "REGULATORY COMPLIANCE",
  },
  {
    id: "ep-17",
    number: 17,
    code: "S1 · EP 17",
    collection: "season-1",
    title: "How Comic Books Become Museum Art",
    subtitle: "Institutional Curatorial Validation & Academic Chairs",
    duration: "25m 47s",
    slug: "how-comic-books-become-museum-art",
    driveFileId: "1s1JKFzJOxq4iZzCt5qB8dedKnTH-pNRY",
    audioFile: "/audio/podcasts/how-comic-books-become-museum-art.m4a",
    description:
      "From the Whitney to the Louvre: how sequential art transitioned from gutter ephemera to major retrospective exhibitions and permanent institutional collections.",
    tag: "CURATORIAL FIT",
  },
  {
    id: "ep-18",
    number: 18,
    code: "S1 · EP 18",
    collection: "season-1",
    title: "Measuring Comic Books Against Fine Art",
    subtitle: "The 20-Metric Canonical Scorecard",
    duration: "47m 19s",
    slug: "measuring-comic-books-against-fine-art",
    driveFileId: "1RAnDBP1EudwyhsdB24tGCGZ9LTmRcZoW",
    audioFile: "/audio/podcasts/measuring-comic-books-against-fine-art.m4a",
    description:
      "A masterclass on the CBSE 20-Metric Appraisal Apparatus: auditing historical significance, emotional intensity, character durability, and certified slab census.",
    tag: "APPRAISAL METRICS",
  },
  {
    id: "ep-19",
    number: 19,
    code: "S1 · EP 19",
    collection: "season-1",
    title: "Why Disposable 1938 Comics Sell for Millions",
    subtitle: "The Paradox of the Ephemeral Masterpiece",
    duration: "37m 01s",
    slug: "why-disposable-1938-comics-sell-for-millions",
    driveFileId: "1IFvbqA1cIOK7WTSaYS7ETZ-vY3CErlym",
    audioFile: "/audio/podcasts/why-disposable-1938-comics-sell-for-millions.m4a",
    description:
      "The psychological and sociological drivers that transformed disposable Depression-era entertainment into holy relics of twentieth-century American mythology.",
    tag: "MYTHOLOGICAL VALUE",
  },
  {
    id: "ep-20",
    number: 20,
    code: "S1 · EP 20",
    collection: "season-1",
    title: "How Disposable Comics Became Million-Dollar Assets",
    subtitle: "The Five Platform Supply Regimes",
    duration: "53m 42s",
    slug: "how-disposable-comics-became-million-dollar-assets",
    driveFileId: "1GzYaj2KWi53vCYJvYvFaHZFVaMs2JC1A",
    audioFile:
      "/audio/podcasts/how-disposable-comics-became-million-dollar-assets.m4a",
    description:
      "Tracing the historical eras from Platinum and Golden through Modern. How each regime's print run size and paper chemistry dictated its modern valuation floor.",
    tag: "SUPPLY REGIMES",
  },
  {
    id: "ep-21",
    number: 21,
    code: "S1 · EP 21",
    collection: "season-1",
    title: "The High Finance of Vintage Comic Books",
    subtitle: "Leverage, Collateralized Lending & Title Insurance",
    duration: "54m 25s",
    slug: "the-high-finance-of-vintage-comic-books",
    driveFileId: "1qJnycAl8QKVX3eKXkbztR0iYbbRaezBD",
    audioFile: "/audio/podcasts/the-high-finance-of-vintage-comic-books.m4a",
    description:
      "How modern high-net-worth collectors borrow against multi-million dollar comic vaults, utilize specialty title insurance, and execute tax-deferred asset exchanges.",
    tag: "LENDING & COLLATERAL",
  },
  {
    id: "ep-22",
    number: 22,
    code: "S1 · EP 22",
    collection: "season-1",
    title: "Turning Comic Books Into Financial Assets",
    subtitle: "Securitization, Indexes & Structured Products",
    duration: "33m 54s",
    slug: "turning-comic-books-into-financial-assets",
    driveFileId: "1FxBax6DsnU7M9bqX-hT2VZhKY52Onmvo",
    audioFile: "/audio/podcasts/turning-comic-books-into-financial-assets.m4a",
    description:
      "Designing the CBSE Tri-Index: the Sovereign Grail Index, the Mid-Tier Liquidity Index, and the Speculative Bronze Index. Mathematical portfolio construction for sequential art.",
    tag: "INDEX ARCHITECTURE",
  },
  {
    id: "ep-23",
    number: 23,
    code: "S1 · EP 23",
    collection: "season-1",
    title: "How Decaying Comics Outvalued Fine Art",
    subtitle: "The Entropy Arbitrage & The Physical Clock",
    duration: "25m 49s",
    slug: "how-decaying-comics-outvalued-fine-art",
    driveFileId: "1GqCqmPXb0vW4lqOF2xLv6OlWC2Gjf2lf",
    audioFile: "/audio/podcasts/how-decaying-comics-outvalued-fine-art.m4a",
    description:
      "Oil paintings can be restored for centuries. Wood-pulp newsprint has a terminal lifespan. Why the unstoppable physical decay of comic books accelerates their financial value.",
    tag: "ENTROPY ARBITRAGE",
  },
  {
    id: "ep-24",
    number: 24,
    code: "S1 · EP 24",
    collection: "season-1",
    title: "How Disposable Comics Become Fine Art",
    subtitle: "The Final Consecration of Sequential Art",
    duration: "57m 32s",
    slug: "how-disposable-comics-become-fine-art",
    driveFileId: "11yqxXFrxifPd_Rmf5f5lwnzalW07ifIf",
    audioFile: "/audio/podcasts/how-disposable-comics-become-fine-art.m4a",
    description:
      "Marcus and Elena conclude Season 1: sequential art as the supreme narrative achievement of modern civilization, standing alongside Greek drama and Renaissance frescoes.",
    tag: "MASTER SYNTHESIS",
  },

  // ── SEASON 2 ──────────────────────────────────────────────────────────────
  {
    id: "s2-ep-01",
    number: 25,
    code: "S2 · EP 01",
    collection: "season-2",
    title: "How Rare Comics Became Financial Securities",
    subtitle: "Season 2 Premiere · Sovereign Indexing, Custody & Market Clearing",
    duration: "1h 00m 22s",
    slug: "how-rare-comics-became-financial-securities",
    driveFileId: "1ujx5sZKMpl3e2N_NZBwT4FOrXfcw3_0x",
    description:
      "Season 2 opens with a deep institutional breakdown of how third-party census grading, sovereign benchmark indices, and verifiable auction ledgers transformed rare comics into tradable financial securities.",
    tag: "SEASON 2 PREMIERE",
  },

  // ── SPECIAL BROADCASTS (5 FULL 1080P SPECIALS) ───────────────────────────
  {
    id: "special-01",
    number: 26,
    code: "SPECIAL 01",
    collection: "specials",
    title: "How Duchamp Paid His Dentist With Art",
    subtitle: "Tzanck Check, Conceptual Currency & Art as Legal Tender",
    duration: "43m 11s",
    slug: "how-duchamp-paid-his-dentist-with-art",
    driveFileId: "1tADj6AzSjHyIIUWdrSSbqxR1EBKj3pjn",
    description:
      "In 1919 Marcel Duchamp hand-drew a bank check to settle his dentist's bill—and later bought it back for far more than face value. What the Tzanck Check reveals about scarcity, provenance, and cultural currency.",
    tag: "ART CURRENCY",
  },
  {
    id: "special-02",
    number: 27,
    code: "SPECIAL 02",
    collection: "specials",
    title: "The Stolen Artists Behind Roy Lichtenstein",
    subtitle: "Uncredited Comic Draftsmen vs. The $165 Million Pop Art Market",
    duration: "42m 26s",
    slug: "the-stolen-artists-behind-roy-lichtenstein",
    driveFileId: "1fxwlgOBy02K3c5-zdw8gw0BAHdJ_HRQn",
    description:
      "A forensic reckoning with the Golden and Silver Age comic illustrators—Russ Heath, Tony Abruzzo, Irv Novick, and Jack Kirby—whose panels powered Roy Lichtenstein's museum empire.",
    tag: "PROVENANCE AUDIT",
  },
  {
    id: "special-03",
    number: 28,
    code: "SPECIAL 03",
    collection: "specials",
    title: "How Destroying Comics Created $680,000 Assets",
    subtitle: "Supply Shock Mechanics, Censorship & Pre-Code Attrition",
    duration: "53m 10s",
    slug: "how-destroying-comics-created-680000-assets",
    driveFileId: "1h5sOcUju4QS8YVx7YtNo6oOTZepXhTIC",
    description:
      "Tracing the exact census math of wartime scrap drives, newsstand returns, and 1950s bonfires—and why catastrophic physical destruction forged six-figure Golden Age survivors.",
    tag: "ATTRITION MATH",
  },
  {
    id: "special-04",
    number: 29,
    code: "SPECIAL 04",
    collection: "specials",
    title: "Pricing a $3.6 Million Comic Book",
    subtitle: "Underwriting Ultra-Thin Trophy Markets & Top-Pop Convexity",
    duration: "46m 34s",
    slug: "pricing-a-3-6-million-comic-book",
    driveFileId: "1PI0-Az4-5diTiAl1eZirGEeR6CydXYQC",
    description:
      "How institutional desks value a single-copy pedigree grail when comparable sales occur once per decade: census concentration, elastic grade spreads, and liquidity haircuts.",
    tag: "TROPHY VALUATION",
  },
  {
    id: "special-05",
    number: 30,
    code: "SPECIAL 05",
    collection: "specials",
    title: "Wall Street Math for Vintage Comics",
    subtitle: "Replacement Cost, Margin of Safety & Markov Grading Odds",
    duration: "23m 12s",
    slug: "wall-street-math-for-vintage-comics",
    driveFileId: "1__dyCuqW60WBtodQkKD9H2SQXbFiK_Xs",
    description:
      "A quantitative walkthrough of raw-to-slab replacement cost underwriting, CGC census transition probabilities, and Benjamin Graham margin-of-safety thresholds applied to vintage comics.",
    tag: "QUANT UNDERWRITING",
  },
];

export default function PodcastsPage() {
  const previewEligibleEpisodes = EPISODES.filter((ep) => Boolean(ep.audioFile));
  const [featuredEpisode, setFeaturedEpisode] = useState<Episode>(
    previewEligibleEpisodes[0] || EPISODES[0]
  );
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [selectedLockedId, setSelectedLockedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [playerMode, setPlayerMode] = useState<"video" | "audio">("audio");
  const [selectedCollection, setSelectedCollection] = useState<
    "all" | PodcastCollection
  >("all");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [audioSnippetOffset, setAudioSnippetOffset] = useState<number>(0);
  const [previewRemainingSec, setPreviewRemainingSec] = useState<number>(
    PREVIEW_LIMIT_SECONDS
  );
  const [previewExpired, setPreviewExpired] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasSeekedInitialRef = useRef<boolean>(false);
  const previewPlayedSecRef = useRef<number>(0);
  const lastTickMsRef = useRef<number | null>(null);

  const expirePreviewAndPromptGate = () => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
    }
    setPreviewRemainingSec(0);
    setPreviewExpired(true);
    setSelectedLockedId(activeEpisode?.id ?? featuredEpisode.id);
    const el = document.getElementById("podcast-gate-wall");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("cbse_podcast_vault_unlocked");
    if (stored === "true") {
      setIsUnlocked(true);
      setPlayerMode("video");
    }
    // Randomly rotate the open 2-minute preview episode on each page load
    const pool = EPISODES.filter((ep) => Boolean(ep.audioFile));
    const randomIndex = Math.floor(Math.random() * pool.length);
    setFeaturedEpisode(pool[randomIndex] || EPISODES[0]);

    // Pick a random snippet start offset between 30s and 270s for the 2-minute excerpt
    const randomStart = Math.floor(Math.random() * 240) + 30;
    setAudioSnippetOffset(randomStart);
  }, []);

  // Hard 250ms watchdog enforcing the strict 120-second (2:00) pre-gate preview cap
  useEffect(() => {
    if (isUnlocked || !activeEpisode || playerMode !== "audio" || previewExpired) {
      lastTickMsRef.current = null;
      return;
    }
    const timer = window.setInterval(() => {
      const audio = audioRef.current;
      if (!audio || audio.paused || audio.ended) {
        lastTickMsRef.current = null;
        return;
      }
      const now = Date.now();
      if (lastTickMsRef.current != null) {
        previewPlayedSecRef.current += (now - lastTickMsRef.current) / 1000;
      }
      lastTickMsRef.current = now;

      const trackElapsed = Math.max(0, audio.currentTime - audioSnippetOffset);
      const totalUsed = Math.max(trackElapsed, previewPlayedSecRef.current);
      const remaining = Math.max(0, Math.ceil(PREVIEW_LIMIT_SECONDS - totalUsed));
      setPreviewRemainingSec(remaining);

      if (
        totalUsed >= PREVIEW_LIMIT_SECONDS ||
        audio.currentTime >= audioSnippetOffset + PREVIEW_LIMIT_SECONDS
      ) {
        expirePreviewAndPromptGate();
      }
    }, 250);

    return () => {
      window.clearInterval(timer);
      lastTickMsRef.current = null;
    };
  }, [isUnlocked, activeEpisode, playerMode, previewExpired, audioSnippetOffset]);

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
          metadata: { source: "gated_podcasts_vault_gdrive_30" },
        }),
      });

      const data = await res.json();
      if (data.ok) {
        localStorage.setItem("cbse_podcast_vault_unlocked", "true");
        localStorage.setItem("cbse_podcast_user_email", email);
        setIsUnlocked(true);
        setSelectedLockedId(null);
        setPreviewExpired(false);
        setPlayerMode("video");
      } else {
        setSubmitError(
          data.error || "Failed to unlock vault. Please try again."
        );
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlayEpisode = (
    ep: Episode,
    mode: "video" | "audio" = "video"
  ) => {
    if (!isUnlocked) {
      if (ep.id !== featuredEpisode.id || !ep.audioFile) {
        // Highlight chosen locked episode with red rimlight and take visitor straight to the contact gate
        setSelectedLockedId(ep.id);
        const el = document.getElementById("podcast-gate-wall");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
        return;
      }
      // Pre-gate: strictly play the randomized 2-minute audio excerpt (never expose full 1080p Drive file)
      if (previewExpired) {
        setSelectedLockedId(ep.id);
        const el = document.getElementById("podcast-gate-wall");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
        return;
      }
      setSelectedLockedId(null);
      hasSeekedInitialRef.current = false;
      previewPlayedSecRef.current = 0;
      lastTickMsRef.current = null;
      setPreviewRemainingSec(PREVIEW_LIMIT_SECONDS);
      setPlayerMode("audio");
      setActiveEpisode(ep);
      const playerEl = document.getElementById("podcast-active-player");
      if (playerEl) {
        playerEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    // Post-gate unlocked: full unrestricted 1080p Google Drive video broadcast (or optional audio-only)
    setPlayerMode(mode === "audio" && ep.audioFile ? "audio" : "video");
    setActiveEpisode(ep);
    const playerEl = document.getElementById("podcast-active-player");
    if (playerEl) {
      playerEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const applyInitialPreviewSeek = (audio: HTMLAudioElement) => {
    if (isUnlocked || hasSeekedInitialRef.current) return;
    const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
    const maxSafeStart =
      dur > PREVIEW_LIMIT_SECONDS + 10
        ? Math.floor(dur - PREVIEW_LIMIT_SECONDS - 10)
        : 0;
    const targetStart = Math.max(0, Math.min(audioSnippetOffset, maxSafeStart));
    hasSeekedInitialRef.current = true;
    if (targetStart !== audioSnippetOffset) {
      setAudioSnippetOffset(targetStart);
    }
    try {
      audio.currentTime = targetStart;
    } catch {
      // retry on canplay if stream wasn't seekable yet
      hasSeekedInitialRef.current = false;
    }
  };

  const handleAudioTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    if (isUnlocked) return;
    const audio = e.currentTarget;
    if (previewExpired) {
      audio.pause();
      return;
    }
    if (!hasSeekedInitialRef.current) {
      applyInitialPreviewSeek(audio);
      return;
    }
    // Clamp if user scrubbed earlier than snippet start
    if (audio.currentTime < audioSnippetOffset - 0.75) {
      audio.currentTime = audioSnippetOffset;
      return;
    }
    const elapsedInSnippet = Math.max(0, audio.currentTime - audioSnippetOffset);
    const totalUsed = Math.max(elapsedInSnippet, previewPlayedSecRef.current);
    setPreviewRemainingSec(
      Math.max(0, Math.ceil(PREVIEW_LIMIT_SECONDS - totalUsed))
    );
    if (totalUsed >= PREVIEW_LIMIT_SECONDS) {
      expirePreviewAndPromptGate();
    }
  };

  const handleAudioSeeking = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    if (isUnlocked) return;
    const audio = e.currentTarget;
    if (previewExpired) {
      audio.pause();
      return;
    }
    const windowEnd = audioSnippetOffset + PREVIEW_LIMIT_SECONDS - 0.5;
    if (audio.currentTime < audioSnippetOffset) {
      audio.currentTime = audioSnippetOffset;
    } else if (audio.currentTime > windowEnd) {
      audio.currentTime = windowEnd;
      expirePreviewAndPromptGate();
    }
  };

  const handleAudioPlay = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    if (isUnlocked) return;
    const audio = e.currentTarget;
    if (previewExpired) {
      audio.pause();
      expirePreviewAndPromptGate();
      return;
    }
    if (!hasSeekedInitialRef.current) {
      applyInitialPreviewSeek(audio);
    }
    lastTickMsRef.current = Date.now();
  };

  const handleAudioLoadedMetadata = (
    e: React.SyntheticEvent<HTMLAudioElement>
  ) => {
    if (isUnlocked) return;
    applyInitialPreviewSeek(e.currentTarget);
  };

  const formatCountdown = (secs: number) => {
    const clamped = Math.max(0, Math.floor(secs));
    const m = Math.floor(clamped / 60);
    const s = clamped % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const season1Count = EPISODES.filter((e) => e.collection === "season-1").length;
  const season2Count = EPISODES.filter((e) => e.collection === "season-2").length;
  const specialsCount = EPISODES.filter((e) => e.collection === "specials").length;

  const filteredEpisodes =
    selectedCollection === "all"
      ? EPISODES
      : EPISODES.filter((ep) => ep.collection === selectedCollection);

  return (
    <div className="relative min-h-screen text-[#f8fafc] font-light selection:bg-emerald-500 selection:text-black">
      {/* High-Resolution Clean Sentinel Parallax Full-Page Background (zero baked-in corner pills) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-95 transition-opacity duration-700"
        style={{
          backgroundImage: `url('/brand/cbse-superhero-city-sentinel-bg.jpg?v=20261126_clean')`,
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#05080e]/25 via-transparent to-[#05080e]/65" />

      <div className="relative z-10">
        {/* Shared Sticky Parallax Header — 3 glowing sibling pills (Private Beta · Monograph / Book · Donate) */}
        <EditorialStickyNav currentPage="podcasts" />

        {/* Hero Header */}
        <section className="relative overflow-hidden py-6 md:py-8 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <div className="inline-block p-6 md:p-8 rounded-2xl bg-[#060b14]/50 backdrop-blur-2xl border border-emerald-500/30 shadow-2xl shadow-black/60 space-y-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-[11px] tracking-widest uppercase backdrop-blur-md">
                  <span>◆</span> OFFICIAL VIDEO PODCAST ARCHIVE // {EPISODES.length}{" "}
                  FULL 1080P BROADCASTS
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-white tracking-wide uppercase leading-tight drop-shadow-lg">
                  Sequential Art Equities <br />
                  <span className="text-emerald-400">
                    Master Video Broadcasts
                  </span>
                </h1>
                <p className="text-slate-100 text-sm md:text-base leading-relaxed max-w-2xl font-light drop-shadow">
                  Forensic market telemetry, actuarial pricing models, and
                  unvarnished dealer history. Hosted by{" "}
                  <strong className="text-white font-normal">
                    Marcus Vance
                  </strong>{" "}
                  (Quantitative Finance Lead) and{" "}
                  <strong className="text-white font-normal">
                    Elena Rostov
                  </strong>{" "}
                  (Art History &amp; Pedigree Provenance).
                </p>
                <div className="flex flex-wrap gap-4 pt-1 text-[11px] uppercase tracking-wider text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>{" "}
                    {season1Count} Season 1 + Season 2 + {specialsCount} Specials
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>{" "}
                    Full 1080p HD Video Masters
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>{" "}
                    Zero Corporate Shilling
                  </span>
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
                    <div className="text-emerald-400 font-normal">
                      Marcus Vance &amp; Elena Rostov
                    </div>
                    <div className="text-slate-300 text-[10px]">
                      CBSE Research Desk
                    </div>
                  </div>
                  <div className="text-emerald-300 font-mono text-[10px]">
                    {EPISODES.length} VOLUMES
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-6 py-8 md:py-10">
          {/* ROTATING FEATURED OPEN PREVIEW — Electric Green Rimlight & Edge Glow */}
          <div
            className="mb-10 p-5 md:p-6 rounded-xl bg-[#060b14]/60 backdrop-blur-2xl relative overflow-hidden transition-all"
            style={{
              border: "1.5px solid #00ff66",
              boxShadow:
                "0 0 26px rgba(0, 255, 102, 0.55), inset 0 0 18px rgba(0, 255, 102, 0.2), 0 0 4px #00ff66",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,255,102,0.12) 0%, transparent 45%, rgba(0,255,102,0.08) 100%)",
              }}
            />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="px-2.5 py-0.5 rounded text-[11px] uppercase tracking-widest font-mono font-semibold"
                    style={{
                      backgroundColor: "rgba(0, 255, 102, 0.16)",
                      color: "#39ff88",
                      border: "1px solid rgba(0, 255, 102, 0.7)",
                      boxShadow: "0 0 10px rgba(0, 255, 102, 0.35)",
                    }}
                  >
                    {isUnlocked
                      ? "FEATURED FULL 1080P BROADCAST"
                      : "ROTATING 2-MINUTE OPEN PREVIEW • NO GATE"}
                  </span>
                  <span className="text-slate-300 text-xs font-mono">
                    {featuredEpisode.code}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono uppercase">
                    {isUnlocked ? "1080P HD VIDEO UNLOCKED" : "RANDOMIZED ON LOAD"}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-light text-white uppercase tracking-wide">
                  {featuredEpisode.title}
                </h2>
                <div className="text-[#39ff88] text-xs uppercase tracking-wider">
                  {featuredEpisode.subtitle}
                </div>
                <p className="text-slate-200 text-xs md:text-sm font-light leading-relaxed pt-1">
                  {featuredEpisode.description}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
                <span className="text-xs text-slate-300 font-mono">
                  RUNTIME: {featuredEpisode.duration}
                </span>
                <button
                  onClick={() =>
                    handlePlayEpisode(
                      featuredEpisode,
                      isUnlocked ? "video" : "audio"
                    )
                  }
                  className="px-5 py-2.5 rounded text-slate-950 font-semibold uppercase tracking-widest text-xs transition-all flex items-center gap-2 cursor-pointer hover:brightness-110"
                  style={{
                    backgroundColor: "#00ff66",
                    boxShadow: "0 0 18px rgba(0, 255, 102, 0.65)",
                  }}
                >
                  <span>▶</span>{" "}
                  {isUnlocked
                    ? "WATCH FULL 1080P EPISODE"
                    : "STREAM 2-MINUTE PREVIEW"}
                </button>
              </div>
            </div>
          </div>

          {/* Active Cinema / Audio Broadcast Player */}
          <div id="podcast-active-player" className="scroll-mt-20">
            {activeEpisode && (
              <div className="mb-10 p-5 md:p-6 rounded-xl bg-[#060b14]/75 border border-emerald-500/60 shadow-2xl shadow-black/80 backdrop-blur-2xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-emerald-400 text-xs uppercase tracking-widest font-mono">
                        {isUnlocked
                          ? "FULL 1080P MASTER UNLOCKED"
                          : "2-MINUTE EXCERPT PREVIEW (CHANGES ON LOAD)"}
                      </span>
                      <span className="text-slate-400 text-xs font-mono">
                        • {activeEpisode.code}
                      </span>
                      <span className="text-cyan-300 text-xs font-mono">
                        • {activeEpisode.duration}
                      </span>
                    </div>
                    <h3 className="text-xl font-normal text-white uppercase tracking-wide mt-1">
                      {activeEpisode.title}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {activeEpisode.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {isUnlocked && (
                      <>
                        <button
                          onClick={() => setPlayerMode("video")}
                          className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                            playerMode === "video"
                              ? "bg-emerald-500 text-slate-950 border-emerald-400 font-semibold"
                              : "bg-slate-900/70 text-slate-300 border-slate-700 hover:border-emerald-500/50"
                          }`}
                        >
                          1080p Video
                        </button>
                        {activeEpisode.audioFile && (
                          <button
                            onClick={() => setPlayerMode("audio")}
                            className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                              playerMode === "audio"
                                ? "bg-emerald-500 text-slate-950 border-emerald-400 font-semibold"
                                : "bg-slate-900/70 text-slate-300 border-slate-700 hover:border-emerald-500/50"
                            }`}
                          >
                            Audio Only
                          </button>
                        )}
                        <a
                          href={driveViewUrl(activeEpisode.driveFileId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider bg-slate-900/70 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/20 transition-colors"
                        >
                          Open in Drive ↗
                        </a>
                        <a
                          href={driveDownloadUrl(activeEpisode.driveFileId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/20 transition-colors"
                        >
                          ⬇ MP4
                        </a>
                      </>
                    )}
                    <button
                      onClick={() => setActiveEpisode(null)}
                      className="px-2.5 py-1.5 rounded text-xs font-mono uppercase bg-slate-900/70 text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
                      aria-label="Close player"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {isUnlocked && playerMode === "video" ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-emerald-500/30 bg-black shadow-2xl">
                    <iframe
                      key={activeEpisode.driveFileId}
                      src={drivePreviewUrl(activeEpisode.driveFileId)}
                      title={activeEpisode.title}
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  </div>
                ) : activeEpisode.audioFile ? (
                  <div
                    className="p-4 rounded-xl bg-black/55 space-y-3 transition-all"
                    style={
                      !isUnlocked && previewExpired
                        ? {
                            border: "1.5px solid #ff2a4b",
                            boxShadow:
                              "0 0 20px rgba(255, 42, 75, 0.5), inset 0 0 12px rgba(255, 42, 75, 0.18)",
                          }
                        : {
                            border: "1.5px solid #00ff66",
                            boxShadow:
                              "0 0 18px rgba(0, 255, 102, 0.4), inset 0 0 10px rgba(0, 255, 102, 0.14)",
                          }
                    }
                  >
                    {!isUnlocked && previewExpired ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
                        <div>
                          <div className="text-xs font-mono font-bold uppercase tracking-wider text-red-400">
                            🔒 2:00 Preview Limit Reached
                          </div>
                          <p className="text-xs text-slate-200 mt-0.5">
                            Enter your details below to unlock all{" "}
                            {EPISODES.length} full 1080p HD Google Drive video
                            broadcasts, Season 2, and all {specialsCount}{" "}
                            Specials.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const el =
                              document.getElementById("podcast-gate-wall");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 border border-red-400 shrink-0 cursor-pointer"
                        >
                          Unlock Full Archive ↓
                        </button>
                      </div>
                    ) : (
                      <>
                        {!isUnlocked && (
                          <div className="flex items-center justify-between gap-3 text-[11px] font-mono uppercase tracking-wider">
                            <span className="text-[#39ff88] font-semibold">
                              2-Minute Randomized Excerpt Active
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-[#00ff66]/60 text-[#39ff88] font-bold">
                              TIME LEFT: {formatCountdown(previewRemainingSec)}
                            </span>
                          </div>
                        )}
                        <audio
                          ref={audioRef}
                          key={`${activeEpisode.audioFile}-${audioSnippetOffset}`}
                          controls
                          autoPlay
                          src={activeEpisode.audioFile}
                          onLoadedMetadata={handleAudioLoadedMetadata}
                          onCanPlay={(e) =>
                            applyInitialPreviewSeek(e.currentTarget)
                          }
                          onPlay={handleAudioPlay}
                          onSeeking={handleAudioSeeking}
                          onTimeUpdate={handleAudioTimeUpdate}
                          className="w-full rounded-lg bg-black/40"
                        />
                        {!isUnlocked && (
                          <div className="space-y-1.5">
                            <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                              <div
                                className="h-full transition-all duration-300"
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      (previewRemainingSec /
                                        PREVIEW_LIMIT_SECONDS) *
                                        100
                                    )
                                  )}%`,
                                  backgroundColor:
                                    previewRemainingSec <= 20
                                      ? "#ff2a4b"
                                      : "#00ff66",
                                  boxShadow:
                                    previewRemainingSec <= 20
                                      ? "0 0 8px #ff2a4b"
                                      : "0 0 8px #00ff66",
                                }}
                              />
                            </div>
                            <p className="text-[11px] text-emerald-300/85 font-mono">
                              Strict 2:00 randomized preview window • Submit
                              your contact info below to unlock all{" "}
                              {EPISODES.length} full 1080p HD video broadcasts,
                              Season 2, and all {specialsCount} Specials.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* GATED ACCESS & FULL GOOGLE DRIVE MASTER ARCHIVE WALL */}
          {!isUnlocked ? (
            <div
              id="podcast-gate-wall"
              className="mb-14 rounded-2xl bg-[#060b14]/60 backdrop-blur-2xl p-8 md:p-10 shadow-2xl shadow-black/60 relative overflow-hidden transition-all"
              style={
                selectedLockedId
                  ? {
                      border: "1.5px solid #ff2a4b",
                      boxShadow:
                        "0 0 26px rgba(255, 42, 75, 0.5), inset 0 0 16px rgba(255, 42, 75, 0.18), 0 0 4px #ff2a4b",
                    }
                  : {
                      border: "1px solid rgba(16, 185, 129, 0.4)",
                    }
              }
            >
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="max-w-2xl mx-auto text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs tracking-widest uppercase">
                  <span>🔒</span> GATED RESEARCH VAULT &bull; {EPISODES.length}{" "}
                  FULL 1080P VIDEO MASTERS
                </div>
                <h2 className="text-2xl sm:text-3xl font-light text-white tracking-wide uppercase">
                  Unlock All {EPISODES.length} Full Video Broadcasts
                </h2>
                <p className="text-slate-200 font-light text-xs sm:text-sm leading-relaxed">
                  Enter your credentials to immediately unlock full 1080p HD
                  streaming and direct Google Drive master access across all{" "}
                  {season1Count} Season 1 chapters, Season 2 Premiere, and{" "}
                  {specialsCount} Special Investigations.
                </p>

                <form
                  onSubmit={handleUnlock}
                  className="space-y-3.5 pt-2 text-left max-w-md mx-auto"
                >
                  {submitError && (
                    <div className="p-3 rounded bg-red-950/60 border border-red-500/50 text-red-300 text-xs uppercase tracking-wider">
                      {submitError}
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-300 mb-1">
                      Full Name *
                    </label>
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
                    <label className="block text-[11px] uppercase tracking-wider text-slate-300 mb-1">
                      Email Address *
                    </label>
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
                    <label className="block text-[11px] uppercase tracking-wider text-slate-300 mb-1">
                      Phone Number (Optional)
                    </label>
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
                    className="w-full py-3 px-6 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium uppercase tracking-widest text-xs transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-1 cursor-pointer"
                  >
                    {isSubmitting
                      ? "UNLOCKING ARCHIVE..."
                      : `UNLOCK ALL ${EPISODES.length} FULL VIDEO BROADCASTS`}
                  </button>
                  <p className="text-center text-[10px] text-slate-400 tracking-wider uppercase">
                    Zero spam. Direct 1080p streaming &bull; Full Google Drive
                    master vault access.
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
                    Vault Unlocked &bull; All {EPISODES.length} Full 1080p Video
                    Masters Ready
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Stream any episode below directly in-page or browse the
                    complete Google Drive master archive folder.
                  </div>
                </div>
              </div>
              <a
                href={DRIVE_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium uppercase tracking-wider text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-lg"
              >
                <span>↗</span> OPEN FULL DRIVE ARCHIVE ({EPISODES.length} MP4s)
              </a>
            </div>
          )}

          {/* Episode Catalog Grid */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-500/20">
              <h2 className="text-xs uppercase tracking-widest text-slate-300">
                Master Broadcast Catalog ({filteredEpisodes.length} of{" "}
                {EPISODES.length} Episodes)
              </h2>

              <div className="flex items-center gap-2 flex-wrap">
                {(
                  [
                    { key: "all", label: `All (${EPISODES.length})` },
                    { key: "season-1", label: `Season 1 (${season1Count})` },
                    { key: "season-2", label: `Season 2 (${season2Count})` },
                    { key: "specials", label: `Specials (${specialsCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedCollection(tab.key)}
                    className={`px-3 py-1 rounded text-[11px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                      selectedCollection === tab.key
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 font-semibold"
                        : "bg-[#060b14]/60 text-slate-300 border-slate-700/80 hover:border-emerald-500/50 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEpisodes.map((ep) => {
                const isThisFeatured = ep.id === featuredEpisode.id;
                const isThisActive = activeEpisode?.id === ep.id;
                const isThisLocked = !isUnlocked && !isThisFeatured;
                const isSelectedLocked = isThisLocked && selectedLockedId === ep.id;
                const isHovered = hoveredId === ep.id;

                const cardRimStyle: React.CSSProperties = isThisFeatured
                  ? {
                      border: "1.5px solid #00ff66",
                      boxShadow: isHovered || isThisActive
                        ? "0 0 28px rgba(0, 255, 102, 0.72), inset 0 0 18px rgba(0, 255, 102, 0.28), 0 0 5px #00ff66"
                        : "0 0 20px rgba(0, 255, 102, 0.48), inset 0 0 12px rgba(0, 255, 102, 0.18), 0 0 3px #00ff66",
                    }
                  : isSelectedLocked
                  ? {
                      border: "1.5px solid #ff2a4b",
                      boxShadow:
                        "0 0 28px rgba(255, 42, 75, 0.78), inset 0 0 18px rgba(255, 42, 75, 0.28), 0 0 5px #ff2a4b",
                    }
                  : isThisLocked && isHovered
                  ? {
                      border: "1.5px solid #ff2a4b",
                      boxShadow:
                        "0 0 22px rgba(255, 42, 75, 0.62), inset 0 0 14px rgba(255, 42, 75, 0.22), 0 0 4px #ff2a4b",
                    }
                  : isThisLocked
                  ? {
                      border: "1px solid rgba(255, 42, 75, 0.42)",
                      boxShadow:
                        "0 0 12px rgba(255, 42, 75, 0.22), inset 0 0 8px rgba(255, 42, 75, 0.08)",
                    }
                  : isThisActive
                  ? {
                      border: "1.5px solid #00ff66",
                      boxShadow:
                        "0 0 24px rgba(0, 255, 102, 0.55), inset 0 0 14px rgba(0, 255, 102, 0.22), 0 0 4px #00ff66",
                    }
                  : isHovered
                  ? {
                      border: "1.5px solid rgba(0, 255, 102, 0.75)",
                      boxShadow:
                        "0 0 16px rgba(0, 255, 102, 0.35), inset 0 0 10px rgba(0, 255, 102, 0.12)",
                    }
                  : {
                      border: "1px solid rgba(51, 65, 85, 0.65)",
                    };

                return (
                  <div
                    key={ep.id}
                    onMouseEnter={() => setHoveredId(ep.id)}
                    onMouseLeave={() => setHoveredId((prev) => (prev === ep.id ? null : prev))}
                    onClick={() => handlePlayEpisode(ep, isUnlocked ? "video" : "audio")}
                    style={cardRimStyle}
                    className={`group p-5 rounded-lg backdrop-blur-xl transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                      isThisFeatured
                        ? "bg-[#04140c]/65"
                        : isSelectedLocked
                        ? "bg-[#1a050b]/65"
                        : "bg-[#060b14]/50 hover:bg-[#060b14]/65"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-slate-400">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-mono ${
                              isThisFeatured
                                ? "text-[#39ff88] font-semibold"
                                : isSelectedLocked || (isThisLocked && isHovered)
                                ? "text-red-400 font-semibold"
                                : "text-emerald-400"
                            }`}
                          >
                            {ep.code}
                          </span>
                          {isThisFeatured && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold"
                              style={{
                                backgroundColor: "rgba(0, 255, 102, 0.18)",
                                color: "#39ff88",
                                border: "1px solid rgba(0, 255, 102, 0.65)",
                              }}
                            >
                              2-MIN FREE PREVIEW
                            </span>
                          )}
                          {isSelectedLocked && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold"
                              style={{
                                backgroundColor: "rgba(255, 42, 75, 0.2)",
                                color: "#ff6b81",
                                border: "1px solid rgba(255, 42, 75, 0.7)",
                              }}
                            >
                              🔒 SUBMIT BELOW TO UNLOCK
                            </span>
                          )}
                          {isThisActive && (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px]">
                              NOW PLAYING
                            </span>
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-900/60 backdrop-blur-md border border-slate-800 text-slate-300 shrink-0">
                          {ep.tag}
                        </span>
                      </div>
                      <h3
                        className={`text-base font-normal text-white uppercase tracking-wide transition-colors ${
                          isThisFeatured
                            ? "group-hover:text-[#39ff88]"
                            : isThisLocked
                            ? "group-hover:text-red-300"
                            : "group-hover:text-emerald-300"
                        }`}
                      >
                        {ep.title}
                      </h3>
                      <div
                        className={`text-xs font-light tracking-wide ${
                          isThisFeatured
                            ? "text-[#39ff88]"
                            : isSelectedLocked
                            ? "text-red-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {ep.subtitle}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-light line-clamp-3 pt-1">
                        {ep.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-slate-400 font-mono">
                        {ep.duration} · 1080p HD
                      </span>

                      <div className="flex items-center gap-2">
                        {ep.audioFile && isUnlocked && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayEpisode(ep, "audio");
                            }}
                            className="px-2.5 py-1.5 rounded bg-slate-900/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Audio
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayEpisode(ep, isUnlocked ? "video" : "audio");
                          }}
                          className={`px-3.5 py-1.5 rounded text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                            isThisFeatured
                              ? "text-slate-950 font-semibold"
                              : isThisLocked
                              ? "bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/60"
                              : "bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/40"
                          }`}
                          style={
                            isThisFeatured
                              ? {
                                  backgroundColor: "#00ff66",
                                  boxShadow: "0 0 14px rgba(0, 255, 102, 0.55)",
                                }
                              : undefined
                          }
                        >
                          <span>{isThisLocked ? "🔒" : "▶"}</span>{" "}
                          {isUnlocked
                            ? "WATCH 1080P"
                            : isThisFeatured
                            ? "2-MIN PREVIEW"
                            : "UNLOCK 1080P"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-20 mb-10 max-w-xl mx-auto px-6 py-4 rounded-xl border border-emerald-500/20 bg-[#060b14]/50 backdrop-blur-xl text-center text-xs uppercase tracking-widest text-slate-300 shadow-2xl">
          <p className="mb-1 text-slate-200">
            Comic Book Stock Exchange • Sequential Art Equities
          </p>
          <p className="text-slate-400 text-[10px]">
            Actuarial Ledger • Zero Corporate Kickbacks
          </p>
        </footer>
      </div>
    </div>
  );
}
