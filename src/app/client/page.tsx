"use client";

import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { ClientPortalPage } from "@/components/dental/client/ClientPortalPage";

/**
 * /client — ODG client portal.
 *
 * Logged-out visitors see a login form (email + last 4 digits of the
 * phone number ODG has on file). Logged-in clients see their devis,
 * commandes and garanties in 3 tabs.
 */
export default function Page() {
  return (
    <PublicLayout>
      <ClientPortalPage />
    </PublicLayout>
  );
}
