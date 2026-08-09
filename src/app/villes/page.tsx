import type { Metadata } from "next";
import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { CITIES } from "@/lib/cities-data";
import { SITE_URL } from "@/lib/env";
import { VillesIndexClient } from "@/components/dental/city/VillesIndexClient";

// ---------------------------------------------------------------------------
// /villes — index page listing all cities served by ODG.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Matériel dentaire en Algérie par ville — OUADAH DENTAL GROUPE",
  description:
    "OUADAH DENTAL GROUPE dessert toutes les wilayas d'Algérie : Oran (siège), Alger, Constantine, Annaba, Sétif, Mostaganem, Mascara, Tlemcen, Batna, Béjaïa, Tizi Ouzou, Ouargla et plus. Installation, formation et SAV inclus.",
  alternates: { canonical: "/villes" },
  keywords: [
    "matériel dentaire Algérie",
    "fauteuil dentaire Algérie par ville",
    "distributeur matériel dentaire wilaya",
    "SAV matériel dentaire Algérie",
    "matériel dentaire Oran",
    "matériel dentaire Alger",
    "matériel dentaire Constantine",
  ],
  openGraph: {
    type: "website",
    title: "Matériel dentaire en Algérie par ville — OUADAH DENTAL GROUPE",
    description:
      "Toutes les villes desservies par OUADAH DENTAL GROUPE : Oran, Alger, Constantine, Annaba, Sétif, Mostaganem, Mascara, Tlemcen, Batna, Béjaïa, Tizi Ouzou, Ouargla et plus.",
    url: SITE_URL + "/villes",
    siteName: "OUADAH DENTAL GROUPE",
  },
};

function buildVillesIndexJsonLd() {
  const cities = Object.values(CITIES);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": SITE_URL + "/villes#collectionpage",
        url: SITE_URL + "/villes",
        name: "Villes desservies par OUADAH DENTAL GROUPE",
        description:
          "Liste des villes d'Algérie desservies par OUADAH DENTAL GROUPE : matériel dentaire, installation, formation et SAV.",
        inLanguage: "fr",
        isPartOf: { "@id": SITE_URL + "/#website" },
        publisher: { "@id": SITE_URL + "/#organization" },
        mainEntity: {
          "@type": "ItemList",
          "@id": SITE_URL + "/villes#itemlist",
          numberOfItems: cities.length,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": SITE_URL + "/villes#breadcrumb",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Villes desservies", item: SITE_URL + "/villes" },
        ],
      },
      {
        "@type": "ItemList",
        "@id": SITE_URL + "/villes#itemlist",
        numberOfItems: cities.length,
        itemListElement: cities.map((c, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: SITE_URL + "/villes/" + c.slug,
          name: c.name,
        })),
      },
    ],
  };
}

export default function VillesIndexPage() {
  const cities = Object.values(CITIES);
  const jsonLd = buildVillesIndexJsonLd();

  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <VillesIndexClient cities={cities} />
    </PublicLayout>
  );
}
