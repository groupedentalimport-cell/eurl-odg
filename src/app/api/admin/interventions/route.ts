import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { requireRole } from "@/lib/admin-auth";

// ============================================================
// CRUD — Interventions (CRM-C)
// Gating:
//   GET    : manager + technician (technician sees only their own)
//   POST   : manager + technician
//   PUT    : manager + technician (technician only their own)
//   DELETE : manager only
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

const ALLOWED_TYPES = [
  "livraison",
  "installation",
  "formation",
  "maintenance_preventive",
  "maintenance_curative",
] as const;
const ALLOWED_STATUTS = ["planifie", "en_cours", "termine", "annule"] as const;

// Resolve the technician's techniciens.id from their admin_users.id
// (session.userId). Returns null if no row exists or the table is
// missing — caller should treat null as "no interventions visible".
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
    // Tolerate a missing techniciens table — fall back to no rows.
    if (isMissingTableError(error)) return null;
    console.warn("[admin/interventions] technicien lookup error:", error.message);
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
  const from = url.searchParams.get("from"); // e.g. 2026-06-01
  const to = url.searchParams.get("to"); // e.g. 2026-06-30
  const technicienId = url.searchParams.get("technicien_id");
  const statut = url.searchParams.get("statut");

  // Technician scoping: lookup their techniciens.id, then filter on it.
  let techFilter: string | null = null;
  if (session.role === "technician") {
    techFilter = await findTechnicienIdForUser(client, session.userId);
    // If the technician has no techniciens row, they see nothing.
  } else if (technicianIdParam(technicienId)) {
    techFilter = technicienId;
  }

  try {
    let query = client
      .from("interventions")
      .select("*")
      .order("date_prevue", { ascending: true });

    if (techFilter) {
      query = query.eq("technicien_id", techFilter);
    }
    if (statut && (ALLOWED_STATUTS as readonly string[]).includes(statut)) {
      query = query.eq("statut", statut);
    }
    // Date range filter on date_prevue (timestamptz).
    // `from` is inclusive (>= start of day), `to` is inclusive (<= end of day).
    if (from) {
      query = query.gte("date_prevue", `${from}T00:00:00Z`);
    }
    if (to) {
      query = query.lte("date_prevue", `${to}T23:59:59Z`);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'interventions' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/interventions] list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ interventions: data || [] });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'interventions' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/interventions] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

function technicianIdParam(v: string | null): v is string {
  return Boolean(v && v.trim());
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
      { error: "Champ 'type' invalide. Valeurs: livraison, installation, formation, maintenance_preventive, maintenance_curative." },
      { status: 400 }
    );
  }

  const payload: Record<string, unknown> = {
    type: body.type,
    client_id: body.client_id || null,
    commande_id: body.commande_id || null,
    produit_id: body.produit_id || null,
    produit_nom: typeof body.produit_nom === "string" ? body.produit_nom : null,
    technicien_id: body.technicien_id || null,
    adresse_intervention: typeof body.adresse_intervention === "string" ? body.adresse_intervention : null,
    rapport: typeof body.rapport === "string" ? body.rapport : null,
    notes: typeof body.notes === "string" ? body.notes : null,
    created_by: session.userId,
    statut: body.statut && (ALLOWED_STATUTS as readonly string[]).includes(body.statut) ? body.statut : "planifie",
    duree_estimee_min:
      Number.isFinite(Number(body.duree_estimee_min)) ? Number(body.duree_estimee_min) : 60,
  };

  // date_prevue: accept either ISO string or "YYYY-MM-DDTHH:mm" (datetime-local).
  if (body.date_prevue) {
    const d = new Date(body.date_prevue);
    if (!isNaN(d.getTime())) {
      payload.date_prevue = d.toISOString();
    } else {
      payload.date_prevue = String(body.date_prevue);
    }
  }

  // Technicians: force technicien_id to their own if not set (or if they try
  // to assign it to someone else). Manager can set any technicien_id.
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
      .from("interventions")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'interventions' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/interventions] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ intervention: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'interventions' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/interventions] exception:", e);
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
    .from("interventions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    console.error("[admin/interventions] fetch error:", fetchErr);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Intervention introuvable." }, { status: 404 });
  }

  // Technician scoping on PUT: must own the intervention.
  if (session.role === "technician") {
    const myTechId = await findTechnicienIdForUser(client, session.userId);
    if (!myTechId || existing.technicien_id !== myTechId) {
      return NextResponse.json(
        { error: "Vous ne pouvez modifier que vos propres interventions." },
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
    client_id: (v) => v || null,
    commande_id: (v) => v || null,
    produit_id: (v) => v || null,
    produit_nom: (v) => (typeof v === "string" ? v : null),
    technicien_id: (v) => v || null,
    adresse_intervention: (v) => (typeof v === "string" ? v : null),
    rapport: (v) => (typeof v === "string" ? v : null),
    notes: (v) => (typeof v === "string" ? v : null),
    duree_estimee_min: (v) => (Number.isFinite(Number(v)) ? Number(v) : undefined),
  };
  for (const [k, fn] of Object.entries(fields)) {
    if (rest[k] !== undefined) {
      const val = fn(rest[k]);
      if (val !== undefined) update[k] = val;
    }
  }
  // date_prevue: accept ISO or datetime-local string.
  if (rest.date_prevue !== undefined) {
    if (rest.date_prevue) {
      const d = new Date(rest.date_prevue);
      update.date_prevue = !isNaN(d.getTime()) ? d.toISOString() : String(rest.date_prevue);
    } else {
      update.date_prevue = null;
    }
  }

  // When transitioning to 'termine', stamp date_realisee = now.
  if (becomingTermine) {
    update.date_realisee = new Date().toISOString();
  }

  // Technician cannot re-assign the intervention to a different technicien.
  if (session.role === "technician" && "technicien_id" in update) {
    delete update.technicien_id;
  }

  try {
    const { data, error } = await client
      .from("interventions")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'interventions' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/interventions] update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ intervention: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'interventions' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/interventions] exception:", e);
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
    const { error } = await client.from("interventions").delete().eq("id", id);
    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'interventions' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/interventions] delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'interventions' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/interventions] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
