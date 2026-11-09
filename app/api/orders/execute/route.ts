import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      comicId,
      ppcfId,
      action = "buy", // "buy" | "sell"
      orderType = "market", // "market" | "limit" | "stop"
      grade = "RAW",
      gradingCompany = null,
      priceUsd,
      quantity = 1,
      sourceContext = "TRADING_DESK" // "TRADING_DESK" | "NEWS_CATALYST" | "SNIPER"
    } = body;

    if (!comicId) {
      return NextResponse.json({ success: false, error: "comicId is required" }, { status: 400 });
    }

    const effectiveUserId = user?.id || null;
    const orderId = `ORD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // If authenticated, persist directly into the user's collection/holdings
    if (effectiveUserId) {
      // Find or create default collection
      let { data: defaultCol } = await supabase
        .from("collections")
        .select("id")
        .eq("user_id", effectiveUserId)
        .eq("is_default", true)
        .maybeSingle();

      if (!defaultCol) {
        const { data: newCol } = await supabase
          .from("collections")
          .insert({ user_id: effectiveUserId, name: "Default Collection", is_default: true })
          .select("id")
          .single();
        defaultCol = newCol;
      }

      if (defaultCol) {
        if (action === "buy") {
          await supabase.from("collection_items").upsert({
            collection_id: defaultCol.id,
            user_id: effectiveUserId,
            comic_id: comicId,
            ppcf_id: ppcfId || null,
            quantity: Number(quantity),
            grade: grade === "RAW" ? null : grade,
            grading_company: grade === "RAW" ? null : (gradingCompany || "CGC"),
            acquisition_date: new Date().toISOString().split("T")[0],
            acquisition_cost: Number(priceUsd),
            notes: `Transmitted via ${orderType.toUpperCase()} order from ${sourceContext}. Order ref: ${orderId}`
          }, { onConflict: "collection_id,comic_id" });
        }

        // Record a diary entry for the trade event
        await supabase.from("player_diary_entries").insert({
          user_id: effectiveUserId,
          entry_type: "trade",
          title: `${action.toUpperCase()} Filled: ${quantity}x ${grade} #${comicId}`,
          body: `Executed ${orderType.toUpperCase()} order at $${Number(priceUsd).toFixed(2)}/unit ($${(Number(priceUsd) * Number(quantity)).toFixed(2)} total outlay). Source: ${sourceContext}.`,
          occurred_at: new Date().toISOString()
        });
      }
    }

    revalidatePath("/collection");
    revalidatePath(`/comics/${comicId}`);

    return NextResponse.json({
      success: true,
      orderId,
      status: "FILLED",
      action,
      orderType,
      comicId,
      grade,
      quantity,
      priceUsd: Number(priceUsd),
      totalOutlay: Number(priceUsd) * Number(quantity),
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Order execution failed" }, { status: 500 });
  }
}
