import { NextRequest, NextResponse } from "next/server";
import { generateElevenLabsAudio, PRESENTERS, lastElevenLabsError } from "@/lib/video/pipeline";
import { sanitizeNewsText } from "@/lib/news/sanitize";
import crypto from "crypto";

// In-memory cache for synthesized audio buffers (stores up to 200 briefings)
const AUDIO_CACHE = new Map<string, { buffer: Buffer; createdAt: number }>();
const MAX_CACHE_ENTRIES = 200;

function getCacheKey(text: string, voiceId: string): string {
  return crypto.createHash("sha256").update(`${voiceId}:${text}`).digest("hex");
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawText = searchParams.get("text") || "";
  const storyId = searchParams.get("storyId") || "";
  const presenterKey = searchParams.get("presenter") || "corinne";
  const presenter = PRESENTERS[presenterKey] || PRESENTERS.corinne;
  const voiceId = searchParams.get("voiceId") || presenter.voiceId;

  const cleanText = sanitizeNewsText(rawText);
  if (!cleanText || cleanText.length < 5) {
    return NextResponse.json({ error: "Missing or invalid text parameter" }, { status: 400 });
  }

  // Ensure the spoken script is a crisp two-sentence executive brief
  const broadcastScript = cleanText.length > 500 ? cleanText.slice(0, 500).replace(/\.[^.]*$/, ".") : cleanText;

  const cacheKey = storyId ? `story:${storyId}:${voiceId}` : getCacheKey(broadcastScript, voiceId);

  const cached = AUDIO_CACHE.get(cacheKey);
  if (cached) {
    return new Response(new Uint8Array(cached.buffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Audio-Source": "cache",
      },
    });
  }

  try {
    const audioBuffer = await generateElevenLabsAudio(broadcastScript, voiceId);
    if (!audioBuffer) {
      return NextResponse.json(
        { error: "Neural TTS generation unavailable", detail: lastElevenLabsError, fallback: true },
        { status: 503 }
      );
    }

    // Cache the synthesized audio buffer
    if (AUDIO_CACHE.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = AUDIO_CACHE.keys().next().value;
      if (oldestKey) AUDIO_CACHE.delete(oldestKey);
    }
    AUDIO_CACHE.set(cacheKey, { buffer: audioBuffer, createdAt: Date.now() });

    return new Response(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Audio-Source": "elevenlabs-neural",
      },
    });
  } catch (error) {
    console.error("[TTS API] Error generating audio:", error);
    return NextResponse.json(
      { error: "Internal TTS error", fallback: true },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawText = body.text || "";
    const storyId = body.storyId || "";
    const presenterKey = body.presenter || "corinne";
    const presenter = PRESENTERS[presenterKey] || PRESENTERS.corinne;
    const voiceId = body.voiceId || presenter.voiceId;

    const cleanText = sanitizeNewsText(rawText);
    if (!cleanText || cleanText.length < 5) {
      return NextResponse.json({ error: "Missing or invalid text parameter" }, { status: 400 });
    }

    const broadcastScript = cleanText.length > 500 ? cleanText.slice(0, 500).replace(/\.[^.]*$/, ".") : cleanText;
    const cacheKey = storyId ? `story:${storyId}:${voiceId}` : getCacheKey(broadcastScript, voiceId);

    const cached = AUDIO_CACHE.get(cacheKey);
    if (cached) {
      return new Response(new Uint8Array(cached.buffer), {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          "X-Audio-Source": "cache",
        },
      });
    }

    const audioBuffer = await generateElevenLabsAudio(broadcastScript, voiceId);
    if (!audioBuffer) {
      return NextResponse.json(
        { error: "Neural TTS generation unavailable", detail: lastElevenLabsError, fallback: true },
        { status: 503 }
      );
    }

    if (AUDIO_CACHE.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = AUDIO_CACHE.keys().next().value;
      if (oldestKey) AUDIO_CACHE.delete(oldestKey);
    }
    AUDIO_CACHE.set(cacheKey, { buffer: audioBuffer, createdAt: Date.now() });

    return new Response(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Audio-Source": "elevenlabs-neural",
      },
    });
  } catch (error) {
    console.error("[TTS API POST] Error:", error);
    return NextResponse.json({ error: "Internal error", fallback: true }, { status: 500 });
  }
}
