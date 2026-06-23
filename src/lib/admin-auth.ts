import { createHmac, timingSafeEqual, scryptSync, randomBytes } from "crypto";
import { getServerClient } from "./supabase";

// ============================================================
// Multi-role admin authentication (server-side only)
// ============================================================
// 6 roles: super_admin | manager | commercial | technician | editor | accountant
// Sessions are httpOnly cookies containing an HMAC-signed token.
// The token payload includes userId + role + issuedAt.
// The actual user record (email, full_name, role) lives in the
// `admin_users` Supabase table.

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

const COOKIE_NAME = "odg_admin";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24; // 24h
const PASSWORD_SALT = "odg-salt-v1";

// Fallback env-based super admin (used when admin_users table is missing
// or for dev without DB setup). Keeps backward compat with the old
// ADMIN_PASSWORD env var.
function getFallbackPassword(): string {
  return process.env.ADMIN_PASSWORD || "odg-admin-2026";
}
function getAdminSecret(): string {
  return process.env.ADMIN_SECRET || "odg-dev-secret-" + getFallbackPassword();
}

// ---- Password hashing (scrypt) ----
export function hashPassword(plain: string): string {
  return scryptSync(plain, PASSWORD_SALT, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
}
export function verifyPassword(plain: string, hash: string): boolean {
  try {
    const computed = hashPassword(plain);
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---- Session token signing (HMAC) ----
function signPayload(payload: string): string {
  const sig = createHmac("sha256", getAdminSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}
function verifyToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  try {
    const decoded = decodeURIComponent(token);
    const parts = decoded.split(".");
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expectedSig = createHmac("sha256", getAdminSecret()).update(payload).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    // payload format: base64url(JSON({userId, role, issuedAt}))
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const data = JSON.parse(json) as SessionPayload;
    if (!data.userId || !data.role) return null;
    const now = Math.floor(Date.now() / 1000);
    if (now - (data.issuedAt || 0) > SESSION_MAX_AGE_SEC) return null;
    return data;
  } catch {
    return null;
  }
}
export function createSessionToken(userId: string, role: AdminRole): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, role, issuedAt: Math.floor(Date.now() / 1000) })
  ).toString("base64url");
  return signPayload(payload);
}

// ---- Cookie helpers ----
export function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}
export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_SESSION_MAX_AGE = SESSION_MAX_AGE_SEC;

// ---- Request verification ----
function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get("cookie") || "";
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k] = v.join("=");
  }
  return out;
}

/**
 * Verify the admin session cookie. Returns the SessionPayload (with role)
 * if valid, otherwise null.
 *
 * Falls back to the legacy env-based password ONLY if the admin_users table
 * is missing — this keeps the site working during the CRM migration.
 */
export function verifyAdmin(request: Request): SessionPayload | null {
  const cookies = parseCookies(request);
  return verifyToken(cookies[COOKIE_NAME]);
}

/**
 * Require a specific set of roles. Returns the SessionPayload if the user
 * has one of the allowed roles, otherwise null (caller should return 403).
 *
 * super_admin always passes (full access).
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
 * Falls back to the env-based super admin if the table is missing
 * (email ignored, uses ADMIN_PASSWORD env var, role = super_admin).
 *
 * Returns { user, token } on success, null on failure.
 */
export async function authenticateAdmin(
  email: string,
  password: string
): Promise<{ user: AdminUser; token: string } | { fallback: true; token: string } | null> {
  // Try DB first
  const user = await findAdminUserByEmail(email);
  if (user) {
    // Fetch password_hash
    let client;
    try {
      client = getServerClient();
    } catch {
      return null;
    }
    if (!client) return null;
    const { data } = await client
      .from("admin_users")
      .select("password_hash")
      .eq("id", user.id)
      .single();
    if (data?.password_hash && verifyPassword(password, data.password_hash)) {
      const token = createSessionToken(user.id, user.role);
      return { user, token };
    }
    return null;
  }

  // Fallback: env-based super admin (only if email is empty or matches the
  // legacy "admin@odg.dz"). This keeps the site working before the SQL is run.
  if ((!email || email === "admin@odg.dz") && password === getFallbackPassword()) {
    const token = createSessionToken("legacy-super-admin", "super_admin");
    return { fallback: true, token };
  }

  return null;
}
