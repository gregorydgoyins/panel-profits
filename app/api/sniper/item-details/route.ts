import { NextResponse } from "next/server";
import { fetchEbayItemDetails } from "@/lib/sniper/ebay-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("id");

  if (!itemId) {
    return NextResponse.json({ success: false, error: "Missing itemId parameter" }, { status: 400 });
  }

  try {
    const details = await fetchEbayItemDetails(itemId);
    if (!details) {
      return NextResponse.json(
        { success: false, error: "Item not found or details unavailable" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      details,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to fetch item details" },
      { status: 500 }
    );
  }
}
