import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { requireRole } from "@/lib/admin-auth";

// ============================================================
// CRUD — Garanties (CRM-D)
// Gating:
//   GET    : manager + technician + accountant (read-only for tech/accountant)
//   POST   : manager
//   PUT    : manager
//   DELETE : manager
//
// Notes:
//  - Garanties are normally auto-created when a commande transitions
//    to 'livree' (see /api/admin/commandes route). The POST endpoint
//    here allows a manager to create a manual garantie (e.g. for
//    equipment installed before the CRM rollout).
//  - date_fin is computed server-side as date_debut + duree_mois months.
// ============================================================

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

// Compute date_fin = date_debut + duree_mois months (ISO date string YYYY-MM-DD).
// Returns null if inputs are invalid.
function computeDateFin(dateDebut: string, dureeMois: number): string | null {
  if (!dateDebut) return null;
  const d = new Date(`${dateDebut}T00:00:00Z`);
  if (isNaN(d.getTime())) return null;
  const months = Number(dureeMois);
  if (!Number.isFinite(months) || months <= 0) return null;
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

// ----- GET: list with optional ?client_id filter -----
export async function GET(request: NextRequest) {
  const session = requireRole(request, ["manager", "technician", "accountant"]);
  if (!session) {
    return NextResponse.json(
      { error: "Non autorisé. Accès réservé (manager, technicien, comptable)." },
      { status: 403 }
    );
  }
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré. Vérifiez SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const clientIdFilter = url.searchParams.get("client_id");

  try {
    // We join the clients table to get the client's nom in one query.
    // Supabase/PostgREST returns nested `client: { nom }` objects.
    let query = client
      .from("garanties")
      .select(
        "id, client_id, commande_id, produit_id, produit_nom, date_debut, date_fin, duree_mois, conditions, actif, created_at, client:clients(nom)"
      )
      .order("date_fin", { ascending: false });

    if (clientIdFilter) {
      query = query.eq("client_id", clientIdFilter);
    }

    const { data, error } = await query;

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
      console.error("[admin/garanties] list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Normalize the nested `client` object into a flat `client_nom` field
    // so the frontend doesn't need to special-case null/obj shapes.
    const garanties = (data || []).map((row: any) => ({
      ...row,
      client_nom:
        row?.client && typeof row.client === "object" && !Array.isArray(row.client)
          ? row.client.nom || null
          : null,
    }));

    return NextResponse.json({ garanties });
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
    console.error("[admin/garanties] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// ----- POST: create -----
export async function POST(request: NextRequest) {
  const session = requireRole(request, ["manager"]);
  if (!session) {
    return NextResponse.json(
      { error: "Non autorisé. Création réservée au manager." },
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

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  if (!body?.client_id) {
    return NextResponse.json(
      { error: "Champ 'client_id' requis." },
      { status: 400 }
    );
  }
  if (!body?.produit_nom || typeof body.produit_nom !== "string" || !body.produit_nom.trim()) {
    return NextResponse.json(
      { error: "Champ 'produit_nom' requis." },
      { status: 400 }
    );
  }
  if (!body?.date_debut || typeof body.date_debut !== "string") {
    return NextResponse.json(
      { error: "Champ 'date_debut' requis (format YYYY-MM-DD)." },
      { status: 400 }
    );
  }

  const dureeMois =
    Number.isFinite(Number(body.duree_mois)) && Number(body.duree_mois) > 0
      ? Number(body.duree_mois)
      : 24;

  const dateDebut = String(body.date_debut).slice(0, 10);
  const dateFin = computeDateFin(dateDebut, dureeMois);
  if (!dateFin) {
    return NextResponse.json(
      { error: "Impossible de calculer la date de fin (date_debut ou duree_mois invalide)." },
      { status: 400 }
    );
  }

  const payload: Record<string, unknown> = {
    client_id: body.client_id,
    commande_id: body.commande_id || null,
    produit_id: body.produit_id || null,
    produit_nom: body.produit_nom.trim(),
    date_debut: dateDebut,
    date_fin: dateFin,
    duree_mois: dureeMois,
    conditions: typeof body.conditions === "string" ? body.conditions : null,
    actif: body.actif !== false,
  };

  try {
    const { data, error } = await client
      .from("garanties")
      .insert(payload)
      .select("*")
      .single();

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
      console.error("[admin/garanties] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ garantie: data });
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
    console.error("[admin/garanties] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// ----- PUT: update -----
export async function PUT(request: NextRequest) {
  const session = requireRole(request, ["manager"]);
  if (!session) {
    return NextResponse.json(
      { error: "Non autorisé. Modification réservée au manager." },
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

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const { id, ...rest } = body;
  if (!id) {
    return NextResponse.json({ error: "Champ 'id' requis." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (rest.client_id !== undefined) update.client_id = rest.client_id || null;
  if (rest.commande_id !== undefined) update.commande_id = rest.commande_id || null;
  if (rest.produit_id !== undefined) update.produit_id = rest.produit_id || null;
  if (typeof rest.produit_nom === "string" && rest.produit_nom.trim()) {
    update.produit_nom = rest.produit_nom.trim();
  }
  if (typeof rest.conditions === "string") {
    update.conditions = rest.conditions;
  }
  if (rest.actif !== undefined) update.actif = Boolean(rest.actif);

  // date_debut + duree_mois → recompute date_fin if either changes.
  let newDateDebut: string | null = null;
  let newDureeMois: number | null = null;
  if (typeof rest.date_debut === "string" && rest.date_debut) {
    newDateDebut = String(rest.date_debut).slice(0, 10);
    update.date_debut = newDateDebut;
  }
  if (rest.duree_mois !== undefined && Number.isFinite(Number(rest.duree_mois))) {
    newDureeMois = Number(rest.duree_mois);
    if (newDureeMois > 0) update.duree_mois = newDureeMois;
  }
  if (rest.date_fin !== undefined) {
    // Allow explicit override (rare but supported).
    update.date_fin = rest.date_fin ? String(rest.date_fin).slice(0, 10) : null;
  } else if (newDateDebut || newDureeMois) {
    // Need the existing row's date_debut/duree_mois to recompute date_fin.
    const { data: existing, error: fetchErr } = await client
      .from("garanties")
      .select("date_debut, duree_mois")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) {
      console.error("[admin/garanties] fetch for recompute error:", fetchErr);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Garantie introuvable." }, { status: 404 });
    }
    const baseDate = newDateDebut || existing.date_debut;
    const baseMois = newDureeMois ?? existing.duree_mois;
    if (baseDate && baseMois) {
      const recomputed = computeDateFin(String(baseDate).slice(0, 10), Number(baseMois));
      if (recomputed) update.date_fin = recomputed;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  try {
    const { data, error } = await client
      .from("garanties")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

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
      console.error("[admin/garanties] update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ garantie: data });
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
    console.error("[admin/garanties] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// ----- DELETE: remove -----
export async function DELETE(request: NextRequest) {
  const session = requireRole(request, ["manager"]);
  if (!session) {
    return NextResponse.json(
      { error: "Non autorisé. Suppression réservée au manager." },
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

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Param 'id' requis." }, { status: 400 });
  }

  try {
    const { error } = await client.from("garanties").delete().eq("id", id);
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
      console.error("[admin/garanties] delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
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
    console.error("[admin/garanties] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
