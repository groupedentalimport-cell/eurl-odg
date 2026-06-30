"use client";

import dynamic from "next/dynamic";

/**
 * Admin route — renders the ODG admin panel.
 *
 * IMPORTANT: the admin panel is mounted WITHOUT the PublicLayout (no public
 * header / footer / chatbot). It has its own internal layout, navigation and
 * login gate (see AdminPage.tsx). It is also marked `noindex` via the
 * adjacent `layout.tsx` so Google never indexes it.
 *
 * `dynamic` with `ssr: false` keeps the entire admin tree client-only — this
 * avoids leaking any auth-state HTML into the initial server response and
 * prevents hydration mismatches on session restore.
 */
const AdminPage = dynamic(
  () =>
    import("@/components/dental/admin/AdminPage").then((m) => m.AdminPage),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        <span className="animate-pulse text-sm">Chargement de l'administration…</span>
      </div>
    ),
  }
);

export default function AdminRoute() {
  return <AdminPage />;
}
