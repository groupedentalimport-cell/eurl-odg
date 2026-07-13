import { z } from "zod";

/**
 * Shared input-validation primitives.
 *
 * WHY: the regex `EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/` was
 * redefined in 8 route files with subtle variations (some anchored,
 * some not). Worse, every route hand-rolled its own validation even
 * though `zod` was a declared dependency but never used.
 *
 * Now every route imports `emailSchema`, `phoneSchema`, etc. — a
 * single source of truth.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine((v) => EMAIL_RE.test(v), {
    message: "Adresse email invalide.",
  });

export const phoneSchema = z
  .string()
  .trim()
  .max(32)
  .refine((v) => /^[+()\d\s-]{6,}$/.test(v), {
    message: "Numéro de téléphone invalide.",
  });

/** Wilaya (algerian province) — 58 codes published by the Algerian state. */
export const wilayaSchema = z
  .string()
  .trim()
  .max(60)
  .optional()
  .or(z.literal(""));

/** Non-empty short text (titles, names, slugs). */
export const shortTextSchema = (max = 120) =>
  z.string().trim().min(1).max(max);

/** Long-form text (descriptions, notes, messages). */
export const longTextSchema = (max = 10_000) =>
  z.string().trim().min(1).max(max);

/** UUID v4. */
export const uuidSchema = z
  .string()
  .uuid("Identifiant invalide.");

/** Positive integer. */
export const positiveIntSchema = z
  .number()
  .int()
  .positive()
  .or(z.string().regex(/^\d+$/).transform(Number));

/** ISO date string (YYYY-MM-DD). */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (format attendu: YYYY-MM-DD).");

/** Slugs: kebab-case, 1-80 chars. */
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, "Slug invalide (minuscules, chiffres, tirets).")
  .min(1)
  .max(80);

/**
 * Wraps an async route handler with a zod-parsed JSON body. On
 * validation failure returns 400 with the flattened errors.
 *
 *   export const POST = withBody(contactSchema, async (req, body) => {
 *     ...
 *     return NextResponse.json({ ok: true });
 *   });
 */
export function withBody<S extends z.ZodTypeAny, R>(
  schema: S,
  handler: (
    req: Request,
    body: z.infer<S>
  ) => Promise<R> | R
): (req: Request) => Promise<R> {
  return async (req: Request) => {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide." },
        { status: 400 }
      ) as unknown as R;
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation échouée.",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      ) as unknown as R;
    }
    return handler(req, parsed.data);
  };
}

// Re-export NextResponse so wrappers don't need a second import.
import { NextResponse } from "next/server";
