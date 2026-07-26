import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { requireRole, type AdminRole } from "@/lib/admin-auth";

// ============================================================
// POST /api/admin/quotes/convert
// Convertit une demande de devis (quotes) en devis CRM (devis).
//
// Flow:
//   1. Charge le quote depuis la table `quotes`
//   2. Cherche ou crée un client dans `clients`
//   3. Crée un devis dans `devis` avec les produits sélectionnés
//   4. Marque le quote comme "traite"
// ============================================================

const WRITE_ROLES: AdminRole[] = ["super_admin", "manager", "commercial"];

function isMissingTableError(err: any): boolean {
  const msg = (err?.message || err?.toString() || "").toLowerCase();
  const code = String(err?.code || "");
  if (code === "42p01" || code === "pgrst205") return true;
  return (
    msg.includes("could not find the table") ||
    (msg.includes("relation") && msg.includes("does not exist")) ||
    (msg.includes("table") && msg.includes("does not exist")) ||
    msg.includes("schema cache")
  );
}

function getClient() {
  try {
    return getServerClient();
  } catch {
    return null;
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function generateNumero(client: any, year: number): Promise<string> {
  const prefix = `DEV-${year}-`;
  const { data } = await client
    .from("devis")
    .select("numero")
    .like("numero", `${prefix}%`);

  let maxSeq = 0;
  if (Array.isArray(data)) {
    for (const row of data) {
      const seq = parseInt(String(row?.numero || "").slice(prefix.length), 10);
      if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
}

export async function POST(request: NextRequest) {
  const session = requireRole(request, WRITE_ROLES);
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

  let body: { quote_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const quoteId = body.quote_id;
  if (!quoteId) {
    return NextResponse.json({ error: "Champ 'quote_id' requis." }, { status: 400 });
  }

  // 1. Charger le quote
  const { data: quote, error: qErr } = await client
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .single();

  if (qErr || !quote) {
    return NextResponse.json({ error: "Demande de devis introuvable." }, { status: 404 });
  }

  if (quote.statut === "traite") {
    return NextResponse.json(
      { error: "Cette demande a déjà été convertie." },
      { status: 409 }
    );
  }

  // 2. Chercher ou créer le client
  const email = (quote.email || "").trim().toLowerCase();
  const nom = (quote.nom || "").trim();
  const telephone = (quote.telephone || "").trim();
  const wilaya = (quote.wilaya || "").trim();

  let clientId: string | null = null;

  if (email) {
    const { data: existing } = await client
      .from("clients")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (existing) {
      clientId = existing.id;
    }
  }

  if (!clientId) {
    const { data: newClient, error: cErr } = await client
      .from("clients")
      .insert({
        nom: nom || "Client (devis)",
        email: email || null,
        telephone: telephone || null,
        wilaya: wilaya || null,
        type_client: quote.type_client || "dentiste",
        notes: `Créé automatiquement depuis la demande de devis #${quoteId.slice(0, 8)}`,
      })
      .select("id")
      .single();

    if (cErr) {
      console.error("[quotes/convert] client creation error:", cErr);
      return NextResponse.json(
        { error: `Erreur création client: ${cErr.message}` },
        { status: 500 }
      );
    }
    clientId = newClient.id;
  }

  // 3. Construire les lignes du devis depuis les produits sélectionnés
  const items = Array.isArray(quote.produits_selectionnes)
    ? quote.produits_selectionnes
    : [];

  const lignes = items.map((it: any) => ({
    product_id: it.productId || null,
    designation: [it.brand, it.model, it.name?.fr || it.name?.ar || it.slug]
      .filter(Boolean)
      .join(" "),
    qte: it.quantity || 1,
    prix_unitaire: 0, // Admin remplira les prix après
    remise_pct: 0,
  }));

  if (lignes.length === 0) {
    lignes.push({
      product_id: null,
      designation: "À définir avec le client",
      qte: 1,
      prix_unitaire: 0,
      remise_pct: 0,
    });
  }

  const tvaTaux = 19;
  const today = new Date();
  const year = today.getFullYear();
  const dateEmission = today.toISOString().slice(0, 10);
  const dateValidite = new Date(today.getTime() + 30 * 86400000)
    .toISOString()
    .slice(0, 10);

  const numero = await generateNumero(client, year);

  const snapshot = {
    nom: nom || null,
    email: email || null,
    telephone: telephone || null,
    adresse: null,
    wilaya: wilaya || null,
  };

  const devisPayload = {
    numero,
    client_id: clientId,
    client_snapshot: snapshot,
    lignes,
    sous_total: 0,
    remise_total: 0,
    tva_taux: tvaTaux,
    tva_montant: 0,
    montant_total: 0,
    statut: "brouillon",
    date_emission: dateEmission,
    date_validite: dateValidite,
    notes: quote.message
      ? `Message du client: ${quote.message}`
      : null,
    commercial_id: session.userId,
  };

  // 4. Insérer le devis
  const { data: devis, error: dErr } = await client
    .from("devis")
    .insert(devisPayload)
    .select("*")
    .single();

  if (dErr) {
    console.error("[quotes/convert] devis creation error:", dErr);
    return NextResponse.json(
      { error: `Erreur création devis: ${dErr.message}` },
      { status: 500 }
    );
  }

  // 5. Marquer le quote comme traité
  await client
    .from("quotes")
    .update({ statut: "traite" })
    .eq("id", quoteId);

  return NextResponse.json({
    ok: true,
    devis_id: devis.id,
    numero: devis.numero,
    client_id: clientId,
    message: `Devis ${devis.numero} créé. Ouvrez-le dans l'onglet Devis pour ajouter les prix.`,
  });
}
