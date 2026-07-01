import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/admin-auth";
import { getServerClient } from "@/lib/supabase";
import { sendEmail, unsubscribeFooter } from "@/lib/email";
import { getEmailLogs, logEmail } from "@/lib/email-log";

// ============================================================
// Bulk newsletter send — Task EMAIL-V3 (#14)
// ============================================================
// POST (admin-only — manager + editor + super_admin):
//   Body: { subject: string, htmlContent: string }
//   - Fetches ALL newsletter_subscribers from Supabase.
//   - Sends the email to each subscriber SEQUENTIALLY (not parallel)
//     with a 100ms delay between sends, to avoid hitting Gmail's
//     rate limits (~500/day on free, ~2000/day on Workspace).
//   - The unsubscribe footer (with a per-subscriber link) is appended
//     to EVERY email — this is a legal requirement (Loi 18-07 /
//     RFC 8058 one-click unsubscribe).
//   - Each send is logged to the `email_log` table (via sendEmail's
//     internal logEmail call). On failure, status='failed' is logged.
//   - Returns { ok, sent, failed, total, truncated?, warning? }.
//   - If there are more than 500 subscribers, stops at 500 and
//     returns a warning (Gmail daily limit safeguard).
//
// GET (admin-only — manager + editor + super_admin):
//   - Returns the current subscriber count + recent email_log rows.
//   - Used by the NewsletterPanel to display the dashboard.
// ============================================================

const MAX_PER_RUN = 500; // Gmail free daily limit safeguard
const DELAY_MS = 100; // Pause between sends to avoid SMTP rate limits

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- POST: bulk send ----
export async function POST(req: NextRequest) {
  // Role gate: manager + editor (super_admin bypasses via requireRole).
  const session = requireRole(req, ["manager", "editor"]);
  if (!session) {
    return NextResponse.json(
      { error: "Non autorisé. Rôle manager ou editor requis." },
      { status: 403 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const subject = (body?.subject || "").toString().trim();
  const htmlContent = (body?.htmlContent || "").toString().trim();

  if (!subject) {
    return NextResponse.json(
      { error: "Le sujet est requis." },
      { status: 400 }
    );
  }
  if (!htmlContent) {
    return NextResponse.json(
      { error: "Le contenu HTML est requis." },
      { status: 400 }
    );
  }

  let client;
  try {
    client = getServerClient();
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Supabase serveur non configuré.",
        detail: e?.message || "",
      },
      { status: 500 }
    );
  }

  // ---- Fetch all subscribers ----
  let subscribers: { email: string }[] = [];
  try {
    const { data, error } = await client
      .from("newsletter_subscribers")
      .select("email")
      .order("created_at", { ascending: true });

    if (error) {
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
      console.error("[newsletter/send] fetch subscribers error:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des abonnés.", detail: error.message },
        { status: 500 }
      );
    }
    subscribers = (data || []).filter(
      (s: any) => s && typeof s.email === "string" && s.email.trim()
    );
  } catch (e: any) {
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
    console.error("[newsletter/send] exception:", e);
    return NextResponse.json(
      { error: e?.message || "Erreur." },
      { status: 500 }
    );
  }

  const total = subscribers.length;
  if (total === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      failed: 0,
      total: 0,
      message: "Aucun abonné à contacter.",
    });
  }

  // ---- Cap at MAX_PER_RUN (Gmail daily limit safeguard) ----
  const capped = Math.min(total, MAX_PER_RUN);
  const truncated = total > MAX_PER_RUN;

  let sent = 0;
  let failed = 0;

  // ---- Sequential send loop ----
  // NOT parallel — Gmail will rate-limit / temp-ban if we burst-send.
  for (let i = 0; i < capped; i++) {
    const email = String(subscribers[i].email).toLowerCase().trim();

    // Append the unsubscribe footer (per-subscriber link) — legally
    // required in every bulk email. The footer is built by the shared
    // unsubscribeFooter() helper so the link format stays consistent
    // with the welcome email.
    const finalHtml = `${htmlContent}\n${unsubscribeFooter(email)}`;

    try {
      const result = await sendEmail({
        to: email,
        subject,
        html: finalHtml,
        template: "newsletter.bulk",
      });
      if (result?.ok || result?.skipped) {
        // skipped = SMTP not configured (dev). Count as "sent" so the
        // admin gets a clear count of intended recipients.
        sent++;
      } else {
        failed++;
      }
    } catch (e: any) {
      // sendEmail already logged the failure (status='failed') via
      // logEmail. We just count + continue.
      console.error(
        `[newsletter/send] failed for ${email}:`,
        e?.message || e
      );
      failed++;
    }

    // Pause between sends (skip after the last one — no need to wait).
    if (i < capped - 1) {
      await sleep(DELAY_MS);
    }
  }

  // Optional: log a synthetic "bulk send completed" entry so admins
  // can see the bulk-send event in the email_log. Non-blocking.
  await logEmail({
    to: `${sent} subscriber(s)`,
    subject,
    template: "newsletter.bulk.summary",
    status: failed === 0 ? "sent" : "failed",
    error:
      failed > 0 ? `${failed} send(s) failed out of ${capped}` : undefined,
  });

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    total,
    truncated,
    warning: truncated
      ? `Limité à ${MAX_PER_RUN} emails (limite quotidienne Gmail). ${total - MAX_PER_RUN} abonnés n'ont pas été contactés — relancez demain.`
      : undefined,
  });
}

// ---- GET: subscriber count + recent logs (for the panel dashboard) ----
export async function GET(req: NextRequest) {
  const session = requireRole(req, ["manager", "editor"]);
  if (!session) {
    return NextResponse.json(
      { error: "Non autorisé. Rôle manager ou editor requis." },
      { status: 403 }
    );
  }

  let client;
  try {
    client = getServerClient();
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Supabase serveur non configuré.",
        detail: e?.message || "",
      },
      { status: 500 }
    );
  }

  // Subscriber count — tolerant of a missing table.
  let subscriberCount = 0;
  let tableMissing = false;
  try {
    const { count, error } = await client
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true });

    if (error) {
      if (isMissingTableError(error)) {
        tableMissing = true;
      } else {
        console.error("[newsletter/send] count error:", error);
      }
    } else {
      subscriberCount = Number(count) || 0;
    }
  } catch (e: any) {
    if (isMissingTableError(e)) {
      tableMissing = true;
    } else {
      console.error("[newsletter/send] count exception:", e);
    }
  }

  // Recent email logs (also tolerant — getEmailLogs never throws).
  const logs = await getEmailLogs(30);

  return NextResponse.json({
    ok: true,
    subscriberCount,
    tableMissing,
    logs,
  });
}
