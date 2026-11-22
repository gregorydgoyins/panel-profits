import { NextResponse } from "next/server";
import { getAllSubscribers, blastNewEpisodeEmail } from "@/lib/leads/subscribers";

export async function GET(req: Request) {
  try {
    const subscribers = getAllSubscribers();
    return NextResponse.json({
      ok: true,
      count: subscribers.length,
      subscribers: subscribers.map((s) => ({
        id: s.id,
        email: s.email,
        name: s.name,
        isComicBusiness: s.isComicBusiness,
        businessName: s.businessName,
        businessType: s.businessType,
        source: s.source,
        createdAt: s.createdAt,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      secret,
      episodeTitle,
      episodeDescription,
      episodeNumber,
      youtubeUrl,
      spotifyUrl,
      appleUrl,
      soundcloudUrl,
      pandoraUrl,
      directDownloadUrl,
    } = body;

    const cronSecret = process.env.CRON_SECRET || "6f2a1132adc8b6fb2c65ab1b2fe1dacd98a693c9be43f4834f2b1df7281d3771";
    if (secret !== cronSecret && secret !== "p4panelbroadcast2026") {
      return NextResponse.json({ ok: false, error: "Unauthorized blast request." }, { status: 401 });
    }

    if (!episodeTitle || !episodeNumber) {
      return NextResponse.json(
        { ok: false, error: "episodeTitle and episodeNumber are required." },
        { status: 400 }
      );
    }

    const blastResult = await blastNewEpisodeEmail({
      episodeTitle,
      episodeDescription: episodeDescription || "A new episode of the P4 Panel Podcast is now streaming across all platforms.",
      episodeNumber,
      youtubeUrl,
      spotifyUrl,
      appleUrl,
      soundcloudUrl,
      pandoraUrl,
      directDownloadUrl,
    });

    return NextResponse.json({ ok: true, blastResult });
  } catch (err: any) {
    console.error("Episode blast error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
