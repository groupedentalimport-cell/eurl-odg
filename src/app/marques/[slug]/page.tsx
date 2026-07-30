import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { BrandPage } from "@/components/dental/brand/BrandPage";
import { BRANDS, getBrandBySlug } from "@/lib/brands-data";
import { buildBrandJsonLd } from "@/lib/brand-jsonld";
import { getServerClient } from "@/lib/supabase";
import type { Product, ProductSpec } from "@/lib/types";

// ---------------------------------------------------------------------------
// /marques/<slug> — server-rendered brand page.
// ---------------------------------------------------------------------------
//
// Each brand page is fully server-rendered with:
//   - Brand identity (history, advantages, SAV).
//   - List of products of the brand (server-fetched from Supabase).
//   - JSON-LD Brand + BreadcrumbList + ItemList schemas.
//   - sr-only block for AI crawlers (ChatGPT, Claude, Perplexity).
//
// Per-brand <title>, meta description, OG tags, canonical URL are emitted
// by generateMetadata below.

type Params = { params: Promise<{ slug: string }> };

// Revalidate every hour so newly-added brand products appear without a redeploy.
export const revalidate = 3600;

// Generate the static metadata for the brand page (title, description, OG, etc).
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const brand = getBrandBySlug(slug);
  if (!brand) {
    return {
      title: "Marque introuvable",
      description: "Cette marque n'est pas distribuée par OUADAH DENTAL GROUPE.",
    };
  }
  // Use the metadata builder from brands-data.ts
  const { buildBrandMetadata } = await import("@/lib/brands-data");
  return buildBrandMetadata(slug);
}

function parseFaq(val: unknown): any[] | undefined {
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

function mapRowToProduct(row: any): Product {
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
    faq: faqFr ? { fr: faqFr, ar: faqAr } : undefined,
    prixMin: row.prix_min ?? null,
    prixMax: row.prix_max ?? null,
    ratingValue: row.rating_value ?? null,
    ratingCount: row.rating_count ?? null,
    specs,
    images: Array.isArray(row.images) ? row.images : [],
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
  };
}

export default async function MarqueSlugRoute({ params }: Params) {
  const { slug } = await params;
  const brand = getBrandBySlug(slug);
  if (!brand) return notFound();

  // Fetch products of this brand from Supabase.
  let products: Product[] = [];
  try {
    const client = getServerClient();

    // Try the full query first (with new rich-content columns).
    const fullResult = await client
      .from("products")
      .select(
        "id, slug, nom_fr, nom_ar, description_fr, description_ar, description_longue_fr, description_longue_ar, faq_fr, faq_ar, prix_min, prix_max, rating_value, rating_count, specs, images, pdf_url, brochure_pdf, category_id, category_slug, marque, modele, en_vedette, disponible, ordre, cible"
      )
      .ilike("marque", brand.name)
      .order("ordre", { ascending: true });

    if (fullResult.error && (fullResult.error.code === "42703" || /column .* does not exist/i.test(fullResult.error.message || ""))) {
      // Migration not applied yet — fallback to basic query.
      const basicResult = await client
        .from("products")
        .select(
          "id, slug, nom_fr, nom_ar, description_fr, description_ar, specs, images, pdf_url, brochure_pdf, category_id, category_slug, marque, modele, en_vedette, disponible, ordre, cible"
        )
        .ilike("marque", brand.name)
        .order("ordre", { ascending: true });
      if (!basicResult.error && Array.isArray(basicResult.data)) {
        products = basicResult.data.map(mapRowToProduct);
      }
    } else if (Array.isArray(fullResult.data)) {
      products = fullResult.data.map(mapRowToProduct);
    }
  } catch {
    // Supabase not configured (dev) — render brand page with no products.
  }

  // Build JSON-LD.
  const jsonLd = buildBrandJsonLd(
    brand,
    products.map((p) => ({
      slug: p.slug,
      name: p.name.fr,
      model: p.model,
      categorySlug: p.categorySlug,
    }))
  );

  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BrandPage brand={brand} products={products} />
    </PublicLayout>
  );
}

// Static params — pre-render all 4 brand pages at build time.
export function generateStaticParams() {
  return Object.keys(BRANDS).map((slug) => ({ slug }));
}
