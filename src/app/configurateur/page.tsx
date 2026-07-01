"use client";

import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { ConfigurateurPage } from "@/components/dental/configurateur/ConfigurateurPage";

/**
 * /configurateur — native route for the interactive cabinet configurator.
 *
 * Wraps the new 3-step ConfigurateurPage (Task BONUS-1 v3) in the public
 * layout (Header + Footer + widgets). Users compose their dental cabinet
 * (fauteuil + autoclave + radio) and get an estimated price range, then
 * can request a detailed quote or push the selection to the comparator.
 */
export default function Page() {
  return (
    <PublicLayout>
      <ConfigurateurPage />
    </PublicLayout>
  );
}
