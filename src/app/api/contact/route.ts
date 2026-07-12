import { NextResponse } from "next/server";
import { getServerClientOr500, tableMissingResponse } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/supabase/errors";
import { contactSchema } from "@/lib/schemas";
import { withBody } from "@/lib/validation";
import { enforceLimit } from "@/lib/auth/rate-limit";
import {
  sendContactNotificationToAdmin,
  sendContactConfirmationToClient,
} from "@/lib/email";

// ============================================================
// REFACTOR (refactor/total — audit §2.1, §2.3, §3.1, §3.2)
// ============================================================
// - Body validated with zod (`contactSchema`).
// - Honeypot field `website` — bots that auto-fill every input get
//   silently rejected (HTTP 200 to avoid tipping them off).
// - Rate-limited to 3 messages / hour per IP.
// - Uses shared `getServerClientOr500()` + `tableMissingResponse()`
//   helpers (no more inline `isMissingTableError` regex).
// - No `any` — the body is fully typed via `withBody`.
// ============================================================

export const POST = withBody(contactSchema, async (req, body) => {
  // Honeypot: silently accept and return 200 without inserting.
  if (body.website) {
    return NextResponse.json({ ok: true, spam: true });
  }

  // Rate limit: 3 messages per hour per IP.
  const limited = enforceLimit(req, "contact", { limit: 3, windowSec: 3600 });
  if (limited) return limited;

  const { client, error: clientError } = getServerClientOr500();
  if (clientError) return clientError;

  try {
    const { data, error } = await client
      .from("messages")
      .insert({
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        subject: body.subject,
        body: body.body,
        read: false,
      })
      .select("id")
      .single();

    if (error) {
      if (isMissingTableError(error)) return tableMissingResponse("messages");
      console.error("[contact] insert error:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement du message." },
        { status: 500 }
      );
    }

    // Email notifications are non-blocking — DB insert succeeded, so
    // the user's request is fulfilled. Email failures log + continue.
    try {
      await sendContactNotificationToAdmin({
        name: body.name,
        email: body.email,
        phone: body.phone || "",
        subject: body.subject,
        body: body.body,
      });
    } catch (e) {
      console.error("[contact] admin email failed:", e);
    }
    try {
      await sendContactConfirmationToClient(body.email, body.name, body.subject);
    } catch (e) {
      console.error("[contact] client email failed:", e);
    }

    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch (e) {
    if (isMissingTableError(e as { message?: string; code?: string })) {
      return tableMissingResponse("messages");
    }
    console.error("[contact] exception:", e);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
});

// GET /api/contact — list messages (admin only).
// REFACTOR: moved RBAC check from `verifyAdmin` (any role) to
// `requireRole(req, PERMISSIONS.messages)` (manager only) per
// audit §2.5. Also uses shared helpers.
import { requireRole } from "@/lib/admin-auth";
import { PERMISSIONS } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  const session = requireRole(req, PERMISSIONS.messages);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { client, error: clientError } = getServerClientOr500();
  if (clientError) return clientError;

  try {
    const { data, error } = await client
      .from("messages")
      .select("id, name, email, phone, subject, body, read, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      if (isMissingTableError(error)) return tableMissingResponse("messages");
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ messages: data || [] });
  } catch (e) {
    if (isMissingTableError(e as { message?: string; code?: string })) {
      return tableMissingResponse("messages");
    }
    return NextResponse.json(
      { error: (e as Error)?.message || "Erreur" },
      { status: 500 }
    );
  }
}
