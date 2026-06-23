import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { requireRole } from "@/lib/admin-auth";

// Clients directory — multi-role access (super_admin, manager, commercial).
//
// Visibility rules:
//   - super_admin & manager → ALL clients
//   - commercial           → only clients WHERE commercial_id = their userId
//                             OR commercial_id IS NULL (unassigned pool)
//   - other roles          → 403
//
// Writes:
//   - commercial creating a client → commercial_id is forced to their userId
//     (they can't assign clients to other salespeople)
//   - commercial updating/deleting → only their own clients
//
// Table: clients (id, nom, type_client, email, telephone, adresse, wilaya,
//   contact_personne, notes, commercial_id FK→admin_users, created_at,
//   updated_at)

const VALID_TYPES = ["dentiste", "clinique", "hopital", "revendeur", "autre"];

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

// Columns we expose. We join commercial_id → admin_users for the "Commercial"
// column shown in the table.
const SELECT_COLS =
  "id, nom, type_client, email, telephone, adresse, wilaya, contact_personne, notes, commercial_id, created_at, updated_at, commercial:admin_users(full_name, email)";

function isManagerLike(role: string): boolean {
  return role === "super_admin" || role === "manager";
}

// ---- GET: list clients, filtered by role ----
export async function GET(request: NextRequest) {
  const session = requireRole(request, ["manager", "commercial"]);
  if (!session) {
    return NextResponse.json(
      { error: "Accès refusé. Rôle insuffisant." },
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
      .from("clients")
      .select(SELECT_COLS)
      .order("created_at", { ascending: false });

    // Commercial: restrict to own + unassigned. We can't express "OR" cleanly
    // with the .or() helper across two columns; use a raw .or().
    if (session.role === "commercial") {
      query = query.or(`commercial_id.eq.${session.userId},commercial_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'clients' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/clients] list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ clients: data || [] });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'clients' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/clients] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// ---- POST: create a client ----
// Body: { nom, type_client, email, telephone, adresse, wilaya,
//         contact_personne, notes, commercial_id? }
export async function POST(request: NextRequest) {
  const session = requireRole(request, ["manager", "commercial"]);
  if (!session) {
    return NextResponse.json(
      { error: "Accès refusé. Rôle insuffisant." },
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

  const nom = String(body?.nom || "").trim();
  if (!nom) {
    return NextResponse.json(
      { error: "Le champ 'nom' est requis." },
      { status: 400 }
    );
  }

  const type_client = String(body?.type_client || "autre").trim();
  if (!VALID_TYPES.includes(type_client)) {
    return NextResponse.json(
      { error: "Type de client invalide. Valeurs attendues : " + VALID_TYPES.join(", ") },
      { status: 400 }
    );
  }

  // Commercial assignment rule:
  //   - commercial → forced to their own userId (can't assign to others)
  //   - manager/super_admin → may pass an explicit commercial_id (validated)
  let commercial_id: string | null = null;
  if (session.role === "commercial") {
    commercial_id = session.userId;
  } else if (typeof body?.commercial_id === "string" && body.commercial_id.trim()) {
    commercial_id = body.commercial_id.trim();
  }

  const payload = {
    nom,
    type_client,
    email: String(body?.email || "").trim() || null,
    telephone: String(body?.telephone || "").trim() || null,
    adresse: String(body?.adresse || "").trim() || null,
    wilaya: String(body?.wilaya || "").trim() || null,
    contact_personne: String(body?.contact_personne || "").trim() || null,
    notes: String(body?.notes || "").trim() || null,
    commercial_id,
  };

  try {
    const { data, error } = await client
      .from("clients")
      .insert(payload)
      .select(SELECT_COLS)
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'clients' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/clients] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ client: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'clients' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/clients] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// ---- PUT: update a client ----
// Body: { id, ...fields }
// Commercial can only update their own clients.
export async function PUT(request: NextRequest) {
  const session = requireRole(request, ["manager", "commercial"]);
  if (!session) {
    return NextResponse.json(
      { error: "Accès refusé. Rôle insuffisant." },
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
    return NextResponse.json(
      { error: "Champ 'id' requis." },
      { status: 400 }
    );
  }

  // Fetch current row to enforce commercial ownership.
  const { data: current, error: fetchErr } = await client
    .from("clients")
    .select("id, commercial_id")
    .eq("id", id)
    .single();
  if (fetchErr || !current) {
    return NextResponse.json(
      { error: "Client introuvable." },
      { status: 404 }
    );
  }
  if (
    session.role === "commercial" &&
    current.commercial_id !== session.userId
  ) {
    return NextResponse.json(
      { error: "Vous ne pouvez modifier que vos propres clients." },
      { status: 403 }
    );
  }

  // Build update payload.
  const update: Record<string, unknown> = {};
  if (typeof rest.nom === "string") {
    const nom = rest.nom.trim();
    if (!nom) {
      return NextResponse.json(
        { error: "Le champ 'nom' ne peut pas être vide." },
        { status: 400 }
      );
    }
    update.nom = nom;
  }
  if (typeof rest.type_client === "string") {
    const tc = rest.type_client.trim();
    if (!VALID_TYPES.includes(tc)) {
      return NextResponse.json(
        { error: "Type de client invalide." },
        { status: 400 }
      );
    }
    update.type_client = tc;
  }
  if (typeof rest.email === "string") update.email = rest.email.trim() || null;
  if (typeof rest.telephone === "string") update.telephone = rest.telephone.trim() || null;
  if (typeof rest.adresse === "string") update.adresse = rest.adresse.trim() || null;
  if (typeof rest.wilaya === "string") update.wilaya = rest.wilaya.trim() || null;
  if (typeof rest.contact_personne === "string") update.contact_personne = rest.contact_personne.trim() || null;
  if (typeof rest.notes === "string") update.notes = rest.notes.trim() || null;

  // Commercial reassignment: only manager+ can change it.
  if (typeof rest.commercial_id !== "undefined") {
    if (isManagerLike(session.role)) {
      const cid = rest.commercial_id;
      update.commercial_id =
        typeof cid === "string" && cid.trim() ? cid.trim() : null;
    }
    // else: silently ignore — commercials can't reassign.
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "Aucun champ à mettre à jour." },
      { status: 400 }
    );
  }

  // Force updated_at refresh (the table has a default but Postgres won't
  // bump it automatically without a trigger — set it explicitly).
  update.updated_at = new Date().toISOString();

  try {
    const { data, error } = await client
      .from("clients")
      .update(update)
      .eq("id", id)
      .select(SELECT_COLS)
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'clients' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/clients] update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ client: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'clients' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/clients] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// ---- DELETE: remove a client ----
// Query: ?id=...
// Commercial can only delete their own clients.
export async function DELETE(request: NextRequest) {
  const session = requireRole(request, ["manager", "commercial"]);
  if (!session) {
    return NextResponse.json(
      { error: "Accès refusé. Rôle insuffisant." },
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
    return NextResponse.json(
      { error: "Param 'id' requis." },
      { status: 400 }
    );
  }

  // Ownership check for commercials.
  if (session.role === "commercial") {
    const { data: current, error: fetchErr } = await client
      .from("clients")
      .select("commercial_id")
      .eq("id", id)
      .single();
    if (fetchErr || !current) {
      return NextResponse.json(
        { error: "Client introuvable." },
        { status: 404 }
      );
    }
    if (current.commercial_id !== session.userId) {
      return NextResponse.json(
        { error: "Vous ne pouvez supprimer que vos propres clients." },
        { status: 403 }
      );
    }
  }

  try {
    const { error } = await client.from("clients").delete().eq("id", id);
    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'clients' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/clients] delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'clients' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/clients] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
