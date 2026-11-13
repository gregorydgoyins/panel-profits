/**
 * News video reels (D-ID). Runs on Render (POST /api/jobs/video-reels) on a pg_cron schedule.
 *
 * Each run:
 *   1. Finishes pending reels: polls D-ID; when done, copies the MP4 into Supabase Storage
 *      (bucket video-reels — D-ID result links expire) and marks the reel READY. Errors → FAILED.
 *   2. Starts reels for the newest relevant stories that have none, up to VIDEO_REELS_PER_RUN
 *      (default 2) — each reel spends D-ID credits.
 * A story only ever shows its own finished reel; nothing is borrowed from another story.
 */
import { createAdminServerClient } from "@/lib/supabase/admin";
import { isRelevantComicStory } from "@/lib/news/self-healing";
import { sanitizeNewsText } from "@/lib/news/sanitize";
import { listDidPresenters, createDidVideo, getDidVideo, type DidPresenter } from "@/lib/video/did";

const STALE_MS = 2 * 3600_000;

function voiceFor(p: DidPresenter): string {
  return /female|woman/i.test(p.gender ?? "") ? "en-US-JennyNeural" : "en-US-GuyNeural";
}

function buildScript(headline: string, summary: string | null): string {
  const body = sanitizeNewsText(summary || "").replace(/\s+/g, " ").trim();
  const trimmed = body.length > 420 ? body.slice(0, 420).replace(/[^.!?]*$/, "").trim() || body.slice(0, 420) : body;
  return `This is the Panel Profits market briefing. ${sanitizeNewsText(headline)}. ${trimmed}`.trim();
}

export async function runVideoReels(opts: { perRun?: number } = {}) {
  const db = createAdminServerClient();
  const perRun = opts.perRun ?? Number(process.env.VIDEO_REELS_PER_RUN || 2);
  let finished = 0, failed = 0, started = 0;

  // 1. Finish pending reels
  const { data: pending } = await db
    .from("pp_video_reels")
    .select("id, story_id, provider_job_id, created_at")
    .eq("status", "PROCESSING")
    .not("provider_job_id", "is", null)
    .limit(50);
  for (const r of pending ?? []) {
    const clip = await getDidVideo(r.provider_job_id);
    if (clip.status === "done" && clip.resultUrl) {
      try {
        const mp4 = await fetch(clip.resultUrl, { cache: "no-store" });
        if (!mp4.ok) throw new Error(`download HTTP ${mp4.status}`);
        const path = `${r.story_id}/${r.id}.mp4`;
        const { error: upErr } = await db.storage
          .from("video-reels")
          .upload(path, Buffer.from(await mp4.arrayBuffer()), { contentType: "video/mp4", upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = db.storage.from("video-reels").getPublicUrl(path);
        await db.from("pp_video_reels").update({ status: "READY", video_url: pub.publicUrl, updated_at: new Date().toISOString() }).eq("id", r.id);
        finished++;
      } catch (e) {
        await db.from("pp_video_reels").update({ status: "FAILED", error: String((e as Error).message).slice(0, 300), updated_at: new Date().toISOString() }).eq("id", r.id);
        failed++;
      }
    } else if (clip.status === "error" || clip.status === "rejected" || Date.now() - Date.parse(r.created_at) > STALE_MS) {
      await db.from("pp_video_reels").update({ status: "FAILED", error: clip.error ?? `D-ID status ${clip.status}`, updated_at: new Date().toISOString() }).eq("id", r.id);
      failed++;
    }
  }

  // 2. Start reels for the newest relevant stories without one
  if (perRun > 0) {
    const { data: stories } = await db
      .from("pp_news_stories")
      .select("id, source, headline, summary, published_at")
      .is("archived_at", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(60);
    const candidates = (stories ?? []).filter((s) => isRelevantComicStory(s.source, s.headline, s.summary));
    const ids = candidates.map((s) => String(s.id));
    const { data: existing } = ids.length
      ? await db.from("pp_video_reels").select("story_id").in("story_id", ids).in("status", ["READY", "PROCESSING"])
      : { data: [] as Array<{ story_id: string }> };
    const have = new Set((existing ?? []).map((e) => String(e.story_id)));
    const todo = candidates.filter((s) => !have.has(String(s.id))).slice(0, perRun);

    if (todo.length) {
      const presenters = await listDidPresenters();
      if (!presenters.length) throw new Error("D-ID returned no presenters");
      for (const [i, s] of todo.entries()) {
        const p = presenters[(Date.parse(s.published_at ?? "") / 3600_000 + i) % presenters.length | 0] ?? presenters[0];
        const script = buildScript(s.headline, s.summary);
        try {
          const jobId = await createDidVideo(p, script, voiceFor(p));
          await db.from("pp_video_reels").insert({
            story_id: String(s.id),
            headline: s.headline,
            presenter_name: p.name ?? "D-ID presenter",
            presenter_role: "Panel Profits market briefing (AI presenter)",
            video_url: null,
            poster_url: p.thumbnail_url ?? p.image_url ?? null,
            transcript: script,
            duration_seconds: null,
            provider: "did",
            provider_job_id: jobId,
            status: "PROCESSING",
          });
          started++;
        } catch (e) {
          await db.from("pp_video_reels").insert({
            story_id: String(s.id), headline: s.headline, presenter_name: p.name ?? "D-ID presenter",
            transcript: script, provider: "did", status: "FAILED", error: String((e as Error).message).slice(0, 300),
          });
          failed++;
        }
      }
    }
  }

  return { finished, started, failed };
}
