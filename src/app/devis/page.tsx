"use client";

import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { QuotePage } from "@/components/dental/quote/QuotePage";

/**
 * /devis — native route for the quote request page.
 */
export default function DevisRoute() {
  return (
    <PublicLayout>
      <QuotePage />
    </PublicLayout>
  );
}
