import { NextResponse } from "next/server";
import { CLIENT_COOKIE_NAME, getClientCookieOptions } from "@/lib/client-auth";

// ============================================================
// POST /api/client-portal/logout  (Task BONUS-3)
// ============================================================
//
// Clears the `odg_client` cookie. No body required.
//
// This is functionally identical to /api/client/logout — kept as a
// separate route so the /portal client doesn't have to know about the
// legacy /client routes (clean separation between the two portals).
// ============================================================

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CLIENT_COOKIE_NAME, "", {
    ...getClientCookieOptions(),
    maxAge: 0,
  });
  return res;
}
