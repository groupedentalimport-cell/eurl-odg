import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route-level middleware.
 *
 * WHY: consolidates the two client portals (audit §1.8). The legacy
 * phone-last-4 portal at `/client` has been removed; clients are
 * redirected to the magic-link portal at `/portal`. The legacy
 * `/api/client/*` endpoints are gone too — both portals now share
 * `/api/client-portal/data`.
 *
 * Magic-link is the stronger choice (the secret never leaves the
 * server, the inbox is the second factor, the token is single-use
 * with a 15-min TTL). The 4-digit phone-last-4 code was brutable
 * in minutes given no rate limiting.
 *
 * Bookmarks and cached links to `/client` are preserved via 302
 * redirect (not 301 — we may want to re-introduce a phone-based
 * flow later, e.g. for SMS OTP).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /client → /portal (and /client/* → /portal/*)
  if (pathname === "/client" || pathname.startsWith("/client/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/client/, "/portal");
    return NextResponse.redirect(url, 302);
  }

  // /api/client/login, /api/client/logout, /api/client/session,
  // /api/client/devis, /api/client/commandes, /api/client/garanties
  // → 410 Gone with a pointer to the replacement endpoint.
  if (pathname.startsWith("/api/client/")) {
    return NextResponse.json(
      {
        error:
          "Cet endpoint a été supprimé lors de la refonte. " +
          "Utilisez /api/client-portal/* (magic-link).",
        doc: "/portal",
      },
      { status: 410 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/client/:path*", "/api/client/:path*"],
};
