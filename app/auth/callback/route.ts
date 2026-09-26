import { createServerClient } from "@/lib/supabase/server";
import { getPlayerEntryPath } from "@/lib/account/queries";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const returnTo = requestUrl.searchParams.get("returnTo") || "";

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth callback error:", error);
      return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(error.message)}`, request.url));
    }
  }

  const entryPath = returnTo.startsWith("/") && !returnTo.startsWith("//")
    ? returnTo
    : await getPlayerEntryPath();
  return NextResponse.redirect(new URL(entryPath, request.url));
}
