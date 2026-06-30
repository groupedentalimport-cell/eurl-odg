import { NextResponse } from "next/server";
import { CLIENT_COOKIE_NAME, getClientCookieOptions } from "@/lib/client-auth";

// ============================================================
// POST /api/client/logout
// (Task BONUS-2-3)
//
// Clears the `odg_client` cookie. No body required.
// ============================================================

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CLIENT_COOKIE_NAME, "", { ...getClientCookieOptions(), maxAge: 0 });
  return res;
}
