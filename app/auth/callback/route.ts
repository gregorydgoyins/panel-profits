import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const returnTo = requestUrl.searchParams.get("returnTo") || "/";

  // Validate returnTo to prevent open redirect vulnerabilities
  const safeReturn = returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.startsWith("/\\") ? returnTo : "/";

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=Sign-in%20was%20not%20completed", request.url));
  }
  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(error.message)}`, request.url));
  }

  return NextResponse.redirect(new URL(safeReturn, request.url));
}
