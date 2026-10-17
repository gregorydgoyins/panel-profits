"use client";
import {venueStatus, type VenueFetch} from "@/lib/sniper/venue-status";
import {balanceAuctionSites} from "@/lib/sniper/eligibility";

import React, { useState, useEffect, useMemo, useCallback, startTransition } from "react";
import Link from "next/link";
import {
  RawAuctionListing,
  CandidateEvaluation,
  SniperFilterProfile,
  ComicEra,
  AuctionSource,
} from "@/lib/sniper/types";
import { evaluateAuctionListing } from "@/lib/sniper/radar-engine";
import { getEraDisplayName } from "@/lib/sniper/anti-bullshit";
import { SlabEncasement } from "@/components/sniper/SlabEncasement";
import { lotUnderwriting } from "@/lib/sniper/lot-underwriting";
import { useLotResearch } from "@/components/sniper/useLotResearch";
import { SniperListingResearch } from "@/components/sniper/SniperListingResearch";
import { formatComicEquityTicker } from "@/lib/equity/ticker-formatting";
import { LiveLotStrip } from "@/components/sniper/LiveLotStrip";
import { SniperLearningPanel } from "@/components/sniper/SniperLearningPanel";
import { LotMarketChart } from "@/components/sniper/LotMarketChart";
import { SniperGame, useSniperGame } from "@/components/sniper/SniperGame";
import { SniperLotTicket } from "@/components/sniper/SniperLotTicket";
import { SniperVideos } from "@/components/sniper/SniperVideos";

const WINDOW_STEP = 24;

/** Renders the next batch of cards when it scrolls near the viewport (and a button as a fallback). */
function LoadMoreSentinel({ remaining, onMore }: { remaining: number; onMore: () => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) onMore(); }, { rootMargin: "1200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [onMore, remaining]);
  return (
    <div ref={ref} className="py-4 text-center">
      <button onClick={onMore} className="text-xs font-mono bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2 rounded-lg cursor-pointer">
        Show more ({remaining} left)
      </button>
    </div>
  );
}

/** CBCS publishes no census, so the number is unknown (N/A). Other graders show "Census not found" when their own data has no match. */
function censusMissing(grader?: string | null): string {
  return /cbcs/i.test(grader ?? "") ? "N/A" : "Census not found";
}


const ALL_CANONICAL_ERAS: ComicEra[] = [
  "platinum",
  "golden",
  "atomic",
  "silver",
  "bronze",
  "copper",
  "modern",
  "postmodern",
  "indy",
];

const ALL_AUCTION_SUITES: { key: AuctionSource; label: string }[] = [
  { key: "comicconnect", label: "ComicConnect Focal" },
  { key: "metropolis", label: "Metropolis Collectibles" },
  { key: "hakes", label: "Hake's Auctions (CGC / Pop Culture)" },
  { key: "atomicavenue", label: "Atomic Avenue (ComicBase Network)" },
  { key: "heritage", label: "Heritage Auctions (HA.com)" },
  { key: "mycomicshop", label: "MyComicShop (Lone Star Auctions)" },
  { key: "comiclink", label: "ComicLink Exchange" },
  { key: "shortboxed", label: "Shortboxed Slab Desk" },
  { key: "whatnot", label: "Whatnot Sudden Drops" },
  { key: "pristine", label: "Pristine Auction" },
  { key: "goldin", label: "Fanatics / Goldin / PWCC" },
  { key: "hipcomic", label: "HipComic Marketplace" },
  { key: "mercari", label: "Mercari (Sleeper Relics)" },
  { key: "ebay", label: "eBay US (Volume/Sleepers)" },
  { key: "ebay_uk", label: "eBay UK 🇬🇧 (GBP £ / Pence Copies)" },
  { key: "ebay_ca", label: "eBay Canada 🇨🇦 (CAD C$ / CPVs)" },
  { key: "ebay_fr", label: "eBay France 🇫🇷 (EUR € / Lug & French)" },
  { key: "ebay_de", label: "eBay Germany 🇩🇪 (EUR € / Condor)" },
  { key: "ebay_au", label: "eBay Australia 🇦🇺 (AUD A$ / Newton)" },
];

function formatVenueName(source: string): string {
  switch (source?.toLowerCase()) {
    case "mycomicshop": return "MyComicShop";
    case "mercari": return "Mercari";
    case "heritage": return "Heritage";
    case "hakes": return "Hake's";
    case "atomicavenue": return "Atomic Avenue";
    case "comiclink": return "ComicLink";
    case "comicconnect": return "ComicConnect";
    case "shortboxed": return "Shortboxed";
    case "whatnot": return "Whatnot";
    case "pristine": return "Pristine";
    case "goldin": return "Goldin";
    case "metropolis": return "Metropolis";
    case "hipcomic": return "HipComic";
    case "ebay": return "eBay";
    case "ebay_uk": return "eBay UK";
    case "ebay_ca": return "eBay Canada";
    case "ebay_fr": return "eBay France";
    case "ebay_de": return "eBay Germany";
    case "ebay_au": return "eBay Australia";
    default: return source ? source.toUpperCase() : "Marketplace";
  }
}

function formatVenueActionText(source: string, isBuyItNow?: boolean): string {
  const venue = formatVenueName(source);
  if (isBuyItNow) {
    return `Open ${venue} Buy It Now ↗`;
  }
  return `Open ${venue} Auction ↗`;
}

export default function SniperRadarPage() {
  const [researchBeta, setResearchBeta] = useState(false);
  useEffect(() => { setResearchBeta(new URLSearchParams(window.location.search).get("beta") === "research"); }, []);
  // Owner Password Authentication Gate State (verified server-side via /api/sniper/auth)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const desk = useSniperGame(isAuthenticated);
  const [snipeSuccessToast, setSnipeSuccessToast] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/sniper/auth", { cache: "no-store", signal: AbortSignal.timeout(8000) })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) {
          setIsAuthenticated(Boolean(j?.authenticated));
          setAuthChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch("/api/sniper/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passwordInput }),
      });
      const data = await res.json();
      if (res.ok && data?.authenticated) {
        setIsAuthenticated(true);
        setPasswordError(null);
      } else {
        setPasswordError(data?.error || "Incorrect owner passcode. Access denied.");
      }
    } catch {
      setPasswordError("Unable to verify passcode right now.");
    }
  };

  const handleLock = async () => {
    try {
      await fetch("/api/sniper/auth", { method: "DELETE" });
    } catch {}
    setIsAuthenticated(false);
    setPasswordInput("");
  };

  // Field Manual / Instructions Drawer Toggle
  const [showManual, setShowManual] = useState<boolean>(false);
  // Expandable "Whole Tomato" Cost Breakdown Accordion State
  const [expandedBreakdownId, setExpandedBreakdownId] = useState<string | null>(null);

  // Strategy Filter Pill Tab
  const [strategyTab, setStrategyTab] = useState<string>("ALL");

  // Primary 3-Section View Switcher: LIVE AUCTIONS | WHAT YOU MISSED | WHAT YOU'VE ACQUIRED
  const [viewMode, setViewMode] = useState<"LIVE" | "MISSED" | "ACQUIRED">("LIVE");
  const [liveShown, setLiveShown] = useState<number>(WINDOW_STEP);

  // DYNAMIC LIVE AUCTION STREAM (Active Open-Web Stream)
  const [venueFetches, setVenueFetches] = useState<VenueFetch[]>([]);
  const [auctionsList, setAuctionsList] = useState<RawAuctionListing[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");
  const [liveStreamSource, setLiveStreamSource] = useState<string>("live_ebay_stream");
  const liveRequest = React.useRef(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [dataAsOf, setDataAsOf] = useState<string | null>(null);

  // Active 1-Second Countdown Timers State
  const [liveAuctionTimers, setLiveAuctionTimers] = useState<Record<string, number>>({});

  // Fetch real live active auctions from /api/sniper/live-auctions
  const fetchLiveAuctions = useCallback(async (refresh = false) => {
    if (liveRequest.current) return;
    liveRequest.current = true;
    try {
      setLiveError(null);
      setIsLoadingLive(true);
      const res = await fetch(`/api/sniper/live-auctions${refresh ? "?refresh=true" : ""}`, {
        cache: "no-store", signal: AbortSignal.timeout(18000),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.auctions)) throw new Error("Saved listings are temporarily unavailable");
      if (data.success && Array.isArray(data.auctions)) {
        setAuctionsList(data.auctions);
        setVenueFetches(Array.isArray(data.venueFetches) ? data.venueFetches : []);
        setLastRefreshedAt(new Date().toLocaleTimeString());
        if (data.source) setLiveStreamSource(data.source);
        setDataAsOf(data.dataAsOf ?? null);

        // Reset countdown timer map with fresh active ticking seconds
        // Account for transport time since the stored-listings response was built.
        const ageSecs = data.fetchedAt ? Math.max(0, (Date.now() - new Date(data.fetchedAt).getTime()) / 1000) : 0;
        const newTimers: Record<string, number> = {};
        for (const item of data.auctions) {
          newTimers[item.id] = Math.max(0, Math.round(Number(item.secondsRemaining || 0) - ageSecs));
        }
        setLiveAuctionTimers(newTimers);
      }
    } catch (err) {
      console.error("Failed to load real live auctions:", err);
      setLiveError("The saved listing feed timed out or is unavailable. Your account and existing bids are preserved.");
    } finally {
      liveRequest.current = false;
      setIsLoadingLive(false);
    }
  }, []);

  // The research radar reads the saved market feed only while that view is open.
  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchLiveAuctions();
    const pollInterval = setInterval(() => void fetchLiveAuctions(), 20000);
    return () => clearInterval(pollInterval);
  }, [fetchLiveAuctions, isAuthenticated]);

  // Initialize and run real-time 1-second countdown ticker
  useEffect(() => {
    setLiveAuctionTimers(prev => {
      const next = { ...prev };
      for (const a of auctionsList) {
        if (next[a.id] === undefined) {
          next[a.id] = a.secondsRemaining;
        }
      }
      return next;
    });

    const interval = setInterval(() => {
      setLiveAuctionTimers(prev => {
        const next = { ...prev };
        for (const a of auctionsList) {
          const cur = next[a.id] ?? a.secondsRemaining;
          // Decrement second-by-second. When 0 is reached, auction has concluded.
          next[a.id] = Math.max(0, cur - 1);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [auctionsList]);

  // Live Auction Scanner Input State
  const [scannerInput, setScannerInput] = useState<string>("");
  const [scannerMessage, setScannerMessage] = useState<string | null>(null);

  const handleScanItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = scannerInput.trim();
    if (!query) return;

    const idMatch = query.match(/(\d{10,14})/);
    const itemId = idMatch ? idMatch[1] : null;

    if (!itemId) {
      setScannerMessage("Please enter a valid eBay listing URL or 12-digit eBay Item ID.");
      setTimeout(() => setScannerMessage(null), 4000);
      return;
    }

    const existing = auctionsList.find((a) => a.id.includes(itemId));
    if (existing) {
      setScannerMessage(`Listing #${itemId} is already in your live radar!`);
      setTimeout(() => setScannerMessage(null), 4000);
      return;
    }

    setScannerMessage(`Fetching verified listing details for #${itemId} from eBay API...`);

    try {
      const res = await fetch(`/api/sniper/item-details?id=${encodeURIComponent(itemId)}`);
      const data = await res.json();

      if (!data.success || !data.details) {
        setScannerMessage(data.error && /rate-limit/.test(data.error) ? data.error : `Listing #${itemId} not found or details unavailable on eBay API.`);
        setTimeout(() => setScannerMessage(null), 5000);
        return;
      }

      const d = data.details;
      const live = data.live;
      if (live?.currentBid == null || live?.secondsRemaining == null) {
        setScannerMessage(`eBay didn't report a price and end time for #${itemId}, so it can't be added.`);
        setTimeout(() => setScannerMessage(null), 5000);
        return;
      }
      const newListing: RawAuctionListing = {
        id: `ebay-${itemId}`,
        source: "ebay",
        title: d.title,
        currentBid: live.currentBid,
        shippingCost: d.shippingUsd ?? 0,
        bidCount: live.bidCount ?? 0,
        secondsRemaining: live.secondsRemaining,
        url: `https://www.ebay.com/itm/${itemId}`,
        imageUrl: d.images?.[0] || "",
        galleryImages: d.images || [],
        certNumber: d.aspects?.certNumber,
        itemDescription: d.description || `Live scanned active auction #${itemId}.`,
      };

      setAuctionsList([newListing, ...auctionsList]);
      setScannerInput("");
      setScannerMessage(`Successfully ingested verified listing: "${d.title}"!`);
      setTimeout(() => setScannerMessage(null), 4000);
    } catch (err) {
      setScannerMessage(`Failed to reach eBay API for listing #${itemId}.`);
      setTimeout(() => setScannerMessage(null), 5000);
    }
  };

  // Configurable Hunter Filter Profile (Centered on lower sub-$1500 ranges)
  const [selectedEras, setSelectedEras] = useState<ComicEra[]>([
    "platinum",
    "golden",
    "atomic",
    "silver",
    "bronze",
    "copper",
    "modern",
    "postmodern",
    "indy",
  ]);
  const [selectedSources, setSelectedSources] = useState<AuctionSource[]>([
    "comicconnect",
    "metropolis",
    "hakes",
    "atomicavenue",
    "heritage",
    "mycomicshop",
    "comiclink",
    "shortboxed",
    "whatnot",
    "pristine",
    "goldin",
    "hipcomic",
    "mercari",
    "ebay",
    "ebay_uk",
    "ebay_ca",
    "ebay_fr",
    "ebay_de",
    "ebay_au",
  ]);
  const [minGrade, setMinGrade] = useState<number>(8.5);
  const [maxGrade, setMaxGrade] = useState<number>(10.0);
  const [minAllInCost, setMinAllInCost] = useState<number>(0.0); // $0.00 Floor for misspellings & cracked cases
  const [maxBudget, setMaxBudget] = useState<number>(10000); // Full Range (up to mega keys)
  const [requireDoubleUpOnly, setRequireDoubleUpOnly] = useState<boolean>(false);
  const [maxUrgencySeconds, setMaxUrgencySeconds] = useState<number | null>(null);
  const [crackAndPress, setCrackAndPress] = useState<boolean>(true);
  const [damagedSlab98, setDamagedSlab98] = useState<boolean>(true);
  const [crackedCasesOnly, setCrackedCasesOnly] = useState<boolean>(false);
  const [misspelledOnly, setMisspelledOnly] = useState<boolean>(false);
  const [signedLegendary, setSignedLegendary] = useState<boolean>(true);
  const [belowGradingCost, setBelowGradingCost] = useState<boolean>(true);
  const [requireProvenSales, setRequireProvenSales] = useState<boolean>(false);
  const [requireImage, setRequireImage] = useState<boolean>(true);
  const [requireCheckedCert, setRequireCheckedCert] = useState<boolean>(false);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [seriesFilter, setSeriesFilter] = useState<string>("");

  // High-Resolution Front View Lightbox Inspection State
  const [selectedDeal, setInspectedDeal] = useState<CandidateEvaluation | null>(null);
  const lotResearch=useLotResearch(selectedDeal ? `/api/sniper/research?${new URLSearchParams({itemId:selectedDeal.listing.id})}` : null);
  const [modalPerspective, setModalPerspective] = useState<
    "all" | "matrix" | "investopedia" | "learn" | "video" | "financial" | "chart" | "census" | "lore" | "gcd" | "signature"
  >("all");
  const [showPlansModal, setShowPlansModal] = useState<boolean>(false);
  const showSalesChart = Boolean(selectedDeal);
  useEffect(() => { setModalPerspective("all"); }, [selectedDeal?.listing.id]);
  const fullResearch = true; // every lot opens with all of its research; nothing is held back for lots about to close

  const profile: SniperFilterProfile = useMemo(
    () => ({
      requireIntrinsicEvidence: true,
      maxAllInBudget: maxBudget,
      minAllInCost: minAllInCost,
      eras: selectedEras,
      sources: selectedSources,
      minGrade,
      maxGrade,
      editions: ["all"],
      minDiscountPercent: minDiscount,
      minHistoricalSalesCount: 1,
      requireProvenSales,
      requireImage,
      requireCheckedCert,
      crackAndPressCandidate: crackAndPress,
      damagedSlab98: damagedSlab98,
      crackedCasesOnly,
      misspelledOnly,
      signedLegendary: signedLegendary,
      belowGradingCost: belowGradingCost,
      requireDoubleUpOnly,
      maxSecondsRemaining: maxUrgencySeconds ?? undefined,
      seriesWhitelist: seriesFilter ? [seriesFilter] : undefined,
    }),
    [
      maxBudget,
      minAllInCost,
      selectedEras,
      selectedSources,
      minGrade,
      maxGrade,
      minDiscount,
      requireProvenSales,
      requireImage,
      requireCheckedCert,
      crackAndPress,
      damagedSlab98,
      crackedCasesOnly,
      misspelledOnly,
      signedLegendary,
      belowGradingCost,
      requireDoubleUpOnly,
      maxUrgencySeconds,
      seriesFilter,
    ]
  );

  const inspectedDeal=useMemo(()=>{
    if(!selectedDeal)return null;
    const evidence=lotUnderwriting(lotResearch.data);
    return evaluateAuctionListing({...selectedDeal.listing,censusTotal:evidence.census?.total,censusCount98:evidence.census?.atGrade,censusHigher:evidence.census?.higher},
      {...profile,requireProvenSales:false,requireDoubleUpOnly:false,minDiscountPercent:0},evidence);
  },[selectedDeal,lotResearch.data,profile]);

  // Evaluate All Real Live Auctions
  const evaluations = useMemo(() => {
    return auctionsList.map((auction) => evaluateAuctionListing(auction, profile));
  }, [auctionsList, profile]);

  // Separate Approved vs Rejected
  const rawApprovedDeals = useMemo(
    () => balanceAuctionSites(evaluations.filter((e) => e.passed),e=>e.listing.source),
    [evaluations]
  );
  const rejectedDeals = useMemo(
    () => evaluations.filter((e) => !e.passed),
    [evaluations]
  );

  // Filter approved by strategy tabs
  const approvedDeals = useMemo(() => {
    return rawApprovedDeals.filter((deal) => {
      if (requireDoubleUpOnly && deal.netRoiPercent < 100) return false;

      if (strategyTab === "ALL") return true;
      if (strategyTab === "BUY_IT_NOW") return Boolean(deal.isBuyItNow);
      if (strategyTab === "AUCTIONS_ONLY") return !deal.isBuyItNow;
      if (strategyTab === "DOUBLE_UP") return deal.netRoiPercent >= 100;
      if (strategyTab === "CRACKED_CASE") return Boolean(deal.isCrackedCase || deal.specialPlay === "CRACKED_CASE" || deal.specialPlay === "REHOLDER_ARBITRAGE" || deal.specialPlay === "DAMAGED_HOLDER" || /crack|scuff|reholder|damaged|shell/i.test(deal.listing.title) || /crack|scuff|reholder|damaged|shell/i.test(deal.listing.itemDescription || ""));
      if (strategyTab === "MISSPELLED") return Boolean(deal.isMisspelled || deal.specialPlay === "MISSPELLED_KEY" || /spidre|avenegr|batamn|wovlerine|thng/i.test(deal.listing.title));
      if (strategyTab === "MANGA") return Boolean(/akira|dragon ball|one piece|ghost in the shell|nausica[aä]|naruto|bleach|manga/i.test(deal.listing.title) || /manga/i.test(deal.resolvedSeries) || /kodansha|viz|shueisha/i.test(deal.gcdMetadata?.publisher || ""));
      if (strategyTab === "OTHER_PUBS") return Boolean(/dc|image|dark horse|boom|idw|2000 ad|valiant|dynamite|top cow|lev gleason/i.test(deal.gcdMetadata?.publisher || "") || /spawn|hellboy|walking dead|tmnt|saga|sandman|watchmen|judge dredd|daredevil comics/i.test(deal.listing.title));
      if (strategyTab === "PLACEHOLDER_85") return Boolean(deal.resolvedGrade !== null && deal.resolvedGrade <= 9.2 && deal.resolvedGrade >= 8.5);
      if (strategyTab === "CPV") return Boolean(deal.listing.isCanadianPriceVariant || deal.specialPlay === "CANADIAN_PRICE_VARIANT" || /canadian|cpv|75¢|95¢|\$1\.00|alpha flight|canuck/i.test(deal.listing.title));
      if (strategyTab === "FOREIGN") return Boolean(deal.listing.isForeignLanguageEdition || deal.specialPlay === "FOREIGN_LANGUAGE_KEY" || (deal.listing.currency && deal.listing.currency !== "USD") || /\b(?:french|german|uk\s*edition|editions?\s*lug|special\s*strange|semic|2000\s*ad|captain\s*britain|topolino)\b/i.test(deal.listing.title) || deal.listing.source.includes("ebay_"));
      if (strategyTab === "STUMBLED") return deal.specialPlay === "STUMBLED_INTO_GREATNESS";
      if (strategyTab === "CRACK_PRESS") return deal.specialPlay === "CRACK_AND_PRESS";
      if (strategyTab === "BELOW_COST") return deal.specialPlay === "BELOW_GRADING_COST" || deal.allInCost <= 45;
      if (strategyTab === "REHOLDER") return Boolean(deal.specialPlay === "REHOLDER_ARBITRAGE" || deal.specialPlay === "DAMAGED_HOLDER" || deal.isCrackedCase || /reholder|crack|damaged/i.test(deal.listing.title));
      return true;
    });
  }, [rawApprovedDeals, strategyTab, requireDoubleUpOnly]);

  // Live deals strictly have ticking countdown > 0 seconds
  const liveDeals = useMemo(() => {
    return approvedDeals.filter((deal) => {
      const liveSecs = liveAuctionTimers[deal.listing.id] ?? deal.listing.secondsRemaining;
      return liveSecs > 0;
    });
  }, [approvedDeals, liveAuctionTimers]);

  // Paper trading: open the lot so the ticket (arm a snipe on an auction, or haggle on a Buy It Now) is in front of the player.
  const executePaperSnipe = (deal: CandidateEvaluation) => {
    startTransition(() => setInspectedDeal(deal));
  };

  const formatTime = (secs: number) => {
    if (secs <= 0) return "EXPIRED";
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s < 10 ? "0" : ""}${s}s`;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  // PASSWORD GATE SCREEN
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center text-slate-400 font-mono text-sm">
        Verifying security clearance...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0E131F] border border-amber-500/40 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-cyan-500" />
          <div className="text-center space-y-2 mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-2xl mb-1">
              ⚡
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase">
              DEAL RADAR &amp; MICROWAVE SNIPER
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Live Real-Time Arbitrage Engine • Restricted Access
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 font-semibold mb-1.5">
                Owner Access Passcode
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter access code..."
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError(null);
                  }}
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-200 font-mono"
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
              {passwordError && (
                <p className="text-xs text-rose-400 font-mono mt-1.5 flex items-center gap-1">
                  <span>⚠️</span> {passwordError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm uppercase tracking-wider transition shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              Unlock Real-Time Sniper
            </button>
          </form>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {snipeSuccessToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border-2 border-emerald-400 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <span className="text-xl">🎯</span>
          <span className="text-xs font-mono font-medium">{snipeSuccessToast}</span>
        </div>
      )}

      {researchBeta && <section className="max-w-7xl w-full mx-auto px-4 py-5 space-y-3">
        <div><p className="text-[10px] font-mono tracking-[0.2em] text-cyan-400 uppercase">Two-comic research beta</p><h2 className="text-xl font-semibold mt-1">Live listing. Complete research.</h2><p className="text-xs text-slate-400 mt-1">Choose a comic to open its sales chart, story, characters, wiki, glossary and learning material.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">{evaluations.map(deal => <button key={deal.listing.id} onClick={() => setInspectedDeal(deal)} className="text-left flex gap-4 rounded-xl border border-cyan-500/25 bg-[#0E131F] p-4 hover:border-cyan-400 transition">
          <img src={deal.listing.imageUrl} alt={deal.listing.title} className="w-16 h-24 object-contain rounded bg-black" />
          <span className="flex flex-col justify-center"><strong className="text-base text-white">{deal.resolvedSeries} #{deal.resolvedIssue}</strong><span className="text-xs text-cyan-300 mt-1">{deal.gradingCompany} {deal.resolvedGrade} · {deal.listing.isBuyItNow ? "Buy It Now" : "Live auction"}</span><span className="text-xs text-slate-400 mt-2">Open complete research ↗</span></span>
        </button>)}</div>
        {isLoadingLive && <p className="text-xs text-slate-400">Loading the two live listings…</p>}
      </section>}
      {/* TOP HEADER / NAVIGATION */}
      <header className="border-b border-slate-800 bg-[#0E131F]/90 backdrop-blur relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-black text-lg">⚡</span>
              <div>
                <h1 className="text-sm font-black tracking-wider text-white uppercase flex items-center gap-2">
                  <span>PANEL PROFITS</span>
                  <span className="text-slate-500 font-light">•</span>
                  <span className="text-amber-400">DEAL RADAR &amp; MICROWAVE SNIPER</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span className={auctionsList.length ? "text-emerald-300 font-bold" : "text-amber-300 font-bold"}>
                    {auctionsList.length ? "LIVE MULTI-VENUE FEED" : "NO LIVE LISTINGS"}
                  </span>
                  <span>•</span>
                  <span>{auctionsList.length} live graded lots</span>
                  {dataAsOf && <span>(updated {Math.max(0, Math.round((Date.now() - new Date(dataAsOf).getTime()) / 60000))}m ago)</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a href={researchBeta ? "/sniper" : "/sniper?beta=research"} className="text-xs rounded-lg border border-emerald-500/40 px-3 py-1.5 text-emerald-300 hover:bg-emerald-950/40">{researchBeta ? "Full radar" : "Two-comic research beta"}</a>
            <button
              onClick={() => { void fetchLiveAuctions(true); void desk.act({action:"refresh"}); }}
              disabled={isLoadingLive}
              className="text-xs font-mono bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400 text-cyan-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition font-bold cursor-pointer"
            >
              <span>🔄</span>
              <span>{isLoadingLive ? "Syncing Live..." : "Refresh Live Stream"}</span>
            </button>

            <div className="bg-slate-900/90 border border-emerald-500/40 px-3 py-1 rounded-lg text-right font-mono">
              <div className="text-[10px] text-slate-400 uppercase">Sniper cash · reserved</div>
              <div className="text-xs font-bold text-emerald-400">{desk.game ? `S$${desk.game.account.available.toLocaleString()} · S$${desk.game.account.reserved.toLocaleString()}` : "Loading account…"}</div>
            </div>

            <button
              onClick={() => setShowManual(!showManual)}
              className="text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              {showManual ? "Close Manual" : "📖 Sniper Guide"}
            </button>

            <button
              onClick={() => setShowPlansModal(true)}
              className="text-xs font-mono bg-purple-950/80 hover:bg-purple-900 border border-purple-500/60 text-purple-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition font-bold cursor-pointer"
            >
              <span>💎</span>
              <span>Plans &amp; Tier Access</span>
            </button>

            <button
              onClick={handleLock}
              className="text-xs font-mono bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 px-2.5 py-1.5 rounded-lg border border-rose-800/80 transition flex items-center gap-1"
            >
              <span>🔒</span> Lock
            </button>
          </div>
        </div>
      </header>

      {desk.error && <div role="alert" className="mx-auto w-full max-w-7xl px-4 pt-3 text-xs text-rose-300">{desk.error} <button onClick={() => void desk.load()} className="ml-2 underline">Retry account</button></div>}
      {liveError && <div role="alert" className="mx-auto w-full max-w-7xl px-4 pt-3 text-xs text-amber-300">{liveError} <button onClick={() => void fetchLiveAuctions()} className="ml-2 underline">Retry saved listings</button></div>}
      {/* FIELD MANUAL ACCORDION DRAWER */}
      {showManual && (
        <section className="bg-[#0A0D14] border-b border-amber-500/30 p-5 animate-in slide-in-from-top duration-200">
          <div className="max-w-7xl mx-auto space-y-4 text-xs text-slate-300 font-mono">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold uppercase text-amber-400 flex items-center gap-2">
                <span>📖</span> Field Manual: Operating the Live Radar
              </h3>
              <button
                onClick={() => setShowManual(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <strong className="text-white block mb-1 text-amber-300">1. Real Live Stream (Zero Hardcoding)</strong>
                <p className="text-slate-400 leading-relaxed">
                  Every listing below comes from live venue catalogs (ComicConnect, Metropolis Collectibles, Hake&apos;s Auctions, and eBay Browse API) with its real end time and price. Nothing is hard-coded or simulated.
                </p>
              </div>
              <div>
                <strong className="text-white block mb-1 text-cyan-300">2. Comic value before grading premiums</strong>
                <p className="text-slate-400 leading-relaxed">
                  Each offered book must have a stored raw comic value of at least $17, above its original cover price, and a slab grade of 8.5 or better. Bid prices, grading costs and potential returns do not establish eligibility.
                </p>
              </div>
              <div>
                <strong className="text-white block mb-1 text-emerald-300">3. Microwave Execution</strong>
                <p className="text-slate-400 leading-relaxed">
                  Auctions ending in under 15 minutes are in the microwave snipe zone. Practice auction decisions with Sniper dollars. No bids are sent to a venue.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* MAIN LAYOUT: TWO COLUMNS (MATCHING EXACT CANONICAL SCREENSHOT) */}
      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 w-full">
        {/* LEFT COLUMN: THE STRATEGY & TARGETING CONTROLS */}
        <div className="lg:col-span-1 space-y-5 bg-[#0E131F] border border-slate-800 rounded-xl p-4 h-fit shadow-xl">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-3">
              <span>🎯</span> Targeting Matrix
            </h2>

            {/* 1. URGENCY WINDOW (MICROWAVE SNIPE) */}
            <div className="space-y-1.5 mb-5">
              <label className="text-xs font-semibold text-slate-300 uppercase flex items-center justify-between">
                <span>Urgency Window</span>
                <span className="text-[10px] text-emerald-400 font-mono">Microwave Killzones</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "⚡ < 1m Snipe", val: 60 },
                  { label: "🔥 < 2m Red Hot", val: 120 },
                  { label: "⏱ < 5m Closing", val: 300 },
                  { label: "⏳ < 10m Micro", val: 600 },
                  { label: "🎯 < 15m On Deck", val: 900 },
                  { label: "📡 < 30m Radar", val: 1800 },
                  { label: "Any Time", val: null },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMaxUrgencySeconds(item.val)}
                    className={`text-[11px] py-1.5 px-2 rounded font-mono font-bold border transition text-center ${
                      maxUrgencySeconds === item.val
                        ? "bg-rose-950 border-rose-500 text-rose-300 shadow-sm ring-1 ring-rose-500"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. AUCTION SUITES */}
            <div className="space-y-1.5 mb-5">
              <label className="text-xs font-semibold text-slate-300 uppercase">Auction Suites</label>
              <div className="space-y-1">
                {ALL_AUCTION_SUITES.map((src) => {
                  const status = venueStatus(src.key, auctionsList.filter(a => a.source === src.key).length, venueFetches);
                  const feedLive = status.selectable;
                  const isChecked = feedLive && selectedSources.includes(src.key);
                  return (
                    <label
                      key={src.key}
                      title={status.detail}
                      className={`flex items-center justify-between text-xs p-2 rounded bg-slate-900/60 border border-slate-800/80 ${feedLive ? "cursor-pointer hover:bg-slate-850" : "opacity-50 cursor-not-allowed"}`}
                    >
                      <span className="text-slate-300 pr-2">{src.label}<span className={`block mt-0.5 text-[10px] ${status.count ? "text-emerald-400" : "text-slate-500"}`}>{status.label}</span></span>
                      <input
                        type="checkbox"
                        disabled={!feedLive}
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedSources(selectedSources.filter((s) => s !== src.key));
                          } else {
                            setSelectedSources([...selectedSources, src.key]);
                          }
                        }}
                        className="rounded accent-amber-500"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3. TARGET ERAS (9 ERAS + INDY) */}
            <div className="space-y-1.5 mb-5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300 uppercase">Target Eras (9 Eras + Indy)</label>
                <button
                  onClick={() => {
                    if (selectedEras.length === ALL_CANONICAL_ERAS.length) {
                      setSelectedEras(["modern", "bronze", "silver"]);
                    } else {
                      setSelectedEras(ALL_CANONICAL_ERAS);
                    }
                  }}
                  className="text-[10px] text-amber-400 hover:underline font-mono"
                >
                  {selectedEras.length === ALL_CANONICAL_ERAS.length ? "Reset" : "Select All"}
                </button>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {ALL_CANONICAL_ERAS.map((era) => {
                  const isSelected = selectedEras.includes(era);
                  return (
                    <button
                      key={era}
                      onClick={() => {
                        if (isSelected) {
                          if (selectedEras.length > 1) {
                            setSelectedEras(selectedEras.filter((e) => e !== era));
                          }
                        } else {
                          setSelectedEras([...selectedEras, era]);
                        }
                      }}
                      className={`w-full text-left text-xs py-1.5 px-2.5 rounded font-mono transition flex justify-between items-center border ${
                        isSelected
                          ? "bg-amber-950/40 border-amber-500/40 text-amber-300 font-bold"
                          : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <span>{getEraDisplayName(era)}</span>
                      {isSelected && <span className="text-[10px] text-amber-400">ACTIVE</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. MINIMUM GRADE SCALE */}
            <div className="space-y-1.5 mb-5">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-slate-300 uppercase">Minimum Grade</label>
                <span className="font-mono text-emerald-400 font-bold">{minGrade.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="8.5"
                max="10.0"
                step="0.1"
                value={minGrade}
                onChange={(e) => setMinGrade(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>8.5 minimum</span>
                <span>9.0</span>
                <span>9.4 (Key)</span>
                <span>9.6</span>
                <span>9.8 (Mint)</span>
                <span>10.0</span>
              </div>
            </div>

            {/* 5. INVESTMENT BUDGET: $0 Floor to Sub-$1,500 Focus */}
            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-slate-300 uppercase">Investment Range</label>
                <span className="font-mono text-amber-400 font-bold">${minAllInCost} - ${maxBudget}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Floor: ${minAllInCost}</span>
                  <span>Ceiling: ${maxBudget}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1500"
                  step="10"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-slate-800"
                />
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {[50, 150, 300, 500, 1500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setMaxBudget(amt)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      maxBudget === amt
                        ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                        : "bg-slate-900 border-slate-800 text-slate-500"
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-800/80">
                <label className="flex items-center gap-2 text-xs text-purple-300 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={requireDoubleUpOnly}
                    onChange={(e) => setRequireDoubleUpOnly(e.target.checked)}
                    className="rounded accent-purple-500"
                  />
                  <span>⚡ 100%+ Double-Ups Only</span>
                </label>
              </div>
            </div>

            {/* 6. SERIES FOCUS FILTER */}
            <div className="space-y-1.5 mb-5">
              <label className="text-xs font-semibold text-slate-300 uppercase">Series / Character Focus</label>
              <input
                type="text"
                placeholder="e.g. Spider-Man, Batman, Hulk..."
                value={seriesFilter}
                onChange={(e) => setSeriesFilter(e.target.value)}
                className="w-full text-xs bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* VIABILITY & IMPULSE PROTECTION */}
          <div className="border-t border-slate-800 pt-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <span>🛡️</span> Viability &amp; Impulse Protection
            </h3>

            <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={requireImage}
                onChange={(e) => setRequireImage(e.target.checked)}
                className="mt-0.5 rounded accent-cyan-500"
              />
              <span>Authentic Image Guard (Only verified photos)</span>
            </label>

            <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={requireCheckedCert}
                onChange={(e) => setRequireCheckedCert(e.target.checked)}
                className="mt-0.5 rounded accent-amber-500"
              />
              <span>Strict Checked Cert Registry Only</span>
            </label>

            <div className="space-y-1 pt-1.5">
              <div className="flex justify-between text-slate-300 text-xs">
                <span>Min. Discount Threshold</span>
                <span className="font-mono text-emerald-400 font-bold">{minDiscount}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={minDiscount}
                onChange={(e) => setMinDiscount(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800"
              />
            </div>
          </div>
            {/* SPECIAL ARBITRAGE ANGLES */}
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>🔍</span> Special Arbitrage Angles
              </h3>

              <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={crackedCasesOnly}
                  onChange={(e) => setCrackedCasesOnly(e.target.checked)}
                  className="mt-0.5 rounded accent-amber-500"
                />
                <span>🔨 Cracked Cases ($25 Reholder Flips)</span>
              </label>

              <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={misspelledOnly}
                  onChange={(e) => setMisspelledOnly(e.target.checked)}
                  className="mt-0.5 rounded accent-purple-500"
                />
                <span>🕵️ Misspelled Sleepers (Zero-Bid Typos)</span>
              </label>
            </div>
          </div>

        {/* RIGHT COLUMN: 3 PRIMARY VIEWS & ACTIVE EXECUTION */}
        <div className="lg:col-span-3 space-y-6">
          {/* 3 PRIMARY SECTION SWITCHERS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#0E131F] border border-slate-800 p-2 rounded-xl">
            <button
              onClick={() => setViewMode("LIVE")}
              className={`py-2.5 px-4 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                viewMode === "LIVE"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping inline-block" />
              <span>🔴 LIVE RADAR ({liveDeals.length})</span>
            </button>

            <button
              onClick={() => setViewMode("MISSED")}
              className={`py-2.5 px-4 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                viewMode === "MISSED"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              <span>⏰</span>
              <span>WHAT YOU MISSED ({desk.game?.rounds.filter(r => r.result?.outcome === "outbid").length ?? 0})</span>
            </button>

            <button
              onClick={() => setViewMode("ACQUIRED")}
              className={`py-2.5 px-4 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                viewMode === "ACQUIRED"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              <span>🏆</span>
              <span>WHAT YOU&apos;VE ACQUIRED ({desk.game?.rounds.filter(r => r.asset && !r.asset.soldAt).length ?? 0})</span>
            </button>
          </div>

          {/* VIEW 1: LIVE RADAR AUCTIONS */}
          {viewMode === "LIVE" && (
            <div className="space-y-6">
              {/* COMMERCIAL STRATEGY FILTER TABS */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#0E131F] border border-slate-800 p-2 rounded-xl">
                {[
                  { id: "ALL", label: `All Viable Deals (${liveDeals.length})` },
                  { id: "BUY_IT_NOW", label: "🏷️ Buy It Now Sensible" },
                  { id: "AUCTIONS_ONLY", label: "⚡ Live Auctions" },
                  { id: "DOUBLE_UP", label: "🔥 100%+ Double-Ups" },
                  { id: "CRACKED_CASE", label: "🔨 Cracked Cases ($25 Reholder)" },
                  { id: "MISSPELLED", label: "🕵️ Misspelled Sleepers" },
                  { id: "MANGA", label: "🗾 Manga Single Issues" },
                  { id: "OTHER_PUBS", label: "📚 DC / Image / Dark Horse / Boom!" },
                  { id: "PLACEHOLDER_85", label: "🎯 8.5+ Set Placeholders" },
                  { id: "CPV", label: "🇨🇦 CPVs & Canadian Keys" },
                  { id: "FOREIGN", label: "🌍 Foreign Keys (UK / FR / DE)" },
                  { id: "STUMBLED", label: "🚀 Stumbled Into Greatness" },
                  { id: "CRACK_PRESS", label: "🔧 Crack & Press" },
                  { id: "BELOW_COST", label: "⚡ Sunk Cost (<$45 Slabs)" },
                  { id: "REHOLDER", label: "🛡️ Reholder Arbitrage" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStrategyTab(tab.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                      strategyTab === tab.id
                        ? "bg-amber-500 text-slate-950 font-bold shadow"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <h2 className="text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <span>⚡</span> Live Active Ending Auctions ({liveDeals.length})
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  Filtered {auctionsList.length} live auctions • {rejectedDeals.length} rejected by Anti-Bullshit
                </span>
              </div>

              <p className="text-xs text-slate-400">Equal allocation by auction site · Grade 8.5+ · Recorded raw comic value ≥ $17 and above original cover price. Additional filters can reduce the available selection.</p>

              <details className="rounded-xl border border-slate-800 bg-[#0E131F] p-4" open={desk.game?.rounds.some(r => r.status === "bidding" || r.status === "awaiting_result") || undefined}>
                <summary className="cursor-pointer text-xs font-bold font-mono uppercase text-amber-300">Paper desk · committed bids &amp; waiting practice lots</summary>
                <div className="mt-4"><SniperGame desk={desk} view="rounds" /></div>
              </details>
              {/* APPROVED LIVE CARDS */}
              {liveDeals.length === 0 ? (
                <div className="bg-[#0E131F] border border-slate-800 rounded-xl p-8 text-center text-slate-400 space-y-3">
                  <p>
                    {isLoadingLive
                      ? "Connecting to live auction firehose..."
                      : `No active ending auctions currently match strategy angle '${strategyTab}'.`}
                  </p>
                  <button
                    onClick={() => { void fetchLiveAuctions(true); void desk.act({action:"refresh"}); }}
                    className="text-xs font-mono bg-cyan-950 hover:bg-cyan-900 border border-cyan-400 text-cyan-300 px-4 py-2 rounded-lg font-bold transition inline-flex items-center gap-2"
                  >
                    <span>🔄</span>
                    <span>Sync Fresh Ending Auctions</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {liveDeals.slice(0, liveShown).map((deal) => {
                    const liveSecs = liveAuctionTimers[deal.listing.id] ?? deal.listing.secondsRemaining;
                    const isBreakdownOpen = expandedBreakdownId === deal.listing.id;

                    const isPre1975 =
                      deal.resolvedEra === "silver" ||
                      deal.resolvedEra === "golden" ||
                      deal.resolvedEra === "atomic" ||
                      deal.resolvedEra === "platinum";
                    const baseGradingFee = isPre1975 ? 45.0 : 30.0;
                    const sigCount = deal.isYellowLabel
                      ? deal.listing.title.toLowerCase().includes("quad")
                        ? 4
                        : 1
                      : 0;
                    const sigFee = sigCount > 0 ? 30.0 + Math.max(0, sigCount - 1) * 25.0 : 0;
                    const gradingFreight = 18.0;
                    const totalSubmitterSunk = baseGradingFee + sigFee + gradingFreight;
                    const estPlatformCut = Math.round(deal.anchorFmv * 0.13 * 100) / 100;
                    const estNetAtExit = Math.round((deal.anchorFmv - estPlatformCut - 5.0) * 100) / 100;

                    return (
                      <div
                        key={deal.listing.id}
                        className="bg-[#0E131F] border border-emerald-500/30 hover:border-emerald-500/60 transition rounded-xl p-5 flex flex-col md:flex-row gap-5 items-start relative overflow-hidden shadow-lg"
                      >
                        {/* Slab Encasement & Real-Time Price Underneath (Left Side) */}
                        <div className="flex-shrink-0 mx-auto md:mx-0 flex flex-col items-center w-full md:w-80 sm:md:w-84 max-w-[340px]">
                          <SlabEncasement
                            gradingCompany={deal.gradingCompany}
                            grade={deal.resolvedGrade}
                            title={deal.normalizedTitle || deal.listing.title}
                            issueNumber={deal.resolvedIssue}
                            publisher={deal.gcdMetadata?.publisher}
                            year={deal.resolvedYear}
                            era={deal.resolvedEra}
                            certNumber={deal.certNumber}
                            pageQuality={deal.label?.pageQuality || undefined}
                            isYellowLabel={deal.isYellowLabel}
                            signatureDetails={deal.signerName}
                            keyComments={deal.keySignificanceNote}
                            imageUrl={deal.listing.imageUrl}
                            galleryImages={deal.galleryImages}
                            size="md"
                            onClick={() => startTransition(() => setInspectedDeal(deal))}
                          />

                          {/* Real-Time Live Bid / Buy It Now Price Placed Directly Underneath the Comic Image */}
                          <div className="w-full mt-2.5 rounded-xl border border-slate-700/80 bg-gradient-to-b from-slate-900/95 via-black to-slate-950 p-3 shadow-xl backdrop-blur-md">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-bold uppercase tracking-wider text-[9px]">
                                  {formatVenueName(deal.listing.source)}
                                </span>
                                {deal.isBuyItNow ? (
                                  <>
                                    <span>🏷️</span> BUY IT NOW
                                  </>
                                ) : (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                                    <span className="text-emerald-400 font-black">{deal.listing.bidKind === "starting" ? "STARTING BID" : "LIVE BID"}</span>
                                  </>
                                )}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {deal.isBuyItNow ? "Fixed Price" : `${deal.listing.bidCount ?? 1} bids`}
                              </span>
                            </div>

                            <div className="pt-2 flex items-baseline justify-between">
                              <div className="text-2xl sm:text-3xl font-mono font-black tracking-tight text-white flex items-baseline gap-1">
                                <span className={deal.isBuyItNow ? "text-amber-400" : "text-emerald-400"}>
                                  ${deal.isBuyItNow ? (deal.buyItNowPrice ?? deal.listing.currentBid).toFixed(2) : deal.listing.currentBid.toFixed(2)}
                                </span>
                                <span className="text-[10px] font-normal text-slate-500 uppercase">USD</span>
                              </div>

                              <div className="text-right font-mono">
                                <div className="text-[10px] text-slate-400">
                                  {deal.listing.shippingKnown === false ? "Shipping not published" : deal.listing.shippingCost && deal.listing.shippingCost > 0
                                    ? `+$${deal.listing.shippingCost.toFixed(2)} s/h`
                                    : "Free Shipping"}
                                </div>
                                <div className="text-[11px] font-bold text-cyan-400">
                                  {deal.listing.timeLeftStr || "Ending soon"}
                                </div>
                              </div>
                            </div>

                            {/* Spread / Upside Under Bid */}
                            {deal.anchorFmv > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                                <span className="text-slate-400">
                                  FMV: <strong className="text-slate-200">${deal.anchorFmv.toFixed(0)}</strong>
                                </span>
                                {deal.discountPercent > 0 ? (
                                  <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                                    {deal.discountPercent}% Under FMV
                                  </span>
                                ) : deal.isBuyItNow ? (
                                  <span className="text-amber-400 font-bold bg-amber-950/60 border border-amber-500/40 px-1.5 py-0.5 rounded">
                                    Sensible BIN
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Details & Dossier (Info Side) */}
                        <div className="flex-1 space-y-3.5 w-full">
                          {deal.listing.eligibility && <p className="text-xs text-cyan-200">Raw comic value: ${deal.listing.eligibility.intrinsicValue.toFixed(2)} · Original cover: ${deal.listing.eligibility.coverPrice.toFixed(2)} <span className="text-slate-500">· Recorded {deal.listing.eligibility.observedAt}</span></p>}
                          <div>
                            {/* Top Header Row with Countdown Ticker pinned on right away from comic */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase">
                                  {deal.listing.source}
                                </span>
                                <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
                                  {deal.gradingCompany} {deal.resolvedGrade.toFixed(1)}
                                </span>
                                <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded">
                                  {getEraDisplayName(deal.resolvedEra)}
                                </span>
                                {deal.isBuyItNow ? (
                                  <span className="text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/50 px-2.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                    🏷️ BUY IT NOW: ${(deal.buyItNowPrice ?? deal.listing.currentBid).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 px-2.5 py-0.5 rounded flex items-center gap-1.5 shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                                    ⚡ {deal.listing.bidKind === "starting" ? "STARTING BID" : "LIVE BID"}: ${deal.listing.currentBid.toFixed(2)} ({deal.listing.bidCount ?? 1} bids)
                                  </span>
                                )}
                                {deal.isCrackedCase || deal.specialPlay === "DAMAGED_HOLDER" ? (
                                  <span className="text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50 px-2 py-0.5 rounded flex items-center gap-1">
                                    🔨 DAMAGED HOLDER ($25 REHOLDER PLAY)
                                  </span>
                                ) : null}
                                {deal.isMisspelled && (
                                  <span className="text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/50 px-2 py-0.5 rounded flex items-center gap-1">
                                    🕵️ MISSPELLED SLEEPER
                                  </span>
                                )}
                                {(deal.listing.isCanadianPriceVariant || deal.specialPlay === "CANADIAN_PRICE_VARIANT") && (
                                  <span className="text-xs font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/50 px-2 py-0.5 rounded flex items-center gap-1">
                                    🇨🇦 CANADIAN PRICE VARIANT (CPV)
                                  </span>
                                )}
                                {(deal.listing.isForeignLanguageEdition || deal.specialPlay === "FOREIGN_LANGUAGE_KEY") && (
                                  <span className="text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/50 px-2 py-0.5 rounded flex items-center gap-1">
                                    🌍 FOREIGN LANGUAGE KEY
                                  </span>
                                )}
                                {deal.listing.currency && deal.listing.currency !== "USD" && (
                                  <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 rounded flex items-center gap-1">
                                    💱 {deal.listing.originalCurrencySymbol || ""}{deal.listing.originalBid?.toFixed(2)} {deal.listing.currency} → ${deal.listing.currentBid?.toFixed(2)} USD (@ {deal.listing.exchangeRateToUsd})
                                  </span>
                                )}
                                {deal.specialPlay && !deal.isCrackedCase && !deal.isMisspelled && deal.specialPlay !== "DAMAGED_HOLDER" && deal.specialPlay !== "CANADIAN_PRICE_VARIANT" && deal.specialPlay !== "FOREIGN_LANGUAGE_KEY" && (
                                  <span className="text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded">
                                    {deal.specialPlay.replace(/_/g, " ")}
                                  </span>
                                )}
                              </div>

                              {/* COUNTDOWN TIMER / BUY IT NOW BADGE & VIEW BIGGER PINNED ON FAR RIGHT */}
                              <div className="flex items-center gap-2">
                                {deal.isBuyItNow ? (
                                  <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-950/90 border border-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.35)]">
                                    <span className="font-mono text-xs font-black tracking-wider text-amber-300">
                                      🏷️ FIXED PRICE · IMMEDIATE
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-black/95 border border-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.45)]">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                                    <span className="font-mono text-xs font-black tracking-wider text-emerald-300">
                                      ⏳ {formatTime(liveSecs)} left
                                    </span>
                                  </div>
                                )}
                                <button
                                  onClick={() => setInspectedDeal(deal)}
                                  className="text-xs font-mono font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400 px-2.5 py-1 rounded transition shadow-[0_0_10px_rgba(34,211,238,0.3)] flex items-center gap-1 cursor-pointer"
                                  title="Click for larger front view"
                                >
                                  <span>🔍</span>
                                  <span>View Bigger</span>
                                </button>
                              </div>
                            </div>

                            {/* Normalized Title (Clean & Canonical) */}
                            <h3 className="text-lg font-bold text-white mt-2 leading-snug hover:text-amber-300 transition">
                              <a
                                href={deal.listing.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5"
                              >
                                <span>{deal.normalizedTitle || deal.listing.title}</span>
                                <span className="text-xs text-amber-400">↗</span>
                              </a>
                            </h3>
                            {/* Raw Listing Subtitle */}
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Raw Auction Title: &quot;{deal.listing.title}&quot;
                            </p>

                            {/* Foreign Language English Translation Note */}
                            {deal.listing.translatedTitle && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-xs font-mono bg-blue-950/60 border border-blue-500/40 text-blue-200 px-2.5 py-1 rounded w-fit">
                                <span className="text-blue-400 font-bold">🌍 English Translation:</span>
                                <span className="font-bold text-white">&quot;{deal.listing.translatedTitle}&quot;</span>
                                <span className="text-[10px] text-blue-300">({deal.listing.internationalRegion?.toUpperCase()} Edition)</span>
                              </div>
                            )}

                            {/* Landmark Key Note */}
                            {deal.keySignificanceNote && (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <span className="text-[10px] uppercase font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
                                  ⭐ {deal.keySignificanceNote}
                                </span>
                              </div>
                            )}

                            {/* Apples-to-Apples Cert Number Verification */}
                            {deal.certNumber && (
                              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 px-2.5 py-0.5 rounded font-bold">
                                  🍎 Apples-to-Apples Cert #{deal.certNumber}
                                </span>
                                {deal.certVerificationUrl && (
                                  <a
                                    href={deal.certVerificationUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline"
                                  >
                                    Verify on {deal.gradingCompany} Registry ↗
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          {/* DEDICATED BOOK VALUE & CENSUS DOSSIER */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs font-mono">
                            {/* Valuation & Provenance */}
                            <div className="space-y-1 md:border-r md:border-slate-800/80 md:pr-3">
                              <div className="text-[10px] text-cyan-400 font-bold uppercase flex items-center justify-between">
                                <span>📊 Verified Fair Market Value (FMV)</span>
                                <span className="text-white font-black text-sm">
                                  {deal.anchorFmv > 0 ? `$${deal.anchorFmv.toFixed(2)}` : "Unavailable"}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 leading-snug">
                                <strong className="text-slate-300">Where Pricing Info Comes From: </strong>
                                {deal.anchorFmv > 0
                                  ? deal.pricingSourceProvenance ||
                                    "Stored grade-specific reference; open the lot for source evidence"
                                  : "Grade-matched valuation has not been loaded. Open the lot to inspect stored guides and completed sales."}
                              </div>
                            </div>

                            {/* Census Population Breakdown */}
                            <div className="space-y-1 md:pl-1">
                              <div className="text-[10px] text-amber-400 font-bold uppercase flex items-center justify-between">
                                <span>🏛️ {deal.gradingCompany} Census Population</span>
                                <span className="text-slate-200 font-bold">
                                  {deal.censusCount98
                                    ? `${deal.censusCount98.toLocaleString()} in ${deal.resolvedGrade.toFixed(1)}`
                                    : "Grade Pop Audit Pending"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-300">
                                <span>
                                  Total Census:{" "}
                                  <strong className="text-white">
                                    {deal.censusTotal
                                      ? deal.censusTotal.toLocaleString()
                                      : censusMissing(deal.gradingCompany)}
                                  </strong>
                                </span>
                                <span>
                                  Graded Higher:{" "}
                                  <strong className="text-emerald-400">
                                    {deal.censusHigher !== undefined
                                      ? deal.censusHigher === 0
                                        ? "0 (Top of Pop ★)"
                                        : deal.censusHigher.toLocaleString()
                                      : "Audit Pending"}
                                  </strong>
                                </span>
                              </div>
                              <div className="text-[9px] text-emerald-400 font-bold truncate">
                                {deal.censusScarcityTier || (deal.censusTotal ? "Verified Registry Pop" : censusMissing(deal.gradingCompany))}
                              </div>
                            </div>
                          </div>

                          {/* COMMERCIAL FLIPPING MULTIPLIERS (ACQUISITION ALL-IN, DOUBLE-UP 2X, 50% WIN EXIT) */}
                          <div className="bg-slate-900/90 border border-emerald-500/40 p-3 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                            <div>
                              <div className="text-slate-400 text-[10px] uppercase font-bold">
                                Acquisition All-In
                              </div>
                              <div className="text-white font-bold text-sm mt-0.5">
                                ${deal.allInCost.toFixed(2)}
                              </div>
                              <div className={`text-[9px] font-sans font-bold ${deal.anchorFmv > 0 && deal.discountPercent < 0 ? "text-amber-400" : "text-emerald-400"}`}>
                                {deal.anchorFmv > 0
                                  ? deal.discountPercent >= 0
                                    ? `${deal.discountPercent}% below FMV`
                                    : `${Math.abs(deal.discountPercent)}% above FMV`
                                  : "FMV unavailable"}
                              </div>
                            </div>

                            <div>
                              <div className="text-emerald-400 text-[10px] uppercase font-bold flex items-center gap-1">
                                <span>🔥</span> 100% Double-Up Exit
                              </div>
                              <div className="text-emerald-300 font-bold text-sm mt-0.5">
                                ${deal.targetWinPrice100Pct.toFixed(2)}
                              </div>
                              <div className="text-[9px] text-slate-400 font-sans">
                                Net 2x cash after fees
                              </div>
                            </div>

                            <div>
                              <div className="text-cyan-400 text-[10px] uppercase font-bold">
                                50% Win Exit (1.5x)
                              </div>
                              <div className="text-cyan-300 font-bold text-sm mt-0.5">
                                ${deal.targetWinPrice50Pct.toFixed(2)}
                              </div>
                              <div className="text-[9px] text-slate-400 font-sans">
                                Net 50% cash ROI
                              </div>
                            </div>

                            <div>
                              <div className="text-amber-400 text-[10px] uppercase font-bold">
                                Projected Net Flip
                              </div>
                              <div className={`font-bold text-sm mt-0.5 ${deal.anchorFmv > 0 && deal.projectedNetProfit < 0 ? "text-rose-300" : "text-amber-300"}`}>
                                {deal.anchorFmv > 0
                                  ? `${deal.projectedNetProfit >= 0 ? "+" : "−"}$${Math.abs(deal.projectedNetProfit).toFixed(2)}`
                                  : "Unavailable"}
                              </div>
                              <div className={`text-[9px] font-sans font-bold ${deal.anchorFmv > 0 && deal.netRoiPercent < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                {deal.anchorFmv > 0
                                  ? `${deal.netRoiPercent >= 0 ? "+" : ""}${deal.netRoiPercent}% Net Margin`
                                  : "FMV unavailable"}
                              </div>
                            </div>
                          </div>

                          {/* FOR SIGNED BOOKS: SIGNATURE SERIES PRICING DOSSIER */}
                          {deal.isYellowLabel && (
                            <div className="bg-amber-950/20 border border-amber-500/40 rounded-lg p-2.5 text-xs font-mono space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 uppercase">
                                <span className="flex items-center gap-1">
                                  <span>✍️</span> Signature Series Pricing Provenance
                                </span>
                                <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40">
                                  {deal.signaturePremiumMultiplier
                                    ? `${deal.signaturePremiumMultiplier}x Blue Label Multiplier`
                                    : "Witnessed Yellow Label"}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-200">
                                Signer: <strong className="text-white">{deal.signerName || "Witnessed Creator Signature"}</strong>
                              </div>
                              <div className="text-[10px] text-slate-400 leading-snug">
                                <strong className="text-amber-300">Signed Pricing Source: </strong>
                                Valuation is anchored to CGC Signature Series™ realized auction comp archives &amp; witnessed sales indexes against raw/unsigned baselines.
                              </div>
                            </div>
                          )}

                          {/* 1. HISTORICAL SIGNIFICANCE, CGC SLAB NOTES & CREATIVE CREDITS */}
                          {(deal.historicalSignificanceLore ||
                            deal.longTermHoldingThesis ||
                            deal.gcdMetadata?.writers?.length ||
                            deal.gcdMetadata?.pencilers?.length ||
                            deal.gcdMetadata?.coverArtists?.length ||
                            deal.gcdMetadata?.publisher) && (
                            <div className="bg-purple-950/25 border border-purple-500/40 rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-mono font-bold text-purple-300 flex items-center gap-1.5">
                                  <span>🏛️</span> CENSUS LABEL NOTES &amp; COLLECTOR LORE
                                </span>
                                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-500/40">
                                  {deal.historicalSignificanceTier ? deal.historicalSignificanceTier.replace(/_/g, " ") : "CERTIFIED SLAB"}
                                </span>
                              </div>

                              {deal.historicalSignificanceLore && (
                                <p className="text-xs text-purple-100/90 leading-relaxed font-sans">
                                  {deal.historicalSignificanceLore}
                                </p>
                              )}

                              {deal.longTermHoldingThesis && (
                                <div className="pt-1.5 border-t border-purple-500/20 text-[11px] text-purple-200/80">
                                  <strong className="text-purple-300 font-mono">Long-Term Holding Thesis: </strong>
                                  {deal.longTermHoldingThesis}
                                </div>
                              )}

                              {deal.gcdMetadata &&
                                Boolean(
                                  deal.gcdMetadata.writers?.length ||
                                    deal.gcdMetadata.pencilers?.length ||
                                    deal.gcdMetadata.coverArtists?.length ||
                                    deal.gcdMetadata.publisher
                                ) && (
                                  <div className="pt-1 border-t border-purple-500/20 flex flex-wrap items-center gap-3 text-[10px] font-mono text-purple-300/80">
                                    {deal.gcdMetadata.writers && deal.gcdMetadata.writers.length > 0 && (
                                      <span>✍️ Writer: <strong className="text-white">{deal.gcdMetadata.writers.join(", ")}</strong></span>
                                    )}
                                    {deal.gcdMetadata.pencilers && deal.gcdMetadata.pencilers.length > 0 && (
                                      <span>🎨 Art: <strong className="text-white">{deal.gcdMetadata.pencilers.join(", ")}</strong></span>
                                    )}
                                    {deal.gcdMetadata.coverArtists &&
                                      deal.gcdMetadata.coverArtists.length > 0 &&
                                      (!deal.gcdMetadata.pencilers ||
                                        deal.gcdMetadata.coverArtists.join(", ") !== deal.gcdMetadata.pencilers.join(", ")) && (
                                        <span>🖼️ Cover: <strong className="text-white">{deal.gcdMetadata.coverArtists.join(", ")}</strong></span>
                                      )}
                                    {deal.gcdMetadata.publisher && (
                                      <span>🏛️ Publisher: <strong className="text-white">{deal.gcdMetadata.publisher}</strong></span>
                                    )}
                                  </div>
                                )}
                            </div>
                          )}

                          {/* 2. COMMERCIAL ARBITRAGE & VALUE THESIS (THE SPREAD & PLAY) */}
                          <div className="bg-amber-950/20 border border-amber-500/40 rounded-lg p-3">
                            <div className="text-[10px] uppercase font-mono font-bold text-amber-400 flex items-center gap-1.5">
                              <span>💡</span> COMMERCIAL ARBITRAGE &amp; SPREAD THESIS
                            </div>
                            <p className="text-xs text-amber-200/90 mt-1 font-medium leading-relaxed font-sans">
                              {deal.whyItsAGoodBuy}
                            </p>
                          </div>

                          {/* 3. BUY IT NOW SENSIBILITY & UPSIDE THESIS */}
                          {deal.isBuyItNow && deal.buyItNowSensibilityWhy && (
                            <div className="bg-emerald-950/25 border border-emerald-500/40 rounded-lg p-3 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                                  <span>🏷️</span> WHY THIS BUY IT NOW MAKES SENSE (UPSIDE &amp; MARGIN OF SAFETY)
                                </span>
                                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-500/40">
                                  +{deal.netRoiPercent}% NET ROI
                                </span>
                              </div>
                              <p className="text-xs text-emerald-100/90 leading-relaxed font-sans">
                                {deal.buyItNowSensibilityWhy}
                              </p>
                            </div>
                          )}

                          {/* HISTORICAL VERIFIED SOLD COMPS */}
                          <div className="bg-slate-900/50 border border-slate-800 p-2.5 rounded-lg text-xs space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase font-bold">
                              <span>Historical Verified Sold Comps (Recorded sources)</span>
                              <span className="text-emerald-400">
                                Resale time not established
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                              {deal.historicalComps && deal.historicalComps.length > 0 ? (
                                deal.historicalComps.map((c, i) => (
                                  <span
                                    key={i}
                                    className="bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded text-slate-300"
                                  >
                                    {c.venue} <strong>${c.price}</strong> ({c.date})
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 text-xs">
                                  Anchor FMV Comp:{" "}
                                  <strong>{deal.anchorFmv > 0 ? `$${deal.anchorFmv.toFixed(2)}` : "Unavailable"}</strong>
                                </span>
                              )}
                              <span className="text-slate-500 font-sans text-xs">
                                vs. Target Exit{" "}
                                <strong className="text-amber-300 font-mono">
                                  ${deal.targetWinPrice100Pct.toFixed(2)}
                                </strong>
                              </span>
                            </div>
                          </div>

                          {/* THE WHOLE TOMATO ACCORDION */}
                          <div className="border border-slate-800 rounded-lg overflow-hidden">
                            <button
                              onClick={() =>
                                setExpandedBreakdownId(isBreakdownOpen ? null : deal.listing.id)
                              }
                              className="w-full bg-slate-900/90 hover:bg-slate-900 p-2 text-left text-xs font-mono font-bold text-amber-400 flex justify-between items-center transition cursor-pointer"
                            >
                              <span>🍅 THE WHOLE TOMATO COST BREAKDOWN (SLABBING &amp; RESALE ANATOMY)</span>
                              <span className="text-slate-400 font-normal">
                                {isBreakdownOpen ? "▲ Hide Breakdown" : "▼ Inspect Full Math"}
                              </span>
                            </button>

                            {isBreakdownOpen && (
                              <div className="p-3 bg-slate-950/70 border-t border-slate-800 text-xs font-mono space-y-3 animate-in fade-in duration-150">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1 text-slate-300 border-r border-slate-800/80 pr-3">
                                    <div className="text-[10px] font-bold text-cyan-400 uppercase">
                                      1. Illustrative grading-cost scenario
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                      <span>
                                        Base Tier ({isPre1975 ? "Vintage Pre-1975" : "Modern Post-1975"}):
                                      </span>
                                      <span className="text-white">${baseGradingFee.toFixed(2)}</span>
                                    </div>
                                    {sigCount > 0 && (
                                      <div className="flex justify-between text-[11px]">
                                        <span>Signature Verification ({sigCount}x signers):</span>
                                        <span className="text-amber-300">+${sigFee.toFixed(2)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between text-[11px]">
                                      <span>Freight &amp; Handling:</span>
                                      <span className="text-white">+${gradingFreight.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px] font-bold border-t border-slate-800 pt-1 text-cyan-300">
                                      <span>Total Prior Sunk Cost on Slab:</span>
                                      <span>${totalSubmitterSunk.toFixed(2)}</span>
                                    </div>
                                  </div>

                                  <div className="space-y-1 text-slate-300">
                                    <div className="text-[10px] font-bold text-emerald-400 uppercase">
                                      2. Resale Platform Exit Cut
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                      <span>Target FMV Flip Gross:</span>
                                      <span className="text-white">
                                        {deal.anchorFmv > 0 ? `$${deal.anchorFmv.toFixed(2)}` : "Unavailable"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                      <span>Platform Cut (~13.25%):</span>
                                      <span className="text-rose-400">
                                        {deal.anchorFmv > 0 ? `-$${estPlatformCut.toFixed(2)}` : "—"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                      <span>Packaging &amp; Mailer:</span>
                                      <span className="text-rose-400">-$5.00</span>
                                    </div>
                                    <div className="flex justify-between text-[11px] font-bold border-t border-slate-800 pt-1 text-emerald-300">
                                      <span>Net Cash Realized at Exit:</span>
                                      <span>
                                        {deal.anchorFmv > 0 ? `$${estNetAtExit.toFixed(2)}` : "Unavailable"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ACTION ROW */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                            <div className="text-xs font-mono text-slate-400">
                              {deal.isBuyItNow ? (
                                <span>
                                  Fixed Cost All-In:{" "}
                                  <strong className="text-amber-300">
                                    ${deal.allInCost.toFixed(2)}
                                  </strong>{" "}
                                  <span className="text-[10px] text-emerald-400 font-bold">(Immediate Acquisition)</span>
                                </span>
                              ) : (
                                <span>
                                  Max Safe Snipe:{" "}
                                  <strong className="text-cyan-400">
                                    {deal.recommendedMaxBid > 0 ? `$${deal.recommendedMaxBid.toFixed(2)}` : "Unavailable"}
                                  </strong>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 ml-auto flex-wrap">
                              <a
                                href={deal.listing.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1 transition"
                              >
                                <span>{deal.isBuyItNow ? "🏷️" : "🌐"}</span>{" "}
                                {formatVenueActionText(deal.listing.source, deal.isBuyItNow)}
                              </a>

                              <button
                                onClick={() => executePaperSnipe(deal)}
                                className="px-3.5 py-1.5 rounded text-xs font-mono font-bold border transition cursor-pointer bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400 shadow-md"
                              >
                                {deal.isBuyItNow ? "📖 Research listing" : "🎯 Paper Snipe"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {liveDeals.length > liveShown && (
                    <LoadMoreSentinel remaining={liveDeals.length - liveShown} onMore={() => setLiveShown((n) => n + WINDOW_STEP)} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: WHAT YOU MISSED WHILE YOU WERE AWAY */}
          {viewMode === "MISSED" && <SniperGame desk={desk} view="results" />}
          {/* VIEW 3: WHAT YOU'VE ACQUIRED */}
          {viewMode === "ACQUIRED" && <SniperGame desk={desk} view="collection" />}
          {/* PRACTICE ROUNDS + PAPER LEDGER */}


          {/* BLOCKED LISTINGS SECTION */}
          <div className="bg-[#0E131F] border border-slate-800/80 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <span>🚫</span> Blocked by Anti-Bullshit Guards ({rejectedDeals.length})
            </h3>
            <p className="text-xs text-slate-500">
              Filtered in real-time to eliminate modern raw reprints, penny-ante junk, and low-margin traps.
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {rejectedDeals.slice(0, 15).map((deal) => (
                <div
                  key={deal.listing.id}
                  className="bg-slate-900/40 border border-slate-800 rounded p-2 text-xs flex justify-between items-center text-slate-400"
                >
                  <div className="truncate pr-2">
                    <span className="font-mono text-[10px] text-slate-500 mr-2">
                      [{deal.listing.source}]
                    </span>
                    <span className="text-slate-300 line-through opacity-70">
                      {deal.listing.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-rose-400 flex-shrink-0">
                    {deal.rejectionReason?.split(":")[0] || "Rejected"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* HIGH-RESOLUTION FRONT VIEW INSPECTION LIGHTBOX MODAL (RAIL-STYLE MULTI-PERSPECTIVE EXPERIENCE) */}
      {inspectedDeal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0A0F1A] border-2 border-cyan-500/60 rounded-2xl max-w-6xl w-full max-h-[94vh] overflow-y-auto shadow-[0_0_60px_rgba(34,211,238,0.25)] p-5 sm:p-6 space-y-5 text-slate-100 font-sans">
            {/* Modal Institutional Header & Breadcrumbs */}
            <div className="space-y-3 border-b border-slate-800/80 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="text-slate-500 hover:text-slate-300 transition">Exchange Floor</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-slate-500 hover:text-slate-300 transition">Microwave Deal Radar</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-amber-400 font-bold uppercase">{inspectedDeal.listing.source}</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-white font-semibold">{inspectedDeal.resolvedSeries} #{inspectedDeal.resolvedIssue}</span>
                  {inspectedDeal.resolvedYear && (
                    <span className="text-slate-500">({inspectedDeal.resolvedYear} • {getEraDisplayName(inspectedDeal.resolvedEra)})</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 shadow-sm">
                    ${formatComicEquityTicker(inspectedDeal.resolvedSeries, inspectedDeal.resolvedIssue)}
                  </span>
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/50">
                    {inspectedDeal.gradingCompany} {inspectedDeal.resolvedGrade.toFixed(1)}
                  </span>
                  {inspectedDeal.certNumber && (
                    <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-900 text-slate-300 border border-slate-700">
                      Cert #{inspectedDeal.certNumber}
                    </span>
                  )}
                  <button
                    onClick={() => setInspectedDeal(null)}
                    className="text-slate-400 hover:text-white px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold font-mono transition ml-2"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {/* Title & Microwave Urgency Window */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                    {inspectedDeal.resolvedSeries} #{inspectedDeal.resolvedIssue}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 line-clamp-1">
                    {inspectedDeal.listing.title}
                  </p>
                </div>
                {inspectedDeal.isBuyItNow ? (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-950/90 border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.45)] self-start sm:self-auto">
                    <span className="font-mono text-xs font-black tracking-wider text-amber-300 uppercase">
                      🏷️ BUY IT NOW: ${(inspectedDeal.buyItNowPrice ?? inspectedDeal.listing.currentBid).toFixed(2)} • FIXED PRICE
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/95 border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)] self-start sm:self-auto">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span className="font-mono text-xs font-black tracking-wider text-emerald-300 uppercase">
                      ⚡ {inspectedDeal.listing.bidKind === "starting" ? "STARTING BID" : "LIVE BID"}: ${inspectedDeal.listing.currentBid.toFixed(2)} ({inspectedDeal.listing.bidCount ?? 1} bids) • ⏳ {formatTime(liveAuctionTimers[inspectedDeal.listing.id] ?? inspectedDeal.listing.secondsRemaining)} LEFT
                    </span>
                  </div>
                )}
              </div>

              {/* Top Institutional Header: FMV Anchor, Census Intel, Acquisition All-In, Double-Up & 50% Win Target Boxes */}
              <div className="bg-[#070C18] border border-cyan-500/40 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-lg">
                {/* Top Row: FMV Anchor & Certified Census Intel */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Research reference:</span>
                    <span className="text-base sm:text-lg font-black font-mono text-cyan-300">
                      {inspectedDeal.anchorFmv > 0 ? `$${inspectedDeal.anchorFmv.toFixed(2)}` : "Unavailable"}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                      {inspectedDeal.anchorFmv > 0 ? "Grade-matched reference" : "No grade-matched reference"}
                    </span>
                  </div>

                  {/* Certified Census Scarcity Ribbon */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="text-[10px] text-purple-300 font-bold uppercase flex items-center gap-1">
                      <span>🏛️</span> Census Intel:
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/60 border border-slate-800 text-slate-300 text-[11px]">
                      Total: <strong className="text-white">{inspectedDeal.censusTotal ? inspectedDeal.censusTotal.toLocaleString() : censusMissing(inspectedDeal.gradingCompany)}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/60 border border-slate-800 text-slate-300 text-[11px]">
                      In {inspectedDeal.resolvedGrade.toFixed(1)}: <strong className="text-emerald-300">{inspectedDeal.censusCount98 ? inspectedDeal.censusCount98.toLocaleString() : censusMissing(inspectedDeal.gradingCompany)}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/60 border border-slate-800 text-slate-300 text-[11px]">
                      Higher: <strong className="text-cyan-300">{inspectedDeal.censusHigher !== undefined ? (inspectedDeal.censusHigher === 0 ? "0 (Top of Pop ★)" : inspectedDeal.censusHigher.toLocaleString()) : "—"}</strong>
                    </span>
                    {inspectedDeal.censusScarcityTier && (
                      <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40 text-[10px] font-bold">
                        {inspectedDeal.censusScarcityTier}
                      </span>
                    )}
                  </div>

                  {/* Realized-sale price for this slab's own grader, label type and grade (GoCollect) */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="text-[10px] text-amber-300 font-bold uppercase">
                      {(inspectedDeal.label?.grader ?? "Graded")} {inspectedDeal.label?.labelType ?? ""} {inspectedDeal.label?.grade != null ? inspectedDeal.label.grade.toFixed(1) : ""} sales:
                    </span>
                    {inspectedDeal.gocollectPrice ? (
                      <>
                        {inspectedDeal.gocollectPrice.lastSoldPrice != null && (
                          <span className="px-2 py-0.5 rounded bg-black/60 border border-slate-800 text-slate-300 text-[11px]">
                            Last sold: <strong className="text-white">${inspectedDeal.gocollectPrice.lastSoldPrice.toLocaleString()}</strong>
                            {inspectedDeal.gocollectPrice.lastSoldDate ? ` (${inspectedDeal.gocollectPrice.lastSoldDate})` : ""}
                          </span>
                        )}
                        {inspectedDeal.gocollectPrice.fmv != null && (
                          <span className="px-2 py-0.5 rounded bg-black/60 border border-slate-800 text-slate-300 text-[11px]">
                            FMV: <strong className="text-white">${inspectedDeal.gocollectPrice.fmv.toLocaleString()}</strong>
                          </span>
                        )}
                        {inspectedDeal.gocollectPrice.avg1y != null && (
                          <span className="px-2 py-0.5 rounded bg-black/60 border border-slate-800 text-slate-300 text-[11px]">
                            1-yr avg: <strong className="text-white">${inspectedDeal.gocollectPrice.avg1y.toLocaleString()}</strong>
                            {inspectedDeal.gocollectPrice.n1y ? ` (${inspectedDeal.gocollectPrice.n1y} sold)` : ""}
                          </span>
                        )}
                        {inspectedDeal.gocollectPrice.salesCount != null && (
                          <span className="px-2 py-0.5 rounded bg-black/60 border border-slate-800 text-slate-300 text-[11px]">
                            Recorded sales: <strong className="text-white">{inspectedDeal.gocollectPrice.salesCount.toLocaleString()}</strong>
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Price not captured yet</span>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Acquisition All-In, Double-Up (2x), 50% Win Box, and Net Profit Margin */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                  {/* Box 1: Acquisition All-In */}
                  <div className="bg-black/70 p-2.5 rounded-lg border border-slate-800 hover:border-cyan-500/50 transition">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase">
                      <span>Acquisition All-In</span>
                      <span className="text-emerald-400 font-bold">
                        {inspectedDeal.anchorFmv > 0 ? `-${inspectedDeal.discountPercent}%` : "—"}
                      </span>
                    </div>
                    <strong className="text-white text-base sm:text-lg block my-0.5 font-bold">
                      ${inspectedDeal.allInCost.toFixed(2)}
                    </strong>
                    <span className="text-[9px] text-slate-500 block">
                      Bid + Ship + Tax (Total Cost)
                    </span>
                  </div>

                  {/* Box 2: Double-Up (2x) Win Price */}
                  <div className="bg-black/70 p-2.5 rounded-lg border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:border-emerald-400 transition">
                    <div className="flex items-center justify-between text-[10px] text-emerald-400 uppercase font-bold">
                      <span>Double-Up (2x)</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">100% Net</span>
                    </div>
                    <strong className="text-emerald-300 text-base sm:text-lg block my-0.5 font-bold">
                      ${inspectedDeal.targetWinPrice100Pct.toFixed(2)}
                    </strong>
                    <span className="text-[9px] text-slate-400 block">
                      Exit Target to Double Cash
                    </span>
                  </div>

                  {/* Box 3: 50% Win Box (1.5x) */}
                  <div className="bg-black/70 p-2.5 rounded-lg border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:border-cyan-400 transition">
                    <div className="flex items-center justify-between text-[10px] text-cyan-400 uppercase font-bold">
                      <span>50% Win Box (1.5x)</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">50% Net</span>
                    </div>
                    <strong className="text-cyan-300 text-base sm:text-lg block my-0.5 font-bold">
                      ${inspectedDeal.targetWinPrice50Pct.toFixed(2)}
                    </strong>
                    <span className="text-[9px] text-slate-400 block">
                      Fast Turn Target Exit Price
                    </span>
                  </div>

                  {/* Box 4: Projected Net Profit & ROI */}
                  <div className="bg-black/70 p-2.5 rounded-lg border border-amber-500/40 hover:border-amber-400 transition">
                    <div className="flex items-center justify-between text-[10px] text-amber-400 uppercase font-bold">
                      <span>Net Flip Spread</span>
                      <span className="text-amber-300">
                        {inspectedDeal.anchorFmv > 0 ? `+${inspectedDeal.netRoiPercent}% ROI` : "—"}
                      </span>
                    </div>
                    <strong className="text-amber-300 text-base sm:text-lg block my-0.5 font-bold">
                      {inspectedDeal.anchorFmv > 0 ? `+$${inspectedDeal.projectedNetProfit.toFixed(2)}` : "Unavailable"}
                    </strong>
                    <span className="text-[9px] text-slate-500 block">
                      Modeled net proceeds at the reference
                    </span>
                  </div>
                </div>
              </div>

            {/* Multi-Perspective Navigation Selector */}

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[
                  { id: "all", label: "ALL PERSPECTIVES", icon: "🌐" },
                  { id: "matrix", label: "PRICE MATRIX (EBAY • CB • PP)", icon: "⚖️" },
                  { id: "financial", label: "FINANCIAL & ARBITRAGE", icon: "📊" },
                  { id: "chart", label: "COMPLETED SALES & PRICE HISTORY", icon: "📈" },
                  { id: "investopedia", label: "INVESTOPEDIA", icon: "📖" },
                  { id: "learn", label: "WHAT TO LEARN", icon: "🎓" },
                  { id: "census", label: "POPULATION CENSUS", icon: "🏛️" },
                  { id: "lore", label: "STORY, CHARACTERS & WIKI", icon: "📜" },
                  { id: "gcd", label: "GCD BIBLIOGRAPHIC", icon: "📚" },
                  ...(inspectedDeal.isYellowLabel ? [{ id: "signature", label: "SIGNATURE PROVENANCE", icon: "✍️" }] : []),
                ].map((tab) => (

                  <button
                    key={tab.id}
                    onClick={() => setModalPerspective(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                      modalPerspective === tab.id
                        ? "bg-cyan-500 text-slate-950 shadow-md"
                        : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: High-Res Front View - Canonical Slab Encasement, Seller Gallery & Action CTAs */}
              <div className="lg:col-span-5 flex flex-col items-center bg-black/80 rounded-xl p-4 border border-slate-800 space-y-4">
                <SlabEncasement
                  gradingCompany={inspectedDeal.gradingCompany}
                  grade={inspectedDeal.resolvedGrade}
                  title={inspectedDeal.normalizedTitle || inspectedDeal.listing.title}
                  issueNumber={inspectedDeal.resolvedIssue}
                  publisher={inspectedDeal.gcdMetadata?.publisher}
                  year={inspectedDeal.resolvedYear}
                  era={inspectedDeal.resolvedEra}
                  certNumber={inspectedDeal.certNumber}
                  pageQuality={inspectedDeal.label?.pageQuality || undefined}
                  isYellowLabel={inspectedDeal.isYellowLabel}
                  signatureDetails={inspectedDeal.signerName}
                  keyComments={inspectedDeal.historicalSignificanceLore || inspectedDeal.whyItsAGoodBuy}
                  imageUrl={inspectedDeal.listing.imageUrl}
                  galleryImages={inspectedDeal.galleryImages}
                  size="lg"
                />

                {/* Real-Time Live Bid / Buy It Now Price Placed Directly Underneath the Modal Slab Encasement */}
                <div className="w-full rounded-xl border border-slate-700/80 bg-gradient-to-b from-slate-900/95 via-black to-slate-950 p-4 shadow-xl backdrop-blur-md">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
                      {inspectedDeal.isBuyItNow ? (
                        <>
                          <span>🏷️</span> BUY IT NOW PRICE
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                          <span className="text-emerald-400 font-black">CURRENT LIVE BID</span>
                        </>
                      )}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {inspectedDeal.isBuyItNow ? "Fixed Price Execution" : `${inspectedDeal.listing.bidCount ?? 1} bids placed`}
                    </span>
                  </div>

                  <div className="pt-3 flex items-baseline justify-between">
                    <div className="text-3xl sm:text-4xl font-mono font-black tracking-tight text-white flex items-baseline gap-1.5">
                      <span className={inspectedDeal.isBuyItNow ? "text-amber-400" : "text-emerald-400"}>
                        ${inspectedDeal.isBuyItNow ? (inspectedDeal.buyItNowPrice ?? inspectedDeal.listing.currentBid).toFixed(2) : inspectedDeal.listing.currentBid.toFixed(2)}
                      </span>
                      <span className="text-xs font-normal text-slate-500 uppercase">USD</span>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs text-slate-400">
                        {inspectedDeal.listing.shippingKnown === false ? "Shipping not published" : inspectedDeal.listing.shippingCost && inspectedDeal.listing.shippingCost > 0
                          ? `+$${inspectedDeal.listing.shippingCost.toFixed(2)} shipping`
                          : "Free Shipping"}
                      </div>
                      <div className="text-xs font-bold text-cyan-400 mt-0.5">
                        {inspectedDeal.listing.timeLeftStr || "Ending soon"}
                      </div>
                    </div>
                  </div>

                  {!inspectedDeal.isBuyItNow && (
                    <LiveLotStrip
                      itemId={inspectedDeal.listing.id}
                      maxBid={inspectedDeal.recommendedMaxBid}
                      url={inspectedDeal.listing.url}
                      startBid={inspectedDeal.listing.currentBid}
                    />
                  )}

                  {/* Spread / Upside Under Modal Bid */}
                  {inspectedDeal.anchorFmv > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">
                        FMV Valuation: <strong className="text-slate-100">${inspectedDeal.anchorFmv.toFixed(0)}</strong>
                      </span>
                      {inspectedDeal.discountPercent > 0 ? (
                        <span className="text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-500/50 px-2 py-0.5 rounded">
                          {inspectedDeal.discountPercent}% Discount
                        </span>
                      ) : inspectedDeal.isBuyItNow ? (
                        <span className="text-amber-400 font-bold bg-amber-950/70 border border-amber-500/50 px-2 py-0.5 rounded">
                          Sensible Fixed Price
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Direct Action Hub */}
                <div className="w-full space-y-2 pt-2 border-t border-slate-800">
                  <a
                    href={inspectedDeal.listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase font-mono text-center shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <span>
                      {inspectedDeal.isBuyItNow ? "🏷️ " : "⚡ "}
                      {formatVenueActionText(inspectedDeal.listing.source, inspectedDeal.isBuyItNow)}
                    </span>
                    <span>↗</span>
                  </a>


                  <SniperLotTicket key={inspectedDeal.listing.id} desk={desk} itemId={inspectedDeal.listing.id} isBuyItNow={Boolean(inspectedDeal.isBuyItNow)} />

                  <div className="grid grid-cols-1 gap-2">
                    <Link
                      href={`/comics?q=${encodeURIComponent(inspectedDeal.resolvedSeries + " #" + inspectedDeal.resolvedIssue)}`}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs uppercase font-mono transition text-center border border-cyan-500/30 flex items-center justify-center gap-1"
                    >
                      <span>Sovereign Rail</span>
                      <span>↗</span>
                    </Link>
                  </div>

                  <div className="text-[10px] text-center font-mono text-slate-400 pt-1">
                    Authentic High-Resolution Slab Well • 1600px Studio Up-Rez Active
                  </div>
                </div>

                <SniperVideos
                  key={inspectedDeal.listing.id}
                  videos={lotResearch.data?.videos || []}
                  loading={lotResearch.loading}
                  series={inspectedDeal.label?.title || inspectedDeal.resolvedSeries}
                  issue={String(inspectedDeal.resolvedIssue ?? "")}
                  archive={inspectedDeal.videoDossier?.comicBaseVideo ? {
                    title: inspectedDeal.videoDossier.comicBaseVideo.headline,
                    videoUrl: inspectedDeal.videoDossier.comicBaseVideo.videoUrl,
                    poster: inspectedDeal.listing.imageUrl,
                  } : undefined}
                />
              </div>

              {/* Right Column: Multi-Perspective Rail Intelligence Dossier */}
              <div className="lg:col-span-7 space-y-4">
                {/* ════════════════════════════════════════════════════════════════════════
                    PERSPECTIVE 2: TRADINGVIEW TECHNICALS & HISTORICAL SALES LEDGER
                    ════════════════════════════════════════════════════════════════════════ */}
                {showSalesChart && (modalPerspective === "all" || modalPerspective === "chart") && (
                  <div className="bg-[#070C18] border border-cyan-500/40 rounded-xl p-4 space-y-3.5 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                          <span>📈</span> COMPLETED SALES &amp; PRICE HISTORY
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                          Lightweight Charts™
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-400">
                        ${formatComicEquityTicker(inspectedDeal.resolvedSeries, inspectedDeal.resolvedIssue)}
                      </span>
                    </div>

                    <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 p-2">
                      <LotMarketChart
                        key={inspectedDeal.listing.id}
                        research={lotResearch}
                        series={inspectedDeal.resolvedSeries}
                        issue={inspectedDeal.resolvedIssue}
                        grade={inspectedDeal.resolvedGrade}
                        grader={inspectedDeal.gradingCompany}
                        ticker={formatComicEquityTicker(inspectedDeal.resolvedSeries, inspectedDeal.resolvedIssue)}
                        currentBid={inspectedDeal.listing.currentBid}
                        allInCost={inspectedDeal.allInCost}
                        editionTerms={/\bNauck\b/i.test(inspectedDeal.listing.title) ? "nauck" : undefined}
                        variant={/\bNauck\b/i.test(inspectedDeal.listing.title) ? "Todd Nauck" : inspectedDeal.variantType || (/variant/i.test(inspectedDeal.listing.title) ? "listed variant" : undefined)}
                      />
                    </div>

                  </div>
                )}

                {/* ════════════════════════════════════════════════════════════════════════
                    PERSPECTIVE 3: HISTORICAL LORE & COLLECTOR CANON
                    ════════════════════════════════════════════════════════════════════════ */}
                {((modalPerspective === "all") || modalPerspective === "lore") && (
                  <div className="bg-[#070C18] border border-amber-500/40 rounded-xl p-4 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-1.5">
                          <span>📜</span> INVESTMENT CASE &amp; ISSUE RESEARCH
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/30">
                          Financial case · story · references
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 uppercase">
                        Issue research
                      </span>
                    </div>

                    {/* Integrated Encyclopedic Fandom Lore Dossier */}
                    <SniperListingResearch
                      research={lotResearch}
                      series={inspectedDeal.label?.title || inspectedDeal.resolvedSeries}
                      issueNumber={inspectedDeal.resolvedIssue}
                      grader={inspectedDeal.gradingCompany}
                      grade={inspectedDeal.resolvedGrade}
                    />

                    {modalPerspective === "lore" && inspectedDeal.longTermHoldingThesis && (
                      <div className="text-xs text-purple-200/90 leading-relaxed font-sans bg-purple-950/20 border border-purple-500/20 p-3 rounded-lg">
                        <strong className="text-purple-400 font-mono text-[11px] block uppercase mb-1">
                          Long-Term Holding Thesis (Beyond Short Flips):
                        </strong>
                        {inspectedDeal.longTermHoldingThesis}
                      </div>
                    )}
                  </div>
                )}


                {/* BUY IT NOW SENSIBILITY & UPSIDE THESIS */}
                {modalPerspective === "financial" && inspectedDeal.isBuyItNow && inspectedDeal.buyItNowSensibilityWhy && (
                  <div className="bg-emerald-950/40 border-2 border-emerald-500/60 rounded-xl p-4 space-y-2 shadow-xl">
                    <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
                      <span className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                        <span>🏷️</span> WHY THIS BUY IT NOW MAKES SENSE (INSTANT ARBITRAGE &amp; MARGIN OF SAFETY)
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-emerald-900 text-emerald-200 border border-emerald-500/50">
                        +{inspectedDeal.netRoiPercent}% NET ROI
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100 font-sans leading-relaxed">
                      {inspectedDeal.buyItNowSensibilityWhy}
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                      <div className="bg-black/50 p-2 rounded border border-emerald-500/30 text-center">
                        <span className="text-[9px] text-slate-400 block uppercase">Gross Upside Spread</span>
                        <strong className="text-emerald-300 text-xs">
                          {inspectedDeal.dollarSpread > 0 ? `+$${inspectedDeal.dollarSpread.toFixed(2)}` : `$${inspectedDeal.dollarSpread.toFixed(2)}`}
                        </strong>
                      </div>
                      <div className="bg-black/50 p-2 rounded border border-emerald-500/30 text-center">
                        <span className="text-[9px] text-slate-400 block uppercase">Projected Net Profit</span>
                        <strong className="text-emerald-300 text-xs">
                          +${inspectedDeal.projectedNetProfit.toFixed(2)}
                        </strong>
                      </div>
                      <div className="bg-black/50 p-2 rounded border border-emerald-500/30 text-center">
                        <span className="text-[9px] text-slate-400 block uppercase">Acquisition Type</span>
                        <strong className="text-amber-300 text-xs">Fixed Price (No Gavel)</strong>
                      </div>
                    </div>
                  </div>
                )}
                {/* ════════════════════════════════════════════════════════════════════════
                    PERSPECTIVE A: MULTI-SOURCE COMPARATIVE PRICE MATRIX (EBAY • CB • PP)
                    ════════════════════════════════════════════════════════════════════════ */}
                {(modalPerspective === "matrix") && inspectedDeal.priceMatrix && (
                  <div className="bg-[#070C18] border border-cyan-500/50 rounded-xl p-4 space-y-3.5 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                          <span>⚖️</span> MULTI-SOURCE PRICE MATRIX (EBAY • COMICBASE • PANEL PROFITS)
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/30">
                          Grade-to-Grade Parity
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Developer API Realized Comps
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Side-by-side grade-level matrix comparing official eBay Developer API auction pricing against the Panel Profits FMV algorithm, ComicBase 2025 catalog valuation, and the GoCollect / GPA benchmark index.
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] font-mono text-left">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-800 text-[10px] uppercase">
                            <th className="pb-1.5 font-bold">Grade Tier</th>
                            <th className="pb-1.5 font-bold text-right">eBay live quote</th>
                            <th className="pb-1.5 font-bold text-right">Panel Profits FMV</th>
                            <th className="pb-1.5 font-bold text-right">ComicBase Catalog</th>
                            <th className="pb-1.5 font-bold text-right">GoCollect / GPA</th>
                            <th className="pb-1.5 font-bold text-right">Dislocation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {inspectedDeal.priceMatrix.map((row, idx) => (
                            <tr
                              key={idx}
                              className={`transition ${
                                row.isInspectedGrade
                                  ? "bg-cyan-950/50 border-l-2 border-cyan-400 font-bold"
                                  : "hover:bg-slate-900/40"
                              }`}
                            >
                              <td className="py-2 pl-1 flex items-center gap-1.5">
                                <span className={row.isInspectedGrade ? "text-cyan-300" : "text-slate-300"}>
                                  {row.gradeLabel}
                                </span>
                                {row.isInspectedGrade && (
                                  <span className="text-[9px] bg-cyan-500 text-slate-950 px-1.5 py-0.2 rounded font-black">
                                    INSPECTED
                                  </span>
                                )}
                              </td>
                              <td className="py-2 text-right text-emerald-400 font-bold">
                                ${row.ebayPrice.toFixed(2)}
                              </td>
                              <td className="py-2 text-right text-cyan-300">
                                ${row.ppFmv.toFixed(2)}
                              </td>
                              <td className="py-2 text-right text-blue-300">
                                ${row.cbPrice.toFixed(2)}
                              </td>
                              <td className="py-2 text-right text-slate-400">
                                {row.gocollectPrice ? `$${row.gocollectPrice.toFixed(2)}` : "—"}
                              </td>
                              <td
                                className={`py-2 text-right font-bold ${
                                  row.spreadPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                                }`}
                              >
                                {row.spreadPercent >= 0 ? `+${row.spreadPercent}%` : `${row.spreadPercent}%`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono bg-black/60 p-2.5 rounded-lg border border-slate-800 text-slate-400">
                      <span>Matched Registry Cert: <strong className="text-cyan-300">{inspectedDeal.certNumber || "Verified Universal Registry"}</strong></span>
                      <span className="text-emerald-300 font-bold">
                        ★ Parity Verified across Cover, Grade &amp; Ticker
                      </span>
                    </div>
                  </div>
                )}

                {/* ════════════════════════════════════════════════════════════════════════
                    PERSPECTIVE 1: FINANCIAL & ARBITRAGE MATH
                    ════════════════════════════════════════════════════════════════════════ */}
                {(modalPerspective === "financial") && (
                  <div className="bg-[#070C18] border border-cyan-500/40 rounded-xl p-4 space-y-3.5 shadow-lg">

                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                        <span>📊</span> FINANCIAL &amp; ARBITRAGE DESK
                      </span>
                      <span className="font-mono text-xs font-black text-cyan-300">
                        {inspectedDeal.anchorFmv > 0 ? `$${inspectedDeal.anchorFmv.toFixed(2)} FMV ANCHOR` : "NO VALUATION YET"}
                      </span>
                    </div>

                    {/* Core Financial Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                      <div className="bg-black/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px] uppercase block">All-In Cost</span>
                        <strong className="text-white text-sm">${inspectedDeal.allInCost.toFixed(2)}</strong>
                        {inspectedDeal.anchorFmv > 0 ? (
                          <span className={`text-[9px] block font-bold ${inspectedDeal.discountPercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {inspectedDeal.discountPercent >= 0 ? `-${inspectedDeal.discountPercent}% under FMV` : `+${Math.abs(inspectedDeal.discountPercent)}% over FMV`}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-500 block">no FMV to compare</span>
                        )}
                      </div>
                      <div className="bg-black/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-emerald-400 text-[10px] uppercase block">Double-Up (2x)</span>
                        <strong className="text-emerald-300 text-sm">${inspectedDeal.targetWinPrice100Pct.toFixed(2)}</strong>
                        <span className={`text-[9px] block ${inspectedDeal.anchorFmv > 0 && inspectedDeal.targetWinPrice100Pct > inspectedDeal.anchorFmv ? "text-amber-400" : "text-slate-500"}`}>
                          {inspectedDeal.anchorFmv <= 0 ? "sell price to double your cost" : inspectedDeal.targetWinPrice100Pct > inspectedDeal.anchorFmv ? "above FMV: needs a buyer over market" : "100% Net Profit"}
                        </span>
                      </div>
                      <div className="bg-black/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-cyan-400 text-[10px] uppercase block">Fast Turn (1.5x)</span>
                        <strong className="text-cyan-300 text-sm">${inspectedDeal.targetWinPrice50Pct.toFixed(2)}</strong>
                        <span className={`text-[9px] block ${inspectedDeal.anchorFmv > 0 && inspectedDeal.targetWinPrice50Pct > inspectedDeal.anchorFmv ? "text-amber-400" : "text-slate-500"}`}>
                          {inspectedDeal.anchorFmv <= 0 ? "sell price for 1.5x your cost" : inspectedDeal.targetWinPrice50Pct > inspectedDeal.anchorFmv ? "above FMV: needs a buyer over market" : "50% Net Margin"}
                        </span>
                      </div>
                      <div className="bg-black/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-amber-400 text-[10px] uppercase block">Net Margin</span>
                        {inspectedDeal.anchorFmv > 0 ? (
                          <>
                            <strong className="text-amber-300 text-sm">{inspectedDeal.netRoiPercent >= 0 ? "+" : ""}{inspectedDeal.netRoiPercent}%</strong>
                            <span className="text-[9px] text-amber-400/80 block">{inspectedDeal.projectedNetProfit >= 0 ? "+" : "-"}${Math.abs(inspectedDeal.projectedNetProfit).toFixed(2)} Net</span>
                          </>
                        ) : (
                          <>
                            <strong className="text-slate-500 text-sm">n/a</strong>
                            <span className="text-[9px] text-slate-500 block">needs a valuation</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Sunk Slabbing Math & Whole Tomato Advantage */}
                    <div className="bg-black/40 border border-slate-800 rounded-lg p-3 space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                        <span className="text-[10px] text-cyan-300 font-bold uppercase">Whole Tomato Sunk Cost Advantage</span>
                        <span className="text-[10px] text-emerald-400 font-bold">Free Certified Sunk Equity</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Prior Owner Grading &amp; Encasing Fee Sunk:</span>
                        <span className="text-amber-300 font-bold">
                          ${inspectedDeal.resolvedEra === "silver" || inspectedDeal.resolvedEra === "golden" ? "63.00" : "48.00"}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Your Acquisition Cost (All-In):</span>
                        <span className="text-white">${inspectedDeal.allInCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-400 border-t border-slate-800 pt-1">
                        <span>Net Captured Instant Equity:</span>
                        <span className={inspectedDeal.anchorFmv > 0 ? "" : "text-slate-500"}>
                          {inspectedDeal.anchorFmv > 0 ? `+$${Math.max(0, (inspectedDeal.anchorFmv - inspectedDeal.allInCost)).toFixed(2)}` : "n/a (no FMV)"}
                        </span>
                      </div>
                    </div>

                    {/* Pricing Provenance & Sales Comps */}
                    <div className="text-[10px] text-slate-400 bg-black/60 rounded-lg p-2.5 border border-slate-800/80 space-y-1.5 font-mono">
                      <div className="leading-relaxed">
                        <strong className="text-cyan-300 uppercase">Verified Valuation Provenance: </strong>
                        <span className="text-slate-300">
                          {inspectedDeal.pricingSourceProvenance || "Open the saved price and sale source records below"}
                        </span>
                      </div>

                      {inspectedDeal.historicalComps && inspectedDeal.historicalComps.length > 0 && (
                        <div className="pt-1 space-y-1">
                          <div className="uppercase text-slate-400 font-bold text-[9px]">
                            Realized Certified Auction Sales Ladder:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {inspectedDeal.historicalComps.map((comp, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                              >
                                {comp.venue}: <strong className="text-emerald-400">${comp.price}</strong> ({comp.date})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {((modalPerspective === "all") || modalPerspective === "investopedia" || modalPerspective === "learn") && (
                  <SniperLearningPanel series={inspectedDeal.resolvedSeries} issue={inspectedDeal.resolvedIssue} section={modalPerspective === "learn" ? "learn" : "investopedia"} />
                )}
                {/* ════════════════════════════════════════════════════════════════════════
                    PERSPECTIVE 3: POPULATION & CENSUS INTEL
                    ════════════════════════════════════════════════════════════════════════ */}
                {((modalPerspective === "all" && fullResearch) || modalPerspective === "census") && (
                  <div className="bg-[#070C18] border border-purple-500/40 rounded-xl p-4 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-mono font-bold text-purple-400 uppercase flex items-center gap-1.5">
                        <span>🏛️</span> POPULATION CENSUS REPORT &amp; SCARCITY
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40 uppercase">
                        {inspectedDeal.censusScarcityTier || "Verified Census"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
                      <div className="bg-black/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase block">Total Graded</span>
                        <strong className="text-white text-sm">{inspectedDeal.censusTotal ? inspectedDeal.censusTotal.toLocaleString() : censusMissing(inspectedDeal.gradingCompany)}</strong>
                        <span className="text-[9px] text-slate-500 block">All universal slabs</span>
                      </div>
                      <div className="bg-black/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-emerald-400 uppercase block">In {inspectedDeal.resolvedGrade.toFixed(1)}</span>
                        <strong className="text-emerald-300 text-sm">{inspectedDeal.censusCount98 ? inspectedDeal.censusCount98.toLocaleString() : censusMissing(inspectedDeal.gradingCompany)}</strong>
                        <span className="text-[9px] text-slate-500 block">Tier population</span>
                      </div>
                      <div className="bg-black/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-cyan-400 uppercase block">Graded Higher</span>
                        <strong className="text-cyan-300 text-sm">{inspectedDeal.censusHigher !== undefined ? (inspectedDeal.censusHigher === 0 ? "0 (Top of Pop ★)" : inspectedDeal.censusHigher.toLocaleString()) : "—"}</strong>
                        <span className="text-[9px] text-slate-500 block">9.9 / 10.0 Gem</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-black/40 p-2.5 rounded-lg border border-slate-800">
                      <span>Census Ceiling Status:</span>
                      <span className="text-emerald-300 font-bold">
                        {(inspectedDeal.censusHigher ?? 0) === 0 ? "★ Highest Known Census Tier (Top of Pop)" : `${inspectedDeal.censusHigher} copies graded higher`}
                      </span>
                    </div>
                  </div>
                )}

                {/* ════════════════════════════════════════════════════════════════════════
                    PERSPECTIVE 4: GRAND COMICS DATABASE™ (GCD) BIBLIOGRAPHIC RECORD
                    ════════════════════════════════════════════════════════════════════════ */}
                {((modalPerspective === "all" && fullResearch) || modalPerspective === "gcd") && (
                  <div className="bg-[#070C18] border border-blue-500/40 rounded-xl p-4 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-mono font-bold text-blue-400 uppercase flex items-center gap-1.5">
                        <span>📚</span> GRAND COMICS DATABASE™ (GCD) BIBLIOGRAPHIC RECORD
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/40 uppercase">
                        Bibliographic Authority
                      </span>
                    </div>

                    <div className="bg-black/60 rounded-lg p-3 border border-slate-800 text-xs font-mono space-y-2.5">
                      {inspectedDeal.gcdMetadata?.writers && inspectedDeal.gcdMetadata.writers.length > 0 && (
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-500">Writer(s):</span>
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            {inspectedDeal.gcdMetadata.writers.map((writer, idx) => (
                              <Link
                                key={idx}
                                href={`/comics?q=${encodeURIComponent(writer)}`}
                                className="text-cyan-400 hover:text-cyan-200 underline underline-offset-2 transition-colors font-medium"
                              >
                                {writer}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      {inspectedDeal.gcdMetadata?.pencilers && inspectedDeal.gcdMetadata.pencilers.length > 0 && (
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-500">Penciler(s):</span>
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            {inspectedDeal.gcdMetadata.pencilers.map((penciler, idx) => (
                              <Link
                                key={idx}
                                href={`/comics?q=${encodeURIComponent(penciler)}`}
                                className="text-cyan-400 hover:text-cyan-200 underline underline-offset-2 transition-colors font-medium"
                              >
                                {penciler}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      {inspectedDeal.gcdMetadata?.coverArtists && inspectedDeal.gcdMetadata.coverArtists.length > 0 && (
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-500">Cover Artist(s):</span>
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            {inspectedDeal.gcdMetadata.coverArtists.map((artist, idx) => (
                              <Link
                                key={idx}
                                href={`/comics?q=${encodeURIComponent(artist)}`}
                                className="text-cyan-400 hover:text-cyan-200 underline underline-offset-2 transition-colors font-medium"
                              >
                                {artist}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      {inspectedDeal.gcdMetadata?.publisher && (
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-500">Publisher:</span>
                          <span className="text-slate-200 font-medium">
                            {inspectedDeal.gcdMetadata.publisher} ({inspectedDeal.gcdMetadata.publicationDate || inspectedDeal.resolvedYear})
                          </span>
                        </div>
                      )}
                      {inspectedDeal.gcdMetadata?.storylines && (
                        <div className="flex justify-between items-start text-slate-300 pt-1 border-t border-slate-800">
                          <span className="text-slate-500">Storyline / Arc:</span>
                          <span className="text-amber-300 font-medium text-right max-w-[70%]">
                            {inspectedDeal.gcdMetadata.storylines}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                      <Link
                        href={`/comics?q=${encodeURIComponent(inspectedDeal.resolvedSeries)}`}
                        className="text-slate-400 hover:text-slate-200 underline inline-flex items-center gap-1"
                      >
                        <span>Sovereign Series Catalog</span>
                        <span className="text-[10px]">↗</span>
                      </Link>
                      <Link
                        href={`/comics?q=${encodeURIComponent(inspectedDeal.resolvedSeries + " #" + inspectedDeal.resolvedIssue)}`}
                        className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline font-bold"
                      >
                        <span>Explore Full Comic Dossier</span>
                        <span>↗</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* ════════════════════════════════════════════════════════════════════════
                    PERSPECTIVE 5: SIGNATURE SERIES PROVENANCE (YELLOW LABEL ONLY)
                    ════════════════════════════════════════════════════════════════════════ */}
                {inspectedDeal.isYellowLabel && ((modalPerspective === "all" && fullResearch) || modalPerspective === "signature") && (
                  <div className="bg-[#070C18] border border-amber-500/60 rounded-xl p-4 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                      <span className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-1.5">
                        <span>✍️</span> SIGNED BOOK PRICING PROVENANCE (YELLOW LABEL)
                      </span>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {inspectedDeal.signaturePremiumMultiplier ? `+${Math.round((inspectedDeal.signaturePremiumMultiplier - 1) * 100)}% Sig Premium` : "Witnessed"}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-mono bg-black/60 p-3 rounded-lg border border-slate-800">
                      <div className="flex justify-between text-amber-200/90">
                        <span className="text-slate-400">Verified Signer:</span>
                        <strong className="text-white">{inspectedDeal.signerName || "Witnessed Creator Signature"}</strong>
                      </div>
                      <div className="flex justify-between text-amber-200/90">
                        <span className="text-slate-400">Authentication Service:</span>
                        <span className="text-amber-300 font-bold">CGC Signature Series™ Official Registry</span>
                      </div>
                      <div className="text-[10px] text-amber-300/80 leading-relaxed border-t border-amber-500/20 pt-2">
                        <strong className="text-amber-200">Signature Pricing Data Source: </strong>
                        Valuation is sourced directly from GPA Analysis CGC Signature Series™ realized auction sales and Heritage Auctions witnessed signature archives. Compares realized signature sales against standard unsigned blue label baseline.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* PLANS & TIER ACCESS MODAL */}
      {showPlansModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0E131F] border-2 border-purple-500/60 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-[0_0_50px_rgba(168,85,247,0.3)] p-6 space-y-6 font-sans">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40 uppercase">
                    💎 MEMBERSHIP &amp; TIER ACCESS
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                    FAIR PRICING PROMISE
                  </span>
                </div>
                <h2 className="text-xl font-black text-white mt-1.5 flex items-center gap-2">
                  <span>How We Charge For The Sniper</span>
                  <span className="text-purple-400 font-light text-base">(Included in Core Plans)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  No predatory pricing. Deal Radar &amp; Collector Academy are included directly in Pro plans so serious collectors never pay absurd $100/mo add-on fees.
                </p>
              </div>
              <button
                onClick={() => setShowPlansModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800 text-sm font-bold"
              >
                ✕ Close
              </button>
            </div>

            {/* Three Membership Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* TIER 1: STARTER */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-mono font-bold text-slate-300 uppercase">Collector Starter</span>
                    <span className="text-xs font-mono font-black text-slate-400">FREE</span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-white">
                    $0 <span className="text-xs font-normal text-slate-500">/ forever</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-xs font-mono text-slate-300">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400">✓</span>
                      <span>Full CE70 Equity Market Catalog</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400">✓</span>
                      <span>Portfolio Holdings Tracker</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400">✓</span>
                      <span>3 Paper Snipes / month</span>
                    </li>
                    <li className="flex items-start gap-1.5 text-slate-500">
                      <span className="text-rose-400">✕</span>
                      <span>Live Real-Time Sniper (15m delayed)</span>
                    </li>
                    <li className="flex items-start gap-1.5 text-slate-500">
                      <span className="text-rose-400">✕</span>
                      <span>Microwave Killzone Alerts</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowPlansModal(false)}
                  className="w-full py-2.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono font-bold hover:bg-slate-700 transition"
                >
                  Current Default Plan
                </button>
              </div>

              {/* TIER 2: PRO (RECOMMENDED - FAIR COLLECTOR PRICING) */}
              <div className="bg-gradient-to-b from-purple-950/40 via-purple-900/20 to-slate-900 border-2 border-purple-500 rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-xl relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-slate-950 text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow">
                  MOST POPULAR • FAIR PRICING
                </div>
                <div>
                  <div className="flex items-center justify-between border-b border-purple-500/30 pb-2">
                    <span className="text-xs font-mono font-bold text-purple-300 uppercase">Collector Pro</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">SNIPER INCLUDED</span>
                  </div>
                  <div className="mt-3 text-3xl font-black text-white">
                    $9.99 <span className="text-xs font-normal text-slate-400">/ mo or $89/yr</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-xs font-mono text-purple-100">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400">✓</span>
                      <strong className="text-white">24/7 Live Deal Radar (All 13 Exchanges)</strong>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400">✓</span>
                      <span>eBay-Style 2.5x Interactive Zoom Loupe</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400">✓</span>
                      <span>Microwave Killzone Alerts (&lt; 2m)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400">✓</span>
                      <span>Whole Tomato Sunk Cost Scanner (&lt;$45 slabs)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400">✓</span>
                      <span>All 5 Collector Academy Masterclasses</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400">✓</span>
                      <span>Unlimited Paper Snipes &amp; Vault CSV Export</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setShowPlansModal(false);
                    setSnipeSuccessToast("💎 Upgraded to Collector Pro! Full 24/7 Live Stream & Academy Unlocked.");
                  }}
                  className="w-full py-2.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-mono font-black uppercase tracking-wider transition shadow-lg cursor-pointer"
                >
                  Activate Collector Pro ($9.99/mo)
                </button>
              </div>

              {/* TIER 3: SOVEREIGN DESK */}
              <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-mono font-bold text-amber-300 uppercase">Sovereign Desk</span>
                    <span className="text-xs font-mono font-black text-amber-400">VIP / DESK</span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-white">
                    $19.99 <span className="text-xs font-normal text-slate-400">/ mo or $179/yr</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-xs font-mono text-slate-300">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400">✓</span>
                      <span>Everything in Collector Pro</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-300">✓</span>
                      <strong className="text-amber-200">Instant Telegram &amp; SMS Killzone Push Bots</strong>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-300">✓</span>
                      <span>Canadian Price Variant (CPV) Sleeper Bot</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-300">✓</span>
                      <span>Direct Webhook Triggers for Automated Bidding</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-300">✓</span>
                      <span>Tax-ready Equity &amp; Cost-Basis Accounting Ledgers</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setShowPlansModal(false);
                    setSnipeSuccessToast("👑 Activated Sovereign Desk! Instant Killzone Push Bots Unlocked.");
                  }}
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-black uppercase tracking-wider transition shadow cursor-pointer"
                >
                  Join Sovereign Desk ($19.99/mo)
                </button>
              </div>
            </div>

            {/* COLLECTOR ACADEMY INCLUDED MASTERCLASSES */}
            <div className="bg-black/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                  <span>🎓</span> INCLUDED MASTERCLASS COURSES (CBX ACADEMY)
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  FREE FOR PRO &amp; SOVEREIGN MEMBERS
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <strong className="text-amber-300 block mb-0.5">1. Sunk-Cost Slabbing Arbitrage</strong>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Learn how sellers lose $45+ grading fees on Modern 9.6/9.8 slabs and how to buy the slabbed comic for less than raw book cost.
                  </p>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <strong className="text-cyan-300 block mb-0.5">2. The $25 Reholder Play</strong>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Identifying scuffed or cracked cases that sell at 40% discount, then sending to CGC for a $25 fresh case to unlock full resale value.
                  </p>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <strong className="text-emerald-300 block mb-0.5">3. CPV Canadian 75¢/95¢ Hunt</strong>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    How to spot rare 1980s Canadian Price Variants (5% of print run) mislabeled by US sellers as regular direct copies.
                  </p>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <strong className="text-purple-300 block mb-0.5">4. Defect Diagnostics &amp; Pressing Bumps</strong>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Reading grader notes for non-color-breaking dents and light waves, cracking CBCS 9.4s, and heat-pressing them into CGC 9.8s.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
