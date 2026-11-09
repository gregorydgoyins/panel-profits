import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createGradingBatch, rollCertifiedGrade } from "@/lib/grading/pipeline";
import { GradingCompany, GradingServiceTier } from "@/lib/grading/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      holdingId,
      comicId,
      company = "CGC",
      tier = "STANDARD",
      hasPressing = true
    } = body;

    if (!comicId) {
      return NextResponse.json({ success: false, error: "comicId is required" }, { status: 400 });
    }

    const userId = user?.id || "anon-trader";

    const batch = createGradingBatch({
      userId,
      gradingCompany: company as GradingCompany,
      serviceTier: tier as GradingServiceTier,
      items: [
        {
          holdingId,
          comicId,
          series: "Holding Series",
          issueNumber: "1",
          rawEstimatedGrade: 9.4
        }
      ],
      hasPressing: Boolean(hasPressing)
    });

    // Roll certified grade yield
    const yieldResult = rollCertifiedGrade({
      era: "Modern",
      year: 2020,
      hasPressing: Boolean(hasPressing),
      rawEstimatedGrade: 9.4
    });

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      status: batch.status,
      serviceTier: batch.serviceTier,
      totalCostUsd: batch.totalCostUsd,
      estimatedCompletionAt: batch.estimatedCompletionAt,
      rolledGrade: yieldResult.grade,
      certificationLabel: yieldResult.label,
      notes: yieldResult.notes
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Internal submission error" }, { status: 500 });
  }
}
