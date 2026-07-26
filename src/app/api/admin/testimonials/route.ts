import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { requireRole, type AdminRole } from "@/lib/admin-auth";

const READ_ROLES: AdminRole[] = ["manager", "editor", "commercial"];
const WRITE_ROLES: AdminRole[] = ["manager", "editor"];

function isMissingTableError(err: any): boolean {
  const msg = (err?.message || "").toLowerCase();
  return String(err?.code || "") === "42p01" || msg.includes("does not exist") || msg.includes("schema cache");
}
function getClient() { try { return getServerClient(); } catch { return null; } }

function buildPayload(body: Record<string, unknown>) {
  const note = Number(body.note);
  return {
    nom: String(body.nom ?? "").trim(),
    etablissement: body.etablissement ? String(body.etablissement).trim() : null,
    wilaya: body.wilaya ? String(body.wilaya).trim() : null,
    note: Number.isFinite(note) && note >= 1 && note <= 5 ? note : 5,
    texte_fr: String(body.texte_fr ?? "").trim(),
    texte_ar: String(body.texte_ar ?? "").trim(),
    photo_url: body.photo_url ? String(body.photo_url) : null,
    actif: body.actif !== false,
    ordre: Number.isFinite(Number(body.ordre)) ? Number(body.ordre) : 0,
  };
}

export async function GET(request: NextRequest) {
  const session = requireRole(request, READ_ROLES);
  if (!session) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const client = getClient();
  if (!client) return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
  try {
    const { data, error } = await client.from("testimonials").select("*").order("ordre", { ascending: true });
    if (error) { if (isMissingTableError(error)) return NextResponse.json({ error: "Table manquante", tableMissing: true }, { status: 501 }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    return NextResponse.json({ testimonials: data || [] });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const session = requireRole(request, WRITE_ROLES);
  if (!session) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const client = getClient();
  if (!client) return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const payload = buildPayload(body);
  if (!payload.nom) return NextResponse.json({ error: "Champ 'nom' requis" }, { status: 400 });
  try {
    const { data, error } = await client.from("testimonials").insert(payload).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ testimonial: data });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 }); }
}

export async function PUT(request: NextRequest) {
  const session = requireRole(request, WRITE_ROLES);
  if (!session) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const client = getClient();
  if (!client) return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
  let body: { id?: string } & Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "Champ 'id' requis" }, { status: 400 });
  const payload = buildPayload(rest);
  try {
    const { data, error } = await client.from("testimonials").update(payload).eq("id", id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ testimonial: data });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const session = requireRole(request, WRITE_ROLES);
  if (!session) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const client = getClient();
  if (!client) return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Param 'id' requis" }, { status: 400 });
  try {
    const { error } = await client.from("testimonials").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 }); }
}
