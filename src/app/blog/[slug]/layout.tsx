import type { Metadata } from "next";
import { getServerClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Per-article SEO metadata (server-side, fetched from Supabase).
// ---------------------------------------------------------------------------
//
// `params` is a Promise in Next.js 16 — we must await it.
//
// Falls back to a generic "Article — OUADAH DENTAL GROUPE" title if Supabase
// is unavailable or the slug is unknown.

type Params = { params: Promise<{ slug: string }> };

const SITE_URL = "https://ouadah-dental-groupe.vercel.app";

const FALLBACK: Metadata = {
  title: "Article",
  description:
    "Article du blog OUADAH DENTAL GROUPE — conseils, guides et actualités sur le matériel dentaire en Algérie.",
  alternates: { canonical: "/blog" },
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return FALLBACK;

  let titreFr = "";
  let auteur = "";

  try {
    const client = getServerClient();
    const { data, error } = await client
      .from("blog_posts")
      .select("slug, titre_fr, auteur, publie")
      .eq("slug", slug)
      .eq("publie", true)
      .maybeSingle();

    if (!error && data) {
      titreFr = String(data.titre_fr || "").trim();
      auteur = String(data.auteur || "").trim();
    }
  } catch {
    // Supabase not configured — fall back.
    return {
      ...FALLBACK,
      alternates: { canonical: `/blog/${slug}` },
    };
  }

  if (!titreFr) {
    return {
      ...FALLBACK,
      alternates: { canonical: `/blog/${slug}` },
    };
  }

  const description = `Article${auteur ? ` par ${auteur}` : ""} — OUADAH DENTAL GROUPE. Conseils et actualités sur le matériel dentaire en Algérie.`;

  return {
    title: titreFr,
    description,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      type: "article",
      title: `${titreFr} — Blog ODG`,
      description,
      url: `/blog/${slug}`,
      siteName: "OUADAH DENTAL GROUPE",
      ...(auteur ? { authors: [auteur] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${titreFr} — Blog ODG`,
      description,
    },
    other: {
      "og:url": `${SITE_URL}/blog/${slug}`,
    },
  };
}

export default function BlogSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
