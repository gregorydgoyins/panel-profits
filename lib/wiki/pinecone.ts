import { getSourceTicker } from "@/lib/news/sourceTickerMap";

export interface VectorEntityMatch {
  id: string;
  name: string;
  type: "character" | "publisher" | "creator" | "title";
  ticker: string;
  score: number;
  metadata?: Record<string, unknown>;
  /** Which Pinecone index / namespace the match came from. */
  index?: string;
}

const VECTOR_CACHE_TTL_MS = 10 * 60 * 1000;
const vectorCache = new Map<string, { timestamp: number; data: VectorEntityMatch[] }>();

/**
 * Two Pinecone indexes, each searched with the SAME embedding model that built it:
 *  - core      (1024-d, 64k comic/character records): Pinecone Inference `multilingual-e5-large`
 *  - core-1536 (1536-d, project docs + video catalog): OpenAI `text-embedding-3-small`
 * If a real embedding can't be produced for an index, that index is skipped — never a made-up vector.
 */
const CORE_HOST = process.env.PINECONE_HOST || "";
const CORE_1536_HOST = process.env.PINECONE_HOST_1536 || "";

/** Pinecone Inference embedding (1024-d, multilingual-e5-large). */
export async function generatePineconeEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey || !text) return null;
  try {
    const res = await fetch("https://api.pinecone.io/embed", {
      method: "POST",
      headers: { "Api-Key": apiKey, "Content-Type": "application/json", "X-Pinecone-API-Version": "2024-10" },
      body: JSON.stringify({
        model: "multilingual-e5-large",
        parameters: { input_type: "query", truncate: "END" },
        inputs: [{ text: text.slice(0, 512) }],
      }),
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: Array<{ values: number[] }> };
    const v = data.data?.[0]?.values;
    return v && v.length === 1024 ? v : null;
  } catch {
    return null;
  }
}

/** OpenAI embedding (1536-d, text-embedding-3-small) — the model core-1536 was built with. */
export async function generateOpenAiEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !text) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 2000) }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    const v = data.data?.[0]?.embedding;
    return v && v.length === 1536 ? v : null;
  } catch {
    return null;
  }
}

async function queryIndex(host: string, vector: number[], namespace: string, topK: number, label: string): Promise<VectorEntityMatch[]> {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey || !host) return [];
  const response = await fetch(`${host}/query`, {
    method: "POST",
    headers: { "Api-Key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ topK, includeMetadata: true, namespace, vector }),
    signal: AbortSignal.timeout(3000),
    cache: "no-store",
  });
  if (!response.ok) {
    console.warn(`Pinecone ${label} query returned status ${response.status}`);
    return [];
  }
  const payload = (await response.json()) as { matches?: Array<Record<string, unknown>> };
  return (payload.matches ?? []).map((match) => {
    const metadata = (match.metadata as Record<string, unknown>) || {};
    const name = String(metadata.name || metadata.title || match.id || "Unknown Entity");
    const entityType = (metadata.type as VectorEntityMatch["type"]) || "character";
    const corpTicker = getSourceTicker(name);
    return {
      id: String(match.id),
      name,
      type: entityType,
      ticker: corpTicker ? `$${corpTicker}` : "",
      score: Number(match.score || 0),
      metadata,
      index: label,
    };
  });
}

export async function queryPineconeVectorIndex(queryText: string, topK = 10): Promise<VectorEntityMatch[]> {
  const normalizedQuery = queryText.trim().toLowerCase();
  if (!process.env.PINECONE_API_KEY || !normalizedQuery) return [];

  const cacheKey = `${normalizedQuery}:${topK}`;
  const cached = vectorCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < VECTOR_CACHE_TTL_MS) return cached.data;

  try {
    const [v1024, v1536] = await Promise.all([
      CORE_HOST ? generatePineconeEmbedding(normalizedQuery) : Promise.resolve(null),
      CORE_1536_HOST ? generateOpenAiEmbedding(normalizedQuery) : Promise.resolve(null),
    ]);
    const searches: Array<Promise<VectorEntityMatch[]>> = [];
    if (v1024) searches.push(queryIndex(CORE_HOST, v1024, "", topK, "core"));
    if (v1536) {
      searches.push(queryIndex(CORE_1536_HOST, v1536, "", topK, "core-1536"));
      searches.push(queryIndex(CORE_1536_HOST, v1536, "video", topK, "core-1536/video"));
    }
    const settled = await Promise.allSettled(searches);
    const results = settled
      .flatMap((s) => (s.status === "fulfilled" ? s.value : []))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    vectorCache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  } catch (error) {
    console.warn("Pinecone vector index query failed:", error instanceof Error ? error.message : error);
    return [];
  }
}
