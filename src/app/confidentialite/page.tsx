"use client";

import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { PolitiqueConfidentialite } from "@/components/dental/legal/PolitiqueConfidentialite";

/**
 * /confidentialite — native route for the privacy policy page.
 */
export default function ConfidentialiteRoute() {
  return (
    <PublicLayout>
      <PolitiqueConfidentialite />
    </PublicLayout>
  );
}
