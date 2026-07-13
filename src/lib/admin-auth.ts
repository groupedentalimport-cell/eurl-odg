import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { getServerClient } from "./supabase";
import { serverEnv } from "./env";
import { signToken, verifyToken, base64urlEncode, base64urlDecode } from "./auth/jwt";
import { parseCookies, sessionCookieOptions } from "./auth/cookies";

// ============================================================
// Multi-role admin authentication (server-side only)
// ============================================================
// 6 roles: super_admin | manager | commercial | technician | editor | accountant
// Sessions are httpOnly cookies containing an HMAC-signed token.
// The token payload includes userId + role + issuedAt.
// The actual user record (email, full_name, role, password_hash, salt)
// lives in the `admin_users` Supabase table.
//
// REFACTOR (refactor/total):
//   - Removed the hardcoded backdoor (audit §2.2). The fallback
//     `admin@odg.dz / odg-admin-2026` super-admin login no longer
//     exists — a real `admin_users` row is required.
//   - Per-row random salt (audit §2.2). The `PASSWORD_SALT` constant
//     is gone; each row stores its own `salt` alongside `password_hash`.
//   - Secrets come from `serverEnv.ADMIN_SECRET` (validated in lib/env.ts).
//   - JWT sign/verify delegated to `lib/auth/jwt.ts`.
//   - Cookie parsing delegated to `lib/auth/cookies.ts`.
// ============================================================

export type AdminRole =
  | "super_admin"
  | "manager"
  | "commercial"
  | "technician"
  | "editor"
  | "accountant";

export const ALL_ROLES: AdminRole[] = [
  "super_admin",
  "manager",
  "commercial",
  "technician",
  "editor",
  "accountant",
];

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  active: boolean;
}

export interface SessionPayload {
  userId: string;
  role: AdminRole;
  issuedAt: number;
}

export const ADMIN_COOKIE_NAME = "odg_admin";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24; // 24h

function adminSecret(): string {
  // serverEnv throws if ADMIN_SECRET is missing in production (see lib/env.ts).
  return serverEnv.ADMIN_SECRET;
}

// ---- Password hashing (scrypt + per-row salt, with bcrypt fallback) ----
/**
 * Generate a 16-byte random salt (hex-encoded, 32 chars).
 * Stored in `admin_users.salt` alongside `password_hash`.
 */
export function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Hash a password with `salt` using scrypt. Returns hex-encoded 64-byte hash.
 *
 * Used for all NEW admin accounts created via the admin UI
 * (/api/admin/admin-users POST/PATCH). The salt is per-row random.
 */
export function hashPassword(plain: string, salt: string): string {
  if (!salt) throw new Error("hashPassword: salt is required (per-row).");
  return scryptSync(plain, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
}

/**
 * Detect bcrypt hash format. bcrypt hashes start with $2a$, $2b$, or $2y$.
 * Used to support legacy accounts migrated via SQL (where scrypt is not
 * available in PL/pgSQL — we use pgcrypto's crypt() with gen_salt('bf')).
 */
function isBcryptHash(hash: string): boolean {
  return /^\$2[aby]\$\d{2}\$.{53}$/.test(hash);
}

/**
 * Verify a password against a stored hash. Supports TWO hash formats:
 *
 *   1. bcrypt ($2a$10$... / $2b$10$... / $2y$10$...) — used by accounts
 *      migrated via SQL using `crypt(password, gen_salt('bf', 10))`.
 *      The `salt` column is IGNORED for bcrypt (the salt is embedded
 *      in the hash itself).
 *
 *   2. scrypt hex (128-char hex string) — used by accounts created
 *      via the admin UI (/api/admin/admin-users). The `salt` column
 *      is required and used as the scrypt salt.
 *
 * This dual-format support preserves backward compatibility with
 * the 6 pre-refonte admin accounts (audit §2.2) that were re-hashed
 * in bcrypt via the supabase-rehash-admins.sql script.
 *
 * NOTE: bcryptjs v3 returns Promise<boolean> from compare(). The
 * function is async accordingly.
 */
export async function verifyPassword(
  plain: string,
  hash: string,
  salt: string
): Promise<boolean> {
  try {
    if (!hash) return false;

    // Format 1: bcrypt
    if (isBcryptHash(hash)) {
      return await bcrypt.compare(plain, hash);
    }

    // Format 2: scrypt (requires per-row salt)
    if (!salt) return false;
    const computed = hashPassword(plain, salt);
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---- Session token signing (delegated to lib/auth/jwt.ts) ----
export function createSessionToken(userId: string, role: AdminRole): string {
  const payload = base64urlEncode(
    JSON.stringify({ userId, role, issuedAt: Math.floor(Date.now() / 1000) })
  );
  return signToken(payload, adminSecret());
}

function decodeAdminPayload(payload: string): SessionPayload | null {
  try {
    const data = JSON.parse(base64urlDecode(payload)) as SessionPayload;
    if (!data.userId || !data.role) return null;
    if (!ALL_ROLES.includes(data.role)) return null;
    const now = Math.floor(Date.now() / 1000);
    if (now - (data.issuedAt || 0) > ADMIN_SESSION_MAX_AGE) return null;
    return data;
  } catch {
    return null;
  }
}

// ---- Cookie helpers ----
export function getCookieOptions() {
  return sessionCookieOptions(ADMIN_SESSION_MAX_AGE);
}

// ---- Request verification ----
/**
 * Verify the admin session cookie. Returns the SessionPayload (with role)
 * if valid, otherwise null. Replaces the deleted `parseCookies` local copy.
 */
export function verifyAdmin(request: Request): SessionPayload | null {
  const cookies = parseCookies(request);
  return verifyToken(cookies[ADMIN_COOKIE_NAME], adminSecret(), decodeAdminPayload);
}

/**
 * Require a specific set of roles. Returns the SessionPayload if the user
 * has one of the allowed roles, otherwise null (caller should return 403).
 * `super_admin` always passes.
 *
 * Pairs with the centralised permission matrix in `lib/auth/permissions.ts`:
 *
 *   import { PERMISSIONS } from "@/lib/auth/permissions";
 *   const session = requireRole(req, PERMISSIONS.products);
 *   if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 */
export function requireRole(
  request: Request,
  allowedRoles: AdminRole[]
): SessionPayload | null {
  const session = verifyAdmin(request);
  if (!session) return null;
  if (session.role === "super_admin") return session; // bypass
  if (!allowedRoles.includes(session.role)) return null;
  return session;
}

// ---- Admin user lookup (DB) ----
export async function findAdminUserByEmail(email: string): Promise<AdminUser | null> {
  let client;
  try {
    client = getServerClient();
  } catch {
    return null;
  }
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("admin_users")
      .select("id, email, full_name, role, active")
      .eq("email", email.toLowerCase().trim())
      .eq("active", true)
      .single();
    if (error || !data) return null;
    return data as AdminUser;
  } catch {
    return null;
  }
}

/**
 * Authenticate by email + password against the admin_users table.
 *
 * REFACTOR: the legacy fallback (env-based `admin@odg.dz / odg-admin-2026`
 * super-admin) has been REMOVED. A real `admin_users` row is required,
 * with `password_hash` AND `salt` columns. To bootstrap the first admin,
 * run `supabase-base-schema.sql` (which inserts a temporary super-admin
 * with a randomly-generated password printed to the SQL output) and
 * change it immediately from the admin UI.
 *
 * Returns `{ user, token }` on success, `null` on failure.
 */
export async function authenticateAdmin(
  email: string,
  password: string
): Promise<{ user: AdminUser; token: string } | null> {
  const user = await findAdminUserByEmail(email);
  if (!user) return null;

  let client;
  try {
    client = getServerClient();
  } catch {
    return null;
  }
  if (!client) return null;

  const { data } = await client
    .from("admin_users")
    .select("password_hash, salt")
    .eq("id", user.id)
    .single();

  // Backward-compat: rows created before this refactor may not have a
  // `salt` column. We refuse login for such rows — the operator must
  // reset the password via the new SQL migration (supabase-base-schema.sql).
  // (bcrypt hashes don't need the salt column — they have it embedded.
  //  scrypt hashes do — see verifyPassword dual-format handling.)
  if (!data?.password_hash) {
    return null;
  }

  const ok = await verifyPassword(password, data.password_hash, data.salt || "");
  if (!ok) {
    return null;
  }

  const token = createSessionToken(user.id, user.role);
  return { user, token };
}
