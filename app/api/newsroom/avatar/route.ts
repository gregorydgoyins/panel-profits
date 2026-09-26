import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// D-ID API Base
const DID_BASE = "https://api.d-id.com";

// Server-side fast cache for completed avatar renders (scriptHash -> videoUrl)
const AVATAR_CACHE = new Map<string, { videoUrl: string; duration: number; timestamp: number }>();

function getScriptHash(text: string): string {
  return crypto.createHash("md5").update(text.trim()).digest("hex");
}

export async function POST(request: Request) {
  try {
    const { scriptText, audioUrl, sourceImageUrl, provider } = await request.json();

    if (!scriptText && !audioUrl) {
      return NextResponse.json({ error: "scriptText or audioUrl is required" }, { status: 400 });
    }

    const scriptHash = getScriptHash(scriptText || audioUrl);

    // Check instant cache
    if (AVATAR_CACHE.has(scriptHash)) {
      const cached = AVATAR_CACHE.get(scriptHash)!;
      // Cache valid for 24 hours
      if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
        return NextResponse.json({
          provider: "did-cached",
          status: "completed",
          videoUrl: cached.videoUrl,
          duration: cached.duration,
          cached: true,
        });
      }
    }

    const heygenKey = process.env.HEYGEN_API_KEY || process.env.HEY_GEN_KEY;
    const didKey = process.env.DID_API_KEY || process.env.D_ID_API_KEY || process.env.DID_STUDIO_KEY;
    const runwayKey = process.env.RUNWAYML_API_SECRET || process.env.RUNWAY_API_KEY || process.env.RUNWAY_SECRET_KEY;

    // 1. HeyGen Native Talking Photo & Avatar Pipeline (Single Frame-Synced Video Stream)
    if (heygenKey && provider !== "did" && provider !== "runway") {
      const response = await fetch("https://api.heygen.com/v2/video/generate", {
        method: "POST",
        headers: {
          "X-Api-Key": heygenKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_inputs: [
            {
              character: {
                type: "talking_photo",
                talking_photo_id: "97316a3014a44d859b8823528b8b9ef5",
              },
              voice: {
                type: "text",
                input_text: scriptText.slice(0, 2000),
                voice_id: "2d5b0e6cf36f460aa7fc47e3eee4ba54", // Natural African American Broadcaster
              },
            },
          ],
          dimension: { width: 1280, height: 720 },
        }),
      });

      if (response.ok) {
        const hData = await response.json();
        const videoId = hData.data?.video_id;
        if (videoId) {
          return NextResponse.json({
            provider: "heygen",
            status: "processing",
            videoId,
            pollUrl: `/api/newsroom/avatar/poll?id=${videoId}&provider=heygen&hash=${scriptHash}`,
          });
        }
      }
    }

    // 2. D-ID Studio Animation Fallback
    if (didKey && provider !== "heygen" && provider !== "runway") {
      const authHeader = didKey.startsWith("Basic ") ? didKey : `Basic ${didKey}`;

      // Authentic Alex Morgan / Black female news anchor portrait
      const imageSource = sourceImageUrl || "https://comicbookstockexchange.com/media/anchor-face.jpg";

      const payload: Record<string, unknown> = {
        source_url: imageSource,
        script: audioUrl
          ? { type: "audio", audio_url: audioUrl }
          : {
              type: "text",
              input: scriptText.slice(0, 1000),
              provider: {
                type: "microsoft",
                voice_id: "en-US-JennyNeural",
              },
            },
        config: {
          stitch: true,
          result_format: "mp4",
          fluent: true,
          pad_audio: 0,
        },
      };

      const createRes = await fetch(`${DID_BASE}/talks`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        return NextResponse.json({ error: "D-ID Talk Creation Failed", details: err }, { status: createRes.status });
      }

      const talkData = await createRes.json();
      const talkId = talkData.id;

      // Quick poll up to 25s for fast delivery
      let attempts = 0;
      while (attempts < 18) {
        await new Promise((r) => setTimeout(r, 1500));
        const checkRes = await fetch(`${DID_BASE}/talks/${talkId}`, {
          headers: { Authorization: authHeader },
        });

        if (checkRes.ok) {
          const statusData = await checkRes.json();
          if (statusData.status === "done" && statusData.result_url) {
            // Save to memory cache
            AVATAR_CACHE.set(scriptHash, {
              videoUrl: statusData.result_url,
              duration: statusData.duration || 0,
              timestamp: Date.now(),
            });

            return NextResponse.json({
              provider: "did",
              status: "completed",
              videoUrl: statusData.result_url,
              duration: statusData.duration,
            });
          }
          if (statusData.status === "error") {
            return NextResponse.json({ error: "D-ID Rendering Failed", details: statusData.error }, { status: 500 });
          }
        }
        attempts++;
      }

      return NextResponse.json({
        provider: "did",
        status: "processing",
        talkId,
        pollUrl: `/api/newsroom/avatar/poll?id=${talkId}&provider=did&hash=${scriptHash}`,
      });
    }

    // 3. RunwayML Gen-3 Pipeline
    if (runwayKey) {
      const response = await fetch("https://api.runwayml.com/v1/image_to_video", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${runwayKey}`,
          "X-Runway-Version": "2024-09-13",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop",
          promptText: "A female news anchor in a television newsroom speaking professionally to the camera.",
          model: "gen3a_turbo",
          duration: 5,
          ratio: "1280:720",
        }),
      });

      if (response.ok) {
        const rData = await response.json();
        return NextResponse.json({
          provider: "runway",
          status: "processing",
          taskId: rData.id,
          pollUrl: `/api/newsroom/avatar/poll?id=${rData.id}&provider=runway`,
        });
      }
    }

    return NextResponse.json({
      error: "No avatar provider configured. Add DID_API_KEY, HEYGEN_API_KEY, or RUNWAYML_API_SECRET to panel-profits/.env.local",
    }, { status: 501 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
