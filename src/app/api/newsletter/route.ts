import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { sendNewsletterWelcome } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isMissingTableError(err: any): boolean {
  const msg = (err?.message || err?.toString() || "").toLowerCase();
  return (
    msg.includes("could not find the table") ||
    (msg.includes("relation") && msg.includes("does not exist")) ||
    (msg.includes("table") && msg.includes("does not exist")) ||
    msg.includes("schema cache") ||
    msg.includes("404")
  );
}

function isUniqueViolation(err: any): boolean {
  const msg = (err?.message || err?.toString() || "").toLowerCase();
  return (
    msg.includes("duplicate key") ||
    msg.includes("unique constraint") ||
    msg.includes("violates unique") ||
    msg.includes("already subscribed") ||
    err?.code === "23505"
  );
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const email = (body?.email || "").toString().trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email requis." }, { status: 400 });
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
      .from("newsletter_subscribers")
      .insert({ email })
      .select("id")
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json({
          ok: true,
          message: "Already subscribed",
        });
      }
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'newsletter_subscribers' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[newsletter] insert error:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'abonnement.", detail: error.message },
        { status: 500 }
      );
    }

    // ---- Welcome email (non-blocking) ----
    // Only sent on a NEW subscription. Duplicate subscriptions (already
    // subscribed) short-circuit above and never reach this point.
    // Email failures must NEVER break this response — we log and continue.
    try {
      await sendNewsletterWelcome(email);
    } catch (e) {
      console.error("[newsletter] welcome email failed:", e);
    }

    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch (e: any) {
    if (isUniqueViolation(e)) {
      return NextResponse.json({ ok: true, message: "Already subscribed" });
    }
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'newsletter_subscribers' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[newsletter] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
