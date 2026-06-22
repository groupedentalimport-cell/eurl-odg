import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getCookieOptions } from "@/lib/admin-auth";

// POST /api/admin/logout — clears the admin session cookie.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", { ...getCookieOptions(), maxAge: 0 });
  return res;
}
