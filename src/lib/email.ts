// ============================================================
// OUADAH DENTAL GROUPE — Email service (Resend REST API)
// ============================================================
// Uses Node's built-in fetch (Node 18+) to call the Resend REST
// API directly — no SDK, no extra dependency, no package.json
// change required.
//
// CONFIG (.env):
//   RESEND_API_KEY   — Your Resend API key (https://resend.com/api-keys)
//   EMAIL_FROM       — Sender address. Until you verify your own domain
//                      in Resend, you MUST use "onboarding@resend.dev".
//                      Example: "OUADAH DENTAL GROUPE <onboarding@resend.dev>"
//   EMAIL_TO         — Destination for admin notifications (business inbox).
//                      Defaults to "contact@odg.dz".
//
// DEV CAVEAT:
//   The Resend test domain (onboarding@resend.dev) can ONLY deliver to
//   the email address associated with your Resend account. Admin
//   notifications sent to other addresses will be rejected by Resend
//   with a 403 / "domain not verified" error. To send to any address,
//   verify your own domain in the Resend dashboard and update
//   EMAIL_FROM accordingly. Either way, the API request still returns
//   `{ ok: true }` to the client — email failures are non-fatal.
// ============================================================

import type { QuoteItem } from "@/lib/types";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const DEFAULT_FROM =
  process.env.EMAIL_FROM || "OUADAH DENTAL GROUPE <onboarding@resend.dev>";
const DEFAULT_ADMIN_TO = process.env.EMAIL_TO || "contact@odg.dz";

// Brand contact info reused across templates.
const BRAND = {
  name: "OUADAH DENTAL GROUPE",
  taglineFr: "Importateur de matériel dentaire — Oran, Algérie",
  phone: "+213 540 00 00 00",
  email: "contact@odg-dz.com",
  address: "Cité 1000 Logements, Bt 4, Oran, Algérie",
  color: "#0f766e", // teal-700
  colorLight: "#f0fdfa", // teal-50
  colorBorder: "#ccfbf1", // teal-100
};

export interface SendEmailResult {
  ok?: boolean;
  skipped?: boolean;
  data?: any;
}

/**
 * Low-level wrapper around the Resend REST API.
 * Returns `{ skipped: true }` if no API key is configured.
 * Throws on network / API errors so callers can decide what to do.
 */
export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[email] RESEND_API_KEY not set — skipping email");
    return { skipped: true };
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: DEFAULT_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      reply_to: replyTo,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[email] Resend error:", err);
    throw new Error(`Email failed: ${err}`);
  }

  return { ok: true, data: await res.json() };
}

// ------------------------------------------------------------
// HTML helpers — inline-styled, table-based for max compatibility
// ------------------------------------------------------------

function htmlShell(inner: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OUADAH DENTAL GROUPE</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
${inner}
        </table>
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="text-align:center;padding:16px 24px;color:#94a3b8;font-size:11px;line-height:1.5;">
              © ${new Date().getFullYear()} ${BRAND.name} — ${BRAND.address}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function headerBlock(subtitle: string): string {
  return `          <tr>
            <td style="background:${BRAND.color};padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:bold;letter-spacing:0.5px;">${BRAND.name}</h1>
              <p style="color:${BRAND.colorBorder};margin:6px 0 0;font-size:13px;">${subtitle}</p>
            </td>
          </tr>`;
}

function contentBlock(inner: string): string {
  return `          <tr>
            <td style="padding:28px 28px 24px;font-size:15px;line-height:1.6;">
${inner}
            </td>
          </tr>`;
}

function infoBox(items: [string, string][]): string {
  const rows = items
    .map(
      ([label, value]) =>
        `              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;width:40%;vertical-align:top;">${label}</td>
                <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${value}</td>
              </tr>`
    )
    .join("\n");
  return `              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.colorLight};border:1px solid ${BRAND.colorBorder};border-radius:8px;padding:14px 18px;margin:16px 0;">
${rows}
              </table>`;
}

function contactFooter(): string {
  return `              <p style="margin:18px 0 8px;font-size:14px;color:#475569;">Pour toute question, contactez-nous :</p>
              <p style="margin:0;font-size:14px;color:#0f172a;">
                📞 ${BRAND.phone}<br>
                ✉️ <a href="mailto:${BRAND.email}" style="color:${BRAND.color};text-decoration:none;">${BRAND.email}</a>
              </p>`;
}

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ------------------------------------------------------------
// Template: Quote confirmation (sent to the client)
// ------------------------------------------------------------

function formatProduitsList(produits: QuoteItem[] | any[]): string {
  if (!Array.isArray(produits) || produits.length === 0) {
    return "Aucun produit sélectionné";
  }
  return produits
    .map((p: any) => {
      const name =
        p?.name && typeof p.name === "object"
          ? String(p.name.fr || p.name.ar || "")
          : String(p?.name || "");
      const qty = Number(p?.quantity) > 0 ? ` ×${Number(p.quantity)}` : "";
      const brand = p?.brand ? ` (${p.brand})` : "";
      return escapeHtml(`${name}${brand}${qty}`) || "—";
    })
    .join("<br>");
}

const TYPE_CLIENT_LABELS: Record<string, string> = {
  dentiste: "Dentiste",
  clinique: "Clinique dentaire",
  hopital: "Hôpital",
  revendeur: "Revendeur",
  autre: "Autre",
};

export async function sendQuoteConfirmation(
  clientEmail: string,
  clientName: string,
  quoteData: {
    produits: QuoteItem[] | any[];
    wilaya?: string;
    type_client?: string;
  }
): Promise<SendEmailResult> {
  const produitsHtml = formatProduitsList(quoteData.produits);
  const wilaya = quoteData.wilaya || "Non précisée";
  const typeLabel =
    TYPE_CLIENT_LABELS[quoteData.type_client || ""] ||
    quoteData.type_client ||
    "Non précisé";

  const inner =
    headerBlock(BRAND.taglineFr) +
    contentBlock(`              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">Demande de devis reçue ✅</h2>
              <p style="margin:0 0 12px;">Bonjour ${escapeHtml(clientName)},</p>
              <p style="margin:0 0 8px;">Nous avons bien reçu votre demande de devis. Notre équipe l'examine et vous contactera sous <strong>24h</strong>.</p>
` +
      infoBox([
        ["Produits", produitsHtml],
        ["Wilaya", escapeHtml(wilaya)],
        ["Type d'établissement", escapeHtml(typeLabel)],
      ]) +
      `              <p style="margin:0 0 8px;">Merci de votre confiance.</p>
${contactFooter()}`);

  const html = htmlShell(inner);

  try {
    return await sendEmail({
      to: clientEmail,
      subject: "Demande de devis reçue — OUADAH DENTAL GROUPE",
      html,
      replyTo: BRAND.email,
    });
  } catch (e) {
    console.error("[email] sendQuoteConfirmation failed:", e);
    throw e;
  }
}

// ------------------------------------------------------------
// Template: Admin notification (new quote)
// ------------------------------------------------------------

export async function sendQuoteNotificationToAdmin(quoteData: {
  nom: string;
  email: string;
  telephone: string;
  wilaya?: string;
  type_client?: string;
  message?: string | null;
  produits?: QuoteItem[] | any[];
}): Promise<SendEmailResult> {
  const produitsHtml = formatProduitsList(quoteData.produits || []);
  const typeLabel =
    TYPE_CLIENT_LABELS[quoteData.type_client || ""] ||
    quoteData.type_client ||
    "—";

  const inner =
    headerBlock("Nouvelle demande de devis") +
    contentBlock(`              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">🔔 Nouvelle demande de devis</h2>
` +
      infoBox([
        ["Nom", escapeHtml(quoteData.nom)],
        ["Email", escapeHtml(quoteData.email)],
        ["Téléphone", escapeHtml(quoteData.telephone)],
        ["Wilaya", escapeHtml(quoteData.wilaya || "—")],
        ["Type de client", escapeHtml(typeLabel)],
      ]) +
      `              <p style="margin:16px 0 6px;font-weight:bold;color:#0f172a;">Produits demandés :</p>
              <div style="background:#f8fafc;border-left:3px solid ${BRAND.color};padding:10px 14px;font-size:14px;color:#1e293b;border-radius:4px;">
                ${produitsHtml}
              </div>
              <p style="margin:16px 0 6px;font-weight:bold;color:#0f172a;">Message du client :</p>
              <div style="background:#f8fafc;border-left:3px solid ${BRAND.color};padding:10px 14px;font-size:14px;color:#1e293b;border-radius:4px;white-space:pre-wrap;">
                ${escapeHtml(quoteData.message || "—")}
              </div>
              <p style="margin:18px 0 0;font-size:13px;color:#64748b;">
                Connectez-vous à l'interface admin pour traiter cette demande.
              </p>`);

  const html = htmlShell(inner);

  try {
    return await sendEmail({
      to: DEFAULT_ADMIN_TO,
      subject: `🔔 Nouveau devis — ${quoteData.nom} (${quoteData.wilaya || "—"})`,
      html,
      replyTo: quoteData.email,
    });
  } catch (e) {
    console.error("[email] sendQuoteNotificationToAdmin failed:", e);
    throw e;
  }
}

// ------------------------------------------------------------
// Template: Admin notification (new contact message)
// ------------------------------------------------------------

export async function sendContactNotificationToAdmin(messageData: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  body: string;
}): Promise<SendEmailResult> {
  const inner =
    headerBlock("Nouveau message de contact") +
    contentBlock(`              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">📬 Nouveau message</h2>
` +
      infoBox([
        ["Nom", escapeHtml(messageData.name)],
        ["Email", escapeHtml(messageData.email)],
        ["Téléphone", escapeHtml(messageData.phone || "—")],
        ["Sujet", escapeHtml(messageData.subject)],
      ]) +
      `              <p style="margin:16px 0 6px;font-weight:bold;color:#0f172a;">Message :</p>
              <div style="background:#f8fafc;border-left:3px solid ${BRAND.color};padding:12px 14px;font-size:14px;color:#1e293b;border-radius:4px;white-space:pre-wrap;">
                ${escapeHtml(messageData.body)}
              </div>
              <p style="margin:18px 0 0;font-size:13px;color:#64748b;">
                Répondez directement à cet email pour contacter l'expéditeur.
              </p>`);

  const html = htmlShell(inner);

  try {
    return await sendEmail({
      to: DEFAULT_ADMIN_TO,
      subject: `📬 Nouveau message — ${messageData.subject}`,
      html,
      replyTo: messageData.email,
    });
  } catch (e) {
    console.error("[email] sendContactNotificationToAdmin failed:", e);
    throw e;
  }
}

// ------------------------------------------------------------
// Template: Contact confirmation (sent to the client)
// ------------------------------------------------------------

export async function sendContactConfirmationToClient(
  clientEmail: string,
  clientName: string,
  subject: string
): Promise<SendEmailResult> {
  const inner =
    headerBlock(BRAND.taglineFr) +
    contentBlock(`              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">Message bien reçu ✅</h2>
              <p style="margin:0 0 12px;">Bonjour ${escapeHtml(clientName)},</p>
              <p style="margin:0 0 8px;">Nous avons bien reçu votre message concernant : <strong>${escapeHtml(subject)}</strong>.</p>
              <p style="margin:0 0 8px;">Notre équipe vous répondra dans les meilleurs délais.</p>
${contactFooter()}`);

  const html = htmlShell(inner);

  try {
    return await sendEmail({
      to: clientEmail,
      subject: "Message bien reçu — OUADAH DENTAL GROUPE",
      html,
      replyTo: BRAND.email,
    });
  } catch (e) {
    console.error("[email] sendContactConfirmationToClient failed:", e);
    throw e;
  }
}

// ------------------------------------------------------------
// Template: Newsletter welcome
// ------------------------------------------------------------

export async function sendNewsletterWelcome(
  email: string
): Promise<SendEmailResult> {
  const inner =
    headerBlock(BRAND.taglineFr) +
    contentBlock(`              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">Bienvenue 🎉</h2>
              <p style="margin:0 0 12px;">Bonjour,</p>
              <p style="margin:0 0 12px;">Merci de vous être abonné(e) à la newsletter d'<strong>OUADAH DENTAL GROUPE</strong>.</p>
              <p style="margin:0 0 12px;">Vous recevrez désormais en avant-première :</p>
              <ul style="margin:0 0 16px;padding-left:20px;color:#1e293b;font-size:14px;line-height:1.8;">
                <li>Nos nouveaux produits et marques</li>
                <li>Les offres exclusives et promotions</li>
                <li>Les actualités du matériel dentaire</li>
                <li>Les conseils de nos experts techniques</li>
              </ul>
              <p style="margin:0 0 8px;">À très vite !</p>
${contactFooter()}`);

  const html = htmlShell(inner);

  try {
    return await sendEmail({
      to: email,
      subject: "Bienvenue chez OUADAH DENTAL GROUPE 🎉",
      html,
      replyTo: BRAND.email,
    });
  } catch (e) {
    console.error("[email] sendNewsletterWelcome failed:", e);
    throw e;
  }
}
