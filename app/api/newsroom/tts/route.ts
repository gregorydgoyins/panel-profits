import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Known studio anchor voices in ElevenLabs (Authentic Black Female Broadcast Voices)
export const STUDIO_VOICES: Record<string, { id: string; name: string; desc: string }> = {
  brooklyn: { id: "zWoalRDt5TZrmW4ROIA7", name: "Brooklyn (Primary Anchor)", desc: "Confident, conversational African American anchor voice" },
  jada: { id: "zWoalRDt5TZrmW4ROIA7", name: "Brooklyn / Jada (Primary Anchor)", desc: "Confident, conversational African American anchor voice" },
  loretta: { id: "fJ3LQjK4kzpdwYWAW3LU", name: "Loretta (Smooth Broadcast)", desc: "Proper, smooth, authoritative Black female anchor" },
  sharon: { id: "hCLMtDrFPq4THEIO6zWf", name: "Sharon (Warm & Confident)", desc: "Warm, engaging, rich Black female broadcaster" },
  ava: { id: "BHf91PCMVcVwq6r1ku7L", name: "Ava (News & Explainer)", desc: "Crisp, articulated television news delivery" },
  rene: { id: "YYsXMvvITqnbq9AYpUDk", name: "Rene (Commanding Network)", desc: "Calm, confident, and powerful network voice" },
};

const DEFAULT_ELEVEN_VOICE_ID = "zWoalRDt5TZrmW4ROIA7"; // Brooklyn - Primary Black female anchor tone

export async function POST(request: Request) {
  try {
    const { text, voiceId, provider } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const elevenKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS;
    const openaiKey = process.env.OPENAI_API_KEY;

    // Resolve voice identifier (either a direct ElevenLabs voiceId or an alias like 'jada')
    let targetVoiceId = DEFAULT_ELEVEN_VOICE_ID;
    if (voiceId) {
      const alias = STUDIO_VOICES[voiceId.toLowerCase()];
      targetVoiceId = alias ? alias.id : voiceId;
    } else if (process.env.ELEVENLABS_VOICE_ID) {
      targetVoiceId = process.env.ELEVENLABS_VOICE_ID;
    }

    // 1. ElevenLabs Neural Studio Synthesis
    if (elevenKey && provider !== "openai") {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}/stream`, {
        method: "POST",
        headers: {
          "xi-api-key": elevenKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.slice(0, 2500),
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.50,
            similarity_boost: 0.82,
            style: 0.12,
            use_speaker_boost: true,
          },
        }),
      });

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        return new NextResponse(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      }
    }

    // 2. OpenAI Neural TTS fallback
    if (openaiKey) {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text.slice(0, 2000),
          voice: "nova", // Warm news anchor tone
        }),
      });

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        return new NextResponse(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      }
    }

    // 3. No cloud API key configured -> notify client to use enhanced local natural voice
    return NextResponse.json({
      fallback: true,
      message: "Cloud neural TTS requires ELEVENLABS_API_KEY or OPENAI_API_KEY in .env.local. Client using enhanced local natural human voice engine.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
