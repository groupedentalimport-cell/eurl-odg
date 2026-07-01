import { NextRequest, NextResponse } from "next/server";
import {
  createClientMagicToken,
  findClientByEmail,
} from "@/lib/client-auth";
import { sendEmail } from "@/lib/email";

// ============================================================
// POST /api/client-portal/login  (Task BONUS-3 — magic link)
// ============================================================
//
// Body: { "email": "client@example.dz" }
//
// Flow:
//   1. Look up the client by email (case-insensitive, trimmed) in the
//      `clients` Supabase table.
//   2. If no client matches → 404 { error: "Aucun compte client trouvé…" }
//      (NOTE: this DOES allow email enumeration, but the task spec asks
//      for an explicit error. Client emails for a B2B dental importer
//      are public business contacts, so the leak is low-impact.)
//   3. If found → generate a short-lived (15-min) HMAC-signed magic
//      token and email it as a link: <SITE_URL>/portal?token=XXX
//   4. The client clicks the link → /portal auto-calls
//      /api/client-portal/verify, which exchanges the magic token for
//      a long-lived (7-day) `odg_client` session cookie.
//
// Email sending: reuses the existing sendEmail() (Gmail SMTP). If SMTP
// is not configured we log the link server-side and (in non-prod only)
// also return it in the JSON so the dev can click it manually — we do
// NOT expose the link in production responses (would leak the token
// to anyone probing the endpoint).
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://ouadah-dental-groupe.vercel.app");

// ---- Magic-link email template ---------------------------------------
// Kept local (instead of in src/lib/email.ts) to avoid modifying that
// shared file. Uses the same htmlShell-style layout: a single teal
// header, a short paragraph, and a large "Se connecter" button. The
// link itself is duplicated as a fallback text under the button for
// mail clients that block buttons or for copy-paste.
function buildMagicLinkEmailHtml(
  clientName: string | null,
  link: string
): string {
  const greeting = clientName
    ? `Bonjour ${escapeHtml(clientName)},`
    : "Bonjour,";
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connexion à votre espace client — ODG</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:#0f766e;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:bold;letter-spacing:0.5px;">OUADAH DENTAL GROUPE</h1>
              <p style="color:#ccfbf1;margin:6px 0 0;font-size:13px;">Espace client — lien de connexion sécurisé</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 24px;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 12px;">${greeting}</p>
              <p style="margin:0 0 16px;">
                Vous avez demandé l'accès à votre espace client. Cliquez sur le bouton
                ci-dessous pour vous connecter automatiquement. Ce lien est valable
                <strong>15 minutes</strong> et peut être utilisé une seule fois.
              </p>
              <p style="margin:24px 0;text-align:center;">
                <a href="${escapeAttr(link)}"
                   style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:8px;font-size:15px;">
                  Se connecter à mon espace
                </a>
              </p>
              <p style="margin:16px 0 8px;font-size:13px;color:#64748b;">
                Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :
              </p>
              <p style="margin:0;font-size:12px;color:#475569;word-break:break-all;">
                <a href="${escapeAttr(link)}" style="color:#0f766e;text-decoration:none;">${escapeHtml(link)}</a>
              </p>
              <p style="margin:20px 0 0;font-size:13px;color:#64748b;">
                Si vous n'avez pas demandé ce lien, ignorez cet email — votre compte reste en sécurité.
              </p>
              <p style="margin:18px 0 8px;font-size:14px;color:#475569;">Pour toute question, contactez-nous :</p>
              <p style="margin:0;font-size:14px;color:#0f172a;">
                📞 +213 540 00 00 00<br>
                ✉️ <a href="mailto:contact@odg-dz.com" style="color:#0f766e;text-decoration:none;">contact@odg-dz.com</a>
              </p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="text-align:center;padding:16px 24px;color:#94a3b8;font-size:11px;line-height:1.5;">
              © ${year} OUADAH DENTAL GROUPE — Cité 1000 Logements, Bt 4, Oran, Algérie
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}

// ---- The route handler ------------------------------------------------
export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const email = (body?.email || "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Email invalide." },
      { status: 400 }
    );
  }

  // Look up the client. findClientByEmail returns null on a missing
  // table OR an unknown email — we treat both as "no account" so the
  // portal works (or fails) consistently during the CRM migration.
  const client = await findClientByEmail(email);
  if (!client) {
    return NextResponse.json(
      { error: "Aucun compte client trouvé avec cet email." },
      { status: 404 }
    );
  }

  // Generate the magic token + the public link.
  const token = createClientMagicToken(client.id);
  const link = `${SITE_URL}/portal?token=${encodeURIComponent(token)}`;

  // Send the email. sendEmail swallows SMTP-missing as `{ skipped: true }`
  // (no throw) so we always reach the return statement below.
  let sent = false;
  try {
    const result = await sendEmail({
      to: email,
      subject: "Votre lien de connexion — OUADAH DENTAL GROUPE",
      html: buildMagicLinkEmailHtml(client.nom, link),
      template: "sendClientMagicLink",
    });
    sent = !result?.skipped;
  } catch (e) {
    console.error("[client-portal/login] sendEmail failed:", e);
    // We do NOT throw — the user should still see "check your email"
    // so we don't leak the SMTP failure (and the dev can check the
    // server logs). In dev with no SMTP, we expose the link below.
  }

  // Dev affordance: if SMTP is not configured, surface the link in the
  // JSON so a developer can click it. NEVER do this in production —
  // the link is a 15-min credential and would be logged by any
  // monitoring/proxy sitting between the client and the API.
  const isProd = process.env.NODE_ENV === "production";
  const payload: { ok: boolean; sent: boolean; devMagicLink?: string } = {
    ok: true,
    sent,
  };
  if (!isProd && !sent) {
    payload.devMagicLink = link;
    // Also log it server-side for `bun run dev` users without a curl.
    console.log("[client-portal/login] dev magic link:", link);
  }

  return NextResponse.json(payload);
}
