import { NextResponse } from "next/server";
import { getServerClientOr500, tableMissingResponse } from "@/lib/supabase/server";
import { isMissingTableError, isUniqueViolation } from "@/lib/supabase/errors";
import { newsletterSubscribeSchema } from "@/lib/schemas";
import { withBody } from "@/lib/validation";
import { enforceLimit } from "@/lib/auth/rate-limit";
import { sendNewsletterWelcome } from "@/lib/email";

// ============================================================
// REFACTOR (refactor/total — audit §2.1, §2.3, §3.1, §3.3)
// ============================================================
// - Body validated with zod (`newsletterSubscribeSchema`).
// - Honeypot `website` field for bot rejection.
// - Rate-limited to 5 subscribes / hour per IP.
// - Uses shared `isMissingTableError` + `isUniqueViolation` from
//   lib/supabase/errors.ts (no more inline regex).
// - Uses shared `getServerClientOr500()` (no more inline try/catch).
// ============================================================

export const POST = withBody(newsletterSubscribeSchema, async (req, body) => {
  // Honeypot: silently accept.
  if (body.website) {
    return NextResponse.json({ ok: true, spam: true });
  }

  // Rate limit: 5 subscribes per hour per IP.
  const limited = enforceLimit(req, "newsletter", { limit: 5, windowSec: 3600 });
  if (limited) return limited;

  const { client, error: clientError } = getServerClientOr500();
  if (clientError) return clientError;

  try {
    const { data, error } = await client
      .from("newsletter_subscribers")
      .insert({
        email: body.email,
        langue: body.langue || "fr",
      })
      .select("id")
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json({ ok: true, message: "Already subscribed" });
      }
      if (isMissingTableError(error)) {
        return tableMissingResponse("newsletter_subscribers");
      }
      console.error("[newsletter] insert error:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'abonnement." },
        { status: 500 }
      );
    }

    // Welcome email — non-blocking. The unsubscribe link in the email
    // is now HMAC-signed (see lib/email.ts — refactor/total §2.4).
    try {
      await sendNewsletterWelcome(body.email);
    } catch (e) {
      console.error("[newsletter] welcome email failed:", e);
    }

    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch (e) {
    if (isUniqueViolation(e as { code?: string; message?: string })) {
      return NextResponse.json({ ok: true, message: "Already subscribed" });
    }
    if (isMissingTableError(e as { code?: string; message?: string })) {
      return tableMissingResponse("newsletter_subscribers");
    }
    console.error("[newsletter] exception:", e);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
});
