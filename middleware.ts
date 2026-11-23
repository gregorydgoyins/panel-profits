import { NextResponse, type NextRequest } from "next/server";
import { proxy } from "./proxy";

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-panel-profits-path", request.nextUrl.pathname);

  // If path is public landing (/beta, /donate, /book), pass header forward immediately
  if (
    request.nextUrl.pathname === "/beta" ||
    request.nextUrl.pathname.startsWith("/beta/") ||
    request.nextUrl.pathname === "/donate" ||
    request.nextUrl.pathname.startsWith("/donate/") ||
    request.nextUrl.pathname === "/book" ||
    request.nextUrl.pathname.startsWith("/book/")
  ) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  const response = await proxy(request);
  response.headers.set("x-panel-profits-path", request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
