import { NextRequest, NextResponse } from "next/server";
import { verifyClientSession, findClientByEmail, type ClientPublicInfo } from "@/lib/client-auth";

// ============================================================
// GET /api/client/session
// (Task BONUS-2-3)
//
// Returns { authed, client } based on the `odg_client` cookie.
// The client hook (useClientSession) calls this on mount to know
// whether the visitor is already logged in.
//
// We re-fetch the live client record on each call — if a manager
// deleted the client (or changed their email) the session is
// invalidated immediately. This is cheap (one indexed lookup) and
// keeps the portal from showing data for a deleted client.
// ============================================================

export async function GET(request: NextRequest) {
  const session = verifyClientSession(request);
  if (!session) {
    return NextResponse.json({ authed: false });
  }

  let client: ClientPublicInfo | null = null;
  try {
    // Look up the client by id. We use the server client (service
    // role) to bypass RLS — the portal API is the trusted boundary.
    const { getServerClient } = await import("@/lib/supabase");
    const supabase = getServerClient();
    const { data } = await supabase
      .from("clients")
      .select("id, nom, email, telephone, wilaya, type_client")
      .eq("id", session.clientId)
      .maybeSingle();
    client = (data as ClientPublicInfo) || null;
  } catch {
    // Supabase not configured → fall back to a minimal stub so the
    // portal still renders (the data routes will return tableMissing).
    client = {
      id: session.clientId,
      nom: "Client",
      email: null,
      telephone: null,
      wilaya: null,
      type_client: null,
    };
  }

  if (!client) {
    // Client deleted since login → treat as logged out.
    return NextResponse.json({ authed: false });
  }

  return NextResponse.json({ authed: true, client });
}
