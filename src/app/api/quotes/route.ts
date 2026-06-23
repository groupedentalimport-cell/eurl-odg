import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

// PUBLIC quote submission endpoint.
// Anyone can POST a quote request here (no admin auth required).
// Uses the server Supabase client (service role key — bypasses RLS,
// only ever used server-side, never exposed to the browser).
//
// `quotes` table schema (already exists in Supabase):
//   id (uuid, PK, default gen_random_uuid())
//   nom (text)
//   email (text)
//   telephone (text)
//   wilaya (text)
//   type_client (text)
//   message (text, nullable)
//   statut (text, default 'nouveau')
//   created_at (timestamptz, default now())
//   produits_selectionnes (jsonb, default '[]')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LEN = 2000;
const MAX_ITEMS = 50;

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

// Sanitize a single QuoteItem coming from the client. We only keep the
// fields the admin panel needs; unknown extras are dropped.
function sanitizeItem(raw: any) {
  if (!raw || typeof raw !== "object") return null;
  const name =
    raw.name && typeof raw.name === "object"
      ? {
          fr: String(raw.name.fr ?? "").slice(0, 200),
          ar: String(raw.name.ar ?? "").slice(0, 200),
        }
      : { fr: "", ar: "" };
  return {
    productId: String(raw.productId ?? "").slice(0, 200),
    slug: String(raw.slug ?? "").slice(0, 200),
    name,
    image: String(raw.image ?? "").slice(0, 500),
    brand: String(raw.brand ?? "").slice(0, 200),
    model: String(raw.model ?? "").slice(0, 200),
    quantity: Math.max(1, Math.min(9999, Number(raw.quantity) || 1)),
  };
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const nom = (body?.nom ?? "").toString().trim();
  const email = (body?.email ?? "").toString().trim();
  const telephone = (body?.telephone ?? "").toString().trim();
  const wilaya = (body?.wilaya ?? "").toString().trim();
  const type_client = (body?.type_client ?? "").toString().trim();
  let message = (body?.message ?? "").toString().trim();

  // Required fields
  if (!nom || !email || !telephone) {
    return NextResponse.json(
      {
        error:
          "Champs requis manquants (nom, email, telephone).",
      },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  // Sanitize message length
  if (message.length > MAX_MESSAGE_LEN) {
    message = message.slice(0, MAX_MESSAGE_LEN);
  }

  // Sanitize produits_selectionnes (jsonb array)
  let produits_selectionnes: any[] = [];
  if (Array.isArray(body?.produits_selectionnes)) {
    produits_selectionnes = body.produits_selectionnes
      .slice(0, MAX_ITEMS)
      .map(sanitizeItem)
      .filter(Boolean);
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
      .insert({
        nom,
        email,
        telephone,
        wilaya: wilaya || null,
        type_client: type_client || null,
        message: message || null,
        statut: "nouveau",
        produits_selectionnes,
      })
      .select("id")
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
      console.error("[quotes] insert error:", error);
      return NextResponse.json(
        {
          error: "Erreur lors de l'enregistrement du devis.",
          detail: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: data?.id ?? null });
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
    console.error("[quotes] exception:", e);
    return NextResponse.json(
      { error: "Erreur interne.", detail: e?.message || "" },
      { status: 500 }
    );
  }
}
