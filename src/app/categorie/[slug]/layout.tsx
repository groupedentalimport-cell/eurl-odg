import type { Metadata } from "next";
import { getServerClient } from "@/lib/supabase";
import { SITE_URL } from "@/lib/env";

// ---------------------------------------------------------------------------
// Per-category SEO metadata (server-side, fetched from Supabase).
// ---------------------------------------------------------------------------
//
// Emits a real <title>, meta description, canonical URL, OG tags and Twitter
// card for each /categorie/<slug> route. Falls back to a generic title if
// Supabase is unavailable or the category slug is unknown.
//
// `params` is a Promise in Next.js 16 — we must await it.
//
// The JSON-LD builder (buildCategoryJsonLd) lives in a separate file
// (src/lib/category-jsonld.ts) so it can be imported by page.tsx without
// triggering "Functions cannot be passed to Client Components" errors.

type Params = { params: Promise<{ slug: string }> };

const FALLBACK: Metadata = {
  title: "Catégorie",
  description:
    "Découvrez notre catégorie de matériel dentaire — fauteuils, autoclaves, radiologie, consommables. Par OUADAH DENTAL GROUPE à Oran, Algérie.",
  alternates: { canonical: "/catalogue" },
};

// Default SEO description per category slug — used as a fallback if the
// category doesn't have a description_fr set in Supabase. These are
// hand-written to be SEO-optimized for the most common practitioner queries.
const CATEGORY_DEFAULTS: Record<
  string,
  { title: string; description: string; keywords: string[] }
> = {
  "fauteuil-dentaire": {
    title: "Fauteuils dentaires Silver Fox en Algérie",
    description:
      "Catalogue des fauteuils dentaires Silver Fox distribués en Algérie par OUADAH DENTAL GROUPE : modèles basique, classique, Pro 8000C et Implant. Devis, installation, formation et SAV à Oran, livraison dans toute l'Algérie.",
    keywords: [
      "fauteuil dentaire",
      "Silver Fox",
      "fauteuil dentaire Algérie",
      "fauteuil dentaire Oran",
      "fauteuil dentaire prix",
      "fauteuil implantologie",
      "8000C Pro",
      "8000C Classic",
    ],
  },
  sterilisation: {
    title: "Autoclaves dentaires ICANCLAVE classe B en Algérie",
    description:
      "Catalogue des autoclaves dentaires ICANCLAVE classe B (norme EN 13060) distribués en Algérie par OUADAH DENTAL GROUPE : modèles 18L et 45L. Stérilisation conforme, formation, installation et SAV à Oran.",
    keywords: [
      "autoclave dentaire",
      "ICANCLAVE",
      "autoclave classe B",
      "stérilisation dentaire",
      "norme EN 13060",
      "autoclave Algérie",
      "autoclave 18L",
      "autoclave 45L",
    ],
  },
  radiologie: {
    title: "Radiologie dentaire OWANDY en Algérie — radio mural, capteur, panoramique 3D",
    description:
      "Catalogue de radiologie dentaire OWANDY distribuée en Algérie par OUADAH DENTAL GROUPE : radio mural standard et nouvelle génération, capteurs intra-oraux, unité panoramique 3D avec céphalométrie. Faible dose, formation et SAV inclus.",
    keywords: [
      "radiologie dentaire",
      "OWANDY",
      "radio mural",
      "capteur intra-oral",
      "panoramique dentaire",
      "céphalométrie",
      "Cone Beam 3D",
      "radiographie numérique",
      "radiologie Algérie",
    ],
  },
  consommables: {
    title: "Consommables dentaires en Algérie",
    description:
      "Consommables et accessoires dentaires distribués en Algérie par OUADAH DENTAL GROUPE : pochettes de stérilisation, tests Helix et Bowie-Dick, pièces détachées pour fauteuils Silver Fox, autoclaves ICANCLAVE et radiologie OWANDY.",
    keywords: [
      "consommables dentaires",
      "pochettes stérilisation",
      "tests Helix",
      "Bowie-Dick",
      "pièces détachées",
      "accessoires dentaires",
    ],
  },
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return FALLBACK;

  let nomFr = "";
  let nomAr = "";
  let descriptionFr = "";

  try {
    const client = getServerClient();
    const { data } = await client
      .from("categories")
      .select("slug, nom_fr, nom_ar, description_fr")
      .eq("slug", slug)
      .maybeSingle();
    if (data) {
      nomFr = String(data.nom_fr || "").trim();
      nomAr = String(data.nom_ar || "").trim();
      descriptionFr = String(data.description_fr || "").trim();
    }
  } catch {
    // Supabase not configured — fall back to defaults.
  }

  const defaults = CATEGORY_DEFAULTS[slug];
  const title = nomFr || defaults?.title || "Catégorie";
  const description =
    descriptionFr || defaults?.description || FALLBACK.description || "";
  const categoryUrl = SITE_URL + "/categorie/" + slug;
  const keywords = defaults?.keywords || [];

  return {
    title,
    description,
    alternates: { canonical: "/categorie/" + slug },
    keywords: keywords.length ? keywords : undefined,
    openGraph: {
      type: "website",
      title: title + " — OUADAH DENTAL GROUPE",
      description,
      url: categoryUrl,
      siteName: "OUADAH DENTAL GROUPE",
      images: [{ url: SITE_URL + "/og.jpg", width: 1024, height: 1024, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: title + " — OUADAH DENTAL GROUPE",
      description,
    },
    other: {
      "og:url": categoryUrl,
    },
  };
}

// ---------------------------------------------------------------------------
// Default export — the layout wrapper.
// ---------------------------------------------------------------------------
//
// Per-category <title>, meta description, OG tags, canonical URL are emitted
// by generateMetadata above. The JSON-LD (CollectionPage + BreadcrumbList +
// ItemList) is emitted by page.tsx via buildCategoryJsonLd().

export default function CategorieSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
