import { getSourceTicker } from "@/lib/news/sourceTickerMap";

export interface VectorEntityMatch {
  id: string;
  name: string;
  type: "character" | "publisher" | "creator" | "title";
  ticker: string;
  score: number;
  metadata?: Record<string, unknown>;
}

const VECTOR_CACHE_TTL_MS = 10 * 60 * 1000;
const vectorCache = new Map<string, { timestamp: number; data: VectorEntityMatch[] }>();

// Hosted Pinecone Index Endpoints for Panel Profits Core Vector Estate (core 1024 & core-1536 1536)
const host = process.env.PINECONE_HOST || "";
const indexName = process.env.PINECONE_INDEX_NAME || "";

// Determine vector dimensions based on target index (1024 vs 1536)
const is1024 = indexName.toLowerCase() === "core" || indexName.includes("1024");
const dimensions = is1024 ? 1024 : 1536;

/**
 * Generates authentic neural text embeddings using Pinecone Inference API
 */
export async function generatePineconeEmbedding(
  text: string,
  target1024 = true
): Promise<number[] | null> {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey || !text) return null;

  try {
    const model = target1024 ? "multilingual-e5-large" : "text-embedding-3-small";
    const res = await fetch("https://api.pinecone.io/embed", {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json",
        "X-Pinecone-API-Version": "2024-10",
      },
      body: JSON.stringify({
        model,
        parameters: { input_type: "query", truncate: "END" },
        inputs: [{ text: text.slice(0, 512) }],
      }),
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { data?: Array<{ values: number[] }> };
    return data.data?.[0]?.values || null;
  } catch {
    return null;
  }
}

export async function queryPineconeVectorIndex(queryText: string, topK = 10): Promise<VectorEntityMatch[]> {
  const apiKey = process.env.PINECONE_API_KEY;
  const normalizedQuery = queryText.trim().toLowerCase();
  if (!apiKey || !normalizedQuery || !host) return [];

  const cacheKey = `${normalizedQuery}:${topK}`;
  const cached = vectorCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < VECTOR_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const neuralEmbedding = await generatePineconeEmbedding(normalizedQuery, is1024);
    // No real embedding of the right size → no vector search (never query with a made-up vector).
    if (!neuralEmbedding || neuralEmbedding.length !== dimensions) return [];
    const vector = neuralEmbedding;

    // Query primary namespace where 63,900+ comic records live, plus core namespace
    const response = await fetch(`${host}/query`, {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        topK,
        includeMetadata: true,
        namespace: "",
        vector,
      }),
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`Pinecone vector query returned status ${response.status}`);
      return [];
    }

    const payload = (await response.json()) as { matches?: Array<Record<string, unknown>> };
    if (!payload.matches || !Array.isArray(payload.matches)) return [];

    const results: VectorEntityMatch[] = payload.matches.map((match) => {
      const metadata = (match.metadata as Record<string, unknown>) || {};
      const name = String(metadata.name || metadata.title || match.id || "Unknown Entity");
      const entityType = (metadata.type as VectorEntityMatch["type"]) || "character";
      return {
        id: String(match.id),
        name,
        type: entityType,
        ticker: `$${getSourceTicker(name)}`,
        score: Number(match.score || 0),
        metadata,
      };
    });

    vectorCache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  } catch (error) {
    console.warn("Pinecone vector index query failed:", error instanceof Error ? error.message : error);
    return [];
  }
}
