import { SITE_URL } from "@/lib/env";

// ---------------------------------------------------------------------------
// JSON-LD structured data for a category page.
// ---------------------------------------------------------------------------
//
// Emits three schemas in a single @graph:
//   - CollectionPage: the category page itself.
//   - BreadcrumbList: Home > Catalogue > Category.
//   - ItemList: list of all products in the category (Google uses this to
//     discover every product URL from the category page).

export function buildCategoryJsonLd(
  slug: string,
  categoryName: string,
  categoryNameAr: string,
  description: string,
  products: { slug: string; name: string; brand?: string; model?: string }[]
) {
  const categoryUrl = SITE_URL + "/categorie/" + slug;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": categoryUrl + "#collectionpage",
        url: categoryUrl,
        name: categoryName,
        alternateName: categoryNameAr || undefined,
        description: description || undefined,
        inLanguage: ["fr", "ar"],
        isPartOf: { "@id": SITE_URL + "/#website" },
        publisher: { "@id": SITE_URL + "/#organization" },
        mainEntity: {
          "@type": "ItemList",
          "@id": categoryUrl + "#itemlist",
          numberOfItems: products.length,
          itemListElement: products.map((p, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            url: SITE_URL + "/produit/" + p.slug,
            name: p.name,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": categoryUrl + "#breadcrumb",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Catalogue",
            item: SITE_URL + "/catalogue",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: categoryName,
            item: categoryUrl,
          },
        ],
      },
      {
        "@type": "ItemList",
        "@id": categoryUrl + "#itemlist",
        numberOfItems: products.length,
        itemListElement: products.map((p, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: SITE_URL + "/produit/" + p.slug,
          name: p.name,
          ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
        })),
      },
    ],
  };
}
