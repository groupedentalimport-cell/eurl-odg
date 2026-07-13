import { z } from "zod";

/**
 * Centralised, validated environment access.
 *
 * WHY: before this file, every module read `process.env.X || "default"`.
 * A typo in `SMTP_USER` silently disabled all email; `CRON_SECRET` unset
 * meant the cron ran unprotected; `ADMIN_SECRET` unset fell back to a
 * hardcoded dev secret. This module fails fast at boot in production
 * and exposes a single typed `env` object for the rest of the app.
 *
 * Usage:
 *   import { env } from "@/lib/env";
 *   const url = env.SUPABASE_URL;
 *
 * In dev (NODE_ENV !== "production"), missing server secrets fall back
 * to a clearly-named dev value and emit a console.warn — the app stays
 * runnable for `next dev`. In production, a missing server secret
 * throws at first access (lazy: we don't crash the build, only the
 * request that needs the secret).
 */

const booleanString = z
  .string()
  .optional()
  .transform((v) => v === "1" || v === "true");

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .default("https://ouadah-dental-groupe.vercel.app"),

  // ---- Supabase ----
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // ---- Auth secrets ----
  ADMIN_SECRET: z.string().min(16),
  ADMIN_PASSWORD: z.string().optional(), // optional: only used to bootstrap the first super-admin
  CLIENT_SECRET: z.string().min(16),
  CRON_SECRET: z.string().min(16),

  // ---- SMTP ----
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().min(1),

  // ---- Z.AI chatbot ----
  ZAI_API_KEY: z.string().min(1),

  // ---- Misc ----
  REVALIDATE_TOKEN: z.string().optional(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const isProd = process.env.NODE_ENV === "production";

function loadServer() {
  const parsed = serverSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;

  // Dev fallback: fill missing server secrets with clearly-named dev values
  // so `next dev` stays runnable without a .env.local. In production we
  // hard-fail on first access (lazy throw via the Proxy below).
  if (isProd) {
    const missing = parsed.error.issues
      .map((i) => i.path.join("."))
      .join(", ");
    throw new Error(
      `[env] Missing required server env vars in production: ${missing}. ` +
        `Configure them in your hosting provider (Vercel → Project → Settings → Environment Variables).`
    );
  }

  console.warn(
    "[env] Missing server env vars in dev — using dev fallbacks:",
    parsed.error.issues.map((i) => i.path.join(".")).join(", ")
  );
  const dev = { ...process.env } as Record<string, string>;
  return serverSchema.parse({
    NODE_ENV: "development",
    NEXT_PUBLIC_SITE_URL:
      dev.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL:
      dev.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      dev.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dev-anon-key",
    SUPABASE_SERVICE_ROLE_KEY:
      dev.SUPABASE_SERVICE_ROLE_KEY || "dev-service-role-key",
    ADMIN_SECRET: dev.ADMIN_SECRET || "dev-admin-secret-min-16-chars",
    CLIENT_SECRET: dev.CLIENT_SECRET || "dev-client-secret-min-16-chars",
    CRON_SECRET: dev.CRON_SECRET || "dev-cron-secret-min-16-chars",
    SMTP_HOST: dev.SMTP_HOST || "localhost",
    SMTP_PORT: dev.SMTP_PORT || "1025",
    SMTP_USER: dev.SMTP_USER || "dev",
    SMTP_PASS: dev.SMTP_PASS || "dev",
    SMTP_FROM: dev.SMTP_FROM || "dev@localhost",
    ZAI_API_KEY: dev.ZAI_API_KEY || "dev-zai-key",
  });
}

function loadPublic() {
  const parsed = publicSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;
  if (isProd) {
    throw new Error(
      "[env] Missing required public env vars: " +
        parsed.error.issues.map((i) => i.path.join(".")).join(", ")
    );
  }
  return {
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dev-anon-key",
  };
}

/**
 * `serverEnv` is validated lazily — the first access triggers parsing.
 * This means a missing secret in production doesn't crash `next build`
 * (which doesn't access env), only the runtime request that needs it.
 */
export const serverEnv = new Proxy({} as z.infer<typeof serverSchema>, {
  get(_t, prop: string) {
    const data = loadServer();
    return data[prop as keyof typeof data];
  },
});

export const publicEnv = loadPublic();

/** Convenience: site URL without trailing slash. */
export const SITE_URL = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

/** True when running on Vercel production. */
export const isProduction = isProd;
