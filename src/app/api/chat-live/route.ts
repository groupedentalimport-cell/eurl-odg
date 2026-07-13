import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import {
  sendContactNotificationToAdmin,
  sendContactConfirmationToClient,
} from "@/lib/email";

// ============================================================
// /api/chat-live — public real-time chat with a human agent
// (Task BONUS-2)
//
// Actions (all POST, JSON body):
//
//   1. { action: "start", name, email, phone? }
//        → creates a live_chat_conversations row (status='waiting')
//        → returns { conversationId }
//
//   2. { action: "send", conversationId, content }
//        → inserts a 'client' message into live_chat_messages
//        → returns { ok, id, createdAt }
//
//   3. { action: "poll", conversationId, since? }
//        → returns messages newer than `since` (ISO string or null)
//          AND only those sent by 'agent' (the visitor already has
//          their own messages locally — no point re-sending them).
//        → returns { messages: [{ id, sender, content, createdAt }] }
//
//   4. { action: "offline", name, email, phone?, message }
//        → OUT-OF-HOURS path: stores the lead in the existing
//          `messages` table (subject='Live Chat (hors ligne)'), sends
//          the same admin + client emails as /api/contact.
//        → returns { ok }
//
// No auth — this is the public endpoint. RLS on the live_chat_*
// tables allows anon INSERT/SELECT (see supabase-live-chat.sql).
// We use the SERVICE-ROLE client server-side anyway for reliability.
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CONTENT_LEN = 4000;
const MAX_NAME_LEN = 120;

// Algeria = UTC+1 (no DST). Sun(0)–Thu(4) · 08:00 → 16:30
const BUSINESS_DAYS = [0, 1, 2, 3, 4];
const START_HOUR = 8;
const END_DECIMAL_HOUR = 16.5; // 16:30

export function isWithinBusinessHours(now: Date = new Date()): boolean {
  // Shift UTC by +1 hour to get Algiers local time. Algeria does not
  // observe DST so this is stable year-round.
  const algiers = new Date(now.getTime() + 60 * 60 * 1000);
  const day = algiers.getUTCDay();
  const hour = algiers.getUTCHours();
  const minute = algiers.getUTCMinutes();
  const decimal = hour + minute / 60;
  return (
    BUSINESS_DAYS.includes(day) &&
    decimal >= START_HOUR &&
    decimal < END_DECIMAL_HOUR
  );
}

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

function getClient() {
  try {
    return getServerClient();
  } catch {
    return null;
  }
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

// ---- Action handlers --------------------------------------------------

async function startConversation(body: any) {
  const name = (body?.name || "").toString().trim();
  const email = (body?.email || "").toString().trim();
  const phone = (body?.phone || "").toString().trim();

  if (!name || !email) return bad("Nom et email requis.");
  if (name.length > MAX_NAME_LEN) return bad("Nom trop long.");
  if (!EMAIL_RE.test(email)) return bad("Email invalide.");

  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré." },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await client
      .from("live_chat_conversations")
      .insert({
        client_name: name,
        client_email: email,
        client_phone: phone || null,
        status: "waiting",
      })
      .select("id")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'live_chat_conversations' n'existe pas. Exécutez supabase-live-chat.sql dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[chat-live/start] insert error:", error);
      return NextResponse.json(
        { error: "Erreur lors de la création de la conversation." },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversationId: data.id });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        { error: "Table live_chat_conversations manquante.", tableMissing: true },
        { status: 501 }
      );
    }
    console.error("[chat-live/start] exception:", e);
    return NextResponse.json(
      { error: "Erreur interne." },
      { status: 500 }
    );
  }
}

async function sendMessage(body: any) {
  const conversationId = (body?.conversationId || "").toString().trim();
  const content = (body?.content || "").toString().trim();

  if (!conversationId || !UUID_RE.test(conversationId)) {
    return bad("conversationId invalide.");
  }
  if (!content) return bad("Message vide.");
  if (content.length > MAX_CONTENT_LEN) {
    return bad("Message trop long (max " + MAX_CONTENT_LEN + " caractères).");
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré." },
      { status: 500 }
    );
  }

  try {
    // Insert the message.
    const { data, error } = await client
      .from("live_chat_messages")
      .insert({
        conversation_id: conversationId,
        sender: "client",
        content,
      })
      .select("id, created_at")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          { error: "Table live_chat_messages manquante.", tableMissing: true },
          { status: 501 }
        );
      }
      console.error("[chat-live/send] insert error:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement du message." },
        { status: 500 }
      );
    }

    // Touch the conversation's last_msg_at (the SQL trigger already
    // does this on insert, but we also bump status → 'active' so the
    // admin panel can surface it).
    try {
      await client
        .from("live_chat_conversations")
        .update({
          last_msg_at: new Date().toISOString(),
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    } catch {
      // Non-fatal — the trigger already keeps last_msg_at fresh.
    }

    return NextResponse.json({
      ok: true,
      id: data?.id,
      createdAt: data?.created_at,
    });
  } catch (e: any) {
    console.error("[chat-live/send] exception:", e);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

async function pollMessages(body: any) {
  const conversationId = (body?.conversationId || "").toString().trim();
  const sinceRaw = (body?.since || "").toString().trim();

  if (!conversationId || !UUID_RE.test(conversationId)) {
    return bad("conversationId invalide.");
  }

  let since: Date | null = null;
  if (sinceRaw) {
    const d = new Date(sinceRaw);
    if (!isNaN(d.getTime())) since = d;
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré." },
      { status: 500 }
    );
  }

  try {
    // Only return 'agent' messages newer than `since`. The visitor
    // already has their own 'client' messages locally — re-sending
    // them would cause duplicates in the UI.
    let query = client
      .from("live_chat_messages")
      .select("id, sender, content, created_at")
      .eq("conversation_id", conversationId)
      .eq("sender", "agent")
      .order("created_at", { ascending: true })
      .limit(200);

    if (since) {
      query = query.gt("created_at", since.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          { error: "Table live_chat_messages manquante.", tableMissing: true },
          { status: 501 }
        );
      }
      console.error("[chat-live/poll] select error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      messages: (data || []).map((m: any) => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        createdAt: m.created_at,
      })),
    });
  } catch (e: any) {
    console.error("[chat-live/poll] exception:", e);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

// Offline path: outside business hours, store the lead in the existing
// `messages` table (subject='Live Chat (hors ligne)') and fire the
// same email notifications as /api/contact.
async function offlineMessage(body: any) {
  const name = (body?.name || "").toString().trim();
  const email = (body?.email || "").toString().trim();
  const phone = (body?.phone || "").toString().trim();
  const message = (body?.message || "").toString().trim();

  if (!name || !email || !message) {
    return bad("Nom, email et message requis.");
  }
  if (!EMAIL_RE.test(email)) return bad("Email invalide.");

  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré." },
      { status: 500 }
    );
  }

  const SUBJECT = "Live Chat (hors ligne)";
  try {
    const { data, error } = await client
      .from("messages")
      .insert({
        name,
        email,
        phone: phone || null,
        subject: SUBJECT,
        body: message,
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
      console.error("[chat-live/offline] insert error:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement du message." },
        { status: 500 }
      );
    }

    // Email notifications (non-blocking)
    try {
      await sendContactNotificationToAdmin({
        name,
        email,
        phone,
        subject: SUBJECT,
        body: message,
      });
    } catch (e) {
      console.error("[chat-live/offline] admin email failed:", e);
    }
    try {
      await sendContactConfirmationToClient(email, name, SUBJECT);
    } catch (e) {
      console.error("[chat-live/offline] client email failed:", e);
    }

    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch (e: any) {
    console.error("[chat-live/offline] exception:", e);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

// ---- Route entry ------------------------------------------------------

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("JSON invalide.");
  }

  const action = (body?.action || "").toString().trim().toLowerCase();
  switch (action) {
    case "start":
      return startConversation(body);
    case "send":
      return sendMessage(body);
    case "poll":
      return pollMessages(body);
    case "offline":
      return offlineMessage(body);
    default:
      return bad("Action inconnue. Utilisez 'start' | 'send' | 'poll' | 'offline'.");
  }
}

// Lightweight GET so the widget can probe whether live chat is
// currently within business hours before showing the green dot.
// Same logic as /api/livechat/session (kept here so the new widget
// only needs one endpoint family).
export async function GET() {
  const now = new Date();
  return NextResponse.json(
    {
      online: isWithinBusinessHours(now),
      now: now.toISOString(),
      businessHours: {
        days: BUSINESS_DAYS,
        start: "08:00",
        end: "16:30",
        timezone: "Africa/Algiers (UTC+1)",
      },
    },
    {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
    }
  );
}
