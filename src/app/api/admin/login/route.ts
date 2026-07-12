import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin, ADMIN_COOKIE_NAME, getCookieOptions } from "@/lib/admin-auth";
import { adminLoginSchema } from "@/lib/schemas";
import { withBody } from "@/lib/validation";
import { enforceLimit } from "@/lib/auth/rate-limit";

// POST /api/admin/login
// Body: { "email": "...", "password": "..." }
//
// REFACTOR (refactor/total — audit §2.1, §2.2, §2.3):
//   - Body validated with zod (`adminLoginSchema`).
//   - Rate-limited to 5 attempts / minute per IP (was: 200ms sleep —
//     fully brutable).
//   - Legacy backdoor removed: the `email == "" || email == "admin@odg.dz"`
//     + `ADMIN_PASSWORD` fallback no longer exists in `authenticateAdmin`.
//   - Constant-time error message: "Identifiants incorrects" whether
//     the email exists or not (no enumeration).
export const POST = withBody(adminLoginSchema, async (req, body) => {
  // Rate limit: 5 attempts / minute per IP.
  const limited = enforceLimit(req, "admin-login", { limit: 5, windowSec: 60 });
  if (limited) return limited;

  // Constant small delay to flatten timing differences between
  // "user not found" and "wrong password" branches (the DB lookup
  // is the dominant timing signal).
  await new Promise((r) => setTimeout(r, 250));

  const result = await authenticateAdmin(body.email, body.password);
  if (!result) {
    return NextResponse.json(
      { error: "Identifiants incorrects" },
      { status: 401 }
    );
  }

  // `result` is now strictly `{ user, token }` — the `{ fallback, token }`
  // union member has been removed.
  const res = NextResponse.json({
    ok: true,
    user: {
      id: result.user.id,
      email: result.user.email,
      full_name: result.user.full_name,
      role: result.user.role,
    },
  });
  res.cookies.set(ADMIN_COOKIE_NAME, result.token, getCookieOptions());
  return res;
});
