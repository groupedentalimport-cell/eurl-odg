import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { requireRole, type AdminRole } from "@/lib/admin-auth";

// ============================================================
// CRM — Single devis detail (GET)
// Task CRM-B
// ============================================================
// Returns the full devis row + joined client info.
// Gating: commercial can only view their own devis.
//
// Route: GET /api/admin/devis/[id]

const READ_ROLES: AdminRole[] = ["manager", "commercial", "accountant"];

function isMissingTableError(err: any): boolean {
  const msg = (err?.message || err?.toString() || "").toLowerCase();
  const code = String(err?.code || "");
  if (code === "42p01") return true;
  if (code === "pgrst205") return true;
  return (
    msg.includes("could not find the table") ||
    (msg.includes("relation") && msg.includes("does not exist")) ||
    (msg.includes("table") && msg.includes("does not exist")) ||
    (msg.includes("schema cache") && msg.includes("does not exist"))
  );
}

function getClient() {
  try {
    return getServerClient();
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireRole(request, READ_ROLES);
  if (!session) {
    return NextResponse.json(
      { error: "Accès refusé. Session admin requise." },
      { status: 403 }
    );
  }
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré." },
      { status: 500 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Param 'id' requis." }, { status: 400 });
  }

  try {
    const { data, error } = await client
      .from("devis")
      .select(
        `
        id,
        numero,
        client_id,
        client_snapshot,
        lignes,
        sous_total,
        remise_total,
        tva_taux,
        tva_montant,
        montant_total,
        statut,
        date_emission,
        date_validite,
        notes,
        commercial_id,
        converted_to_commande_id,
        created_at,
        updated_at,
        client:clients (
          id,
          nom,
          email,
          telephone,
          adresse,
          wilaya
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116" || /no rows/i.test(error.message || "")) {
        return NextResponse.json(
          { error: "Devis introuvable." },
          { status: 404 }
        );
      }
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'devis' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/devis/[id]] fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Devis introuvable." },
        { status: 404 }
      );
    }

    // Commercial: enforce ownership.
    if (
      session.role === "commercial" &&
      data.commercial_id !== session.userId
    ) {
      return NextResponse.json(
        { error: "Accès refusé. Ce devis n'est pas le vôtre." },
        { status: 403 }
      );
    }

    return NextResponse.json({ devis: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'devis' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/devis/[id]] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
