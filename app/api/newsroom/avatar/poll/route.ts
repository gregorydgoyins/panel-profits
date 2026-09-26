import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DID_BASE = "https://api.d-id.com";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const provider = searchParams.get("provider") || "did";

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    if (provider === "did") {
      const didKey = process.env.DID_API_KEY || process.env.D_ID_API_KEY || process.env.DID_STUDIO_KEY;
      if (!didKey) {
        return NextResponse.json({ error: "DID_API_KEY not configured" }, { status: 501 });
      }

      const authHeader = didKey.startsWith("Basic ") ? didKey : `Basic ${didKey}`;

      const res = await fetch(`${DID_BASE}/talks/${id}`, {
        headers: { Authorization: authHeader },
      });

      if (!res.ok) {
        return NextResponse.json({ error: "Failed to fetch talk status" }, { status: res.status });
      }

      const data = await res.json();
      return NextResponse.json({
        status: data.status === "done" ? "done" : data.status,
        videoUrl: data.result_url || null,
        error: data.error || null,
        duration: data.duration || null,
      });
    }

    if (provider === "heygen") {
      const heygenKey = process.env.HEYGEN_API_KEY || process.env.HEY_GEN_KEY;
      if (!heygenKey) {
        return NextResponse.json({ error: "HEYGEN_API_KEY not configured" }, { status: 501 });
      }

      const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${id}`, {
        headers: { "X-Api-Key": heygenKey },
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          status: data.data?.status === "completed" ? "done" : data.data?.status,
          videoUrl: data.data?.video_url || null,
          error: data.data?.error || null,
        });
      }
    }

    if (provider === "runway") {
      const runwayKey = process.env.RUNWAYML_API_SECRET || process.env.RUNWAY_API_KEY;
      if (!runwayKey) {
        return NextResponse.json({ error: "RUNWAYML_API_SECRET not configured" }, { status: 501 });
      }

      const res = await fetch(`https://api.runwayml.com/v1/tasks/${id}`, {
        headers: {
          Authorization: `Bearer ${runwayKey}`,
          "X-Runway-Version": "2024-09-13",
        },
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          status: data.status === "SUCCEEDED" ? "done" : data.status,
          videoUrl: data.output ? data.output[0] : null,
          error: data.failure || null,
        });
      }
    }

    return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
