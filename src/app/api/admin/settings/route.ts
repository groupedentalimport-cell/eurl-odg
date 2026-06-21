import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

function getClient() {
  try {
    return getServerClient();
  } catch {
    return null;
  }
}

// GET /api/admin/settings — returns all site_settings rows (admin only)
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Non autorisé. Session admin requise." }, { status: 401 });
  }
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré. Vérifiez SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }
  try {
    const { data, error } = await client
      .from("site_settings")
      .select("key, value, updated_at")
      .order("key");
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("could not find") || msg.includes("does not exist") || msg.includes("404")) {
        return NextResponse.json(
          { error: "La table 'site_settings' n'existe pas. Exécutez le script supabase-site-settings.sql.", tableMissing: true },
          { status: 501 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // Return as a key→value object for easy consumption
    const settings: Record<string, unknown> = {};
    for (const row of data || []) {
      if (!row?.key) continue;
      try {
        settings[row.key] = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      } catch {
        settings[row.key] = row.value;
      }
    }
    return NextResponse.json({ settings });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// PUT /api/admin/settings — upsert a setting. Body: { key: string, value: any }
export async function PUT(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Non autorisé. Session admin requise." }, { status: 401 });
  }
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré. Vérifiez SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }
  let body: { key?: string; value?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const key = body?.key;
  const value = body?.value;
  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "Champ 'key' requis" }, { status: 400 });
  }
  if (value === undefined || value === null) {
    return NextResponse.json({ error: "Champ 'value' requis" }, { status: 400 });
  }

  try {
    const { data, error } = await client
      .from("site_settings")
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      )
      .select("key, value, updated_at")
      .single();

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("could not find") || msg.includes("does not exist") || msg.includes("404")) {
        return NextResponse.json(
          { error: "La table 'site_settings' n'existe pas. Exécutez le script supabase-site-settings.sql.", tableMissing: true },
          { status: 501 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, setting: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
