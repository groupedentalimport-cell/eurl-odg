import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

// GET /api/admin/session — returns { authed: boolean } so the client can know
// whether the current request carries a valid admin cookie (e.g. on page reload).
export async function GET(request: NextRequest) {
  return NextResponse.json({ authed: verifyAdmin(request) });
}
