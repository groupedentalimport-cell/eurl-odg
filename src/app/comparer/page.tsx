"use client";

import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { ComparePage } from "@/components/dental/compare/ComparePage";

/**
 * /comparer — native route for the product comparison page.
 */
export default function ComparerRoute() {
  return (
    <PublicLayout>
      <ComparePage />
    </PublicLayout>
  );
}
