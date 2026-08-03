import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

// Admin-only CRUD for the `blog_posts` table.
// Uses the service role client (bypasses RLS). All routes gated behind verifyAdmin.

function isMissingTableError(err: any): boolean {
  const msg = (err?.message || err?.toString() || "").toLowerCase();
  const code = String(err?.code || "");
  if (code === "42p01" || code === "pgrst205") return true;
  return (
    msg.includes("could not find the table") ||
    msg.includes("relation") && msg.includes("does not exist") ||
    msg.includes("table") && msg.includes("does not exist") ||
    msg.includes("schema cache") && msg.includes("does not exist")
  );
}

function getClient() {
  try {
    return getServerClient();
  } catch {
    return null;
  }
}

// Normalize FAQ payload — accept both array of {q,a} and stringified JSON.
function normalizeFaq(val: unknown): Array<{ q: string; a: string }> | null {
  if (val == null) return null;
  let arr: unknown = val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;
    try {
      arr = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(arr)) return null;
  const cleaned = arr
    .map((item: any) => ({
      q: String(item?.q ?? item?.question ?? "").trim(),
      a: String(item?.a ?? item?.answer ?? "").trim(),
    }))
    .filter((item) => item.q && item.a);
  return cleaned.length > 0 ? cleaned : null;
}

// Convert form payload to Supabase column names (snake_case).
function buildPayload(body: any) {
  // Fallback for titre fields in case they're NOT NULL.
  const titre_fr = body.titre_fr?.trim() || body.titre_ar?.trim() || body.slug || "Article";
  const titre_ar = body.titre_ar?.trim() || body.titre_fr?.trim() || body.slug || "مقال";

  // String helper — empty string becomes null.
  const strOrNull = (v: unknown): string | null => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s ? s : null;
  };

  // Tags helper — accept array or comma-separated string.
  const normalizeTags = (v: unknown): string[] | null => {
    if (v == null) return null;
    if (Array.isArray(v)) {
      const arr = v.map((s) => String(s).trim()).filter(Boolean);
      return arr.length > 0 ? arr : null;
    }
    if (typeof v === "string") {
      const arr = v.split(",").map((s) => s.trim()).filter(Boolean);
      return arr.length > 0 ? arr : null;
    }
    return null;
  };

  const faqFr = normalizeFaq(body.faq_fr);
  const faqAr = normalizeFaq(body.faq_ar) || faqFr;

  return {
    slug: body.slug ?? "",
    titre_fr,
    titre_ar,
    contenu_fr: body.contenu_fr ?? "",
    contenu_ar: body.contenu_ar ?? "",
    // Rich content fields (added 2026-07-29 for SEO/IA).
    excerpt_fr: strOrNull(body.excerpt_fr),
    excerpt_ar: strOrNull(body.excerpt_ar),
    meta_description_fr: strOrNull(body.meta_description_fr),
    meta_description_ar: strOrNull(body.meta_description_ar),
    faq_fr: faqFr,
    faq_ar: faqAr,
    category: strOrNull(body.category),
    tags: normalizeTags(body.tags),
    // Original fields below — unchanged.
    image_url: body.image_url ?? null,
    publie: body.publie !== false,
    auteur: body.auteur ?? "Equipe ODG",
  };
}

// GET: list all blog posts ordered by created_at desc (admin only).
// Includes unpublished posts (unlike the public read).
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
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'blog_posts' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/posts] list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ posts: data || [] });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'blog_posts' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/posts] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// POST: create a blog post (admin only).
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
      .from("blog_posts")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'blog_posts' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/posts] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ post: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'blog_posts' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/posts] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// PUT: update a blog post (admin only). Body = { id, ...fields }.
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
      .from("blog_posts")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'blog_posts' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/posts] update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ post: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'blog_posts' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/posts] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// DELETE: remove a blog post (admin only). Query param: ?id=...
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
    const { error } = await client.from("blog_posts").delete().eq("id", id);
    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'blog_posts' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/posts] delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'blog_posts' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/posts] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
