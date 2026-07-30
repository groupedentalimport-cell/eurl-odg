import { notFound } from "next/navigation";
import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { CategoryPage } from "@/components/dental/catalogue/CategoryPage";
import { getServerClient } from "@/lib/supabase";
import { buildCategoryJsonLd } from "@/lib/category-jsonld";
import type { Product, ProductSpec } from "@/lib/types";

// ---------------------------------------------------------------------------
// /categorie/<slug> — server-rendered category page.
// ---------------------------------------------------------------------------
//
// SEO/GEO CRITICAL:
//   - Fetches the category row + all its products server-side.
//   - Passes them as props to <CategoryPage> so the initial HTML contains
//     the full product grid (Googlebot + AI crawlers see real content,
//     not an empty shell).
//   - Emits CollectionPage + BreadcrumbList + ItemList JSON-LD.
//
// The per-category <title>, meta description, OG tags, canonical URL are
// emitted by the adjacent `layout.tsx` via `generateMetadata`.

type Params = { params: Promise<{ slug: string }> };

// Revalidate every hour so newly-added products appear without a redeploy.
export const revalidate = 3600;

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

export default async function CategorieRoute({ params }: Params) {
  const { slug } = await params;
  if (!slug) return notFound();

  let categoryRow: any = null;
  let productRows: any[] = [];

  try {
    const client = getServerClient();

    // Fetch the category row.
    const catRes = await client
      .from("categories")
      .select("id, slug, nom_fr, nom_ar, description_fr, description_ar, icone, ordre")
      .eq("slug", slug)
      .maybeSingle();
    if (!catRes.error) categoryRow = catRes.data;

    if (categoryRow) {
      // Try the full query (with new rich-content columns).
      const fullResult = await client
        .from("products")
        .select(
          "id, slug, nom_fr, nom_ar, description_fr, description_ar, description_longue_fr, description_longue_ar, faq_fr, faq_ar, prix_min, prix_max, rating_value, rating_count, specs, images, pdf_url, brochure_pdf, category_id, marque, modele, en_vedette, disponible, ordre, cible"
        )
        .eq("category_id", categoryRow.id)
        .order("ordre", { ascending: true });

      if (fullResult.error && (fullResult.error.code === "42703" || /column .* does not exist/i.test(fullResult.error.message || ""))) {
        // Migration not applied yet — fallback to basic query.
        const basicResult = await client
          .from("products")
          .select(
            "id, slug, nom_fr, nom_ar, description_fr, description_ar, specs, images, pdf_url, brochure_pdf, category_id, marque, modele, en_vedette, disponible, ordre, cible"
          )
          .eq("category_id", categoryRow.id)
          .order("ordre", { ascending: true });
        if (!basicResult.error && Array.isArray(basicResult.data)) {
          productRows = basicResult.data;
        }
      } else if (Array.isArray(fullResult.data)) {
        productRows = fullResult.data;
      }
    }
  } catch {
    // Supabase not configured (dev) — render empty category.
  }

  if (!categoryRow) {
    // Unknown category slug — 404.
    return notFound();
  }

  const products: Product[] = productRows.map(mapRowToProduct).filter((p: Product) => p.slug);

  const category = {
    slug: String(categoryRow.slug || slug),
    name: {
      fr: String(categoryRow.nom_fr || slug),
      ar: String(categoryRow.nom_ar || categoryRow.nom_fr || slug),
    },
    description: {
      fr: String(categoryRow.description_fr || ""),
      ar: String(categoryRow.description_ar || categoryRow.description_fr || ""),
    },
  };

  // Build JSON-LD.
  const jsonLd = buildCategoryJsonLd(
    category.slug,
    category.name.fr,
    category.name.ar,
    category.description.fr,
    products.map((p) => ({
      slug: p.slug,
      name: p.name.fr,
      brand: p.brand,
      model: p.model,
    }))
  );

  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CategoryPage category={category} initialProducts={products} />
    </PublicLayout>
  );
}
