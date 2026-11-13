import { NextRequest, NextResponse, after } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { runPricechartingSync } from "@/lib/jobs/pricecharting-sync";
import { runComichronIngest } from "@/lib/jobs/comichron-ingest";
import { runFullNewsIngest } from "@/lib/jobs/news-ingest";
import { runVideoReels } from "@/lib/jobs/video-reels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Background data jobs, run on Render with Render's own env keys.
 * Triggered by Supabase pg_cron (net.http_post) with the job's token from
 * public.job_triggers in the `x-job-token` header. Each run is logged in public.job_runs.
 */
const JOBS: Record<string, (params: Record<string, unknown>) => Promise<unknown>> = {
  "pricecharting-sync": (p) => runPricechartingSync({ batch: p.batch ? Number(p.batch) : undefined, concurrency: p.concurrency ? Number(p.concurrency) : undefined }),
  "comichron-ingest": (p) => runComichronIngest({ from: p.from ? String(p.from) : undefined, to: p.to ? String(p.to) : undefined }),
  "news-ingest": () => runFullNewsIngest(),
  "video-reels": (p) => runVideoReels({ perRun: p.perRun != null ? Number(p.perRun) : undefined }),
};

const running = ((globalThis as any).__ppJobsRunning ??= new Set<string>()) as Set<string>;

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;
  const run = JOBS[job];
  if (!run) return NextResponse.json({ error: "Unknown job" }, { status: 404 });

  const db = createAdminServerClient();
  const { data: trig } = await db.from("job_triggers").select("token").eq("name", job).maybeSingle();
  const token = req.headers.get("x-job-token") || "";
  if (!trig?.token || !token || !same(token, trig.token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (running.has(job)) return NextResponse.json({ status: "already running" }, { status: 409 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { data: row } = await db.from("job_runs").insert({ job, params: body }).select("id").single();
  running.add(job);

  after(async () => {
    try {
      const summary = await run(body);
      await db.from("job_runs").update({ status: "ok", summary, finished_at: new Date().toISOString() }).eq("id", row?.id);
    } catch (e) {
      await db.from("job_runs").update({ status: "error", error: String((e as Error)?.message ?? e).slice(0, 2000), finished_at: new Date().toISOString() }).eq("id", row?.id);
    } finally {
      running.delete(job);
    }
  });

  return NextResponse.json({ status: "started", runId: row?.id ?? null }, { status: 202 });
}
