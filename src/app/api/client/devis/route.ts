import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { verifyClientSession } from "@/lib/client-auth";

// ============================================================
// GET /api/client/devis
// (Task BONUS-2-3)
//
// Returns the list of devis for the logged-in client:
//   { devis: [{ id, numero, statut, date_emission, date_validite,
//               montant_total, created_at }] }
//
// Security:
//  - verifyClientSession ensures the `odg_client` cookie is valid.
//  - The query is HARD-FILTERED by client_id = session.clientId so a
//    logged-in client can NEVER see another client's devis, even if
//    they guessed the id.
//  - We select only the columns the portal needs (no commercial_id,
//    no lignes, no client_snapshot) to minimize data exposure.
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
      .from("devis")
      .select(
        "id, numero, statut, date_emission, date_validite, montant_total, created_at"
      )
      .eq("client_id", session.clientId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'devis' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[client/devis] error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ devis: data || [] });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'devis' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[client/devis] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
