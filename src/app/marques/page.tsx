import type { Metadata } from "next";
import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { BRANDS } from "@/lib/brands-data";
import { SITE_URL } from "@/lib/env";
import { MarquesIndexClient } from "@/components/dental/brand/MarquesIndexClient";

// ---------------------------------------------------------------------------
// /marques — index page listing all distributed brands.
// ---------------------------------------------------------------------------
//
// Server-rendered with:
//   - ItemList JSON-LD (lists all brand pages — Google discovers them).
//   - BreadcrumbList JSON-LD.
//   - Card per brand linking to /marques/<slug>.

export const metadata: Metadata = {
  title: "Marques distribuées en Algérie — Silver Fox, ICANCLAVE, OWANDY, Launca",
  description:
    "Découvrez les marques de matériel dentaire distribuées en Algérie par OUADAH DENTAL GROUPE : Silver Fox (fauteuils), ICANCLAVE (autoclaves), OWANDY (radiologie), Launca (scanners intra-oraux). Installation, formation et SAV à Oran.",
  alternates: { canonical: "/marques" },
  keywords: [
    "marques matériel dentaire Algérie",
    "Silver Fox",
    "ICANCLAVE",
    "OWANDY",
    "Launca",
    "distributeur matériel dentaire Algérie",
  ],
  openGraph: {
    type: "website",
    title: "Marques distribuées en Algérie — OUADAH DENTAL GROUPE",
    description:
      "Silver Fox, ICANCLAVE, OWANDY, Launca — toutes les marques de matériel dentaire distribuées en Algérie par ODG.",
    url: SITE_URL + "/marques",
    siteName: "OUADAH DENTAL GROUPE",
  },
};

function buildMarquesIndexJsonLd() {
  const brands = Object.values(BRANDS);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": SITE_URL + "/marques#collectionpage",
        url: SITE_URL + "/marques",
        name: "Marques distribuées par OUADAH DENTAL GROUPE",
        description:
          "Liste des marques de matériel dentaire distribuées en Algérie : Silver Fox, ICANCLAVE, OWANDY, Launca.",
        inLanguage: "fr",
        isPartOf: { "@id": SITE_URL + "/#website" },
        publisher: { "@id": SITE_URL + "/#organization" },
        mainEntity: {
          "@type": "ItemList",
          "@id": SITE_URL + "/marques#itemlist",
          numberOfItems: brands.length,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": SITE_URL + "/marques#breadcrumb",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Marques", item: SITE_URL + "/marques" },
        ],
      },
      {
        "@type": "ItemList",
        "@id": SITE_URL + "/marques#itemlist",
        numberOfItems: brands.length,
        itemListElement: brands.map((b, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: SITE_URL + "/marques/" + b.slug,
          name: b.name,
        })),
      },
    ],
  };
}

export default function MarquesIndexPage() {
  const brands = Object.values(BRANDS);
  const jsonLd = buildMarquesIndexJsonLd();

  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarquesIndexClient brands={brands} />
    </PublicLayout>
  );
}
