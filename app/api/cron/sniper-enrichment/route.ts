import { NextResponse } from "next/server";
import { runAdmissionEnrichment } from "@/lib/sniper/admission-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (process.env.CRON_SECRET && bearer !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized scheduled worker" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await runAdmissionEnrichment(20)) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
