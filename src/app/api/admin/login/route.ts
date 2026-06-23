import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin, ADMIN_COOKIE_NAME, getCookieOptions } from "@/lib/admin-auth";

// POST /api/admin/login
// Body: { "email": "...", "password": "..." }
// On success: sets an httpOnly signed cookie (with userId + role) and
// returns { ok: true, user: { id, email, full_name, role } }.
// On failure: 401 { error: "Identifiants incorrects" }
//
// Backward compat: if email is omitted/empty and password matches
// ADMIN_PASSWORD env var, authenticates as super_admin (legacy mode,
// used before the admin_users table is created).
export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const email = (body?.email || "").trim();
  const password = body?.password || "";
  if (!password) {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
  }

  // Small delay to mitigate brute-force timing
  await new Promise((r) => setTimeout(r, 200));

  const result = await authenticateAdmin(email, password);
  if (!result) {
    return NextResponse.json(
      { error: "Identifiants incorrects" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({
    ok: true,
    user: "user" in result
      ? { id: result.user.id, email: result.user.email, full_name: result.user.full_name, role: result.user.role }
      : { id: "legacy", email: "admin@odg.dz", full_name: "Super Admin", role: "super_admin" as const },
  });
  res.cookies.set(ADMIN_COOKIE_NAME, result.token, getCookieOptions());
  return res;
}
