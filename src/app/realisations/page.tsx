"use client";

import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { RealisationsPage } from "@/components/dental/realisations/RealisationsPage";

/**
 * /realisations — public "Nos réalisations" gallery page.
 * Shows photos of dental cabinets equipped by ODG across Algeria.
 */
export default function Page() {
  return (
    <PublicLayout>
      <RealisationsPage />
    </PublicLayout>
  );
}
