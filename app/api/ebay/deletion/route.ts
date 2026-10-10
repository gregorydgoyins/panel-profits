import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const VERIFICATION_TOKEN =
  process.env.EBAY_VERIFICATION_TOKEN || "panelprofits2026ebaydeletionsecrettoken12345";
const ENDPOINT_URL = "https://comicbookstockexchange.com/api/ebay/deletion";

/**
 * eBay Marketplace Account Deletion Notification Challenge Endpoint
 * Protocol:
 * 1. eBay sends a GET request with ?challenge_code=xyz
 * 2. Response must be SHA-256 hash of (challenge_code + verification_token + endpoint_url) in hex
 * 3. Returns { challengeResponse: "<hex>" } with HTTP 200
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challengeCode = searchParams.get("challenge_code");

  if (!challengeCode) {
    return NextResponse.json({ error: "Missing challenge_code" }, { status: 400 });
  }

  const hash = crypto.createHash("sha256");
  hash.update(challengeCode);
  hash.update(VERIFICATION_TOKEN);
  hash.update(ENDPOINT_URL);
  const challengeResponse = hash.digest("hex");

  return NextResponse.json({ challengeResponse }, { status: 200 });
}

/**
 * Handle incoming deletion notification payloads from eBay
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[eBay Marketplace Deletion Notification]", body);
  } catch {
    // Ignore parse error
  }
  return NextResponse.json({ status: "acknowledged" }, { status: 200 });
}
