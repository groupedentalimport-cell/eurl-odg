import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import {
  sendContactNotificationToAdmin,
  sendContactConfirmationToClient,
} from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isMissingTableError(err: any): boolean {
  const msg = (err?.message || err?.toString() || "").toLowerCase();
  return (
    msg.includes("could not find the table") ||
    msg.includes("relation") && msg.includes("does not exist") ||
    msg.includes("table") && msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("404")
  );
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const name = (body?.name || "").toString().trim();
  const email = (body?.email || "").toString().trim();
  const phone = (body?.phone || "").toString().trim();
  const subject = (body?.subject || "").toString().trim();
  const messageBody = (body?.body || "").toString().trim();

  if (!name || !email || !subject || !messageBody) {
    return NextResponse.json(
      { error: "Champs requis manquants (name, email, subject, body)." },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  let client;
  try {
    client = getServerClient();
  } catch (e: any) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré.", detail: e?.message || "" },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await client
      .from("messages")
      .insert({
        name,
        email,
        phone: phone || null,
        subject,
        body: messageBody,
        read: false,
      })
      .select("id")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'messages' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[contact] insert error:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement du message.", detail: error.message },
        { status: 500 }
      );
    }

    // ---- Email notifications (non-blocking) ----
    // The DB insert succeeded, so the user's request is fulfilled.
    // Email failures must NEVER break this response — we log and continue.
    try {
      await sendContactNotificationToAdmin({
        name,
        email,
        phone,
        subject,
        body: messageBody,
      });
    } catch (e) {
      console.error("[contact] admin email failed:", e);
    }
    try {
      await sendContactConfirmationToClient(email, name, subject);
    } catch (e) {
      console.error("[contact] client email failed:", e);
    }

    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'messages' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[contact] exception:", e);
    return NextResponse.json(
      { error: "Erreur interne.", detail: e?.message || "" },
      { status: 500 }
    );
  }
}

export async function GET() {
  let client;
  try {
    client = getServerClient();
  } catch (e: any) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré.", detail: e?.message || "" },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await client
      .from("messages")
      .select("id, name, email, phone, subject, body, read, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'messages' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[contact] list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: data || [] });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'messages' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[contact] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
