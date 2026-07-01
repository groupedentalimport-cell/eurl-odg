import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { decodeUnsubscribeToken, sendUnsubscribeConfirmation } from "@/lib/email";

// ============================================================
// Newsletter — unsubscribe endpoint
// Task EMAIL-V2 (#13 — Loi 18-07 compliance)
// ============================================================
// Two equivalent call shapes:
//   GET  /api/newsletter/unsubscribe?token=<base64url(email)>
//   POST /api/newsletter/unsubscribe   body: { "token": "<base64url(email)>" }
//
// The token is a base64url encoding of the subscriber's email
// (NOT encryption — see `encodeUnsubscribeToken` in src/lib/email.ts).
// The newsletter welcome email embeds a one-click unsubscribe link
// in this format pointing to /newsletter-unsubscribe?token=...,
// which is the page that calls this API.
//
// Behaviour:
//   1. Decode the token → email (trim + lowercase).
//   2. Validate the email format. 400 on missing/invalid.
//   3. Delete the matching row from `newsletter_subscribers`
//      (service-role client, bypasses RLS).
//   4. Send a confirmation email (`sendUnsubscribeConfirmation`)
//      so the user has a written record — non-blocking, wrapped
//      in try/catch so SMTP failure never breaks the 200.
//   5. Return ok:true (idempotent — clicking the link twice must
//      NOT show an error to the user, per RFC 8058).
//
// Security note: this endpoint is intentionally NOT authenticated.
// Anyone with the unsubscribe URL can remove the corresponding email
// from the list. This matches standard newsletter unsubscribe UX
// (one-click unsubscribe per RFC 8058). The URL is shareable but
// only removes one specific subscriber.
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isMissingTableError(err: any): boolean {
  const msg = (err?.message || err?.toString() || "").toLowerCase();
  const code = String(err?.code || "");
  if (code === "42p01") return true;
  if (code === "pgrst205") return true;
  return (
    msg.includes("could not find the table") ||
    (msg.includes("relation") && msg.includes("does not exist")) ||
    (msg.includes("table") && msg.includes("does not exist")) ||
    (msg.includes("schema cache") && msg.includes("does not exist"))
  );
}

// Shared core: takes a normalized email, performs the deletion, sends
// the confirmation email, and returns the JSON response.
async function unsubscribeByEmail(
  email: string
): Promise<NextResponse> {
  let client: ReturnType<typeof getServerClient>;
  try {
    client = getServerClient();
  } catch (e: any) {
    console.error("[newsletter/unsubscribe] supabase error:", e?.message || e);
    return NextResponse.json(
      {
        ok: false,
        error: "Service non configuré.",
        detail: e?.message || "",
      },
      { status: 500 }
    );
  }

  let removed: number | null = null;
  try {
    const { error, count } = await client
      .from("newsletter_subscribers")
      .delete({ count: "exact" })
      .eq("email", email);

    if (error) {
      if (isMissingTableError(error)) {
        // Table missing → still respond ok:true (idempotent): the
        // subscriber doesn't exist in any meaningful sense.
        console.warn(
          "[newsletter/unsubscribe] table 'newsletter_subscribers' missing — treating as already unsubscribed"
        );
        return NextResponse.json({
          ok: true,
          message: "Désinscription confirmée",
          note: "Table manquante (déjà désinscrit).",
        });
      }
      console.error("[newsletter/unsubscribe] delete error:", error);
      return NextResponse.json(
        { ok: false, error: "Erreur lors de la désinscription.", detail: error.message },
        { status: 500 }
      );
    }
    removed = typeof count === "number" ? count : null;
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json({
        ok: true,
        message: "Désinscription confirmée",
        note: "Table manquante (déjà désinscrit).",
      });
    }
    console.error("[newsletter/unsubscribe] exception:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Erreur" },
      { status: 500 }
    );
  }

  // ---- Send the confirmation email (non-blocking) ----
  // Even if no row was deleted (count=0, already unsubscribed), we
  // still send the confirmation so the user has a written record.
  // SMTP failures must never break the 200 response.
  try {
    await sendUnsubscribeConfirmation(email);
  } catch (e: any) {
    console.error(
      "[newsletter/unsubscribe] confirmation email failed:",
      e?.message || e
    );
  }

  // Idempotent: even if count=0 (no row matched), return ok:true.
  return NextResponse.json({
    ok: true,
    message: "Désinscription confirmée",
    removed,
  });
}

// Resolve a token (from query string or request body) into a
// normalized email, or return null if the token is missing/invalid.
async function resolveToken(req: NextRequest): Promise<string | null> {
  // 1. Try query string: ?token=...
  const url = new URL(req.url);
  const queryToken = (url.searchParams.get("token") || "").trim();
  if (queryToken) {
    const email = decodeUnsubscribeToken(queryToken).toLowerCase();
    return email && EMAIL_RE.test(email) ? email : null;
  }

  // 2. Try JSON body: { "token": "..." }
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const bodyToken = (body?.token || "").toString().trim();
      if (bodyToken) {
        const email = decodeUnsubscribeToken(bodyToken).toLowerCase();
        return email && EMAIL_RE.test(email) ? email : null;
      }
    } catch {
      // Body wasn't JSON or didn't contain a token — fall through.
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const email = await resolveToken(req);
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Token de désinscription manquant ou invalide." },
      { status: 400 }
    );
  }
  return unsubscribeByEmail(email);
}

export async function POST(req: NextRequest) {
  const email = await resolveToken(req);
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Token de désinscription manquant ou invalide." },
      { status: 400 }
    );
  }
  return unsubscribeByEmail(email);
}
