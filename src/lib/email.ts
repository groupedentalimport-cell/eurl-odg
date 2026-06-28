// ============================================================
// OUADAH DENTAL GROUPE — Email service (Gmail SMTP via nodemailer)
// ============================================================
// Sends transactional emails (quote confirmations, contact notifications,
// newsletter welcomes) through your Gmail account using SMTP.
//
// CONFIG (.env / Vercel env vars):
//   SMTP_HOST   — Gmail SMTP host: "smtp.gmail.com"
//   SMTP_PORT   — Gmail SMTP port: 587 (STARTTLS) or 465 (SSL)
//   SMTP_USER   — Your Gmail address, e.g. "groupedentalimport@gmail.com"
//   SMTP_PASS   — Gmail App Password (16 chars, generated at
//                 https://myaccount.google.com/apppasswords — NOT your
//                 regular Gmail password). 2-Step Verification must be ON.
//   EMAIL_FROM  — Sender display, e.g. "OUADAH DENTAL GROUPE <groupedentalimport@gmail.com>"
//   EMAIL_TO    — Destination for admin notifications (business inbox).
//                 Defaults to SMTP_USER if not set.
//
// LIMITS:
//   Gmail free: ~500 emails/day. Google Workspace: ~2000/day.
//   Sufficient for ODG's volume (devis, contacts, newsletter).
//
// SECURITY:
//   The App Password is stored ONLY in environment variables (never in
//   code/git). It bypasses 2-Step Verification for SMTP only — it cannot
//   be used to log into Gmail's web interface.
// ============================================================

import type { QuoteItem } from "@/lib/types";
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";

const DEFAULT_FROM =
  process.env.EMAIL_FROM ||
  (SMTP_USER ? `OUADAH DENTAL GROUPE <${SMTP_USER}>` : "OUADAH DENTAL GROUPE");
const DEFAULT_ADMIN_TO = process.env.EMAIL_TO || SMTP_USER || "contact@odg.dz";

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
 * Low-level wrapper around Gmail SMTP (via nodemailer).
 * Returns `{ skipped: true }` if SMTP_USER/SMTP_PASS are not configured.
 * Throws on SMTP errors so callers can decide what to do.
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
  if (!SMTP_USER || !SMTP_PASS) {
    console.log("[email] SMTP_USER/SMTP_PASS not set — skipping email");
    return { skipped: true };
  }

  // Create a nodemailer transporter using Gmail SMTP.
  // The transporter is cheap to create; nodemailer pools connections internally.
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: DEFAULT_FROM,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
    replyTo: replyTo || undefined,
  });

  return { ok: true, data: { messageId: info.messageId } };
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
