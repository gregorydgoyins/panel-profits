/**
 * Automated Video Production & Streaming Pipeline
 *
 * Integrates:
 * - HeyGen API (AI Presenter Avatar synthesis)
 * - ElevenLabs API (Neural Voice Synthesis)
 * - D-ID API (Live Talking Photo generation)
 * - RunwayML API (Generative Video background creation)
 * - Supabase Clean persistence into public.pp_video_reels
 */

import { createAdminServerClient } from "@/lib/supabase/admin";

export interface PresenterProfile {
  id: string;
  name: string;
  role: string;
  voiceId: string;
  heygenAvatarId: string;
  avatarImage: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const PRESENTERS: Record<string, PresenterProfile> = {
  corinne: {
    id: "corinne-howard",
    name: "Corinne Howard",
    role: "Chief Market Anchor & Bureau Chief",
    voiceId: "zWoalRDt5TZrmW4ROIA7", // ElevenLabs Brooklyn (African American, mature, confident news anchor)
    heygenAvatarId: "default_female_anchor_1",
    avatarImage: "/media/anchor-face.jpg",
    badgeBg: "bg-cyan-950/60",
    badgeBorder: "border-cyan-500/40",
    badgeText: "text-cyan-300",
  },
  marcus: {
    id: "marcus-vance",
    name: "Marcus Vance",
    role: "Chief Equity & Census Strategist",
    voiceId: "cjVigY5qzO86Huf0OWal", // ElevenLabs Eric (Smooth, authoritative financial analyst)
    heygenAvatarId: "default_male_anchor_1",
    avatarImage: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&auto=format&fit=crop&q=80",
    badgeBg: "bg-blue-950/60",
    badgeBorder: "border-blue-500/40",
    badgeText: "text-blue-300",
  },
  elena: {
    id: "elena-rostova",
    name: "Elena Rostova",
    role: "Senior Hollywood & Media Correspondent",
    voiceId: "BHf91PCMVcVwq6r1ku7L", // ElevenLabs Ava (Clear, professional news & explainer voice)
    heygenAvatarId: "default_female_anchor_2",
    avatarImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80",
    badgeBg: "bg-rose-950/60",
    badgeBorder: "border-rose-500/40",
    badgeText: "text-rose-300",
  },
  julian: {
    id: "dr-julian-mercer",
    name: "Dr. Julian Mercer",
    role: "Director of Archival Provenance",
    voiceId: "JBFqnCBsd6RMkjVDRZzb", // ElevenLabs George (Warm, captivating, mature historian)
    heygenAvatarId: "default_male_anchor_2",
    avatarImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
    badgeBg: "bg-indigo-950/60",
    badgeBorder: "border-indigo-500/40",
    badgeText: "text-indigo-300",
  },
};

export interface GeneratedVideoReel {
  id: string;
  storyId: string;
  headline: string;
  presenter: PresenterProfile;
  videoUrl: string;
  posterUrl: string;
  audioUrl?: string;
  transcript: string;
  durationSeconds: number;
  provider: "heygen" | "did" | "elevenlabs" | "runwayml" | "broadcast_stream";
  status: "READY" | "PROCESSING" | "FAILED";
}

/**
 * Generates an audio briefing using ElevenLabs API
 */
export async function generateElevenLabsAudio(
  text: string,
  voiceId = "21m00Tcm4TlvDq8ikWAM"
): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn("ElevenLabs audio generation HTTP", res.status, res.statusText);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("ElevenLabs synthesis error:", err);
    return null;
  }
}

/**
 * Triggers video generation via HeyGen
 */
export async function requestHeyGenVideo(
  scriptText: string,
  avatarId = "default_female_anchor_1"
): Promise<string | null> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: "avatar",
              avatar_id: avatarId,
              avatar_style: "normal",
            },
            voice: {
              type: "text",
              input_text: scriptText,
              voice_id: "en-US-JennyNeural",
            },
            background: {
              type: "color",
              value: "#07080B",
            },
          },
        ],
        dimension: { width: 1280, height: 720 },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn("HeyGen video generate HTTP", res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    return data.data?.video_id || null;
  } catch (err) {
    console.error("HeyGen request error:", err);
    return null;
  }
}

/**
 * Triggers generative video background creation via RunwayML Gen-3 Alpha API
 */
export async function requestRunwayVideo(
  promptImage: string,
  promptText: string
): Promise<string | null> {
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-09-13",
      },
      body: JSON.stringify({
        promptImage,
        model: "gen3a_turbo",
        promptText,
        duration: 5,
        ratio: "1280:768",
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn("RunwayML video generate HTTP", res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    return data.id || null;
  } catch (err) {
    console.error("RunwayML request error:", err);
    return null;
  }
}

/**
 * Polls RunwayML task status
 */
export async function pollRunwayTask(taskId: string): Promise<string | null> {
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey || !taskId) return null;

  try {
    const res = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Runway-Version": "2024-09-13",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === "SUCCEEDED" && Array.isArray(data.output) && data.output.length > 0) {
      return data.output[0];
    }
    return null;
  } catch {
    return null;
  }
}

// D-ID reels are produced by lib/jobs/video-reels.ts (scheduled job, D-ID licensed presenters,
// videos copied into Supabase Storage). Nothing here generates or borrows videos at request time.

/**
 * Retrieves the latest active video reel for a given story from Clean Supabase.
 */
export async function getStoryVideoReel(storyId: string): Promise<GeneratedVideoReel | null> {
  try {
    const supabase = createAdminServerClient();
    const { data } = await supabase
      .from("pp_video_reels")
      .select("*")
      .eq("story_id", storyId)
      .eq("status", "READY")
      .not("video_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    // Presenter shown is the one actually in the video (D-ID stock presenter), not a house persona.
    const presenter: PresenterProfile = {
      ...PRESENTERS.elena,
      id: `did-${data.id}`,
      name: data.presenter_name,
      role: data.presenter_role,
      avatarImage: data.poster_url || "",
    };
    return {
      id: data.id,
      storyId: data.story_id,
      headline: data.headline,
      presenter,
      videoUrl: data.video_url,
      posterUrl: data.poster_url || "",
      audioUrl: data.audio_url || undefined,
      transcript: data.transcript,
      durationSeconds: data.duration_seconds || 0,
      provider: data.provider as any,
      status: data.status as any,
    };
  } catch {
    return null;
  }
}
