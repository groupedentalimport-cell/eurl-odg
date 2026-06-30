"use client";

import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { FinanceCalculator } from "@/components/dental/finance/FinanceCalculator";

/**
 * /financement — interactive financing calculator route.
 * Wraps the FinanceCalculator in the public layout shell.
 */
export default function FinancementRoute() {
  return (
    <PublicLayout>
      <FinanceCalculator />
    </PublicLayout>
  );
}
