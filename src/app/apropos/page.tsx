"use client";

import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { AboutPage } from "@/components/dental/about/AboutPage";

/**
 * /apropos — native route for the "À propos" page.
 */
export default function AproposRoute() {
  return (
    <PublicLayout>
      <AboutPage />
    </PublicLayout>
  );
}
