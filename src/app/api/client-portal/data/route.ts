import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import {
  verifyClientSession,
  type ClientPublicInfo,
} from "@/lib/client-auth";

// ============================================================
// GET /api/client-portal/data  (Task BONUS-3 — magic link portal)
// ============================================================
//
// Single round-trip endpoint that returns EVERYTHING the client
// portal dashboard needs:
//   {
//     client:    { id, nom, email, telephone, wilaya, type_client },
//     devis:      [...],
//     commandes:  [...],
//     garanties:  [...],
//     interventions: [...]
//   }
//
// Security:
//   - verifyClientSession reads the `odg_client` cookie and returns
//     { clientId } (or null). The cookie is HMAC-signed server-side,
//     so a client cannot forge a different clientId.
//   - EVERY Supabase query is HARD-FILTERED by `.eq("client_id",
//     session.clientId)` so a logged-in client can NEVER see another
//     client's rows, even by tampering with the request.
//   - The route uses the service-role Supabase client (bypasses RLS)
//     — this route is the trusted boundary, not RLS.
//
// Columns selected:
//   - devis:           numero, statut, dates, montant_total
//   - commandes:       numero, statut, dates de commande + livraison
//   - garanties:       produit, dates, durée, actif, conditions
//   - interventions:   type, dates, technicien_id, statut, rapport
//
// We don't expose: commercial_id, lignes, client_snapshot, notes
// (internal-use only).
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

interface PortalData {
  client: ClientPublicInfo | null;
  devis: any[];
  commandes: any[];
  garanties: any[];
  interventions: any[];
  tableMissing?: boolean;
  missingTables?: string[];
}

// Row shapes (mirror the columns selected below). Used only for the
// runQuery<T> type parameter — the API returns them as JSON, the
// client (ClientPortalPage) re-declares the same shapes for its UI.
interface DevisRow {
  id: string;
  numero: string;
  statut: string;
  date_emission: string | null;
  date_validite: string | null;
  montant_total: number | null;
  created_at?: string;
}
interface CommandeRow {
  id: string;
  numero: string;
  statut: string;
  date_commande: string | null;
  date_livraison_prevue: string | null;
  date_livraison_reelle: string | null;
  created_at?: string;
}
interface GarantieRow {
  id: string;
  produit_nom: string | null;
  date_debut: string | null;
  date_fin: string | null;
  duree_mois: number | null;
  actif: boolean | null;
  conditions: string | null;
  created_at?: string;
}
interface InterventionRow {
  id: string;
  type: string;
  date_prevue: string | null;
  date_realisee: string | null;
  technicien_id: string | null;
  statut: string;
  rapport: string | null;
  produit_nom: string | null;
  created_at?: string;
}

export async function GET(request: NextRequest) {
  const session = verifyClientSession(request);
  if (!session) {
    return NextResponse.json(
      { error: "Non connecté. Veuillez vous connecter." },
      { status: 401 }
    );
  }

  let supabase;
  try {
    supabase = getServerClient();
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Supabase serveur non configuré.",
        detail: e?.message || "",
      },
      { status: 500 }
    );
  }

  const cid = session.clientId;
  const missing: string[] = [];

  // ---- Fetch the client record (for the welcome banner) ----
  let client: ClientPublicInfo | null = null;
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("id, nom, email, telephone, wilaya, type_client")
      .eq("id", cid)
      .maybeSingle();
    if (error) {
      if (isMissingTableError(error)) missing.push("clients");
      else console.error("[client-portal/data] clients error:", error);
    } else {
      client = (data as ClientPublicInfo) || null;
    }
  } catch (e: any) {
    if (isMissingTableError(e)) missing.push("clients");
    else console.error("[client-portal/data] clients exception:", e);
  }

  // Fallback stub when the clients table is missing — keeps the UI
  // renderable during the CRM migration.
  if (!client) {
    client = {
      id: cid,
      nom: "Client",
      email: null,
      telephone: null,
      wilaya: null,
      type_client: null,
    };
  }

  // ---- Fetch devis, commandes, garanties, interventions in parallel ----
  // Each query is hard-filtered by client_id = session.clientId and
  // ordered newest-first so the dashboard shows the most recent
  // activity at the top. The Supabase query builder returns a
  // PromiseLike (not a real Promise), so we can't call .catch on it
  // directly — wrap each query in an async helper that try/catches.
  async function runQuery<T>(
    table: string,
    builder: PromiseLike<{ data: T | null; error: any }>
  ): Promise<{ table: string; data: T | null; error: any }> {
    try {
      const result = await builder;
      return { table, data: result.data, error: result.error };
    } catch (e) {
      return { table, data: null, error: e };
    }
  }

  const [devisRes, commandesRes, garantiesRes, interventionsRes] =
    await Promise.all([
      runQuery<DevisRow[]>(
        "devis",
        supabase
          .from("devis")
          .select(
            "id, numero, statut, date_emission, date_validite, montant_total, created_at"
          )
          .eq("client_id", cid)
          .order("created_at", { ascending: false })
          .limit(200)
      ),
      runQuery<CommandeRow[]>(
        "commandes",
        supabase
          .from("commandes")
          .select(
            "id, numero, statut, date_commande, date_livraison_prevue, date_livraison_reelle, created_at"
          )
          .eq("client_id", cid)
          .order("created_at", { ascending: false })
          .limit(200)
      ),
      runQuery<GarantieRow[]>(
        "garanties",
        supabase
          .from("garanties")
          .select(
            "id, produit_nom, date_debut, date_fin, duree_mois, actif, conditions, created_at"
          )
          .eq("client_id", cid)
          .order("date_fin", { ascending: false })
          .limit(200)
      ),
      runQuery<InterventionRow[]>(
        "interventions",
        supabase
          .from("interventions")
          .select(
            "id, type, date_prevue, date_realisee, technicien_id, statut, rapport, produit_nom, created_at"
          )
          .eq("client_id", cid)
          .order("date_prevue", { ascending: false, nullsFirst: false })
          .limit(200)
      ),
    ]);

  // Collect per-table errors: a missing table is reported (so the UI
  // can show a "run the SQL" hint) but does NOT abort the other
  // tables — partial data is more useful than a hard 500.
  function pickRows<T>(r: {
    table: string;
    data: T | null;
    error: any;
  }): T[] {
    if (r.error) {
      if (isMissingTableError(r.error)) missing.push(r.table);
      else console.error(`[client-portal/data] ${r.table} error:`, r.error);
      return [];
    }
    return Array.isArray(r.data) ? r.data : [];
  }

  const result: PortalData = {
    client,
    devis: pickRows(devisRes),
    commandes: pickRows(commandesRes),
    garanties: pickRows(garantiesRes),
    interventions: pickRows(interventionsRes),
  };
  if (missing.length > 0) {
    result.tableMissing = true;
    result.missingTables = missing;
  }

  return NextResponse.json(result);
}
