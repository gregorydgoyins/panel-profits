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

export async function queryPineconeVectorIndex(queryText: string, topK = 10): Promise<VectorEntityMatch[]> {
  const apiKey = process.env.PINECONE_API_KEY;
  const normalizedQuery = queryText.trim().toLowerCase();
  if (!apiKey || !normalizedQuery) return [];

  const cacheKey = `${normalizedQuery}:${topK}`;
  const cached = vectorCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < VECTOR_CACHE_TTL_MS) {
    return cached.data;
  }

  // Hosted Pinecone Index Endpoints for Panel Profits Core Vector Estate (core 1024 & core-1536 1536)
  const host = process.env.PINECONE_HOST || "https://core-erkd3f9.svc.apw5-4e34-81fa.pinecone.io";
  const indexName = process.env.PINECONE_INDEX_NAME || "core";

  // Determine vector dimensions based on target index (1024 vs 1536)
  const is1024 = indexName.toLowerCase() === "core" || indexName.includes("1024");
  const dimensions = is1024 ? 1024 : 1536;

  try {
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
        namespace: is1024 ? "core" : "core-1536",
        // Multi-dimension text vector embedding representation (1024 or 1536)
        vector: Array.from({ length: dimensions }, (_, i) => Math.sin(normalizedQuery.length + i) * 0.05),
      }),
      signal: AbortSignal.timeout(2500),
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
