import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, findAdminUserByEmail, type AdminRole } from "@/lib/admin-auth";

// GET /api/admin/session — returns the current session info so the client
// knows whether the user is authed AND what role they have (for menu
// visibility + button gating).
export async function GET(request: NextRequest) {
  const session = verifyAdmin(request);
  if (!session) {
    return NextResponse.json({ authed: false });
  }

  // If legacy session (no real user in DB), return super_admin
  if (session.userId === "legacy-super-admin") {
    return NextResponse.json({
      authed: true,
      user: {
        id: "legacy",
        email: "admin@odg.dz",
        full_name: "Super Admin",
        role: "super_admin" as AdminRole,
      },
    });
  }

  // Fetch the live user record (in case role changed since login)
  let client;
  try {
    const { getServerClient } = await import("@/lib/supabase");
    client = getServerClient();
  } catch {
    // service role not configured — return session info without DB lookup
    return NextResponse.json({
      authed: true,
      user: { id: session.userId, role: session.role },
    });
  }
  if (client) {
    const { data } = await client
      .from("admin_users")
      .select("id, email, full_name, role, active")
      .eq("id", session.userId)
      .single();
    if (data?.active) {
      return NextResponse.json({
        authed: true,
        user: data,
      });
    }
    // User deactivated since login → treat as logged out
    return NextResponse.json({ authed: false });
  }

  return NextResponse.json({
    authed: true,
    user: { id: session.userId, role: session.role },
  });
}
