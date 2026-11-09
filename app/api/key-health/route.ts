import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Result = { configured: boolean; ok?: boolean; status?: number; note?: string };

const env = (k: string) => process.env[k] || "";

async function probe(url: string, init: RequestInit = {}, okWhen?: (status: number, body: string) => boolean): Promise<Result> {
  try {
    const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(15000) });
    const body = await res.text();
    const ok = okWhen ? okWhen(res.status, body) : res.ok;
    return { configured: true, ok, status: res.status, note: ok ? undefined : body.slice(0, 140) };
  } catch (err) {
    return { configured: true, ok: false, note: String(err).slice(0, 140) };
  }
}

/** Diagnostic: checks every external API key this server uses, with free / minimal calls. Never returns key values. */
export async function GET() {
  const r: Record<string, Result> = {};
  const has = (k: string) => Boolean(env(k));
  const skip = (k: string): Result => ({ configured: false });

  const sbUrl = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL");
  for (const k of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"]) {
    r[k] = has(k) && sbUrl
      ? await probe(`${sbUrl}/rest/v1/verified_equities?select=id&limit=1`, { headers: { apikey: env(k), Authorization: `Bearer ${env(k)}` } })
      : skip(k);
  }
  r.PRICECHARTING_API_TOKEN = has("PRICECHARTING_API_TOKEN")
    ? await probe(`https://www.pricecharting.com/api/product?t=${env("PRICECHARTING_API_TOKEN")}&id=2412811`, {}, (s, b) => s === 200 && b.includes('"success"'))
    : skip("PRICECHARTING_API_TOKEN");
  r.GEMINI_API_KEY = has("GEMINI_API_KEY") ? await probe(`https://generativelanguage.googleapis.com/v1beta/models?key=${env("GEMINI_API_KEY")}&pageSize=1`) : skip("");
  r.YOUTUBE_API_KEY = has("YOUTUBE_API_KEY") ? await probe(`https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${env("YOUTUBE_API_KEY")}`) : skip("");
  r.ELEVENLABS_API_KEY = has("ELEVENLABS_API_KEY") ? await probe("https://api.elevenlabs.io/v1/user", { headers: { "xi-api-key": env("ELEVENLABS_API_KEY") } }) : skip("");
  r.HEYGEN_API_KEY = has("HEYGEN_API_KEY") ? await probe("https://api.heygen.com/v2/user/remaining_quota", { headers: { "X-Api-Key": env("HEYGEN_API_KEY") } }) : skip("");
  r.DID_API_KEY = has("DID_API_KEY") ? await probe("https://api.d-id.com/credits", { headers: { Authorization: `Basic ${env("DID_API_KEY")}` } }) : skip("");
  r.RUNWAYML_API_SECRET = has("RUNWAYML_API_SECRET") ? await probe("https://api.dev.runwayml.com/v1/organization", { headers: { Authorization: `Bearer ${env("RUNWAYML_API_SECRET")}`, "X-Runway-Version": "2024-11-06" } }) : skip("");
  r.PINECONE_API_KEY = has("PINECONE_API_KEY") ? await probe("https://api.pinecone.io/indexes", { headers: { "Api-Key": env("PINECONE_API_KEY") } }) : skip("");
  r.THENEWSAPI_API_KEY = has("THENEWSAPI_API_KEY") ? await probe(`https://api.thenewsapi.com/v1/news/all?api_token=${env("THENEWSAPI_API_KEY")}&limit=1`) : skip("");
  r.NEWS_API_KEY = has("NEWS_API_KEY") ? await probe(`https://newsapi.org/v2/top-headlines?country=us&pageSize=1&apiKey=${env("NEWS_API_KEY")}`) : skip("");
  r.NEWSDATA_API_KEY = has("NEWSDATA_API_KEY") ? await probe(`https://newsdata.io/api/1/latest?apikey=${env("NEWSDATA_API_KEY")}&size=1`) : skip("");
  r.PERIGON_API_KEY = has("PERIGON_API_KEY") ? await probe(`https://api.goperigon.com/v1/all?apiKey=${env("PERIGON_API_KEY")}&size=1`) : skip("");
  r.EBAY_CLIENT_ID_SECRET = has("EBAY_CLIENT_ID") && has("EBAY_CLIENT_SECRET")
    ? await probe(`https://api${env("EBAY_ENV") === "sandbox" ? ".sandbox" : ""}.ebay.com/identity/v1/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${Buffer.from(`${env("EBAY_CLIENT_ID")}:${env("EBAY_CLIENT_SECRET")}`).toString("base64")}` },
        body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
      })
    : skip("");
  // Paid-per-call or no free auth endpoint: report presence only.
  for (const k of ["COMPSNIPER_API_KEY", "ASKNEWS_API_KEY", "AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN", "CRON_SECRET", "SNIPER_AUTH_SECRET", "SNIPER_PASSCODES", "GPA_INGESTION_SECRET", "EBAY_VERIFICATION_TOKEN"]) {
    r[k] = { configured: has(k), note: "presence only (no free check)" };
  }
  return NextResponse.json(r);
}
