import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { requireRole } from "@/lib/admin-auth";

// ============================================================
// CRUD — Commandes (CRM-C)
// Gating:
//   GET    : manager + commercial (own) + accountant (all)
//   POST   : manager + commercial
//   PUT    : manager + commercial  (statut changes are manager-only)
//   DELETE : manager only
//
// Side-effect: when statut → 'livree', insert a `garanties` row
// (24 months from today, linked to the commande + client + produit_nom
// derived from the devis lignes). Failures are logged but do NOT
// block the commande update itself.
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

// Build `CMD-YYYY-NNN` sequence number. NNN is the count of commandes
// created this year + 1 (zero-padded to 3). Race conditions could
// duplicate it under high concurrency, but the UNIQUE constraint will
// reject the second insert — and we retry with +1 in that case.
async function generateNumero(client: ReturnType<typeof getServerClient>): Promise<string> {
  const year = new Date().getFullYear();
  let seq = 1;
  if (client) {
    const from = `${year}-01-01T00:00:00Z`;
    const to = `${year}-12-31T23:59:59Z`;
    const { count, error } = await client
      .from("commandes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", from)
      .lte("created_at", to);
    if (!error && typeof count === "number") {
      seq = count + 1;
    }
  }
  return `CMD-${year}-${String(seq).padStart(3, "0")}`;
}

// ----- GET: list -----
export async function GET(request: NextRequest) {
  const session = requireRole(request, ["manager", "commercial", "accountant"]);
  if (!session) {
    return NextResponse.json(
      { error: "Non autorisé. Accès réservé (manager, commercial, comptable)." },
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

  try {
    let query = client
      .from("commandes")
      .select("*")
      .order("created_at", { ascending: false });

    // Commercial sees only their own commandes (commercial_id = userId).
    // manager + accountant + super_admin see everything.
    if (session.role === "commercial") {
      query = query.eq("commercial_id", session.userId);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'commandes' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/commandes] list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ commandes: data || [] });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'commandes' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/commandes] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// ----- POST: create -----
export async function POST(request: NextRequest) {
  const session = requireRole(request, ["manager", "commercial"]);
  if (!session) {
    return NextResponse.json(
      { error: "Non autorisé. Création réservée (manager, commercial)." },
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

  if (!body?.devis_id) {
    return NextResponse.json(
      { error: "Champ 'devis_id' requis (la commande provient d'un devis accepté)." },
      { status: 400 }
    );
  }

  // Fetch the devis — must be statut='accepte'. Pull client_id + commercial_id.
  const { data: devis, error: devisErr } = await client
    .from("devis")
    .select("id, client_id, commercial_id, statut, numero")
    .eq("id", body.devis_id)
    .maybeSingle();

  if (devisErr) {
    console.error("[admin/commandes] devis lookup error:", devisErr);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du devis : " + devisErr.message },
      { status: 500 }
    );
  }
  if (!devis) {
    return NextResponse.json(
      { error: "Devis introuvable." },
      { status: 404 }
    );
  }
  if (devis.statut !== "accepte") {
    return NextResponse.json(
      { error: "Le devis doit être au statut 'accepté' pour générer une commande." },
      { status: 400 }
    );
  }

  // Commercial can only create a commande from their own devis.
  if (session.role === "commercial" && devis.commercial_id && devis.commercial_id !== session.userId) {
    return NextResponse.json(
      { error: "Vous ne pouvez créer une commande qu'à partir de vos propres devis." },
      { status: 403 }
    );
  }

  const numero = await generateNumero(client);

  const payload: Record<string, unknown> = {
    numero,
    devis_id: devis.id,
    client_id: devis.client_id || body.client_id || null,
    statut: "en_attente",
    date_commande: new Date().toISOString().slice(0, 10),
    notes: typeof body.notes === "string" ? body.notes : null,
    commercial_id: devis.commercial_id || session.userId,
  };
  if (body.date_livraison_prevue) {
    payload.date_livraison_prevue = String(body.date_livraison_prevue).slice(0, 10);
  }

  try {
    const { data, error } = await client
      .from("commandes")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      // Retry with a higher sequence number if UNIQUE collision on numero.
      if (
        (error.code === "23505" || /duplicate key/i.test(error.message || "")) &&
        /numero/i.test(error.message || "")
      ) {
        const retryNumero = await generateNumero(client);
        const { data: data2, error: error2 } = await client
          .from("commandes")
          .insert({ ...payload, numero: retryNumero })
          .select("*")
          .single();
        if (error2) {
          console.error("[admin/commandes] insert retry error:", error2);
          return NextResponse.json({ error: error2.message }, { status: 500 });
        }
        return NextResponse.json({ commande: data2 });
      }
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'commandes' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/commandes] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ commande: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'commandes' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/commandes] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// ----- PUT: update -----
export async function PUT(request: NextRequest) {
  const session = requireRole(request, ["manager", "commercial"]);
  if (!session) {
    return NextResponse.json(
      { error: "Non autorisé. Modification réservée (manager, commercial)." },
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

  // Fetch the existing row for permission + side-effect checks.
  const { data: existing, error: fetchErr } = await client
    .from("commandes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    console.error("[admin/commandes] fetch for update error:", fetchErr);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  // Commercial: can only update their own commandes.
  if (session.role === "commercial" && existing.commercial_id && existing.commercial_id !== session.userId) {
    return NextResponse.json(
      { error: "Vous ne pouvez modifier que vos propres commandes." },
      { status: 403 }
    );
  }

  const previousStatut = existing.statut;
  const nextStatut = rest.statut ?? previousStatut;

  // Statut changes are manager-only (commercial cannot self-promote
  // a commande to 'livree' or change statut at all).
  if (nextStatut !== previousStatut && session.role === "commercial") {
    return NextResponse.json(
      { error: "Seul un manager peut changer le statut d'une commande." },
      { status: 403 }
    );
  }

  // Build the update payload from whitelisted fields.
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof rest.notes === "string") update.notes = rest.notes;
  if (rest.date_livraison_prevue !== undefined) {
    update.date_livraison_prevue = rest.date_livraison_prevue
      ? String(rest.date_livraison_prevue).slice(0, 10)
      : null;
  }
  if (rest.statut !== undefined) {
    const allowed = ["en_attente", "en_preparation", "livree", "annulee"];
    if (!allowed.includes(rest.statut)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }
    update.statut = rest.statut;
  }
  if (rest.client_id !== undefined) update.client_id = rest.client_id || null;
  if (rest.devis_id !== undefined) update.devis_id = rest.devis_id || null;
  if (rest.commercial_id !== undefined) update.commercial_id = rest.commercial_id || null;

  // When transitioning to 'livree', stamp date_livraison_reelle = today.
  const becomingLivre = nextStatut === "livree" && previousStatut !== "livree";
  if (becomingLivre) {
    update.date_livraison_reelle = new Date().toISOString().slice(0, 10);
  }

  try {
    const { data, error } = await client
      .from("commandes")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'commandes' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/commandes] update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Side-effect: garantie auto-creation when becoming 'livree'.
    // Failures are logged but do NOT fail the commande update — the
    // spec is explicit on this point.
    if (becomingLivre) {
      try {
        await createGarantiesForCommande(client, data);
      } catch (ge: any) {
        console.error(
          "[admin/commandes] garantie auto-creation failed (commande non bloquée) :",
          ge?.message || ge
        );
      }
    }

    return NextResponse.json({ commande: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'commandes' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/commandes] exception:", e);
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
    const { error } = await client.from("commandes").delete().eq("id", id);
    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'commandes' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/commandes] delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'commandes' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/commandes] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// ============================================================
// Garantie auto-creation — fire-and-forget side-effect.
// Inserts one `garanties` row per ligne in the source devis
// (24-month warranty). Falls back to a single row using
// produit_nom = "Commande {numero}" if the devis has no lignes
// or if fetching the devis fails.
// ============================================================
async function createGarantiesForCommande(
  client: NonNullable<ReturnType<typeof getServerClient>>,
  commande: any
): Promise<void> {
  const today = new Date();
  const dateDebut = today.toISOString().slice(0, 10);
  const fin = new Date(today);
  fin.setMonth(fin.getMonth() + 24);
  const dateFin = fin.toISOString().slice(0, 10);

  // Pull the devis lignes to know which products are covered.
  let produitNoms: string[] = [];
  if (commande?.devis_id) {
    const { data: devis, error } = await client
      .from("devis")
      .select("lignes, numero")
      .eq("id", commande.devis_id)
      .maybeSingle();
    if (!error && devis) {
      const lignes = Array.isArray(devis.lignes) ? devis.lignes : [];
      produitNoms = lignes
        .map((l: any) => {
          if (!l) return null;
          if (typeof l === "string") return l;
          // Lignes are { label: { fr, ar }, value } or { nom, produit, ... }
          if (l.nom && typeof l.nom === "string") return l.nom;
          if (l.produit && typeof l.produit === "string") return l.produit;
          if (l.name && typeof l.name === "object" && (l.name.fr || l.name.ar)) {
            return l.name.fr || l.name.ar;
          }
          if (l.label && typeof l.label === "object" && (l.label.fr || l.label.ar)) {
            return l.label.fr || l.label.ar;
          }
          if (typeof l.label === "string") return l.label;
          if (typeof l.name === "string") return l.name;
          return null;
        })
        .filter(Boolean) as string[];
    }
  }

  // Fallback: a single generic garantie if we couldn't resolve product names.
  if (produitNoms.length === 0) {
    produitNoms = [`Commande ${commande?.numero || ""}`.trim()];
  }

  const rows = produitNoms.map((nom) => ({
    client_id: commande?.client_id || null,
    commande_id: commande?.id || null,
    produit_nom: nom,
    date_debut: dateDebut,
    date_fin: dateFin,
    duree_mois: 24,
    actif: true,
  }));

  // Insert all garantie rows in one batch. Failures bubble up to the
  // caller, which catches them and logs without blocking the commande.
  const { error } = await client.from("garanties").insert(rows);
  if (error) {
    // If the table is missing, log + return silently.
    if (isMissingTableError(error)) {
      console.warn(
        "[admin/commandes] table 'garanties' absente — garantie non créée."
      );
      return;
    }
    throw error;
  }
}
