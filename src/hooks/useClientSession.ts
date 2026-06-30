"use client";
import { useCallback, useEffect, useState } from "react";

// ============================================================
// useClientSession — client-side hook for the ODG client portal.
// (Task BONUS-2-3)
//
// Mirrors the pattern of useAdminSession.ts: a single fetch to
// /api/client/session that returns { authed, client }, plus a
// refresh() and a logout() helper.
//
// The cookie itself (odg_client) is httpOnly, so the client cannot
// read it directly — it must ask the server.
// ============================================================

export interface ClientPublicInfo {
  id: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  wilaya: string | null;
  type_client: string | null;
}

interface ClientSessionState {
  loading: boolean;
  authed: boolean;
  client: ClientPublicInfo | null;
  refresh: () => void;
  logout: () => Promise<void>;
}

export function useClientSession(): ClientSessionState {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [client, setClient] = useState<ClientPublicInfo | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/client/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setAuthed(Boolean(d?.authed));
        setClient(d?.client || null);
      })
      .catch(() => {
        if (!cancelled) {
          setAuthed(false);
          setClient(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/client/logout", { method: "POST" });
    } catch {
      /* ignore network errors — local state is cleared anyway */
    }
    setAuthed(false);
    setClient(null);
  }, []);

  return { loading, authed, client, refresh, logout };
}
