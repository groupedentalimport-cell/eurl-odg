import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { requireRole } from "@/lib/admin-auth";

// ============================================================
// /api/admin/chat-live — admin-side live chat management
// (Task BONUS-2)
//
// GET  — list conversations (most recent activity first).
//        Query params:
//          ?status=active|waiting|closed   (default: active,waiting)
//          ?limit=50                        (max 200)
//        Returns: { conversations: [{ id, client_name, client_email,
//                  client_phone, status, assigned_to, last_msg_at,
//                  created_at, updated_at, last_message? }] }
//
// POST — body actions:
//   1. { conversationId, content }
//        → agent replies (inserts 'agent' message + assigns the
//          conversation to the current admin).
//   2. { conversationId, action: "close" }
//        → marks the conversation as 'closed'.
//   3. { conversationId, action: "poll" }
//        → returns all messages of the conversation (both client +
//          agent). Used by the admin panel every 3s.
//        → Returns { messages: [...], conversation: {...} }
//
// Auth: super_admin bypasses; otherwise role must be manager or
// commercial (the two customer-facing roles). Verified via
// requireRole() — server-side gate, mirrors the matrix in
// useAdminSession.ts (which we can't modify).
// ============================================================

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CONTENT_LEN = 4000;
const ALLOWED_STATUSES = ["active", "waiting", "closed"];

const ADMIN_ROLES = ["manager", "commercial"] as const;

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

function unauthorized() {
  return NextResponse.json(
    { error: "Non autorisé. Rôle manager, commercial ou super_admin requis." },
    { status: 403 }
  );
}

// ---- GET: list conversations ----------------------------------------

export async function GET(req: NextRequest) {
  const session = requireRole(req, [...ADMIN_ROLES]);
  if (!session) return unauthorized();

  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré." },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status") || "active,waiting";
  const statuses = statusParam
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is string => ALLOWED_STATUSES.includes(s));
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1),
    200
  );

  try {
    let query = client
      .from("live_chat_conversations")
      .select(
        "id, client_name, client_email, client_phone, status, assigned_to, last_msg_at, created_at, updated_at"
      )
      .order("last_msg_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (statuses.length > 0) {
      query = query.in("status", statuses);
    }

    const { data: conversations, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "Table live_chat_conversations manquante. Exécutez supabase-live-chat.sql.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/chat-live] list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch the latest message of each conversation in one shot so
    // the admin sidebar can show a preview. We can't do a JOIN with
    // Supabase's REST client (we'd need an RPC), so we just fire one
    // query per conversation — capped by `limit`. For 50 convos this
    // is fast enough (and the admin panel re-polls every 5s).
    const list = Array.isArray(conversations) ? conversations : [];
    const withLast = await Promise.all(
      list.map(async (conv: any) => {
        try {
          const { data: msgs } = await client
            .from("live_chat_messages")
            .select("sender, content, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1);
          const last = Array.isArray(msgs) && msgs[0];
          return { ...conv, last_message: last || null };
        } catch {
          return { ...conv, last_message: null };
        }
      })
    );

    return NextResponse.json({ conversations: withLast });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error: "Table live_chat_conversations manquante.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/chat-live] list exception:", e);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

// ---- POST: reply / close / poll messages ---------------------------

export async function POST(req: NextRequest) {
  const session = requireRole(req, [...ADMIN_ROLES]);
  if (!session) return unauthorized();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const conversationId = (body?.conversationId || "").toString().trim();
  if (!conversationId || !UUID_RE.test(conversationId)) {
    return NextResponse.json(
      { error: "conversationId invalide." },
      { status: 400 }
    );
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré." },
      { status: 500 }
    );
  }

  // Sub-action dispatch.
  const sub = (body?.action || "").toString().trim().toLowerCase();

  // --- poll: return all messages of the conversation ----------------
  if (sub === "poll") {
    try {
      const { data: messages, error } = await client
        .from("live_chat_messages")
        .select("id, sender, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(500);

      if (error) {
        if (isMissingTableError(error)) {
          return NextResponse.json(
            { error: "Table manquante.", tableMissing: true },
            { status: 501 }
          );
        }
        console.error("[admin/chat-live/poll] error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Also return the conversation row (status, client info, etc.)
      const { data: conv } = await client
        .from("live_chat_conversations")
        .select(
          "id, client_name, client_email, client_phone, status, assigned_to, last_msg_at, created_at, updated_at"
        )
        .eq("id", conversationId)
        .maybeSingle();

      return NextResponse.json({
        messages: messages || [],
        conversation: conv || null,
      });
    } catch (e: any) {
      console.error("[admin/chat-live/poll] exception:", e);
      return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
    }
  }

  // --- close: mark as closed ---------------------------------------
  if (sub === "close") {
    try {
      const { error } = await client
        .from("live_chat_conversations")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("id", conversationId);
      if (error) {
        console.error("[admin/chat-live/close] error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      console.error("[admin/chat-live/close] exception:", e);
      return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
    }
  }

  // --- reopen: switch back to active (optional, used by admin) -----
  if (sub === "reopen") {
    try {
      const { error } = await client
        .from("live_chat_conversations")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", conversationId);
      if (error) {
        console.error("[admin/chat-live/reopen] error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      console.error("[admin/chat-live/reopen] exception:", e);
      return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
    }
  }

  // --- default: agent reply ----------------------------------------
  const content = (body?.content || "").toString().trim();
  if (!content) {
    return NextResponse.json(
      { error: "Contenu du message requis." },
      { status: 400 }
    );
  }
  if (content.length > MAX_CONTENT_LEN) {
    return NextResponse.json(
      { error: "Message trop long (max " + MAX_CONTENT_LEN + " caractères)." },
      { status: 400 }
    );
  }

  try {
    // Insert the agent message.
    const { data: msg, error: msgErr } = await client
      .from("live_chat_messages")
      .insert({
        conversation_id: conversationId,
        sender: "agent",
        content,
      })
      .select("id, created_at")
      .single();

    if (msgErr) {
      if (isMissingTableError(msgErr)) {
        return NextResponse.json(
          { error: "Table manquante.", tableMissing: true },
          { status: 501 }
        );
      }
      console.error("[admin/chat-live/reply] insert error:", msgErr);
      return NextResponse.json(
        { error: "Erreur lors de l'envoi du message." },
        { status: 500 }
      );
    }

    // Assign the conversation to the current admin (if not already)
    // + bump status to 'active'. The SQL trigger already keeps
    // last_msg_at fresh.
    try {
      await client
        .from("live_chat_conversations")
        .update({
          status: "active",
          assigned_to: session.userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    } catch {
      // Non-fatal.
    }

    return NextResponse.json({
      ok: true,
      id: msg?.id,
      createdAt: msg?.created_at,
    });
  } catch (e: any) {
    console.error("[admin/chat-live/reply] exception:", e);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
