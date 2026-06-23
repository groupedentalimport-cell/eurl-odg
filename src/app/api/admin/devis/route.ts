import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { requireRole, type AdminRole } from "@/lib/admin-auth";

// ============================================================
// CRM — Devis (quotes) CRUD
// Task CRM-B
// ============================================================
// Roles & permissions (mirrors src/hooks/useAdminSession.ts):
//   - GET (list): super_admin, manager, accountant → ALL devis.
//                  commercial → only WHERE commercial_id = session.userId.
//   - POST (create): super_admin, manager, commercial.
//   - PUT (update): super_admin, manager (any field incl. statut).
//                    commercial → only own brouillons, cannot change statut.
//   - DELETE: super_admin, manager (any).
//             commercial → own brouillons only.
//   - accountant: read-only (excluded from POST/PUT/DELETE).
//
// Table: devis (see supabase-crm-schema.sql):
//   id, numero UNIQUE, client_id, client_snapshot jsonb, lignes jsonb,
//   sous_total, remise_total, tva_taux, tva_montant, montant_total,
//   statut CHECK(brouillon|envoye|accepte|refuse|expire),
//   date_emission, date_validite, notes, commercial_id,
//   converted_to_commande_id, created_at, updated_at

const READ_ROLES: AdminRole[] = ["manager", "commercial", "accountant"];
const WRITE_ROLES: AdminRole[] = ["manager", "commercial"];
const VALIDATE_ROLES: AdminRole[] = ["manager"]; // commercial excluded

type Ligne = {
  product_id?: string | null;
  designation: string;
  qte: number;
  prix_unitaire: number;
  remise_pct?: number;
};

type Totals = {
  sous_total: number;
  remise_total: number;
  tva_montant: number;
  montant_total: number;
};

function isMissingTableError(err: any): boolean {
  const msg = (err?.message || err?.toString() || "").toLowerCase();
  const code = String(err?.code || "");
  if (code === "42p01") return true; // undefined_table
  if (code === "pgrst205") return true; // schema cache miss
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

function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function computeTotals(lignes: Ligne[], tvaTaux: number): Totals {
  let sousTotal = 0;
  let remiseTotal = 0;
  for (const l of lignes || []) {
    const qte = toNum(l.qte, 0);
    const pu = toNum(l.prix_unitaire, 0);
    const remisePct = toNum(l.remise_pct, 0);
    const brut = qte * pu;
    const remise = (brut * remisePct) / 100;
    sousTotal += brut;
    remiseTotal += remise;
  }
  const baseImposable = Math.max(0, sousTotal - remiseTotal);
  const tvaMontant = (baseImposable * toNum(tvaTaux, 0)) / 100;
  const montantTotal = baseImposable + tvaMontant;
  return {
    sous_total: round2(sousTotal),
    remise_total: round2(remiseTotal),
    tva_montant: round2(tvaMontant),
    montant_total: round2(montantTotal),
  };
}

function sanitizeLignes(raw: unknown): Ligne[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((l: any) => ({
      product_id: l?.product_id ? String(l.product_id) : null,
      designation: (l?.designation ?? "").toString().trim(),
      qte: toNum(l?.qte, 0),
      prix_unitaire: toNum(l?.prix_unitaire, 0),
      remise_pct: toNum(l?.remise_pct, 0),
    }))
    .filter((l) => l.designation !== "" || l.qte > 0 || l.prix_unitaire > 0);
}

// Generate the next numero for the current year.
// Format: DEV-YYYY-NNN (zero-padded to 3 digits, but expands if > 999).
// Strategy: query the MAX numero for the year prefix, parse NNN, +1.
// On UNIQUE collision (race), retry with NNN+1 up to 5 times.
async function generateNumero(
  client: ReturnType<typeof getServerClient>,
  year: number
): Promise<string> {
  const prefix = `DEV-${year}-`;
  // Fetch all numeros starting with the prefix
  const { data, error } = await client!
    .from("devis")
    .select("numero")
    .like("numero", `${prefix}%`);

  let maxSeq = 0;
  if (!error && Array.isArray(data)) {
    for (const row of data) {
      const seq = parseInt(String(row?.numero || "").slice(prefix.length), 10);
      if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
}

async function insertWithNumeroRetry(
  client: ReturnType<typeof getServerClient>,
  payload: Record<string, unknown>,
  year: number,
  attempts = 5
): Promise<{ data: any; error: any }> {
  let lastError: any = null;
  for (let i = 0; i < attempts; i++) {
    const numero = await generateNumero(client, year);
    const { data, error } = await client!
      .from("devis")
      .insert({ ...payload, numero })
      .select("*")
      .single();
    if (!error) return { data, error: null };
    lastError = error;
    // 23505 = unique_violation (numero duplicate) → retry with next seq
    const code = String(error?.code || "");
    const msg = (error?.message || "").toLowerCase();
    if (code !== "23505" && !msg.includes("unique") && !msg.includes("duplicate")) {
      return { data: null, error };
    }
    // else loop and try next numero
  }
  return { data: null, error: lastError };
}

async function fetchClientSnapshot(
  client: ReturnType<typeof getServerClient>,
  clientId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await client!
    .from("clients")
    .select("id, nom, email, telephone, adresse, wilaya")
    .eq("id", clientId)
    .single();
  if (error || !data) return null;
  return {
    nom: data.nom ?? null,
    email: data.email ?? null,
    telephone: data.telephone ?? null,
    adresse: data.adresse ?? null,
    wilaya: data.wilaya ?? null,
  };
}

// =====================================================================
// GET — list devis
// =====================================================================
export async function GET(request: NextRequest) {
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
      { error: "Supabase serveur non configuré. Vérifiez SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  try {
    let query = client
      .from("devis")
      .select(
        "id, numero, client_id, client_snapshot, lignes, sous_total, remise_total, tva_taux, tva_montant, montant_total, statut, date_emission, date_validite, notes, commercial_id, converted_to_commande_id, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    // Commercial sees only their own devis.
    if (session.role === "commercial") {
      query = query.eq("commercial_id", session.userId);
    }

    const { data, error } = await query;

    if (error) {
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
      console.error("[admin/devis] list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ devis: data || [] });
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
    console.error("[admin/devis] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// =====================================================================
// POST — create
// =====================================================================
export async function POST(request: NextRequest) {
  const session = requireRole(request, WRITE_ROLES);
  if (!session) {
    return NextResponse.json(
      { error: "Accès refusé. Création réservée aux managers et commerciaux." },
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

  const clientId = body?.client_id ? String(body.client_id) : null;
  if (!clientId) {
    return NextResponse.json(
      { error: "Champ 'client_id' requis." },
      { status: 400 }
    );
  }

  const lignes = sanitizeLignes(body.lignes);
  if (lignes.length === 0) {
    return NextResponse.json(
      { error: "Au moins une ligne est requise." },
      { status: 400 }
    );
  }
  for (const l of lignes) {
    if (!l.designation) {
      return NextResponse.json(
        { error: "Chaque ligne doit avoir une désignation." },
        { status: 400 }
      );
    }
  }

  const tvaTaux = toNum(body.tva_taux, 19);
  const totals = computeTotals(lignes, tvaTaux);
  const snapshot = await fetchClientSnapshot(client, clientId);
  if (!snapshot) {
    return NextResponse.json(
      { error: "Client introuvable. Vérifiez l'identifiant client." },
      { status: 400 }
    );
  }

  // commercial_id: commercial forced to self; manager+ can pass body.commercial_id
  let commercialId: string | null = session.userId;
  if (session.role !== "commercial") {
    commercialId = body.commercial_id ? String(body.commercial_id) : session.userId;
  }

  const today = new Date();
  const year = today.getFullYear();
  const dateEmission = today.toISOString().slice(0, 10);

  // date_validite default +30 days
  let dateValidite: string | null = null;
  if (body.date_validite) {
    dateValidite = String(body.date_validite);
  } else {
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    dateValidite = d.toISOString().slice(0, 10);
  }

  const payload: Record<string, unknown> = {
    client_id: clientId,
    client_snapshot: snapshot,
    lignes,
    sous_total: totals.sous_total,
    remise_total: totals.remise_total,
    tva_taux: tvaTaux,
    tva_montant: totals.tva_montant,
    montant_total: totals.montant_total,
    statut: "brouillon",
    date_emission: dateEmission,
    date_validite: dateValidite,
    notes: body.notes ? String(body.notes) : null,
    commercial_id: commercialId,
  };

  try {
    const { data, error } = await insertWithNumeroRetry(client, payload, year);
    if (error) {
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
      console.error("[admin/devis] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
    console.error("[admin/devis] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// =====================================================================
// PUT — update
// =====================================================================
export async function PUT(request: NextRequest) {
  const session = requireRole(request, WRITE_ROLES);
  if (!session) {
    return NextResponse.json(
      { error: "Accès refusé. Modification réservée aux managers et commerciaux." },
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

  const id = body?.id ? String(body.id) : "";
  if (!id) {
    return NextResponse.json({ error: "Champ 'id' requis." }, { status: 400 });
  }

  // Fetch existing row (need to check statut + ownership for commercials).
  const { data: existing, error: fetchErr } = await client
    .from("devis")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) {
    return NextResponse.json(
      { error: "Devis introuvable." },
      { status: 404 }
    );
  }

  // Commercial: only own brouillons, cannot change statut.
  if (session.role === "commercial") {
    if (existing.commercial_id !== session.userId) {
      return NextResponse.json(
        { error: "Vous ne pouvez modifier que vos propres devis." },
        { status: 403 }
      );
    }
    if (existing.statut !== "brouillon") {
      return NextResponse.json(
        { error: "Vous ne pouvez modifier que les brouillons." },
        { status: 403 }
      );
    }
  }

  // Build update payload.
  const payload: Record<string, unknown> = {};
  if (body.client_id !== undefined) {
    const cid = body.client_id ? String(body.client_id) : null;
    payload.client_id = cid;
    if (cid) {
      const snap = await fetchClientSnapshot(client, cid);
      if (snap) payload.client_snapshot = snap;
    }
  }
  if (body.lignes !== undefined) {
    const lignes = sanitizeLignes(body.lignes);
    if (lignes.length === 0) {
      return NextResponse.json(
        { error: "Au moins une ligne est requise." },
        { status: 400 }
      );
    }
    for (const l of lignes) {
      if (!l.designation) {
        return NextResponse.json(
          { error: "Chaque ligne doit avoir une désignation." },
          { status: 400 }
        );
      }
    }
    payload.lignes = lignes;
  }
  if (body.tva_taux !== undefined) {
    payload.tva_taux = toNum(body.tva_taux, 19);
  }

  // Recompute totals if lignes or tva changed.
  const lignesForCalc = (payload.lignes as Ligne[] | undefined) ?? (existing.lignes as Ligne[]);
  const tvaForCalc =
    payload.tva_taux !== undefined ? (payload.tva_taux as number) : toNum(existing.tva_taux, 19);
  if (payload.lignes !== undefined || payload.tva_taux !== undefined) {
    const totals = computeTotals(lignesForCalc, tvaForCalc);
    payload.sous_total = totals.sous_total;
    payload.remise_total = totals.remise_total;
    payload.tva_montant = totals.tva_montant;
    payload.montant_total = totals.montant_total;
  }

  if (body.date_validite !== undefined) {
    payload.date_validite = body.date_validite ? String(body.date_validite) : null;
  }
  if (body.notes !== undefined) {
    payload.notes = body.notes ? String(body.notes) : null;
  }

  // Statut change: manager+ only.
  if (body.statut !== undefined) {
    const newStatut = String(body.statut);
    const allowed = ["brouillon", "envoye", "accepte", "refuse", "expire"];
    if (!allowed.includes(newStatut)) {
      return NextResponse.json(
        { error: "Statut invalide." },
        { status: 400 }
      );
    }
    if (!VALIDATE_ROLES.includes(session.role as AdminRole) && session.role !== "super_admin") {
      return NextResponse.json(
        { error: "Seuls les managers peuvent changer le statut." },
        { status: 403 }
      );
    }
    payload.statut = newStatut;
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ devis: existing });
  }

  try {
    const { data, error } = await client
      .from("devis")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
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
      console.error("[admin/devis] update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
    console.error("[admin/devis] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// =====================================================================
// DELETE — remove
// =====================================================================
export async function DELETE(request: NextRequest) {
  const session = requireRole(request, WRITE_ROLES);
  if (!session) {
    return NextResponse.json(
      { error: "Accès refusé. Suppression réservée aux managers et commerciaux." },
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

  // For commercial: verify ownership + brouillon statut.
  if (session.role === "commercial") {
    const { data: existing, error: fetchErr } = await client
      .from("devis")
      .select("commercial_id, statut")
      .eq("id", id)
      .single();
    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
    }
    if (existing.commercial_id !== session.userId) {
      return NextResponse.json(
        { error: "Vous ne pouvez supprimer que vos propres devis." },
        { status: 403 }
      );
    }
    if (existing.statut !== "brouillon") {
      return NextResponse.json(
        { error: "Vous ne pouvez supprimer que les brouillons." },
        { status: 403 }
      );
    }
  }

  try {
    const { error } = await client.from("devis").delete().eq("id", id);
    if (error) {
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
      console.error("[admin/devis] delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
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
    console.error("[admin/devis] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
