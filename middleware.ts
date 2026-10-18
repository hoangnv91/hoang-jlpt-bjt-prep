import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register", "/api/register"];

/**
 * The VibeFlow preview proxy may serve the app under a path prefix of the form
 * `/api/v1/sessions/{session-id}/preview/{port}`. Strip it before matching
 * routes, and keep it when building redirects, so `/login` under the prefix is
 * still recognised as public (otherwise the middleware redirects to itself and
 * the browser hits "redirected you too many times").
 */
const PREVIEW_PREFIX = /^\/api\/v1\/sessions\/[^/]+\/preview\/\d+/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const prefixMatch = pathname.match(PREVIEW_PREFIX);
  const prefix = prefixMatch ? prefixMatch[0] : "";
  const stripped = prefix ? pathname.slice(prefix.length) || "/" : pathname;

  const isPublic =
    PUBLIC_PATHS.includes(stripped) || stripped.startsWith("/api/auth");

  if (isPublic) return NextResponse.next();

  const token =
    request.cookies.get("authjs.session-token")?.value ??
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!token) {
    // API routes: return a JSON 401 instead of an HTML redirect. The route
    // handlers enforce their own auth; redirecting would make fetch().json()
    // choke on the login page HTML ("Unexpected token '<'").
    if (stripped.startsWith("/api/")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }
    // Build the redirect from the forwarded host/proto so the Location is
    // always the public preview URL (Next.js otherwise uses the internal
    // connection host, which the browser cannot resolve).
    const host =
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      request.nextUrl.host;
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const url = new URL(`${prefix}/login`, `${proto}://${host}`);
    url.search = "";
    url.searchParams.set("callbackUrl", stripped);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};