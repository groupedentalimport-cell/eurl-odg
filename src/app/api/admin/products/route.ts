import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

// Admin-only CRUD for the `products` table.
// Uses the service role client (bypasses RLS). All routes gated behind verifyAdmin.

function isMissingTableError(err: any): boolean {
  const msg = (err?.message || err?.toString() || "").toLowerCase();
  return (
    msg.includes("could not find the table") ||
    (msg.includes("relation") && msg.includes("does not exist")) ||
    (msg.includes("table") && msg.includes("does not exist")) ||
    msg.includes("schema cache") ||
    msg.includes("404")
  );
}

function getClient() {
  try {
    return getServerClient();
  } catch {
    return null;
  }
}

// Convert the form payload (camelCase) to Supabase column names (snake_case).
// `id` is intentionally excluded — Supabase generates it via gen_random_uuid().
//
// Specs note: the admin panel parses the textarea into an array of
// `{ label: { fr, ar }, value }` (matching the Product type). However, the
// public `data-service.tsx` reads `specs` as a flat object `{ key: value }`.
// To stay compatible with the public catalogue (which we cannot modify),
// we collapse the array into an object keyed by the FR label. Duplicate
// labels overwrite earlier entries — acceptable for typical spec sheets.
function normalizeSpecs(specs: any): Record<string, string> {
  if (!specs) return {};
  if (Array.isArray(specs)) {
    const obj: Record<string, string> = {};
    for (const it of specs) {
      if (it && typeof it === "object") {
        const label =
          (typeof it.label === "object" && (it.label?.fr || it.label?.ar)) ||
          (typeof it.label === "string" ? it.label : "") ||
          "";
        if (label) obj[label] = String(it.value ?? "");
      } else if (typeof it === "string" && it.trim()) {
        obj[it.trim()] = "";
      }
    }
    return obj;
  }
  if (typeof specs === "object") return specs as Record<string, string>;
  return {};
}

function buildPayload(body: any) {
  const payload: Record<string, unknown> = {
    slug: body.slug ?? "",
    nom_fr: body.nom_fr ?? "",
    nom_ar: body.nom_ar ?? "",
    description_fr: body.description_fr ?? "",
    description_ar: body.description_ar ?? "",
    specs: normalizeSpecs(body.specs),
    images: Array.isArray(body.images) ? body.images : [],
    pdf_url: body.pdf_url ?? null,
    brochure_pdf: body.brochure_pdf ?? null,
    category_id: body.category_id || null,
    marque: body.marque ?? "",
    modele: body.modele ?? "",
    en_vedette: Boolean(body.en_vedette),
    disponible: body.disponible !== false,
    ordre: Number.isFinite(Number(body.ordre)) ? Number(body.ordre) : 0,
    cible: Array.isArray(body.cible) ? body.cible : [],
  };
  // video_url is optional — only include if the column exists. We send it
  // optimistically; if the column is missing Supabase returns an error and
  // the admin sees a toast. (Most deployments have the column.)
  if (body.video_url !== undefined) {
    payload.video_url = body.video_url ?? null;
  }
  return payload;
}

// GET: list all products ordered by ordre (admin only)
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
      { error: "Supabase serveur non configuré. Vérifiez SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await client
      .from("products")
      .select("*")
      .order("ordre", { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'products' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/products] list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data || [] });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'products' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/products] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// POST: create a product (admin only). Body = product fields (no id).
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json(
      { error: "Non autorisé. Session admin requise." },
      { status: 401 }
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

  const payload = buildPayload(body);

  try {
    const { data, error } = await client
      .from("products")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'products' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/products] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'products' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/products] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// PUT: update a product (admin only). Body = { id, ...fields }.
export async function PUT(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json(
      { error: "Non autorisé. Session admin requise." },
      { status: 401 }
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

  const payload = buildPayload(rest);

  try {
    const { data, error } = await client
      .from("products")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'products' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/products] update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'products' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/products] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// DELETE: remove a product (admin only). Query param: ?id=...
export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json(
      { error: "Non autorisé. Session admin requise." },
      { status: 401 }
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
    const { error } = await client.from("products").delete().eq("id", id);
    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'products' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/products] delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'products' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/products] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
