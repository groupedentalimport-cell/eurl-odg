"use client";

import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { FinancementPage } from "@/components/dental/financement/FinancementPage";

/**
 * /financement — interactive financing calculator route.
 * Wraps the FinancementPage in the public layout shell.
 */
export default function Page() {
  return (
    <PublicLayout>
      <FinancementPage />
    </PublicLayout>
  );
}
