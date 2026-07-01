import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import {
  sendContactNotificationToAdmin,
  sendContactConfirmationToClient,
} from "@/lib/email";

// ============================================================
// POST /api/livechat/messages
// (Task BONUS-2-3)
//
// Public endpoint (no auth). Accepts:
//   { name, email, phone?, message }
//
// Stores the message in the existing `messages` table with
//   subject = "Live Chat" so ODG staff can see it in the existing
//   Messages admin panel (no new admin UI to build).
//
// Also fires the same email notifications as /api/contact:
//   - sendContactNotificationToAdmin → notifies the ODG team
//   - sendContactConfirmationToClient → auto-replies to the visitor
//
// Returns { ok: true, id } on success.
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIVE_CHAT_SUBJECT = "Live Chat";

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
  const messageBody = (body?.message || "").toString().trim();

  if (!name || !email || !messageBody) {
    return NextResponse.json(
      { error: "Champs requis manquants (name, email, message)." },
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
        subject: LIVE_CHAT_SUBJECT,
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
      console.error("[livechat/messages] insert error:", error);
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
        subject: LIVE_CHAT_SUBJECT,
        body: messageBody,
      });
    } catch (e) {
      console.error("[livechat/messages] admin email failed:", e);
    }
    try {
      await sendContactConfirmationToClient(email, name, LIVE_CHAT_SUBJECT);
    } catch (e) {
      console.error("[livechat/messages] client email failed:", e);
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
    console.error("[livechat/messages] exception:", e);
    return NextResponse.json(
      { error: "Erreur interne.", detail: e?.message || "" },
      { status: 500 }
    );
  }
}
