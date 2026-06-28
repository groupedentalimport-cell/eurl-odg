"use client";

import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { MentionsLegales } from "@/components/dental/legal/MentionsLegales";

/**
 * /mentions-legales — native route for the legal notices page.
 */
export default function MentionsLegalesRoute() {
  return (
    <PublicLayout>
      <MentionsLegales />
    </PublicLayout>
  );
}
