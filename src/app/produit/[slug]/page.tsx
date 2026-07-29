import { notFound } from "next/navigation";
import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { ProductPage } from "@/components/dental/product/ProductPage";
import { getServerClient, getProductImageUrl } from "@/lib/supabase";
import { buildProductJsonLd } from "@/lib/product-jsonld";
import type { Product, ProductSpec, ProductFaqItem } from "@/lib/types";

// ---------------------------------------------------------------------------
// /produit/<slug> — server-rendered product page.
// ---------------------------------------------------------------------------
//
// CRITICAL SEO: this route was previously a "use client" component. The
// product was fetched client-side via useProductBySlug after hydration, so
// Googlebot AND AI crawlers (GPTBot, ClaudeBot, PerplexityBot) received an
// empty shell — they couldn't see the product name, description, specs, or
// any of the rich content.
//
// This version:
//   1. Fetches the product server-side from Supabase.
//   2. Maps it to the Product type (with new rich-content fields).
//   3. Passes it as `serverProduct` to <ProductPage> — the client UI still
//      works (animations, lightbox, add-to-quote, compare) but the initial
//      HTML contains the full product content for crawlers.
//   4. Emits Product + BreadcrumbList + FAQPage JSON-LD schemas via the
//      `buildProductJsonLd` helper.
//
// Per-product <title>, meta description, OG tags, canonical URL are emitted
// by the adjacent `layout.tsx` via `generateMetadata`.

type Params = { params: Promise<{ slug: string }> };

// Revalidate every hour so price/spec changes appear without a redeploy.
export const revalidate = 3600;

function parseFaq(val: unknown): ProductFaqItem[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) {
    return val
      .map((item: any) => ({
        q: String(item?.q || item?.question || "").trim(),
        a: String(item?.a || item?.answer || "").trim(),
      }))
      .filter((item) => item.q && item.a);
  }
  if (typeof val === "string") {
    try {
      return parseFaq(JSON.parse(val));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function mapRowToProduct(row: any): Product | null {
  if (!row) return null;
  const images: string[] = Array.isArray(row.images) ? row.images : [];
  const specsRaw = row.specs && typeof row.specs === "object" ? row.specs : {};
  const specs: ProductSpec[] = Object.entries(specsRaw).map(([k, v]) => ({
    label: { fr: k, ar: k },
    value: String(v ?? ""),
  }));

  const faqFr = parseFaq(row.faq_fr);
  const faqAr = parseFaq(row.faq_ar) || faqFr;

  return {
    id: String(row.id || ""),
    slug: String(row.slug || ""),
    name: {
      fr: String(row.nom_fr || row.slug || ""),
      ar: String(row.nom_ar || row.nom_fr || row.slug || ""),
    },
    description: {
      fr: String(row.description_fr || ""),
      ar: String(row.description_ar || row.description_fr || ""),
    },
    descriptionLongue:
      row.description_longue_fr || row.description_longue_ar
        ? {
            fr: String(row.description_longue_fr || ""),
            ar: String(row.description_longue_ar || row.description_longue_fr || ""),
          }
        : undefined,
    usages:
      row.usages_fr || row.usages_ar
        ? {
            fr: String(row.usages_fr || ""),
            ar: String(row.usages_ar || row.usages_fr || ""),
          }
        : undefined,
    maintenance:
      row.maintenance_fr || row.maintenance_ar
        ? {
            fr: String(row.maintenance_fr || ""),
            ar: String(row.maintenance_ar || row.maintenance_fr || ""),
          }
        : undefined,
    compatibilite:
      row.compatibilite_fr || row.compatibilite_ar
        ? {
            fr: String(row.compatibilite_fr || ""),
            ar: String(row.compatibilite_ar || row.compatibilite_fr || ""),
          }
        : undefined,
    garantie:
      row.garantie_fr || row.garantie_ar
        ? {
            fr: String(row.garantie_fr || ""),
            ar: String(row.garantie_ar || row.garantie_fr || ""),
          }
        : undefined,
    faq: faqFr ? { fr: faqFr, ar: faqAr } : undefined,
    prixMin: row.prix_min ?? null,
    prixMax: row.prix_max ?? null,
    ratingValue: row.rating_value ?? null,
    ratingCount: row.rating_count ?? null,
    specs,
    images,
    pdfUrl: row.pdf_url || undefined,
    brochurePdf: row.brochure_pdf || undefined,
    categoryId: String(row.category_id || ""),
    categorySlug: String(row.category_slug || ""),
    brand: String(row.marque || "").trim(),
    model: String(row.modele || ""),
    featured: Boolean(row.en_vedette),
    available: row.disponible !== false,
    order: Number(row.ordre ?? 0),
    audience: Array.isArray(row.cible) ? row.cible : [],
    videoUrl: row.video_url || undefined,
  };
}

export default async function ProduitRoute({ params }: Params) {
  const { slug } = await params;
  if (!slug) return notFound();

  let product: Product | null = null;

  try {
    const client = getServerClient();
    // Try the full query (with new rich-content columns). If the migration
    // hasn't been applied yet (columns don't exist), Supabase returns an
    // error and we fall back to a basic query.
    let data: any = null;
    let error: any = null;

    const fullSelect =
      "id, slug, nom_fr, nom_ar, description_fr, description_ar, description_longue_fr, description_longue_ar, usages_fr, usages_ar, maintenance_fr, maintenance_ar, compatibilite_fr, compatibilite_ar, garantie_fr, garantie_ar, faq_fr, faq_ar, prix_min, prix_max, rating_value, rating_count, specs, images, pdf_url, brochure_pdf, category_id, category_slug, marque, modele, en_vedette, disponible, ordre, cible, video_url";

    const fullResult = await client
      .from("products")
      .select(fullSelect)
      .eq("slug", slug)
      .maybeSingle();
    data = fullResult.data;
    error = fullResult.error;

    // If the full query failed because of missing columns (Postgres error
    // code 42703 = undefined_column), retry with a basic select.
    if (error && (error.code === "42703" || /column .* does not exist/i.test(error.message || ""))) {
      const basicResult = await client
        .from("products")
        .select(
          "id, slug, nom_fr, nom_ar, description_fr, description_ar, specs, images, pdf_url, brochure_pdf, category_id, category_slug, marque, modele, en_vedette, disponible, ordre, cible"
        )
        .eq("slug", slug)
        .maybeSingle();
      data = basicResult.data;
      error = basicResult.error;
    }

    if (!error) {
      product = mapRowToProduct(data);
    }
  } catch {
    // Supabase not configured (dev) — fall through to client-side fetch.
  }

  const jsonLd = product ? buildProductJsonLd(product) : null;

  return (
    <PublicLayout>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ProductPage slug={slug} serverProduct={product ?? undefined} />
    </PublicLayout>
  );
}
