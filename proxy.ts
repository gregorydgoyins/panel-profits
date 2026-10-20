import { NextResponse, type NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  request.headers.set("x-panel-profits-path", request.nextUrl.pathname);
  // Public evidence routes need no account refresh. Game and account routes retain their own checks.
  if (
    request.nextUrl.pathname === "/wiki" ||
    request.nextUrl.pathname.startsWith("/wiki/") ||
    request.nextUrl.pathname === "/api/mcp" ||
    request.nextUrl.pathname.startsWith("/api/mcp/") ||
    request.nextUrl.pathname === "/sniper" ||
    request.nextUrl.pathname.startsWith("/api/sniper/")
  ) {
    return NextResponse.next({ request });
  }
  return refreshSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
