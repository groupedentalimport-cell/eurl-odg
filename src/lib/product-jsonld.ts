import type { Product } from "@/lib/types";
import { SITE_URL } from "@/lib/env";
import { COMPANY } from "@/lib/types";
import { getProductImageUrl } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// JSON-LD structured data for a single product.
// ---------------------------------------------------------------------------
//
// Emits up to FOUR schemas so Google + AI crawlers can build rich product
// snippets AND FAQ entries:
//   - Product: name, image, brand, model, description, offers (price range),
//     aggregateRating, category, SKU (slug).
//   - BreadcrumbList: Home > Catalogue > Category > Product.
//   - FAQPage: derived from product.faq (only if at least 1 Q&A).
//   - Review / AggregateRating: if ratingValue + ratingCount are set.
//
// All schemas are returned as a single @graph so they share the same
// @context and can reference each other via @id.

function safeStrip(html: string, max = 300): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function firstImage(product: Product): string | undefined {
  const fn = Array.isArray(product.images) ? product.images[0] : undefined;
  if (!fn) return undefined;
  const url = getProductImageUrl(fn);
  if (!url) return undefined;
  return url.startsWith("http") ? url : SITE_URL + (url.startsWith("/") ? "" : "/") + url;
}

export function buildProductJsonLd(product: Product) {
  if (!product?.slug) return null;
  const productUrl = SITE_URL + "/produit/" + product.slug;
  const imageUrl = firstImage(product) || SITE_URL + "/og.jpg";

  const description =
    product.descriptionLongue?.fr ||
    safeStrip(product.description.fr, 300) ||
    product.name.fr + " — " + product.brand + " " + product.model;

  const graph: any[] = [
    {
      "@type": "Product",
      "@id": productUrl + "#product",
      name: product.name.fr,
      alternateName: [product.name.ar, product.brand + " " + product.model].filter(Boolean),
      image: [imageUrl],
      description: safeStrip(description, 5000),
      sku: product.slug,
      mpn: product.model || undefined,
      brand: {
        "@type": "Brand",
        name: product.brand,
      },
      manufacturer: { "@id": SITE_URL + "/#organization" },
      category: product.categorySlug || "Matériel dentaire",
      url: productUrl,
      ...(product.audience && product.audience.length
        ? { audience: { "@type": "Audience", audienceType: product.audience.join(", ") } }
        : {}),
      ...(product.prixMin || product.prixMax
        ? {
            offers: {
              "@type": "Offer",
              url: productUrl,
              priceCurrency: "DZD",
              ...(product.prixMin ? { price: String(product.prixMin) } : {}),
              ...(product.prixMin && product.prixMax
                ? { maxPrice: String(product.prixMax), priceSpecification: {
                    "@type": "PriceSpecification",
                    minPrice: product.prixMin,
                    maxPrice: product.prixMax,
                    priceCurrency: "DZD",
                  } }
                : {}),
              availability: product.available
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              seller: { "@id": SITE_URL + "/#organization" },
              areaServed: {
                "@type": "Country",
                name: "Algérie",
                alternateName: "Algeria",
              },
            },
          }
        : {}),
      ...(product.ratingValue && product.ratingCount
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: String(product.ratingValue),
              reviewCount: String(product.ratingCount),
              bestRating: "5",
              worstRating: "1",
            },
          }
        : {}),
    },
    {
      "@type": "BreadcrumbList",
      "@id": productUrl + "#breadcrumb",
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
        ...(product.categorySlug
          ? [
              {
                "@type": "ListItem",
                position: 3,
                name: product.categorySlug,
                item: SITE_URL + "/catalogue?category=" + product.categorySlug,
              },
            ]
          : []),
        {
          "@type": "ListItem",
          position: product.categorySlug ? 4 : 3,
          name: product.name.fr,
          item: productUrl,
        },
      ],
    },
  ];

  // Optional FAQPage schema — extracted from product.faq.
  const faqs = product.faq?.fr;
  if (Array.isArray(faqs) && faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": productUrl + "#faq",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.a,
        },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}
