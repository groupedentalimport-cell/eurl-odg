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

// Role permission matrix — mirrors the server-side requireRole().
// super_admin bypasses everything.
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
    // CRM
    "crm.clients": ["manager", "commercial"],
    "crm.devis": ["manager", "commercial", "accountant"],
    "crm.devis.create": ["manager", "commercial"],
    "crm.devis.validate": ["manager"], // commercial can only draft
    "crm.commandes": ["manager", "commercial", "accountant"],
    "crm.quotes": ["manager", "commercial"],
    // Operations
    "ops.interventions": ["manager", "technician"],
    "ops.techniciens": ["manager"],
    "ops.maintenances": ["manager", "technician"],
    "ops.garanties": ["manager", "technician", "accountant"],
    // Admin
    "admin.users": [], // only super_admin (handled by bypass)
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
