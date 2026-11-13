/**
 * D-ID Clips API client. Uses D-ID's own licensed stock presenters — never animates
 * photos of real people we don't have rights to.
 * Docs: https://docs.d-id.com/reference/createclip
 */
const BASE = "https://api.d-id.com";

function auth(): string {
  const key = process.env.DID_API_KEY;
  if (!key) throw new Error("DID_API_KEY not set");
  return `Basic ${key}`;
}

export interface DidPresenter {
  presenter_id: string;
  name?: string;
  gender?: string;
  thumbnail_url?: string;
  image_url?: string;
}

let presenterCache: { at: number; list: DidPresenter[] } | null = null;

export async function listDidPresenters(): Promise<DidPresenter[]> {
  if (presenterCache && Date.now() - presenterCache.at < 6 * 3600_000) return presenterCache.list;
  const res = await fetch(`${BASE}/clips/presenters?limit=100`, { headers: { Authorization: auth() }, cache: "no-store" });
  if (!res.ok) throw new Error(`D-ID presenters HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const list: DidPresenter[] = (data.presenters ?? []).filter((p: DidPresenter) => p.presenter_id);
  presenterCache = { at: Date.now(), list };
  return list;
}

export async function createDidClip(presenterId: string, script: string, voiceId: string): Promise<string> {
  const res = await fetch(`${BASE}/clips`, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      presenter_id: presenterId,
      script: { type: "text", input: script, provider: { type: "microsoft", voice_id: voiceId } },
      config: { result_format: "mp4" },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`D-ID create clip HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  if (!data.id) throw new Error("D-ID create clip returned no id");
  return String(data.id);
}

export async function getDidClip(id: string): Promise<{ status: string; resultUrl: string | null; error: string | null }> {
  const res = await fetch(`${BASE}/clips/${id}`, { headers: { Authorization: auth() }, cache: "no-store" });
  if (!res.ok) return { status: "unknown", resultUrl: null, error: `HTTP ${res.status}` };
  const d = await res.json();
  return {
    status: String(d.status ?? "unknown"),
    resultUrl: d.result_url ?? null,
    error: d.error ? JSON.stringify(d.error).slice(0, 300) : null,
  };
}
