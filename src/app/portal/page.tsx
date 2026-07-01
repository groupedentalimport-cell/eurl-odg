"use client";

import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { ClientPortalPage } from "@/components/dental/portal/ClientPortalPage";

// ============================================================
// /portal — ODG client portal (magic link auth — Task BONUS-3)
// ============================================================
//
// Logged-out visitors see an email-entry form: they type their email
// → /api/client-portal/login sends a magic link by email → they
// click it → the URL becomes /portal?token=XXX → ClientLoginPage
// auto-POSTs to /api/client-portal/verify → the server sets the
// `odg_client` httpOnly cookie → the parent refreshes its session
// and swaps to the dashboard view.
//
// Logged-in clients see a 4-tab dashboard (Devis / Commandes /
// Garanties / Interventions) — read-only, all data fetched in a
// single GET /api/client-portal/data call (hard-filtered by
// client_id server-side).
//
// The portal shares the `odg_client` cookie with the legacy /client
// route (phone-last-4 login) — the two portals are interchangeable
// for the same client. /portal just adds the email-only magic-link
// login method for clients who don't want to type their phone code.
export default function Page() {
  return (
    <PublicLayout>
      <ClientPortalPage />
    </PublicLayout>
  );
}
