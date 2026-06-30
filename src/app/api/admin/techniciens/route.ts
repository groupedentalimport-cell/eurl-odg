import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { requireRole } from "@/lib/admin-auth";

// ============================================================
// CRUD — Techniciens (CRM-C)
// Gating:
//   GET    : manager + technician
//   POST   : manager
//   PUT    : manager
//   DELETE : manager
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

function toArray(v: any): string[] {
  if (Array.isArray(v)) {
    return v.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof v === "string") {
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// ----- GET: list (active by default, all if ?all=1) -----
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
  const includeInactive = url.searchParams.get("all") === "1";

  try {
    let query = client
      .from("techniciens")
      .select("*")
      .order("nom", { ascending: true });
    if (!includeInactive) {
      query = query.eq("actif", true);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'techniciens' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/techniciens] list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ techniciens: data || [] });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'techniciens' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/techniciens] exception:", e);
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

  if (!body?.nom || typeof body.nom !== "string" || !body.nom.trim()) {
    return NextResponse.json({ error: "Champ 'nom' requis." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    nom: body.nom.trim(),
    telephone: typeof body.telephone === "string" ? body.telephone.trim() : null,
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() || null : null,
    specialites: toArray(body.specialites),
    zones_couvertes: toArray(body.zones_couvertes),
    actif: body.actif !== false,
    user_id: body.user_id || null,
  };

  try {
    const { data, error } = await client
      .from("techniciens")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'techniciens' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/techniciens] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ technicien: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'techniciens' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/techniciens] exception:", e);
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
  if (typeof rest.nom === "string" && rest.nom.trim()) update.nom = rest.nom.trim();
  if (rest.telephone !== undefined) update.telephone = typeof rest.telephone === "string" ? rest.telephone.trim() : null;
  if (rest.email !== undefined) {
    update.email = typeof rest.email === "string" ? rest.email.trim().toLowerCase() || null : null;
  }
  if (rest.specialites !== undefined) update.specialites = toArray(rest.specialites);
  if (rest.zones_couvertes !== undefined) update.zones_couvertes = toArray(rest.zones_couvertes);
  if (rest.actif !== undefined) update.actif = Boolean(rest.actif);
  if (rest.user_id !== undefined) update.user_id = rest.user_id || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  try {
    const { data, error } = await client
      .from("techniciens")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'techniciens' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/techniciens] update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ technicien: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'techniciens' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/techniciens] exception:", e);
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
    const { error } = await client.from("techniciens").delete().eq("id", id);
    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'techniciens' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/techniciens] delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'techniciens' n'existe pas. Exécutez le script SQL CRM dans le Supabase Dashboard.",
            tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/techniciens] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
