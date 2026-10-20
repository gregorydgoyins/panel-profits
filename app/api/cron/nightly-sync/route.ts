import { NextRequest, NextResponse } from "next/server";
import { syncGoCollectCpi } from "@/lib/gocollect/cpi-sync";
import { getStorySummary } from "@/lib/comics/story-summary";
import { createAdminServerClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export interface NightlyReportDigest {
  id: string;
  timestamp: string;
  timestamp_formatted: string;
  status: "SUCCESS" | "PARTIAL" | "ERROR";
  duration_ms: number;
  tasks: {
    pricecharting_api: {
      status: "UP" | "DOWN";
      token_valid: boolean;
      latency_ms: number;
      message: string;
    };
    gocollect_cpi: {
      status: string;
      details?: Record<string, unknown>;
    };
    lore_prewarming: {
      status: "SUCCESS" | "SKIPPED" | "ERROR";
      books_processed: number;
      titles: string[];
    };
    system_health: {
      database: "CONNECTED" | "UNREACHABLE";
      node_version: string;
      memory_rss_mb: number;
    };
  };
  summary: string;
}

// In-memory cache of the latest report for instant viewing
let latestReportCache: NightlyReportDigest | null = null;

export async function GET(req: NextRequest) {
  // Allow viewing latest report via ?view=latest without authentication
  const isViewOnly = req.nextUrl.searchParams.get("view") === "latest";
  if (isViewOnly && latestReportCache) {
    return NextResponse.json(latestReportCache);
  }

  // Authorization check for cron trigger
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  const queryToken = req.nextUrl.searchParams.get("secret") || req.nextUrl.searchParams.get("token");
  const secrets = [process.env.CRON_SECRET, process.env.GPA_INGESTION_SECRET].filter(Boolean);
  const fromVercelCron = (req.headers.get("user-agent") || "").startsWith("vercel-cron/");

  const isAuthorized =
    fromVercelCron ||
    (bearer && secrets.includes(bearer)) ||
    (queryToken && secrets.includes(queryToken)) ||
    secrets.length === 0; // fallback in local development if no secret set

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized: Invalid CRON_SECRET" }, { status: 401 });
  }

  const startTime = Date.now();
  const reportId = crypto.randomUUID();
  const now = new Date();

  const report: NightlyReportDigest = {
    id: reportId,
    timestamp: now.toISOString(),
    timestamp_formatted: now.toLocaleString("en-US", { timeZone: "America/New_York" }) + " EDT",
    status: "SUCCESS",
    duration_ms: 0,
    tasks: {
      pricecharting_api: {
        status: "DOWN",
        token_valid: false,
        latency_ms: 0,
        message: "Pending",
      },
      gocollect_cpi: {
        status: "Pending",
      },
      lore_prewarming: {
        status: "SKIPPED",
        books_processed: 0,
        titles: [],
      },
      system_health: {
        database: "UNREACHABLE",
        node_version: process.version,
        memory_rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    },
    summary: "",
  };

  // 1. Task: PriceCharting API Health & Active Token Verification
  // Keep the PriceCharting API credential in Vercel's encrypted environment only.
  // The CSV loader uses PRICECHARTING_CSV_URL separately; this probe is API health only.
  const pcToken = process.env.PRICECHARTING_API_TOKEN?.trim();
  const pcStart = Date.now();
  try {
    if (!pcToken) {
      report.tasks.pricecharting_api = {
        status: "DOWN",
        token_valid: false,
        latency_ms: 0,
        message: "PRICECHARTING_API_TOKEN is not configured",
      };
      report.status = "PARTIAL";
    } else {
      const pcRes = await fetch(`https://www.pricecharting.com/api/products?t=${pcToken}&q=spider-man`, {
        cache: "no-store",
        headers: { "user-agent": "PanelProfitsBot/1.0" },
      });
      const pcLatency = Date.now() - pcStart;
      if (pcRes.ok) {
        const pcData = await pcRes.json();
        const count = Array.isArray(pcData?.products) ? pcData.products.length : 0;
        report.tasks.pricecharting_api = {
          status: "UP",
          token_valid: true,
          latency_ms: pcLatency,
          message: `Token valid and active. ${count} products matched test probe.`,
        };
      } else {
        report.tasks.pricecharting_api = {
          status: "DOWN",
          token_valid: false,
          latency_ms: pcLatency,
          message: `HTTP ${pcRes.status}: ${pcRes.statusText}`,
        };
        report.status = "PARTIAL";
      }
    }
  } catch (err: unknown) {
    report.tasks.pricecharting_api = {
      status: "DOWN",
      token_valid: false,
      latency_ms: Date.now() - pcStart,
      message: (err as Error).message,
    };
    report.status = "PARTIAL";
  }

  // 2. Task: GoCollect CPI Sync
  try {
    const gcResult = await syncGoCollectCpi();
    report.tasks.gocollect_cpi = {
      status: gcResult.ok ? "SUCCESS" : "PARTIAL",
      details: gcResult as unknown as Record<string, unknown>,
    };
  } catch (err: unknown) {
    report.tasks.gocollect_cpi = {
      status: "ERROR",
      details: { error: (err as Error).message },
    };
    report.status = "PARTIAL";
  }

  // 3. Task: Lore & Due Diligence Pre-warming (Top Benchmark Books)
  const priorityLoreBooks = [
    { series: "Avengers", issueNumber: "2", year: 2013, publisher: "Marvel", volume: 5 },
    { series: "Batman", issueNumber: "251", year: 1973, publisher: "DC Comics", volume: 1 },
    { series: "Amazing Spider-Man", issueNumber: "300", year: 1988, publisher: "Marvel", volume: 1 },
    { series: "Giant-Size X-Men", issueNumber: "1", year: 1975, publisher: "Marvel", volume: 1 },
  ];

  const prewarmedTitles: string[] = [];
  try {
    for (const b of priorityLoreBooks) {
      const summary = await getStorySummary(b);
      if (summary) {
        prewarmedTitles.push(`${b.series} #${b.issueNumber} (${summary.storyTitle || "synopsis"})`);
      }
    }
    report.tasks.lore_prewarming = {
      status: "SUCCESS",
      books_processed: prewarmedTitles.length,
      titles: prewarmedTitles,
    };
  } catch (err: unknown) {
    report.tasks.lore_prewarming = {
      status: "ERROR",
      books_processed: prewarmedTitles.length,
      titles: prewarmedTitles,
    };
    report.status = "PARTIAL";
  }

  // 4. Task: Database Connectivity Verification
  try {
    const db = createAdminServerClient();
    const { error: dbErr } = await db.from("issue_story_summaries").select("comic_key").limit(1);
    report.tasks.system_health.database = dbErr ? "UNREACHABLE" : "CONNECTED";
  } catch {
    report.tasks.system_health.database = "UNREACHABLE";
  }

  // Wrap-up Digest
  report.duration_ms = Date.now() - startTime;
  report.summary =
    report.status === "SUCCESS"
      ? `Nightly audit completed cleanly in ${report.duration_ms}ms. All providers responsive.`
      : `Nightly audit completed with partial warnings in ${report.duration_ms}ms. Inspect task details.`;

  latestReportCache = report;

  return NextResponse.json(report, { status: report.status === "ERROR" ? 500 : 200 });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
