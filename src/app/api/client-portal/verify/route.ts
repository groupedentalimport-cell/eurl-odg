import { NextRequest, NextResponse } from "next/server";
import {
  verifyClientMagicToken,
  createClientSessionToken,
  CLIENT_COOKIE_NAME,
  getClientCookieOptions,
  CLIENT_MAGIC_TOKEN_MAX_AGE,
} from "@/lib/client-auth";

// ============================================================
// POST /api/client-portal/verify  (Task BONUS-3 — magic link)
// ============================================================
//
// Body: { "token": "…" }   (the magic token from the email link)
//
// Flow:
//   1. Verify the magic token (HMAC signature + 15-min TTL).
//   2. If invalid/expired → 401 { error: "Lien invalide ou expiré." }
//   3. If valid → mint a long-lived (7-day) session token and set it
//      as the `odg_client` httpOnly cookie. Return
//      { ok: true, clientId }.
//
// NOTE: the magic token is NOT single-use (we have no DB-side "consumed"
// flag). Replays within the 15-min TTL would just re-issue a session
// cookie for the same client — no privilege escalation. The short TTL
// is the primary defense.
// ============================================================

export async function POST(request: NextRequest) {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const token = (body?.token || "").trim();
  if (!token) {
    return NextResponse.json(
      { error: "Lien invalide ou expiré." },
      { status: 401 }
    );
  }

  const payload = verifyClientMagicToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "Lien invalide ou expiré." },
      { status: 401 }
    );
  }

  // Magic token is valid → mint a long-lived session token (reuses the
  // same signing scheme as the legacy /client phone-last-4 portal, so
  // both portals share the `odg_client` cookie transparently).
  const sessionToken = createClientSessionToken(payload.clientId);
  const res = NextResponse.json({ ok: true, clientId: payload.clientId });
  res.cookies.set(
    CLIENT_COOKIE_NAME,
    sessionToken,
    getClientCookieOptions()
  );
  // Hint for clients/proxies that the cookie is short-TTL-issued —
  // not used by the server but useful for observability.
  res.headers.set(
    "X-ODG-Client-Portal",
    `magic; max-age=${CLIENT_MAGIC_TOKEN_MAX_AGE}`
  );
  return res;
}
