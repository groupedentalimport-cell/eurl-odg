import { NextRequest, NextResponse } from "next/server";
import {
  authenticateClient,
  CLIENT_COOKIE_NAME,
  getClientCookieOptions,
} from "@/lib/client-auth";

// ============================================================
// POST /api/client/login
// (Task BONUS-2-3)
//
// Body: { "email": "...", "phoneLast4": "3456" }
//
// On success: sets the httpOnly `odg_client` cookie (signed) and
// returns { ok: true, client: { id, nom, email, telephone, wilaya, type_client } }.
// On failure: 401 { error: "Identifiants incorrects" }
//
// We add a 200ms delay to slow down brute-force attempts on the
// 4-digit code (10_000 codes max → without delay a fast client
// could try them all in seconds).
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: { email?: string; phoneLast4?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const email = (body?.email || "").trim().toLowerCase();
  const phoneLast4 = (body?.phoneLast4 || "").trim();

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Email invalide." },
      { status: 400 }
    );
  }
  if (!/^\d{4}$/.test(phoneLast4)) {
    return NextResponse.json(
      { error: "Code : 4 chiffres requis." },
      { status: 400 }
    );
  }

  // Small delay to mitigate brute-force timing on the 4-digit code.
  await new Promise((r) => setTimeout(r, 200));

  const result = await authenticateClient(email, phoneLast4);
  if (!result) {
    return NextResponse.json(
      { error: "Identifiants incorrects." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({
    ok: true,
    client: {
      id: result.client.id,
      nom: result.client.nom,
      email: result.client.email,
      telephone: result.client.telephone,
      wilaya: result.client.wilaya,
      type_client: result.client.type_client,
    },
  });
  res.cookies.set(CLIENT_COOKIE_NAME, result.token, getClientCookieOptions());
  return res;
}
