import { NextRequest, NextResponse } from "next/server";
import { getServerClientOr500, tableMissingResponse } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/supabase/errors";
import { requireRole } from "@/lib/admin-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";

// ============================================================
// REFACTOR (refactor/total — audit §2.5, §3.1, §3.2, §4.1)
// ============================================================
// Admin-only CRUD for the `products` table.
//   - RBAC: every handler now uses `requireRole(req, PERMISSIONS.products)`
//     (editor-only) instead of the loose `verifyAdmin(req)` (any role).
//   - Helpers: uses shared `getServerClientOr500()` + `tableMissingResponse()`
//     + `isMissingTableError()` (no more inline duplicates).
//   - Types: `body` typed as `Record<string, unknown>`, no more `any`.
// ============================================================

// Convert the form payload (camelCase) to Supabase column names (snake_case).
function normalizeSpecs(specs: unknown): Record<string, string> {
  if (!specs) return {};
  if (Array.isArray(specs)) {
    const obj: Record<string, string> = {};
    for (const it of specs) {
      if (it && typeof it === "object") {
        const label =
          (typeof (it as { label?: { fr?: string; ar?: string } }).label === "object" &&
            ((it as { label?: { fr?: string; ar?: string } }).label?.fr ||
              (it as { label?: { fr?: string; ar?: string } }).label?.ar)) ||
          (typeof (it as { label?: string }).label === "string"
            ? (it as { label?: string }).label
            : "") ||
          "";
        if (label) obj[label] = String((it as { value?: unknown }).value ?? "");
      } else if (typeof it === "string" && it.trim()) {
        obj[it.trim()] = "";
      }
    }
    return obj;
  }
  if (typeof specs === "object") return specs as Record<string, string>;
  return {};
}

function buildPayload(body: Record<string, unknown>) {
  const nom_fr =
    String(body.nom_fr ?? "").trim() ||
    String(body.nom_ar ?? "").trim() ||
    String(body.slug ?? "") ||
    "Produit";
  const nom_ar =
    String(body.nom_ar ?? "").trim() ||
    String(body.nom_fr ?? "").trim() ||
    String(body.slug ?? "") ||
    "منتج";
  return {
    slug: body.slug ?? "",
    nom_fr,
    nom_ar,
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
}

function forbidden(): NextResponse {
  return NextResponse.json(
    { error: "Forbidden. Rôle requis: editor (ou super_admin)." },
    { status: 403 }
  );
}

// GET: list all products ordered by ordre (editor only).
export async function GET(request: NextRequest) {
  if (!requireRole(request, PERMISSIONS.products)) return forbidden();
  const { client, error: clientError } = getServerClientOr500();
  if (clientError) return clientError;

  try {
    const { data, error } = await client
      .from("products")
      .select("*")
      .order("ordre", { ascending: true });

    if (error) {
      if (isMissingTableError(error)) return tableMissingResponse("products");
      console.error("[admin/products] list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ products: data || [] });
  } catch (e) {
    if (isMissingTableError(e as { code?: string; message?: string }))
      return tableMissingResponse("products");
    console.error("[admin/products] exception:", e);
    return NextResponse.json(
      { error: (e as Error)?.message || "Erreur" },
      { status: 500 }
    );
  }
}

// POST: create a product (editor only).
export async function POST(request: NextRequest) {
  if (!requireRole(request, PERMISSIONS.products)) return forbidden();
  const { client, error: clientError } = getServerClientOr500();
  if (clientError) return clientError;

  let body: Record<string, unknown>;
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
      if (isMissingTableError(error)) return tableMissingResponse("products");
      console.error("[admin/products] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ product: data });
  } catch (e) {
    if (isMissingTableError(e as { code?: string; message?: string }))
      return tableMissingResponse("products");
    console.error("[admin/products] exception:", e);
    return NextResponse.json(
      { error: (e as Error)?.message || "Erreur" },
      { status: 500 }
    );
  }
}

// PUT: update a product (editor only). Body = { id, ...fields }.
export async function PUT(request: NextRequest) {
  if (!requireRole(request, PERMISSIONS.products)) return forbidden();
  const { client, error: clientError } = getServerClientOr500();
  if (clientError) return clientError;

  let body: { id?: string } & Record<string, unknown>;
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
      if (isMissingTableError(error)) return tableMissingResponse("products");
      console.error("[admin/products] update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ product: data });
  } catch (e) {
    if (isMissingTableError(e as { code?: string; message?: string }))
      return tableMissingResponse("products");
    console.error("[admin/products] exception:", e);
    return NextResponse.json(
      { error: (e as Error)?.message || "Erreur" },
      { status: 500 }
    );
  }
}

// DELETE: remove a product (editor only). Query param: ?id=...
export async function DELETE(request: NextRequest) {
  if (!requireRole(request, PERMISSIONS.products)) return forbidden();
  const { client, error: clientError } = getServerClientOr500();
  if (clientError) return clientError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Param 'id' requis." }, { status: 400 });
  }

  try {
    const { error } = await client.from("products").delete().eq("id", id);
    if (error) {
      if (isMissingTableError(error)) return tableMissingResponse("products");
      console.error("[admin/products] delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isMissingTableError(e as { code?: string; message?: string }))
      return tableMissingResponse("products");
    console.error("[admin/products] exception:", e);
    return NextResponse.json(
      { error: (e as Error)?.message || "Erreur" },
      { status: 500 }
    );
  }
}
