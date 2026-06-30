import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { verifyClientSession } from "@/lib/client-auth";

// ============================================================
// GET /api/client/garanties
// (Task BONUS-2-3)
//
// Returns the list of garanties for the logged-in client:
//   { garanties: [{ id, produit_nom, date_debut, date_fin,
//                   duree_mois, actif, conditions, created_at }] }
//
// Security: hard-filtered by client_id = session.clientId.
// ============================================================

function isMissingTableError(err: any): boolean {
  const msg = (err?.message || err?.toString() || "").toLowerCase();
  const code = String(err?.code || "");
  if (code === "42p01" || code === "pgrst205") return true;
  return (
    msg.includes("could not find the table") ||
    (msg.includes("relation") && msg.includes("does not exist")) ||
    (msg.includes("table") && msg.includes("does not exist")) ||
    (msg.includes("schema cache") && msg.includes("does not exist"))
  );
}

export async function GET(request: NextRequest) {
  const session = verifyClientSession(request);
  if (!session) {
    return NextResponse.json(
      { error: "Non connecté. Veuillez vous connecter." },
      { status: 401 }
    );
  }

  let client;
  try {
    client = getServerClient();
  } catch (e: any) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré.", detail: e?.message || "" },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await client
      .from("garanties")
      .select(
        "id, produit_nom, date_debut, date_fin, duree_mois, actif, conditions, created_at"
      )
      .eq("client_id", session.clientId)
      .order("date_fin", { ascending: false })
      .limit(200);

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'garanties' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[client/garanties] error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ garanties: data || [] });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'garanties' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[client/garanties] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
