import type { AdminRole } from "../admin-auth";

/**
 * Centralised RBAC permission matrix.
 *
 * WHY: the client-side matrix in `hooks/useAdminSession.ts:31-55` was
 * hand-maintained, and was already out of sync with the API routes
 * (the AdminPage had to re-implement `can()` inline for newsletter
 * and livechat — see audit §1.6, §2.5). This file is the SINGLE
 * source of truth, imported by both server routes and client hooks.
 *
 * Rule: never check `verifyAdmin(request)` alone — always pair it
 * with `requireRole(request, PERMS.<action>)`.
 */

export type Action =
  | "dashboard"
  | "messages"
  | "products"
  | "categories"
  | "posts"
  | "settings"
  | "clients"
  | "devis"
  | "commandes"
  | "interventions"
  | "techniciens"
  | "maintenances"
  | "garanties"
  | "adminUsers"
  | "quotes"
  | "newsletter"
  | "livechat"
  | "finance"
  | "realisations"
  | "testimonials";

/**
 * Per-action allowed roles. `super_admin` is implicit (always allowed)
 * and is enforced in `requireRole`, not listed here.
 */
export const PERMISSIONS: Record<Action, AdminRole[]> = {
  dashboard: ["manager", "commercial", "technician", "editor", "accountant"],
  messages: ["manager"], // was: any role — see audit §2.5
  products: ["editor"],
  categories: ["editor"],
  posts: ["editor"],
  settings: ["manager", "editor"],
  clients: ["manager", "commercial", "accountant"],
  devis: ["manager", "commercial"],
  commandes: ["manager", "commercial"],
  interventions: ["manager", "technician"],
  techniciens: ["manager"],
  maintenances: ["manager", "technician", "accountant"],
  garanties: ["manager", "technician", "accountant"],
  adminUsers: ["manager"],
  quotes: ["manager", "commercial"],
  newsletter: ["manager", "editor"],
  livechat: ["manager"],
  finance: ["manager", "accountant"],
  realisations: ["editor"],
  testimonials: ["editor"],
};

/**
 * Returns true if `role` is allowed to perform `action`.
 * `super_admin` always passes.
 */
export function can(role: AdminRole | undefined | null, action: Action): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  return PERMISSIONS[action].includes(role);
}

/**
 * Returns the list of allowed actions for `role`. Used by the admin
 * sidebar to show/hide nav items.
 */
export function allowedActions(role: AdminRole | undefined | null): Action[] {
  return (Object.keys(PERMISSIONS) as Action[]).filter((a) => can(role, a));
}
