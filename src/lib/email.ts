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
import { logEmail } from "./email-log";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";

const DEFAULT_FROM =
  process.env.EMAIL_FROM ||
  (SMTP_USER ? `OUADAH DENTAL GROUPE <${SMTP_USER}>` : "OUADAH DENTAL GROUPE");
const DEFAULT_ADMIN_TO = process.env.EMAIL_TO || SMTP_USER || "contact@odg.dz";

// Exposed for the cron route so it knows where to send the admin alert
// (#10 — maintenance en retard). Falls back to SMTP_USER then to a
// generic contact address.
export function getAdminInbox(): string {
  return DEFAULT_ADMIN_TO;
}

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
  warn: "#b45309", // amber-700 — used for admin alert emails
  warnLight: "#fffbeb", // amber-50
  warnBorder: "#fde68a", // amber-200
};

// ============================================================
// Multilingual support (Tier 3 — #12)
// ============================================================
// All template functions accept an optional `lang` parameter
// (default "fr"). When lang === "ar", the subject line, body text,
// info-box labels, and HTML wrapper direction (dir="rtl") are
// switched to Arabic. The BRAND visual identity (logo, colors) stays
// the same — only the text changes.
export type EmailLang = "fr" | "ar";

// Arabic label maps (used by the lang-aware template functions).
const TYPE_CLIENT_LABELS_AR: Record<string, string> = {
  dentiste: "طبيب أسنان",
  clinique: "عيادة أسنان",
  hopital: "مستشفى",
  revendeur: "موزع",
  autre: "آخر",
};

const TYPE_INTERVENTION_LABELS_AR: Record<string, string> = {
  livraison: "تسليم",
  installation: "تركيب",
  formation: "تكوين",
  maintenance_preventive: "صيانة وقائية",
  maintenance_curative: "صيانة علاجية",
};

// Public site origin — used to build absolute links (e.g. newsletter
// unsubscribe). Mirrors the constant in src/app/sitemap.ts.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://ouadah-dental-groupe.vercel.app";

// ============================================================
// HMAC-signed unsubscribe tokens (refactor/total — audit §2.4)
// ============================================================
// Previously the unsubscribe link used `base64url(email)` — pure
// encoding with no signature. Anyone who knew a victim's email
// could compute the token and unsubscribe them via a cross-site
// GET (allowed under sameSite=lax). RFC 8058 actually permits
// one-click unsubscribe via GET, but the token MUST be unforgeable.
//
// New format: `<base64url(json)>.<hex-hmac-sha256>`. The JSON
// contains `{ email, iat }` with a 30-day TTL (matches the typical
// re-engagement window for a monthly newsletter). The HMAC key is
// `CLIENT_SECRET` (already required at boot via lib/env.ts).
//
// Backward-compat: `decodeUnsubscribeToken` accepts both old
// (base64url-only) and new (signed) tokens — but old tokens are
// rejected after a 7-day migration window via a hardcoded cutoff.
import { createHmac, timingSafeEqual } from "crypto";
import { serverEnv } from "./env";

const UNSUBSCRIBE_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

function unsubscribeSecret(): string {
  return serverEnv.CLIENT_SECRET + ":unsubscribe";
}

export function encodeUnsubscribeToken(email: string): string {
  const json = JSON.stringify({
    email: email.toLowerCase().trim(),
    iat: Math.floor(Date.now() / 1000),
  });
  const payload = Buffer.from(json, "utf8").toString("base64url");
  const sig = createHmac("sha256", unsubscribeSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function decodeUnsubscribeToken(token: string): string {
  if (!token) return "";
  try {
    const decoded = decodeURIComponent(token);
    // New format: `<payload>.<sig>`.
    if (decoded.includes(".")) {
      const [payload, sig] = decoded.split(".");
      const expectedSig = createHmac("sha256", unsubscribeSecret())
        .update(payload)
        .digest("hex");
      const a = Buffer.from(sig, "hex");
      const b = Buffer.from(expectedSig, "hex");
      if (a.length !== b.length || !timingSafeEqual(a, b)) return "";
      const json = Buffer.from(payload, "base64url").toString("utf8");
      const data = JSON.parse(json) as { email?: string; iat?: number };
      if (!data.email) return "";
      const now = Math.floor(Date.now() / 1000);
      if (now - (data.iat || 0) > UNSUBSCRIBE_TTL_SEC) return "";
      return data.email;
    }
    // Legacy format (pre-refactor): base64url(email). REJECTED to
    // close the forgery vector — operators must re-send the
    // newsletter with new signed links.
    return "";
  } catch {
    return "";
  }
}

// Build the unsubscribe URL embedded in the newsletter welcome email.
// Format: <SITE_URL>/newsletter-unsubscribe?token=<signed-token>
function buildUnsubscribeUrl(email: string): string {
  return `${SITE_URL}/newsletter-unsubscribe?token=${encodeUnsubscribeToken(email)}`;
}

// Unsubscribe footer inserted at the bottom of every newsletter email.
// Small grey paragraph with a single "Se désinscrire" link — matches
// the Loi 18-07 (Algerian spam law) compliance requirement.
// Exported so the bulk newsletter send route can reuse the same footer
// (ensures every bulk email has the legally-required unsubscribe link).
// Localized: Arabic variant uses an Arabic translation of the message.
export function unsubscribeFooter(
  email: string,
  lang: EmailLang = "fr"
): string {
  if (lang === "ar") {
    return `              <p style="font-size:12px;color:#64748b;margin-top:24px;direction:rtl;text-align:right;">
                تتلقون هذه الرسالة لأنكم اشتركتم في نشرة مجموعة أوضاح لطب الأسنان. <a href="${buildUnsubscribeUrl(
                  email
                )}" style="color:${BRAND.color};text-decoration:none;">إلغاء الاشتراك</a>
              </p>`;
  }
  return `              <p style="font-size:12px;color:#64748b;margin-top:24px;">
                Vous recevez cet email car vous êtes inscrit à la newsletter ODG. <a href="${buildUnsubscribeUrl(
                  email
                )}" style="color:${BRAND.color};text-decoration:none;">Se désinscrire</a>
              </p>`;
}

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
  template,
}: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  /**
   * Optional template identifier (e.g. "sendQuoteConfirmation").
   * Recorded in the `email_log` table for audit. Defaults to "unknown"
   * when not provided (legacy callers).
   */
  template?: string;
}): Promise<SendEmailResult> {
  const toStr = Array.isArray(to) ? to.join(", ") : to;

  if (!SMTP_USER || !SMTP_PASS) {
    console.log("[email] SMTP_USER/SMTP_PASS not set — skipping email");
    // Non-blocking: log the skip (table may not exist — logEmail swallows).
    await logEmail({ to: toStr, subject, template, status: "skipped" });
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

  try {
    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to: toStr,
      subject,
      html,
      replyTo: replyTo || undefined,
    });
    // Non-blocking: log the successful send.
    await logEmail({
      to: toStr,
      subject,
      template,
      status: "sent",
      messageId: info.messageId,
    });
    return { ok: true, data: { messageId: info.messageId } };
  } catch (e: any) {
    // Non-blocking: log the failure (still re-throw to preserve contract).
    await logEmail({
      to: toStr,
      subject,
      template,
      status: "failed",
      error: e?.message || String(e),
    });
    throw e;
  }
}

// ------------------------------------------------------------
// HTML helpers — inline-styled, table-based for max compatibility
// ------------------------------------------------------------

function htmlShell(inner: string, lang: EmailLang = "fr"): string {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const htmlLang = lang === "ar" ? "ar" : "fr";
  return `<!DOCTYPE html>
<html lang="${htmlLang}" dir="${dir}">
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

// Amber-themed variant used for admin alert emails (e.g. maintenance en
// retard). Visually distinct from the standard teal header so the admin
// can immediately spot a warning in their inbox.
function headerBlockWarning(subtitle: string): string {
  return `          <tr>
            <td style="background:${BRAND.warn};padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:bold;letter-spacing:0.5px;">${BRAND.name}</h1>
              <p style="color:${BRAND.warnBorder};margin:6px 0 0;font-size:13px;">${subtitle}</p>
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

function contactFooter(lang: EmailLang = "fr"): string {
  const intro = lang === "ar"
    ? "لأي سؤال، تواصلوا معنا:"
    : "Pour toute question, contactez-nous :";
  const dirStyle = lang === "ar" ? "direction:rtl;text-align:right;" : "";
  return `              <p style="margin:18px 0 8px;font-size:14px;color:#475569;${dirStyle}">${intro}</p>
              <p style="margin:0;font-size:14px;color:#0f172a;${dirStyle}">
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
  },
  lang: EmailLang = "fr"
): Promise<SendEmailResult> {
  const isAr = lang === "ar";
  const produitsHtml = formatProduitsList(quoteData.produits);
  const wilaya = quoteData.wilaya || (isAr ? "غير محددة" : "Non précisée");
  const typeLabel = isAr
    ? TYPE_CLIENT_LABELS_AR[quoteData.type_client || ""] ||
      quoteData.type_client ||
      "غير محدد"
    : TYPE_CLIENT_LABELS[quoteData.type_client || ""] ||
      quoteData.type_client ||
      "Non précisé";

  const subtitle = isAr
    ? "استيراد معدات طب الأسنان — وهران، الجزائر"
    : BRAND.taglineFr;
  const h2 = isAr ? "تم استلام طلب عرض السعر ✅" : "Demande de devis reçue ✅";
  const greeting = isAr
    ? `مرحباً ${escapeHtml(clientName)}،`
    : `Bonjour ${escapeHtml(clientName)},`;
  const body = isAr
    ? "لقد استلمنا طلب عرض السعر. فريقنا يراجعه وسيتواصل معكم خلال <strong>24 ساعة</strong>."
    : "Nous avons bien reçu votre demande de devis. Notre équipe l'examine et vous contactera sous <strong>24h</strong>.";
  const lblProducts = isAr ? "المنتجات" : "Produits";
  const lblWilaya = isAr ? "الولاية" : "Wilaya";
  const lblType = isAr ? "نوع المؤسسة" : "Type d'établissement";
  const closing = isAr ? "شكراً لثقتكم." : "Merci de votre confiance.";
  const subject = isAr
    ? "تأكيد طلب عرض سعر — مجموعة أوضاح لطب الأسنان"
    : "Demande de devis reçue — OUADAH DENTAL GROUPE";

  const inner =
    headerBlock(subtitle) +
    contentBlock(
      `              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">${h2}</h2>
              <p style="margin:0 0 12px;">${greeting}</p>
              <p style="margin:0 0 8px;">${body}</p>
` +
        infoBox([
          [lblProducts, produitsHtml],
          [lblWilaya, escapeHtml(wilaya)],
          [lblType, escapeHtml(typeLabel)],
        ]) +
        `              <p style="margin:0 0 8px;">${closing}</p>
${contactFooter(lang)}`
    );

  const html = htmlShell(inner, lang);

  try {
    return await sendEmail({
      to: clientEmail,
      subject,
      html,
      replyTo: BRAND.email,
      template: "sendQuoteConfirmation",
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
      template: "sendQuoteNotificationToAdmin",
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
      template: "sendContactNotificationToAdmin",
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
      template: "sendContactConfirmationToClient",
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
  email: string,
  lang: EmailLang = "fr"
): Promise<SendEmailResult> {
  const isAr = lang === "ar";
  const subtitle = isAr
    ? "استيراد معدات طب الأسنان — وهران، الجزائر"
    : BRAND.taglineFr;
  const h2 = isAr ? "أهلاً وسهلاً 🎉" : "Bienvenue 🎉";
  const greeting = isAr ? "مرحباً،" : "Bonjour,";
  const intro = isAr
    ? "شكراً لاشتراككم في نشرة <strong>مجموعة أوضاح لطب الأسنان</strong>."
    : "Merci de vous être abonné(e) à la newsletter d'<strong>OUADAH DENTAL GROUPE</strong>.";
  const preview = isAr
    ? "ستتلقون من الآن فصاعداً وبشكل استباقي:"
    : "Vous recevrez désormais en avant-première :";
  const items = isAr
    ? [
        "منتجاتنا وعلاماتنا الجديدة",
        "العروض الحصرية والتخفيضات",
        "آخر مستجدات معدات طب الأسنان",
        "نصائح من خبرائنا التقنيين",
      ]
    : [
        "Nos nouveaux produits et marques",
        "Les offres exclusives et promotions",
        "Les actualités du matériel dentaire",
        "Les conseils de nos experts techniques",
      ];
  const closing = isAr ? "نراكم قريباً!" : "À très vite !";
  const subject = isAr
    ? "مرحباً بكم في مجموعة أوضاح لطب الأسنان 🎉"
    : "Bienvenue chez OUADAH DENTAL GROUPE 🎉";

  const itemsHtml = items.map((i) => `                <li>${i}</li>`).join("\n");

  const inner =
    headerBlock(subtitle) +
    contentBlock(
      `              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">${h2}</h2>
              <p style="margin:0 0 12px;">${greeting}</p>
              <p style="margin:0 0 12px;">${intro}</p>
              <p style="margin:0 0 12px;">${preview}</p>
              <ul style="margin:0 0 16px;padding-left:20px;color:#1e293b;font-size:14px;line-height:1.8;">
${itemsHtml}
              </ul>
              <p style="margin:0 0 8px;">${closing}</p>
${contactFooter(lang)}
${unsubscribeFooter(email, lang)}`
    );

  const html = htmlShell(inner, lang);

  try {
    return await sendEmail({
      to: email,
      subject,
      html,
      replyTo: BRAND.email,
      template: "sendNewsletterWelcome",
    });
  } catch (e) {
    console.error("[email] sendNewsletterWelcome failed:", e);
    throw e;
  }
}

// ============================================================
// CRM workflow templates (Tier 1 — status-triggered automatic emails)
// Task EMAIL-V1
// ============================================================
// These 6 functions are invoked from the admin API routes after a
// successful statut change. The CALLER wraps each call in try/catch
// so that SMTP failures never break the API response. Each function
// just builds the HTML and delegates to sendEmail().
// ============================================================

const TYPE_INTERVENTION_LABELS: Record<string, string> = {
  livraison: "Livraison",
  installation: "Installation",
  formation: "Formation",
  maintenance_preventive: "Maintenance préventive",
  maintenance_curative: "Maintenance curative",
};

// Algerian Dinar currency formatter. "fr-DZ" may fall back to "fr" in
// some Node runtimes; wrap in try/catch just in case.
const DZD = (() => {
  try {
    return new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
      maximumFractionDigits: 2,
    });
  } catch {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "DZD",
      maximumFractionDigits: 2,
    });
  }
})();

function formatDzd(n: number | string | null | undefined): string {
  const num = typeof n === "string" ? parseFloat(n) : Number(n);
  if (!Number.isFinite(num)) return "—";
  try {
    return DZD.format(num);
  } catch {
    return `${num.toFixed(2)} DZD`;
  }
}

function formatDateTimeFr(
  iso: string | null | undefined,
  lang: EmailLang = "fr"
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const primary = lang === "ar" ? "ar-DZ" : "fr-DZ";
  const fallback = lang === "ar" ? "ar" : "fr-FR";
  try {
    return d.toLocaleString(primary, { dateStyle: "long", timeStyle: "short" });
  } catch {
    try {
      return d.toLocaleString(fallback, { dateStyle: "long", timeStyle: "short" });
    } catch {
      return d.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
    }
  }
}

function formatDateFr(
  iso: string | null | undefined,
  lang: EmailLang = "fr"
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const primary = lang === "ar" ? "ar-DZ" : "fr-DZ";
  const fallback = lang === "ar" ? "ar" : "fr-FR";
  try {
    return d.toLocaleDateString(primary, { dateStyle: "long" });
  } catch {
    try {
      return d.toLocaleDateString(fallback, { dateStyle: "long" });
    } catch {
      return d.toLocaleDateString("fr-FR", { dateStyle: "long" });
    }
  }
}

// Format the devis "lignes" array (each row: { designation, qte,
// prix_unitaire, remise_pct }) into a simple HTML list for emails.
function formatDevisLignes(lignes: any[] | null | undefined): string {
  if (!Array.isArray(lignes) || lignes.length === 0) return "—";
  return lignes
    .map((l: any) => {
      const designation = escapeHtml(l?.designation || "—");
      const qte = Number(l?.qte) > 0 ? ` ×${Number(l.qte)}` : "";
      const pu = Number.isFinite(Number(l?.prix_unitaire))
        ? ` — ${formatDzd(l.prix_unitaire)}`
        : "";
      return `${designation}${qte}${pu}`;
    })
    .join("<br>");
}

// ----- Email #1: Devis statut → "envoye" (devis ready, sent to client) -----
export async function sendDevisValideEmail(
  clientEmail: string,
  clientName: string,
  devisData: {
    numero?: string;
    montant_total?: number | string;
    lignes?: any[];
    date_emission?: string | null;
    date_validite?: string | null;
  },
  lang: EmailLang = "fr"
): Promise<SendEmailResult> {
  const isAr = lang === "ar";
  const numero = devisData.numero || "—";
  const lignesHtml = formatDevisLignes(devisData.lignes);

  const subtitle = isAr
    ? "استيراد معدات طب الأسنان — وهران، الجزائر"
    : BRAND.taglineFr;
  const h2 = isAr ? "عرض السعر جاهز 📄" : "Votre devis est prêt 📄";
  const greeting = isAr
    ? `مرحباً ${escapeHtml(clientName)}،`
    : `Bonjour ${escapeHtml(clientName)},`;
  const body = isAr
    ? `عرض سعركم <strong>ODG #${escapeHtml(numero)}</strong> جاهز. تجدون ملخصه أدناه:`
    : `Votre devis <strong>ODG #${escapeHtml(numero)}</strong> est prêt. Vous en trouverez le récapitulatif ci-dessous :`;
  const lblNumero = isAr ? "رقم العرض" : "N° de devis";
  const lblDateEmission = isAr ? "تاريخ الإصدار" : "Date d'émission";
  const lblDateValidite = isAr ? "صالح حتى" : "Valide jusqu'au";
  const lblMontant = isAr ? "المبلغ الإجمالي" : "Montant total";
  const lblLignes = isAr ? "البنود" : "Lignes";
  const closing = isAr
    ? "لأي سؤال أو لمناقشة الشروط، لا تترددوا في الاتصال بنا — سنرد عليكم خلال 24 ساعة."
    : "Pour toute question ou pour discuter des conditions, n'hésitez pas à nous contacter — nous vous répondrons sous 24h.";
  const subject = isAr
    ? `عرض سعر مجموعة أوضاح رقم #${numero} جاهز`
    : `Votre devis ODG #${numero} est prêt`;

  const inner =
    headerBlock(subtitle) +
    contentBlock(
      `              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">${h2}</h2>
              <p style="margin:0 0 12px;">${greeting}</p>
              <p style="margin:0 0 8px;">${body}</p>
` +
        infoBox([
          [lblNumero, escapeHtml(numero)],
          [lblDateEmission, formatDateFr(devisData.date_emission, lang)],
          [lblDateValidite, formatDateFr(devisData.date_validite, lang)],
          [lblMontant, formatDzd(devisData.montant_total)],
          [lblLignes, lignesHtml],
        ]) +
        `              <p style="margin:0 0 8px;">${closing}</p>
${contactFooter(lang)}`
    );

  const html = htmlShell(inner, lang);
  return await sendEmail({
    to: clientEmail,
    subject,
    html,
    replyTo: BRAND.email,
    template: "sendDevisValideEmail",
  });
}

// ----- Email #2: Devis statut → "accepte" -----
export async function sendDevisAccepteEmail(
  clientEmail: string,
  clientName: string,
  devisData: {
    numero?: string;
    montant_total?: number | string;
  },
  lang: EmailLang = "fr"
): Promise<SendEmailResult> {
  const isAr = lang === "ar";
  const numero = devisData.numero || "—";

  const subtitle = isAr
    ? "استيراد معدات طب الأسنان — وهران، الجزائر"
    : BRAND.taglineFr;
  const h2 = isAr ? "تم قبول عرض السعر — شكراً! 🤝" : "Devis accepté — merci ! 🤝";
  const greeting = isAr
    ? `مرحباً ${escapeHtml(clientName)}،`
    : `Bonjour ${escapeHtml(clientName)},`;
  const body = isAr
    ? `نشكركم على قبول عرض السعر <strong>ODG #${escapeHtml(numero)}</strong>. يسعدنا أن نكمل طلبكم.`
    : `Nous vous remercions d'avoir accepté le devis <strong>ODG #${escapeHtml(numero)}</strong>. C'est avec plaisir que nous allons finaliser votre commande.`;
  const lblNumero = isAr ? "رقم العرض" : "N° de devis";
  const lblMontant = isAr ? "المبلغ الإجمالي" : "Montant total";
  const stepsTitle = isAr ? "<strong>الخطوات التالية:</strong>" : "<strong>Prochaines étapes :</strong>";
  const steps = isAr
    ? [
        "سيتواصل معكم فريقنا التجاري لإنهاء الطلب.",
        "بعد ذلك سنخطط للتسليم و/أو التركيب حسب توفركم.",
        "سيتم تفعيل ضمان لمدة 24 شهراً عند التسليم.",
      ]
    : [
        "Notre équipe commerciale vous contactera pour finaliser la commande.",
        "Nous planifierons ensuite la livraison et/ou l'installation selon vos disponibilités.",
        "Une garantie de 24 mois sera activée dès la livraison.",
      ];
  const closing = isAr ? "شكراً لثقتكم." : "Merci de votre confiance.";
  const subject = isAr
    ? "تم قبول عرض السعر — شكراً لثقتكم"
    : "Devis accepté — merci de votre confiance";

  const stepsHtml = steps.map((s) => `                <li>${s}</li>`).join("\n");

  const inner =
    headerBlock(subtitle) +
    contentBlock(
      `              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">${h2}</h2>
              <p style="margin:0 0 12px;">${greeting}</p>
              <p style="margin:0 0 8px;">${body}</p>
` +
        infoBox([
          [lblNumero, escapeHtml(numero)],
          [lblMontant, formatDzd(devisData.montant_total)],
        ]) +
        `              <p style="margin:0 0 8px;">${stepsTitle}</p>
              <ul style="margin:0 0 16px;padding-left:20px;color:#1e293b;font-size:14px;line-height:1.8;">
${stepsHtml}
              </ul>
              <p style="margin:0 0 8px;">${closing}</p>
${contactFooter(lang)}`
    );

  const html = htmlShell(inner, lang);
  return await sendEmail({
    to: clientEmail,
    subject,
    html,
    replyTo: BRAND.email,
    template: "sendDevisAccepteEmail",
  });
}

// ----- Email #3: Commande créée (POST) -----
export async function sendCommandeCreatedEmail(
  clientEmail: string,
  clientName: string,
  commandeData: {
    numero?: string;
    date_commande?: string | null;
    date_livraison_prevue?: string | null;
  },
  lang: EmailLang = "fr"
): Promise<SendEmailResult> {
  const isAr = lang === "ar";
  const numero = commandeData.numero || "—";

  const subtitle = isAr
    ? "استيراد معدات طب الأسنان — وهران، الجزائر"
    : BRAND.taglineFr;
  const h2 = isAr ? "تأكيد الطلب 📦" : "Confirmation de commande 📦";
  const greeting = isAr
    ? `مرحباً ${escapeHtml(clientName)}،`
    : `Bonjour ${escapeHtml(clientName)},`;
  const body = isAr
    ? `لقد سجلنا طلبكم <strong>ODG #${escapeHtml(numero)}</strong>. إليكم المعلومات الرئيسية:`
    : `Nous avons bien enregistré votre commande <strong>ODG #${escapeHtml(numero)}</strong>. Voici les informations principales :`;
  const lblNumero = isAr ? "رقم الطلب" : "N° de commande";
  const lblDateCmd = isAr ? "تاريخ الطلب" : "Date de commande";
  const lblLivraison = isAr ? "تاريخ التسليم المتوقع" : "Livraison estimée";
  const closing = isAr
    ? "سيبقيكم فريقنا على اطلاع في كل مرحلة من مراحل تحضير وتسليم طلبكم."
    : "Notre équipe vous tiendra informé(e) à chaque étape de la préparation et de la livraison de votre commande.";
  const subject = isAr
    ? `تأكيد الطلب رقم #${numero}`
    : `Confirmation de commande #${numero}`;

  const inner =
    headerBlock(subtitle) +
    contentBlock(
      `              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">${h2}</h2>
              <p style="margin:0 0 12px;">${greeting}</p>
              <p style="margin:0 0 8px;">${body}</p>
` +
        infoBox([
          [lblNumero, escapeHtml(numero)],
          [lblDateCmd, formatDateFr(commandeData.date_commande, lang)],
          [lblLivraison, formatDateFr(commandeData.date_livraison_prevue, lang)],
        ]) +
        `              <p style="margin:0 0 8px;">${closing}</p>
${contactFooter(lang)}`
    );

  const html = htmlShell(inner, lang);
  return await sendEmail({
    to: clientEmail,
    subject,
    html,
    replyTo: BRAND.email,
    template: "sendCommandeCreatedEmail",
  });
}

// ----- Email #4: Commande statut → "livree" -----
export async function sendCommandeLivreeEmail(
  clientEmail: string,
  clientName: string,
  commandeData: {
    numero?: string;
    date_livraison_reelle?: string | null;
  },
  lang: EmailLang = "fr"
): Promise<SendEmailResult> {
  const isAr = lang === "ar";
  const numero = commandeData.numero || "—";
  // Garantie window: 24 months starting today.
  const today = new Date();
  const fin = new Date(today);
  fin.setMonth(fin.getMonth() + 24);
  const livraisonIso =
    commandeData.date_livraison_reelle || today.toISOString();

  const subtitle = isAr
    ? "استيراد معدات طب الأسنان — وهران، الجزائر"
    : BRAND.taglineFr;
  const h2 = isAr ? "تم تسليم الطلب ✅" : "Commande livrée ✅";
  const greeting = isAr
    ? `مرحباً ${escapeHtml(clientName)}،`
    : `Bonjour ${escapeHtml(clientName)},`;
  const body = isAr
    ? `تم تسليم طلبكم <strong>ODG #${escapeHtml(numero)}</strong>. نأمل أن يلبي المعدات توقعاتكم.`
    : `Votre commande <strong>ODG #${escapeHtml(numero)}</strong> a été livrée. Nous espérons que le matériel répond à vos attentes.`;
  const lblNumero = isAr ? "رقم الطلب" : "N° de commande";
  const lblDateLivraison = isAr ? "تاريخ التسليم" : "Date de livraison";
  const garantieTitle = isAr ? "<strong>الضمان:</strong>" : "<strong>Garantie :</strong>";
  const garantieBody = isAr
    ? `ضمان لمدة <strong>24 شهراً</strong> أصبح ساري المفعول على معداتكم. بدأ في <strong>${formatDateFr(today.toISOString(), lang)}</strong> وسينتهي في <strong>${formatDateFr(fin.toISOString(), lang)}</strong>.`
    : `une garantie de <strong>24 mois</strong> est désormais active sur votre matériel. Elle a débuté le <strong>${formatDateFr(today.toISOString(), lang)}</strong> et expirera le <strong>${formatDateFr(fin.toISOString(), lang)}</strong>.`;
  const closing = isAr
    ? "لأي مشكلة تقنية أو عيب أو سؤال حول المعدات المسلمة، لا تترددوا في الاتصال بنا — سننظم تدخلاً عند الحاجة."
    : "Pour tout problème technique, défaut ou question sur le matériel livré, n'hésitez pas à nous contacter — nous organiserons une intervention si nécessaire.";
  const subject = isAr
    ? `تم تسليم طلبكم رقم #${numero}`
    : `Votre commande #${numero} a été livrée`;

  const inner =
    headerBlock(subtitle) +
    contentBlock(
      `              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">${h2}</h2>
              <p style="margin:0 0 12px;">${greeting}</p>
              <p style="margin:0 0 8px;">${body}</p>
` +
        infoBox([
          [lblNumero, escapeHtml(numero)],
          [lblDateLivraison, formatDateFr(livraisonIso, lang)],
        ]) +
        `              <p style="margin:0 0 8px;">${garantieTitle} ${garantieBody}</p>
              <p style="margin:0 0 8px;">${closing}</p>
${contactFooter(lang)}`
    );

  const html = htmlShell(inner, lang);
  return await sendEmail({
    to: clientEmail,
    subject,
    html,
    replyTo: BRAND.email,
    template: "sendCommandeLivreeEmail",
  });
}

// ----- Email #5: Intervention créée / planifiée -----
export async function sendInterventionPlanifieeEmail(
  clientEmail: string,
  clientName: string,
  interventionData: {
    type?: string;
    date_prevue?: string | null;
    technicien_nom?: string | null;
    adresse_intervention?: string | null;
    duree_estimee_min?: number | string | null;
  },
  lang: EmailLang = "fr"
): Promise<SendEmailResult> {
  const isAr = lang === "ar";
  const typeLabel = isAr
    ? TYPE_INTERVENTION_LABELS_AR[interventionData.type || ""] ||
      interventionData.type ||
      "موعد"
    : TYPE_INTERVENTION_LABELS[interventionData.type || ""] ||
      interventionData.type ||
      "Rendez-vous";
  const dateStr = formatDateTimeFr(interventionData.date_prevue, lang);
  const dureeNum = Number(interventionData.duree_estimee_min);
  const duree = Number.isFinite(dureeNum) && dureeNum > 0
    ? `${dureeNum} ${isAr ? "دقيقة" : "min"}`
    : "—";

  const subtitle = isAr
    ? "استيراد معدات طب الأسنان — وهران، الجزائر"
    : BRAND.taglineFr;
  const h2 = isAr ? "تم جدولة موعد 📅" : "Rendez-vous planifié 📅";
  const greeting = isAr
    ? `مرحباً ${escapeHtml(clientName)}،`
    : `Bonjour ${escapeHtml(clientName)},`;
  const body = isAr
    ? "تم جدولة موعد في مقركم من طرف مجموعة أوضاح لطب الأسنان. إليكم التفاصيل:"
    : "Un rendez-vous a été planifié chez vous par OUADAH DENTAL GROUPE. En voici les détails :";
  const lblType = isAr ? "نوع التدخل" : "Type d'intervention";
  const lblDate = isAr ? "التاريخ والوقت" : "Date et heure";
  const lblTechnicien = isAr ? "الفني" : "Technicien";
  const lblAdresse = isAr ? "العنوان" : "Adresse";
  const lblDuree = isAr ? "المدة المقدرة" : "Durée estimée";
  const prepareTitle = isAr ? "<strong>تحضير فضائكم:</strong>" : "<strong>Préparez votre espace :</strong>";
  const prepareBody = isAr
    ? "يرجى إخلاء منطقة التدخل والتأكد من إمكانية الوصول إلى المعدات المعنية. سيصل الفني في الوقت المحدد."
    : "merci de dégager la zone d'intervention et de vous assurer que l'accès au matériel concerné est possible. Notre technicien arrivera à l'heure prévue.";
  const subject = isAr
    ? `موعد مجدول: ${typeLabel} في ${dateStr}`
    : `RDV planifié : ${typeLabel} le ${dateStr}`;

  const inner =
    headerBlock(subtitle) +
    contentBlock(
      `              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">${h2}</h2>
              <p style="margin:0 0 12px;">${greeting}</p>
              <p style="margin:0 0 8px;">${body}</p>
` +
        infoBox([
          [lblType, escapeHtml(typeLabel)],
          [lblDate, escapeHtml(dateStr)],
          [lblTechnicien, escapeHtml(interventionData.technicien_nom || "—")],
          [lblAdresse, escapeHtml(interventionData.adresse_intervention || "—")],
          [lblDuree, escapeHtml(duree)],
        ]) +
        `              <p style="margin:0 0 8px;">${prepareTitle} ${prepareBody}</p>
${contactFooter(lang)}`
    );

  const html = htmlShell(inner, lang);
  return await sendEmail({
    to: clientEmail,
    subject,
    html,
    replyTo: BRAND.email,
    template: "sendInterventionPlanifieeEmail",
  });
}

// ----- Email #6: Intervention statut → "termine" -----
export async function sendInterventionTermineeEmail(
  clientEmail: string,
  clientName: string,
  interventionData: {
    type?: string;
    rapport?: string | null;
    date_realisee?: string | null;
  },
  lang: EmailLang = "fr"
): Promise<SendEmailResult> {
  const isAr = lang === "ar";
  const typeLabel = isAr
    ? TYPE_INTERVENTION_LABELS_AR[interventionData.type || ""] ||
      interventionData.type ||
      "تدخل"
    : TYPE_INTERVENTION_LABELS[interventionData.type || ""] ||
      interventionData.type ||
      "Intervention";

  const subtitle = isAr
    ? "استيراد معدات طب الأسنان — وهران، الجزائر"
    : BRAND.taglineFr;
  const h2 = isAr ? "تم إنهاء التدخل ✅" : "Intervention terminée ✅";
  const greeting = isAr
    ? `مرحباً ${escapeHtml(clientName)}،`
    : `Bonjour ${escapeHtml(clientName)},`;
  const bodyPrefix = isAr
    ? `تدخل نوع <strong>${escapeHtml(typeLabel)}</strong> المبرمج في مقركم قد اكتمل`
    : `L'intervention de type <strong>${escapeHtml(typeLabel)}</strong> programmée chez vous est à présent terminée`;
  const bodySuffix = interventionData.date_realisee
    ? isAr
      ? ` (أُنجز في ${formatDateFr(interventionData.date_realisee, lang)}).`
      : ` (réalisée le ${formatDateFr(interventionData.date_realisee, lang)}).`
    : ".";
  const rapportTitle = isAr ? "تقرير التدخل:" : "Rapport d'intervention :";
  const rapportFallback = isAr
    ? "لا يوجد تقرير مسجل."
    : "Aucun rapport renseigné.";
  const closing = isAr
    ? "يسعدنا أن نحصل على رأيكم حول هذا التدخل. لأي ملاحظة أو طلب إضافي، لا تترددوا في الاتصال بنا."
    : "Nous serions ravis d'avoir votre retour sur cette intervention. Pour toute remarque ou demande complémentaire, n'hésitez pas à nous contacter.";
  const subject = isAr ? "انتهاء التدخل — تقرير" : "Intervention terminée — rapport";

  const inner =
    headerBlock(subtitle) +
    contentBlock(
      `              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">${h2}</h2>
              <p style="margin:0 0 12px;">${greeting}</p>
              <p style="margin:0 0 8px;">${bodyPrefix}${bodySuffix}</p>
              <p style="margin:16px 0 6px;font-weight:bold;color:#0f172a;">${rapportTitle}</p>
              <div style="background:#f8fafc;border-left:3px solid ${BRAND.color};padding:12px 14px;font-size:14px;color:#1e293b;border-radius:4px;white-space:pre-wrap;">
                ${escapeHtml(interventionData.rapport || rapportFallback)}
              </div>
              <p style="margin:16px 0 8px;">${closing}</p>
${contactFooter(lang)}`
    );

  const html = htmlShell(inner, lang);
  return await sendEmail({
    to: clientEmail,
    subject,
    html,
    replyTo: BRAND.email,
    template: "sendInterventionTermineeEmail",
  });
}

// ============================================================
// CRM time-based reminder templates (Tier 2 — cron-triggered)
// Task EMAIL-V2
// ============================================================
// These 4 functions are invoked by /api/cron/reminders (daily cron,
// protected by CRON_SECRET). Each corresponds to one of the 4 time
// windows defined in the spec. The cron route is responsible for:
//   - querying Supabase within the right 1-day-wide window
//   - resolving the recipient's email
//   - wrapping each call in try/catch so SMTP failures never break
//     the cron response
//
// To avoid duplicate reminders without a `last_reminder_sent` column,
// each reminder uses a 1-day-wide window (e.g. for #7: between 23h
// and 25h before the intervention). The cron runs once a day → each
// row matches at most one run.
// ============================================================

// ----- Email #7: Rappel intervention 24h avant (cron) -----
// Trigger: intervention with date_prevue in [now+23h, now+25h] AND
// statut='planifie'. Sent to the client.
export async function sendRappelInterventionEmail(
  clientEmail: string,
  clientName: string,
  interventionData: {
    type?: string;
    date_prevue?: string | null;
    technicien_nom?: string | null;
    adresse_intervention?: string | null;
  }
): Promise<SendEmailResult> {
  const typeLabel =
    TYPE_INTERVENTION_LABELS[interventionData.type || ""] ||
    interventionData.type ||
    "Rendez-vous";
  const dateStr = formatDateTimeFr(interventionData.date_prevue);

  const inner =
    headerBlock(BRAND.taglineFr) +
    contentBlock(
      `              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">Rappel : rendez-vous demain 📅</h2>
              <p style="margin:0 0 12px;">Bonjour ${escapeHtml(clientName)},</p>
              <p style="margin:0 0 8px;">Petit rappel : nous avons rendez-vous <strong>demain</strong> avec vous. Voici les détails :</p>
` +
        infoBox([
          ["Type d'intervention", escapeHtml(typeLabel)],
          ["Date et heure", escapeHtml(dateStr)],
          ["Technicien", escapeHtml(interventionData.technicien_nom || "—")],
          ["Adresse", escapeHtml(interventionData.adresse_intervention || "—")],
        ]) +
        `              <p style="margin:0 0 8px;"><strong>À demain !</strong> Merci de préparer l'espace d'intervention et de vous assurer que l'accès au matériel concerné est possible.</p>
              <p style="margin:0 0 8px;">En cas d'imprévu ou pour reporter, contactez-nous au plus vite.</p>
${contactFooter()}`
    );

  const html = htmlShell(inner);
  return await sendEmail({
    to: clientEmail,
    subject: "Rappel : votre RDV ODG demain",
    html,
    replyTo: BRAND.email,
    template: "sendRappelInterventionEmail",
  });
}

// ----- Email #8: Rappel maintenance préventive à venir (cron) -----
// Trigger: maintenance (type='preventive') with date_prevue in
// [now+6d, now+8d] AND statut='planifie'. Sent to the client.
export async function sendRappelMaintenanceEmail(
  clientEmail: string,
  clientName: string,
  maintenanceData: {
    date_prevue?: string | null;
    produit_nom?: string | null;
    description?: string | null;
  }
): Promise<SendEmailResult> {
  const dateStr = formatDateFr(maintenanceData.date_prevue);
  const produit = maintenanceData.produit_nom || "Votre matériel";

  const inner =
    headerBlock(BRAND.taglineFr) +
    contentBlock(
      `              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">Entretien à venir 🛠️</h2>
              <p style="margin:0 0 12px;">Bonjour ${escapeHtml(clientName)},</p>
              <p style="margin:0 0 8px;">Un entretien préventif est planifié sur <strong>${escapeHtml(produit)}</strong> dans les prochains jours. Voici les informations :</p>
` +
        infoBox([
          ["Date prévue", escapeHtml(dateStr)],
          ["Matériel concerné", escapeHtml(produit)],
          [
            "Description",
            escapeHtml(maintenanceData.description || "Entretien préventif programmé."),
          ],
        ]) +
        `              <p style="margin:0 0 8px;">Cet entretien permet de prolonger la durée de vie de votre matériel et d'éviter les pannes. <strong>Pour reporter si besoin</strong>, merci de nous contacter rapidement afin que nous puissions réorganiser le passage du technicien.</p>
${contactFooter()}`
    );

  const html = htmlShell(inner);
  return await sendEmail({
    to: clientEmail,
    subject: "Rappel : entretien à venir",
    html,
    replyTo: BRAND.email,
    template: "sendRappelMaintenanceEmail",
  });
}

// ----- Email #9: Expiration garantie à 30 jours (cron) -----
// Trigger: garantie with date_fin in [now+29d, now+31d] AND actif=true.
// Sent to the client. Offers renewal / extension.
export async function sendGarantieExpirationEmail(
  clientEmail: string,
  clientName: string,
  garantieData: {
    produit_nom?: string | null;
    date_fin?: string | null;
    date_debut?: string | null;
    duree_mois?: number | string | null;
  }
): Promise<SendEmailResult> {
  const dateFinStr = formatDateFr(garantieData.date_fin);
  const produit = garantieData.produit_nom || "votre matériel";
  const dureeNum = Number(garantieData.duree_mois);

  const inner =
    headerBlock(BRAND.taglineFr) +
    contentBlock(
      `              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">Votre garantie expire bientôt ⏳</h2>
              <p style="margin:0 0 12px;">Bonjour ${escapeHtml(clientName)},</p>
              <p style="margin:0 0 8px;">Nous vous informons que la garantie sur <strong>${escapeHtml(produit)}</strong> arrive à échéance dans environ 30 jours.</p>
` +
        infoBox([
          ["Matériel", escapeHtml(produit)],
          ["Date de fin de garantie", escapeHtml(dateFinStr)],
          ...(garantieData.date_debut
            ? ([["Date de début", formatDateFr(garantieData.date_debut)]] as [string, string][])
            : ([] as [string, string][])),
          [
            "Durée initiale",
            Number.isFinite(dureeNum) && dureeNum > 0
              ? `${dureeNum} mois`
              : "—",
          ],
        ]) +
        `              <p style="margin:0 0 8px;">Pour continuer à bénéficier d'une couverture optimale et de notre service après-vente, nous vous proposons :</p>
              <ul style="margin:0 0 16px;padding-left:20px;color:#1e293b;font-size:14px;line-height:1.8;">
                <li><strong>Renouvellement</strong> de votre garantie pour une nouvelle période.</li>
                <li><strong>Extension</strong> avec de nouvelles options (maintenance préventive, pièces prioritaires...).</li>
                <li>Un <strong>contrat de maintenance</strong> sur mesure adapté à votre utilisation.</li>
              </ul>
              <p style="margin:0 0 8px;">Contactez-nous dès que possible pour étudier ensemble la meilleure option.</p>
${contactFooter()}`
    );

  const html = htmlShell(inner);
  return await sendEmail({
    to: clientEmail,
    subject: "Votre garantie expire bientôt",
    html,
    replyTo: BRAND.email,
    template: "sendGarantieExpirationEmail",
  });
}

// ----- Email #10: Alerte maintenance en retard → admin (cron) -----
// Trigger: maintenance with date_prevue in [now-9d, now-7d] AND
// statut NOT IN ('termine','annule'). Sent to EMAIL_TO (admin inbox).
// Uses the amber-themed headerBlockWarning for visual differentiation.
export async function sendMaintenanceRetardAlertEmail(
  adminEmail: string,
  maintenanceData: {
    id?: string;
    type?: string;
    date_prevue?: string | null;
    produit_nom?: string | null;
    client_nom?: string | null;
    description?: string | null;
    statut?: string | null;
  }
): Promise<SendEmailResult> {
  const dateStr = formatDateFr(maintenanceData.date_prevue);
  const produit = maintenanceData.produit_nom || "Matériel non précisé";
  const client = maintenanceData.client_nom || "Client inconnu";
  const typeLabel =
    maintenanceData.type === "curative"
      ? "Curative"
      : maintenanceData.type === "preventive"
      ? "Préventive"
      : maintenanceData.type || "—";

  const inner =
    headerBlockWarning("Alerte : maintenance en retard") +
    contentBlock(
      `              <h2 style="color:${BRAND.warn};margin:0 0 12px;font-size:19px;">⚠️ Maintenance non réalisée</h2>
              <p style="margin:0 0 8px;">Une maintenance planifiée n'a pas été réalisée dans le délai imparti (plus de 7 jours de retard). Merci de planifier une intervention curative dans les meilleurs délais.</p>
` +
        infoBox([
          ["Client", escapeHtml(client)],
          ["Matériel concerné", escapeHtml(produit)],
          ["Type de maintenance", escapeHtml(typeLabel)],
          ["Date prévue", escapeHtml(dateStr)],
          ["Statut actuel", escapeHtml(maintenanceData.statut || "—")],
          ...(maintenanceData.id
            ? ([["ID maintenance", escapeHtml(String(maintenanceData.id))]] as [string, string][])
            : ([] as [string, string][])),
        ]) +
        `              <p style="margin:16px 0 6px;font-weight:bold;color:#0f172a;">Description :</p>
              <div style="background:${BRAND.warnLight};border-left:3px solid ${BRAND.warn};padding:10px 14px;font-size:14px;color:#1e293b;border-radius:4px;white-space:pre-wrap;">
                ${escapeHtml(maintenanceData.description || "—")}
              </div>
              <p style="margin:18px 0 0;font-size:13px;color:#64748b;">
                Connectez-vous à l'interface admin pour planifier une intervention curative et avertir le client.
              </p>`
    );

  const html = htmlShell(inner);
  return await sendEmail({
    to: adminEmail,
    subject: "⚠️ Maintenance en retard",
    html,
    replyTo: BRAND.email,
    template: "sendMaintenanceRetardAlertEmail",
  });
}

// ============================================================
// Newsletter unsubscribe confirmation (#13 — Loi 18-07 compliance)
// Task EMAIL-V2
// ============================================================
// Sent to a subscriber AFTER they've been removed from the
// `newsletter_subscribers` table (i.e. after the unsubscribe API
// succeeded). Confirms the action + tells them how to resubscribe
// if it was a mistake. Uses the standard teal header (informational,
// not an alert).
//
// The unsubscribe link is intentionally NOT included here — they
// just unsubscribed, no need to show another "Se désinscrire" link.
// ============================================================
export async function sendUnsubscribeConfirmation(
  clientEmail: string
): Promise<SendEmailResult> {
  const inner =
    headerBlock(BRAND.taglineFr) +
    contentBlock(
      `              <h2 style="color:${BRAND.color};margin:0 0 12px;font-size:19px;">Désinscription confirmée ✅</h2>
              <p style="margin:0 0 12px;">Bonjour,</p>
              <p style="margin:0 0 12px;">Nous confirmons que vous avez été <strong>désinscrit(e)</strong> de la newsletter d'<strong>OUADAH DENTAL GROUPE</strong>. Vous ne recevrez plus d'emails de notre part à cette adresse.</p>
              <p style="margin:0 0 12px;">Si cette action était une erreur, ou si vous changez d'avis, vous pouvez à tout moment vous réinscrire depuis le formulaire de newsletter en bas de notre site.</p>
              <p style="margin:0 0 8px;">Merci de votre intérêt pour ODG.</p>
${contactFooter()}`
    );

  const html = htmlShell(inner);
  return await sendEmail({
    to: clientEmail,
    subject: "Désinscription confirmée — OUADAH DENTAL GROUPE",
    html,
    replyTo: BRAND.email,
    template: "sendUnsubscribeConfirmation",
  });
}

// ============================================================
// English-named aliases (Task EMAIL-V2 spec compliance)
// ============================================================
// The task spec lists the 4 reminder functions under English names
// (`sendInterventionReminder24h`, `sendMaintenanceReminder7d`,
// `sendGarantieExpiryWarning`, `sendMaintenanceOverdueAlert`).
// The implementation above uses French names for consistency with
// the rest of email.ts (sendDevisValideEmail, etc.). These aliases
// re-export the French implementations under the English names so
// both naming conventions work — the cron route can import either.
export const sendInterventionReminder24h = sendRappelInterventionEmail;
export const sendMaintenanceReminder7d = sendRappelMaintenanceEmail;
export const sendGarantieExpiryWarning = sendGarantieExpirationEmail;
export const sendMaintenanceOverdueAlert = sendMaintenanceRetardAlertEmail;
