"use client";

import { useParams } from "next/navigation";
import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { ProductPage } from "@/components/dental/product/ProductPage";

/**
 * /produit/<slug> — native route for the product detail page.
 *
 * Client component: the ProductPage panel relies on client-side hooks
 * (useProductBySlug, useQuoteCart, useCompare, framer-motion...). We pull the
 * slug from `useParams()` and forward it to the panel.
 *
 * Per-product SEO metadata (title, description, OG tags, canonical) is emitted
 * by the adjacent server `layout.tsx` via `generateMetadata` — it runs on the
 * server and fetches the product row from Supabase.
 */
export default function ProduitRoute() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : undefined;

  return (
    <PublicLayout>
      <ProductPage slug={slug} />
    </PublicLayout>
  );
}
