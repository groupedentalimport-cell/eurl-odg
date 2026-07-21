"use client";
import { useEffect, useState } from "react";

export type AdminRole =
  | "super_admin"
  | "manager"
  | "commercial"
  | "technician"
  | "editor"
  | "accountant";

export interface AdminUser {
  id: string;
  email?: string;
  full_name?: string;
  role: AdminRole;
}

interface SessionState {
  loading: boolean;
  authed: boolean;
  user: AdminUser | null;
  refresh: () => void;
}

// Role permission matrix — mirrors the server-side `PERMISSIONS` in
// lib/auth/permissions.ts. super_admin bypasses everything.
//
// REFACTOR (refactor/total — audit §1.6, §2.5):
// The previous matrix was missing `content.newsletter` and
// `content.livechat`, forcing AdminPage.tsx to re-implement `can()`
// inline for those two items. They're now in the matrix, and
// AdminPage's inline override has been removed.
//
// Keep this matrix IN SYNC with `lib/auth/permissions.ts` — they
// MUST agree. A future iteration should generate one from the other
// (or share a single file imported both server-side and client-side).
export function can(role: AdminRole | undefined | null, action: string): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  const matrix: Record<string, AdminRole[]> = {
    // Content
    "content.messages": ["manager"],
    "content.products": ["editor"],
    "content.posts": ["editor"],
    "content.categories": ["editor"],
    "content.home": ["editor"],
    "content.about": ["editor"],
    "content.contact": ["editor"],
    "content.newsletter": ["manager", "editor"], // added — was missing
    "content.livechat": ["manager"], // added — was missing
    "content.realisations": ["editor"],
    "content.testimonials": ["editor"],
    "content.legal": ["manager", "editor"],
    // CRM
    "crm.clients": ["manager", "commercial", "accountant"],
    "crm.devis": ["manager", "commercial"],
    "crm.devis.create": ["manager", "commercial"],
    "crm.devis.validate": ["manager"], // commercial can only draft
    "crm.commandes": ["manager", "commercial"],
    "crm.quotes": ["manager", "commercial"],
    // Operations
    "ops.interventions": ["manager", "technician"],
    "ops.techniciens": ["manager"],
    "ops.maintenances": ["manager", "technician", "accountant"],
    "ops.garanties": ["manager", "technician", "accountant"],
    // Admin
    "admin.users": ["manager"], // manager can manage admin users (super_admin bypasses)
    "admin.dashboard": ["manager", "commercial", "technician", "editor", "accountant"],
  };
  const allowed = matrix[action];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function useAdminSession(): SessionState {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setAuthed(Boolean(d?.authed));
        setUser(d?.user || null);
      })
      .catch(() => {
        if (!cancelled) {
          setAuthed(false);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { loading, authed, user, refresh };
}
