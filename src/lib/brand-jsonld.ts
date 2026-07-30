import { SITE_URL } from "@/lib/env";
import type { BrandData, BrandProduct } from "@/lib/brands-data";

// ---------------------------------------------------------------------------
// JSON-LD structured data for a brand page.
// ---------------------------------------------------------------------------
//
// Emits three schemas in a single @graph:
//   - Brand: official name, logo, description, parent organization (ODG).
//   - BreadcrumbList: Home > Marques > Brand.
//   - ItemList: list of all products of the brand (Google uses this to
//     discover every product URL from the brand page).

export function buildBrandJsonLd(
  brand: BrandData,
  products: BrandProduct[]
) {
  const brandUrl = SITE_URL + "/marques/" + brand.slug;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Brand",
        "@id": brandUrl + "#brand",
        name: brand.name,
        alternateName: brand.nameAr || undefined,
        description: brand.tagline,
        url: brandUrl,
        logo: {
          "@type": "ImageObject",
          url: SITE_URL + "/logo-odg.png",
          caption: brand.name + " — distribué par OUADAH DENTAL GROUPE",
        },
        founder: { "@id": SITE_URL + "/#organization" },
        // Brand is a sub-entity of the Organization (ODG) that distributes it.
        // Linking via parentOrganization helps Google understand that ODG is
        // the official distributor in Algeria.
        parentOrganization: { "@id": SITE_URL + "/#organization" },
        ...(brand.yearFounded ? { foundingDate: String(brand.yearFounded) } : {}),
        ...(brand.country ? { location: { "@type": "Place", name: brand.country } } : {}),
        // Link to the brand's products via ItemList.
        mainEntity: {
          "@type": "ItemList",
          "@id": brandUrl + "#itemlist",
          numberOfItems: products.length,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": brandUrl + "#breadcrumb",
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
            name: "Marques",
            item: SITE_URL + "/marques",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: brand.name,
            item: brandUrl,
          },
        ],
      },
      {
        "@type": "ItemList",
        "@id": brandUrl + "#itemlist",
        numberOfItems: products.length,
        itemListElement: products.map((p, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: SITE_URL + "/produit/" + p.slug,
          name: p.name,
        })),
      },
    ],
  };
}
