import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { requireRole } from "@/lib/admin-auth";

// ============================================================
// CRUD — Maintenances (CRM-D)
// Gating:
//   GET    : manager + technician (technician sees only their own)
//   POST   : manager + technician (tech: forced technicien_id = their own)
//   PUT    : manager + technician (tech: own only; cannot re-assign)
//   DELETE : manager only
//
// Schema notes:
//  - maintenances.garantie_id → garanties.id (nullable for legacy/manual rows)
//  - maintenances.intervention_id → interventions.id (nullable; set when a
//    maintenance is realised as an intervention)
//  - statut enum: planifie | en_cours | termine | annule | en_retard
//    (en_retard is computed by the dashboard, but stored too so a cron could
//     flip it later.)
//  - When date_realisee is set on PUT, statut auto-becomes 'termine'.
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

const ALLOWED_TYPES = ["preventive", "curative"] as const;
const ALLOWED_STATUTS = ["planifie", "en_cours", "termine", "annule", "en_retard"] as const;

// Resolve the technician's techniciens.id from their admin_users.id.
// Returns null if no row exists or the table is missing.
async function findTechnicienIdForUser(
  client: NonNullable<ReturnType<typeof getServerClient>>,
  userId: string
): Promise<string | null> {
  const { data, error } = await client
    .from("techniciens")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    console.warn("[admin/maintenances] technicien lookup error:", error.message);
    return null;
  }
  return data?.id || null;
}

// ----- GET: list with optional filters -----
export async function GET(request: NextRequest) {
  const session = requireRole(request, ["manager", "technician"]);
  if (!session) {
    return NextResponse.json(
      { error: "Non autorisé. Accès réservé (manager, technicien)." },
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
  const garantieId = url.searchParams.get("garantie_id");
  const clientId = url.searchParams.get("client_id");
  const type = url.searchParams.get("type");
  const statut = url.searchParams.get("statut");

  // Technician scoping: lookup their techniciens.id, then filter on it.
  let techFilter: string | null = null;
  if (session.role === "technician") {
    techFilter = await findTechnicienIdForUser(client, session.userId);
  }

  try {
    // Join garantie (for produit_nom + date_fin) and client (for nom).
    let query = client
      .from("maintenances")
      .select(
        "id, garantie_id, client_id, type, date_prevue, date_realisee, intervention_id, description, rapport, statut, technicien_id, created_at, updated_at, garantie:garanties(produit_nom, date_fin), client:clients(nom)"
      )
      .order("date_prevue", { ascending: true });

    if (techFilter) {
      query = query.eq("technicien_id", techFilter);
    }
    if (garantieId) {
      query = query.eq("garantie_id", garantieId);
    }
    if (clientId) {
      query = query.eq("client_id", clientId);
    }
    if (type && (ALLOWED_TYPES as readonly string[]).includes(type)) {
      query = query.eq("type", type);
    }
    if (statut && (ALLOWED_STATUTS as readonly string[]).includes(statut)) {
      query = query.eq("statut", statut);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'maintenances' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/maintenances] list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten the joined objects into convenient `garantie_produit_nom`,
    // `garantie_date_fin` and `client_nom` fields for the frontend.
    const maintenances = (data || []).map((row: any) => {
      const g = row?.garantie;
      const c = row?.client;
      return {
        ...row,
        garantie_produit_nom:
          g && typeof g === "object" && !Array.isArray(g) ? g.produit_nom || null : null,
        garantie_date_fin:
          g && typeof g === "object" && !Array.isArray(g) ? g.date_fin || null : null,
        client_nom:
          c && typeof c === "object" && !Array.isArray(c) ? c.nom || null : null,
      };
    });

    return NextResponse.json({ maintenances });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'maintenances' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/maintenances] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// ----- POST: create -----
export async function POST(request: NextRequest) {
  const session = requireRole(request, ["manager", "technician"]);
  if (!session) {
    return NextResponse.json(
      { error: "Non autorisé. Création réservée (manager, technicien)." },
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

  if (!body?.type || !(ALLOWED_TYPES as readonly string[]).includes(body.type)) {
    return NextResponse.json(
      { error: "Champ 'type' invalide. Valeurs: preventive, curative." },
      { status: 400 }
    );
  }
  if (!body?.client_id) {
    return NextResponse.json(
      { error: "Champ 'client_id' requis." },
      { status: 400 }
    );
  }

  const payload: Record<string, unknown> = {
    garantie_id: body.garantie_id || null,
    client_id: body.client_id,
    type: body.type,
    date_prevue:
      typeof body.date_prevue === "string"
        ? String(body.date_prevue).slice(0, 10)
        : null,
    description: typeof body.description === "string" ? body.description : null,
    rapport: typeof body.rapport === "string" ? body.rapport : null,
    intervention_id: body.intervention_id || null,
    technicien_id: body.technicien_id || null,
    statut: "planifie",
  };

  // Technician scoping on POST: force technicien_id to their own.
  if (session.role === "technician") {
    const myTechId = await findTechnicienIdForUser(client, session.userId);
    if (myTechId) {
      payload.technicien_id = myTechId;
    } else if (!payload.technicien_id) {
      return NextResponse.json(
        { error: "Aucun profil technicien lié à votre compte. Contactez un manager." },
        { status: 400 }
      );
    }
  }

  try {
    const { data, error } = await client
      .from("maintenances")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'maintenances' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/maintenances] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ maintenance: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'maintenances' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/maintenances] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// ----- PUT: update -----
export async function PUT(request: NextRequest) {
  const session = requireRole(request, ["manager", "technician"]);
  if (!session) {
    return NextResponse.json(
      { error: "Non autorisé. Modification réservée (manager, technicien)." },
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

  const { data: existing, error: fetchErr } = await client
    .from("maintenances")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    console.error("[admin/maintenances] fetch error:", fetchErr);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Maintenance introuvable." }, { status: 404 });
  }

  // Technician scoping on PUT: must own the maintenance.
  if (session.role === "technician") {
    const myTechId = await findTechnicienIdForUser(client, session.userId);
    if (!myTechId || existing.technicien_id !== myTechId) {
      return NextResponse.json(
        { error: "Vous ne pouvez modifier que vos propres maintenances." },
        { status: 403 }
      );
    }
  }

  const previousStatut = existing.statut;
  const nextStatut = rest.statut ?? previousStatut;
  const becomingTermine = nextStatut === "termine" && previousStatut !== "termine";

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  const fields: Record<string, (v: any) => unknown> = {
    type: (v) => (ALLOWED_TYPES as readonly string[]).includes(v) ? v : undefined,
    statut: (v) => (ALLOWED_STATUTS as readonly string[]).includes(v) ? v : undefined,
    garantie_id: (v) => v || null,
    client_id: (v) => v || null,
    intervention_id: (v) => v || null,
    description: (v) => (typeof v === "string" ? v : null),
    rapport: (v) => (typeof v === "string" ? v : null),
    technicien_id: (v) => v || null,
  };
  for (const [k, fn] of Object.entries(fields)) {
    if (rest[k] !== undefined) {
      const val = fn(rest[k]);
      if (val !== undefined) update[k] = val;
    }
  }

  // date_prevue: accept YYYY-MM-DD or ISO.
  if (rest.date_prevue !== undefined) {
    if (rest.date_prevue) {
      update.date_prevue = String(rest.date_prevue).slice(0, 10);
    } else {
      update.date_prevue = null;
    }
  }

  // date_realisee: if explicitly set, stamp it AND auto-set statut='termine'
  // (per spec: "If date_realisee set → statut = 'termine'").
  if (rest.date_realisee !== undefined) {
    if (rest.date_realisee) {
      update.date_realisee = String(rest.date_realisee).slice(0, 10);
      update.statut = "termine";
    } else {
      update.date_realisee = null;
    }
  } else if (becomingTermine) {
    // statut → termine without explicit date_realisee: stamp today.
    update.date_realisee = new Date().toISOString().slice(0, 10);
  }

  // Technician cannot re-assign the maintenance to a different technicien.
  if (session.role === "technician" && "technicien_id" in update) {
    delete update.technicien_id;
  }

  if (Object.keys(update).length === 1 && "updated_at" in update) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  try {
    const { data, error } = await client
      .from("maintenances")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'maintenances' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/maintenances] update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ maintenance: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'maintenances' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/maintenances] exception:", e);
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
    const { error } = await client.from("maintenances").delete().eq("id", id);
    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'maintenances' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/maintenances] delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'maintenances' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/maintenances] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
