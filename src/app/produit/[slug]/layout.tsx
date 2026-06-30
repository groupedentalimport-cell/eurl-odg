import type { Metadata } from "next";
import { getServerClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Per-product SEO metadata (server-side, fetched from Supabase).
// ---------------------------------------------------------------------------
//
// Because this `layout.tsx` is a server component, we can use `generateMetadata`
// to fetch the product row and emit a real <title>, meta description, canonical
// URL and OpenGraph tags — exactly the SEO win that justifies the migration to
// native App Router routes (Google does NOT index hash-fragment URLs reliably).
//
// `params` is a Promise in Next.js 16 — we must await it.
//
// If Supabase is not configured or the product is missing, we fall back to a
// generic "Produit — OUADAH DENTAL GROUPE" title. The sitemap (and Googlebot)
// should never 500 because of a DB hiccup.

type Params = { params: Promise<{ slug: string }> };

const SITE_URL = "https://ouadah-dental-groupe.vercel.app";

const FALLBACK: Metadata = {
  title: "Produit",
  description:
    "Découvrez ce produit dentaire ODG — fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Demandez votre devis personnalisé.",
  alternates: { canonical: "/catalogue" },
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return FALLBACK;

  let nomFr = "";
  let descriptionFr = "";
  let brand = "";
  let modele = "";

  try {
    const client = getServerClient();
    const { data, error } = await client
      .from("products")
      .select("slug, nom_fr, description_fr, brand, modele")
      .eq("slug", slug)
      .maybeSingle();

    if (!error && data) {
      nomFr = String(data.nom_fr || "").trim();
      descriptionFr = String(data.description_fr || "").trim();
      brand = String(data.brand || "").trim();
      modele = String(data.modele || "").trim();
    }
  } catch {
    // Supabase not configured or table missing — fall back to generic title.
    return {
      ...FALLBACK,
      alternates: { canonical: `/produit/${slug}` },
    };
  }

  if (!nomFr) {
    return {
      ...FALLBACK,
      alternates: { canonical: `/produit/${slug}` },
    };
  }

  const title = `${nomFr}${brand ? ` — ${brand}${modele ? ` ${modele}` : ""}` : ""}`;
  const description =
    descriptionFr.slice(0, 155) ||
    FALLBACK.description ||
    "";

  return {
    title,
    description,
    alternates: {
      canonical: `/produit/${slug}`,
    },
    openGraph: {
      type: "website",
      title: `${title} — OUADAH DENTAL GROUPE`,
      description,
      url: `/produit/${slug}`,
      siteName: "OUADAH DENTAL GROUPE",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — OUADAH DENTAL GROUPE`,
      description,
    },
    other: {
      // Absolute URL for og:url since OG scrapers don't resolve metadataBase
      // consistently across all crawlers.
      "og:url": `${SITE_URL}/produit/${slug}`,
    },
  };
}

export default function ProduitSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
