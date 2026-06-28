"use client";

import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { CataloguePage } from "@/components/dental/catalogue/CataloguePage";

/**
 * /catalogue — native route for the product catalogue.
 *
 * The CataloguePage component reads the active category from the URL itself
 * (via useHashRoute / usePathname), so no prop wiring is needed here. The
 * page is a client component because the catalogue relies on client-side
 * data hooks (useData) and filters.
 */
export default function CatalogueRoute() {
  return (
    <PublicLayout>
      <CataloguePage />
    </PublicLayout>
  );
}
