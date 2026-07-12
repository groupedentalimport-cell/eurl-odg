import { z } from "zod";
import {
  emailSchema,
  phoneSchema,
  shortTextSchema,
  longTextSchema,
  uuidSchema,
  positiveIntSchema,
} from "../validation";

/**
 * Zod schemas for every API request body.
 *
 * WHY: the audit (§2.1) found that `zod` was declared as a dependency
 * but had ZERO usages in `src/`. Every route hand-rolled validation
 * with inconsistent regex and length checks. This file is the single
 * source of truth for resource shapes — routes consume them via the
 * `withBody(schema, handler)` HOF.
 */

// ---- Contact form (/api/contact) ----
// Field names match the existing frontend (HomePage ContactForm, etc.)
// and the `messages` table columns.
export const contactSchema = z.object({
  name: shortTextSchema(120),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  subject: shortTextSchema(200),
  body: longTextSchema(5000),
  /** Optional honeypot field — must be empty. */
  website: z.string().max(0).optional().or(z.literal("")),
});

// ---- Quote request (/api/quotes) ----
export const quoteItemSchema = z.object({
  produit_id: uuidSchema.optional(),
  nom: shortTextSchema(200),
  reference: shortTextSchema(80).optional().or(z.literal("")),
  qte: positiveIntSchema,
  prix_unitaire: z.number().nonnegative().optional(),
  duree_garantie: z.number().int().nonnegative().optional(),
});

export const quoteSchema = z.object({
  nom: shortTextSchema(120),
  email: emailSchema,
  telephone: phoneSchema,
  wilaya: shortTextSchema(60).optional().or(z.literal("")),
  message: longTextSchema(3000).optional().or(z.literal("")),
  lignes: z.array(quoteItemSchema).min(1).max(50),
  website: z.string().max(0).optional().or(z.literal("")),
});

// ---- Newsletter (/api/newsletter) ----
export const newsletterSubscribeSchema = z.object({
  email: emailSchema,
  langue: z.enum(["fr", "ar"]).optional(),
  website: z.string().max(0).optional().or(z.literal("")),
});

export const newsletterUnsubscribeSchema = z.object({
  token: z.string().min(10),
});

// ---- Admin login (/api/admin/login) ----
export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

// ---- Client login — phone-last-4 (/api/client/login) ----
export const clientLoginSchema = z.object({
  email: emailSchema,
  phoneLast4: z.string().regex(/^\d{4}$/, "Code à 4 chiffres requis."),
});

// ---- Client portal — magic-link request (/api/client-portal/login) ----
export const clientPortalLoginSchema = z.object({
  email: emailSchema,
});

// ---- Client portal — magic-link verify (/api/client-portal/verify) ----
export const clientPortalVerifySchema = z.object({
  token: z.string().min(10).max(2000),
});

// ---- Live chat — send a message (/api/chat-live) ----
export const chatLiveSchema = z.object({
  action: z.enum(["start", "message", "poll", "close", "offline"]),
  conversationId: z.string().optional(),
  visitorName: shortTextSchema(80).optional().or(z.literal("")),
  visitorEmail: emailSchema.optional().or(z.literal("")),
  message: longTextSchema(2000).optional().or(z.literal("")),
  subject: shortTextSchema(200).optional().or(z.literal("")),
});

// ---- Admin products (/api/admin/products) ----
export const productCreateSchema = z.object({
  nom_fr: shortTextSchema(200),
  nom_ar: shortTextSchema(200).optional().or(z.literal("")),
  slug: shortTextSchema(80),
  reference: shortTextSchema(80).optional().or(z.literal("")),
  description_fr: longTextSchema(5000).optional().or(z.literal("")),
  description_ar: longTextSchema(5000).optional().or(z.literal("")),
  prix: z.number().nonnegative(),
  categorie_id: uuidSchema.optional(),
  image: z.string().max(500).optional().or(z.literal("")),
  disponible: z.boolean().optional().default(true),
  marques: z.array(z.string()).optional().default([]),
  specs: z.record(z.string(), z.string()).optional().default({}),
});

// ---- Admin devis (/api/admin/devis) ----
export const devisCreateSchema = z.object({
  client_id: uuidSchema.optional(),
  client_snapshot: z
    .object({
      nom: shortTextSchema(120),
      email: emailSchema.optional().or(z.literal("")),
      telephone: phoneSchema.optional().or(z.literal("")),
      wilaya: shortTextSchema(60).optional().or(z.literal("")),
      type_client: shortTextSchema(40).optional().or(z.literal("")),
    })
    .optional(),
  lignes: z.array(quoteItemSchema).min(1).max(50),
  notes: longTextSchema(3000).optional().or(z.literal("")),
  statut: z
    .enum(["brouillon", "envoye", "accepte", "refuse", "expire"])
    .optional()
    .default("brouillon"),
});

export const devisUpdateSchema = z.object({
  statut: z
    .enum(["brouillon", "envoye", "accepte", "refuse", "expire"])
    .optional(),
  lignes: z.array(quoteItemSchema).max(50).optional(),
  notes: longTextSchema(3000).optional().or(z.literal("")),
  commercial_id: uuidSchema.nullable().optional(),
});

// ---- Admin admin-users (/api/admin/admin-users) ----
export const adminUserCreateSchema = z.object({
  email: emailSchema,
  full_name: shortTextSchema(120),
  role: z.enum([
    "super_admin",
    "manager",
    "commercial",
    "technician",
    "editor",
    "accountant",
  ]),
  password: z.string().min(8).max(200),
  active: z.boolean().optional().default(true),
});

export const adminUserUpdateSchema = adminUserCreateSchema
  .partial()
  .extend({ id: uuidSchema });

// ---- Settings (/api/admin/settings) ----
export const settingsUpsertSchema = z.object({
  key: shortTextSchema(80),
  value_fr: z.string().max(10_000).optional().or(z.literal("")),
  value_ar: z.string().max(10_000).optional().or(z.literal("")),
  value_json: z.unknown().optional(),
  category: shortTextSchema(40),
  label: shortTextSchema(120).optional().or(z.literal("")),
  type: z.enum(["text", "textarea", "image", "json", "array"]).optional(),
});
