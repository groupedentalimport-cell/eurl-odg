import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSessionToken, ADMIN_COOKIE_NAME, getCookieOptions } from "@/lib/admin-auth";

// POST /api/admin/login
// Body: { "password": "..." }
// On success: sets an httpOnly signed cookie and returns { ok: true }.
// On failure: 401 { error: "Mot de passe incorrect" }
export async function POST(request: NextRequest) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const password = body?.password;
  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
  }

  // Small delay to mitigate brute-force timing (constant-time compare already in place)
  await new Promise((r) => setTimeout(r, 200));

  if (!verifyPassword(password)) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  const token = createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, getCookieOptions());
  return res;
}
