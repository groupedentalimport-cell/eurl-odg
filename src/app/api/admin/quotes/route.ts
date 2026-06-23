import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

// Admin-only CRUD for the `quotes` table.
// Uses the service role client (bypasses RLS). All routes gated behind verifyAdmin.
//
// Schema (already exists — DO NOT create or modify):
//   id (uuid, PK)
//   nom, email, telephone, wilaya, type_client (text)
//   message (text, nullable)
//   statut (text — 'nouveau' | 'en_cours' | 'traite' | 'archive')
//   created_at (timestamptz)
//   produits_selectionnes (jsonb array of QuoteItem)

const VALID_STATUTES = new Set(["nouveau", "en_cours", "traite", "archive"]);

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

const SELECT_COLS =
  "id, nom, email, telephone, wilaya, type_client, message, statut, created_at, produits_selectionnes";

// GET: list all quotes ordered by created_at desc (admin only)
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json(
      { error: "Non autorisé. Session admin requise." },
      { status: 401 }
    );
  }
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      {
        error:
          "Supabase serveur non configuré. Vérifiez SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await client
      .from("quotes")
      .select(SELECT_COLS)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'quotes' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/quotes] list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ quotes: data || [] });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'quotes' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/quotes] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// PATCH: update a quote's statut. Expects ?id=... and body { statut } (admin only)
export async function PATCH(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json(
      { error: "Non autorisé. Session admin requise." },
      { status: 401 }
    );
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Param 'id' requis." }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const statut = (body?.statut ?? "").toString().trim();
  if (!VALID_STATUTES.has(statut)) {
    return NextResponse.json(
      {
        error:
          "Statut invalide. Valeurs attendues : nouveau, en_cours, traite, archive.",
      },
      { status: 400 }
    );
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré." },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await client
      .from("quotes")
      .update({ statut })
      .eq("id", id)
      .select(SELECT_COLS)
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'quotes' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/quotes] update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, quote: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'quotes' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/quotes] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// DELETE: remove a quote. Expects ?id=... (admin only)
export async function DELETE(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json(
      { error: "Non autorisé. Session admin requise." },
      { status: 401 }
    );
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Param 'id' requis." }, { status: 400 });
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré." },
      { status: 500 }
    );
  }

  try {
    const { error } = await client.from("quotes").delete().eq("id", id);
    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'quotes' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/quotes] delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'quotes' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/quotes] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
