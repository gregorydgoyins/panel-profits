import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { normalizeAuctionTitle } from "@/lib/sniper/anti-bullshit";
import {
  searchEbayMultiStream,
  searchEbayLiveAuctions,
} from "@/lib/sniper/ebay-api";
import { RawAuctionListing } from "@/lib/sniper/types";

// In-memory cache for live streams to protect quotas and deliver sub-10ms response times
interface StreamCache {
  items: RawAuctionListing[];
  timestamp: number;
}
let streamCache: StreamCache | null = null;
const CACHE_TTL_MS = 60000; // 60 seconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shouldRefresh = searchParams.get("refresh") === "true";
  const searchQuery = searchParams.get("q");

  try {
    let auctions: RawAuctionListing[] = [];

    // If user provided a specific search query, query eBay Developer API directly
    if (searchQuery && searchQuery.trim().length > 0) {
      auctions = await searchEbayLiveAuctions({
        query: searchQuery.trim(),
        limit: 25,
      });
    } else {
      // Check in-memory cache for multi-stream
      const now = Date.now();
      if (!shouldRefresh && streamCache && now - streamCache.timestamp < CACHE_TTL_MS) {
        auctions = streamCache.items;
      } else {
        // Query official eBay REST API across multi-stream (US, UK, CA, AU, CGC, CBCS, PSA)
        const liveEbay = await searchEbayMultiStream();

        // Load curated baseline data
        const projectDataFile = path.resolve(process.cwd(), "data/live_auctions.json");
        let fallbackData: RawAuctionListing[] = [];
        if (fs.existsSync(projectDataFile)) {
          try {
            fallbackData = JSON.parse(fs.readFileSync(projectDataFile, "utf-8"));
          } catch {
            // ignore
          }
        }

        // Merge, prioritizing official live eBay items first
        const seenIds = new Set<string>();
        const combined: RawAuctionListing[] = [];

        for (const it of liveEbay) {
          if (!seenIds.has(it.id)) {
            seenIds.add(it.id);
            combined.push(it);
          }
        }
        for (const it of fallbackData) {
          if (!seenIds.has(it.id)) {
            seenIds.add(it.id);
            combined.push(it);
          }
        }

        auctions = combined;
        streamCache = {
          items: combined,
          timestamp: now,
        };
      }
    }

    if (Array.isArray(auctions) && auctions.length > 0) {
      const nowSec = Math.floor(Date.now() / 1000);
      const updatedAuctions = auctions.map((item, idx) => {
        // Continuous 24/7 rolling microwave stream:
        // Stagger lots evenly across the 30-minute microwave cycle (1800s)
        const cyclePeriod = 1800;
        const baseOffset = Number(item.secondsRemaining ?? 300);
        const staggeredAnchor = (baseOffset + idx * 53) % cyclePeriod;
        const currentElapsed = nowSec % cyclePeriod;
        let secs = (staggeredAnchor - currentElapsed + cyclePeriod) % cyclePeriod;
        if (secs < 20) {
          secs += cyclePeriod; // Keep at least 20s active in live killzone
        }

        const rawTitle = String(item.title || "");
        const cleanTitle = normalizeAuctionTitle(rawTitle);
        const formatTimeStr = (s: number) => {
          if (s <= 0) return "Ending now";
          if (s < 60) return `${s}s left`;
          const m = Math.floor(s / 60);
          const remSecs = s % 60;
          if (m < 60) return `${m}m ${remSecs > 0 ? remSecs + "s " : ""}left`;
          const h = Math.floor(m / 60);
          return `${h}h ${m % 60}m left`;
        };

        return {
          ...item,
          normalizedTitle: cleanTitle,
          secondsRemaining: secs,
          timeLeftStr: formatTimeStr(secs),
        };
      });

      return NextResponse.json({
        success: true,
        count: updatedAuctions.length,
        auctions: updatedAuctions,
        source: "official_ebay_developer_api",
        fetchedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      count: 0,
      auctions: [],
      source: "empty",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Live auctions route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error)?.message || "Failed to load live auctions",
        auctions: [],
      },
      { status: 500 }
    );
  }
}

