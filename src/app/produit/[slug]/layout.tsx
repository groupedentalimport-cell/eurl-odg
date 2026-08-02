import type { Metadata } from "next";
import { getServerClient } from "@/lib/supabase";
import { SITE_URL } from "@/lib/env";
import { COMPANY } from "@/lib/types";

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
  let descriptionLongueFr = "";
  let brand = "";
  let modele = "";

  try {
    const client = getServerClient();
    // IMPORTANT: the DB columns are `marque` and `modele` (NOT `brand`).
    // The previous version of this query selected `brand` which doesn't
    // exist → the title always fell back to the generic "Produit" title.
    const { data, error } = await client
      .from("products")
      .select("slug, nom_fr, description_fr, description_longue_fr, marque, modele")
      .eq("slug", slug)
      .maybeSingle();

    if (!error && data) {
      nomFr = String(data.nom_fr || "").trim();
      descriptionFr = String(data.description_fr || "").trim();
      descriptionLongueFr = String(data.description_longue_fr || "").trim();
      brand = String(data.marque || "").trim();
      modele = String(data.modele || "").trim();
    }
  } catch {
    // Supabase not configured or table missing — fall back to generic title.
    return {
      ...FALLBACK,
      alternates: { canonical: "/produit/" + slug },
    };
  }

  if (!nomFr) {
    return {
      ...FALLBACK,
      alternates: { canonical: "/produit/" + slug },
    };
  }

  // Title format: "Fauteuil dentaire classique — Silver Fox 8000C"
  // Falls back to just the name if brand is missing.
  const title = nomFr + (brand ? " — " + brand + (modele ? " " + modele : "") : "");

  // Description: prefer the short description_fr (HTML stripped), fall back
  // to a stripped version of description_longue_fr (first 155 chars), then
  // to the generic FALLBACK description.
  const stripHtml = (s: string) =>
    s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const description =
    stripHtml(descriptionFr).slice(0, 155) ||
    stripHtml(descriptionLongueFr).slice(0, 155) ||
    FALLBACK.description ||
    "";

  const articleUrl = SITE_URL + "/produit/" + slug;

  return {
    title,
    description,
    alternates: {
      canonical: "/produit/" + slug,
    },
    openGraph: {
      type: "website",
      title: title + " — OUADAH DENTAL GROUPE",
      description,
      url: articleUrl,
      siteName: "OUADAH DENTAL GROUPE",
    },
    twitter: {
      card: "summary_large_image",
      title: title + " — OUADAH DENTAL GROUPE",
      description,
    },
    other: {
      "og:url": articleUrl,
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
