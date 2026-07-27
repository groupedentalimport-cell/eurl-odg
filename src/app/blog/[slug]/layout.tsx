import type { Metadata } from "next";
import { getServerClient } from "@/lib/supabase";
import { SITE_URL } from "@/lib/env";
import { COMPANY } from "@/lib/types";

// ---------------------------------------------------------------------------
// Per-article SEO metadata (server-side, fetched from Supabase).
// ---------------------------------------------------------------------------
//
// `params` is a Promise in Next.js 16 — we must await it.
//
// Falls back to a generic "Article — OUADAH DENTAL GROUPE" title if Supabase
// is unavailable or the slug is unknown.

type Params = { params: Promise<{ slug: string }> };

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
      alternates: { canonical: "/blog/" + slug },
    };
  }

  if (!titreFr) {
    return {
      ...FALLBACK,
      alternates: { canonical: "/blog/" + slug },
    };
  }

  const description =
    "Article" + (auteur ? " par " + auteur : "") +
    " — OUADAH DENTAL GROUPE. Conseils et actualités sur le matériel dentaire en Algérie.";

  const articleUrl = SITE_URL + "/blog/" + slug;

  return {
    title: titreFr,
    description,
    alternates: {
      canonical: "/blog/" + slug,
    },
    openGraph: {
      type: "article",
      title: titreFr + " — Blog ODG",
      description,
      url: articleUrl,
      siteName: "OUADAH DENTAL GROUPE",
      ...(auteur ? { authors: [auteur] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: titreFr + " — Blog ODG",
      description,
    },
    other: {
      "og:url": articleUrl,
    },
  };
}

// ---------------------------------------------------------------------------
// JSON-LD structured data for a single blog article.
// ---------------------------------------------------------------------------
//
// Emits three schemas so Google can build rich snippets:
//   - BlogPosting: the article itself (headline, author, datePublished,
//     image, publisher).
//   - BreadcrumbList: hierarchy Home > Blog > Article — improves SERP
//     appearance and helps Google understand site structure.
//   - (Optional) FAQPage: auto-extracted from <h2> blocks that end with "?"
//     followed by a <p> answer — powers Featured Snippets / People Also Ask.

function extractFaqsFromHtml(html: string): { q: string; a: string }[] {
  if (!html) return [];
  const faqs: { q: string; a: string }[] = [];
  const headingRe = /<h[23][^>]*>([^<]+)<\/h[23]>/gi;
  const matches: { idx: number; q: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(html)) !== null) {
    const text = m[1].trim();
    if (text.includes("?") && text.length > 8 && text.length < 200) {
      matches.push({ idx: m.index + m[0].length, q: text });
    }
  }
  for (let i = 0; i < matches.length && faqs.length < 15; i++) {
    const start = matches[i].idx;
    const end = i + 1 < matches.length ? matches[i + 1].idx : html.length;
    const chunk = html.slice(start, end);
    const pRe = /<p[^>]*>([\s\S]*?)<\/p>/i;
    const pm = chunk.match(pRe);
    if (pm && pm[1]) {
      const a = pm[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (a.length > 20) faqs.push({ q: matches[i].q, a });
    }
  }
  return faqs;
}

async function buildArticleJsonLd(slug: string) {
  let titreFr = "";
  let auteur = "Equipe ODG";
  let contenuFr = "";
  let imageUrl = "";
  let datePublished = "";
  let dateModified = "";

  try {
    const client = getServerClient();
    const { data } = await client
      .from("blog_posts")
      .select(
        "slug, titre_fr, contenu_fr, image_url, auteur, publie, created_at, updated_at"
      )
      .eq("slug", slug)
      .eq("publie", true)
      .maybeSingle();
    if (data) {
      titreFr = String(data.titre_fr || "").trim();
      auteur = String(data.auteur || auteur).trim();
      contenuFr = String(data.contenu_fr || "");
      imageUrl = String(data.image_url || "");
      datePublished = data.created_at || "";
      dateModified = data.updated_at || datePublished;
    }
  } catch {
    // ignore — return null graph
  }

  if (!titreFr) return null;

  const faqs = extractFaqsFromHtml(contenuFr);
  const blogBaseUrl = SITE_URL + "/blog";
  const articleUrl = blogBaseUrl + "/" + slug;
  const imageUrlAbs = imageUrl
    ? (imageUrl.startsWith("http")
        ? imageUrl
        : SITE_URL + (imageUrl.startsWith("/") ? "" : "/") + imageUrl)
    : SITE_URL + "/og.jpg";

  const graph: any[] = [
    {
      "@type": "BlogPosting",
      "@id": articleUrl + "#article",
      headline: titreFr,
      description:
        contenuFr.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) ||
        ("Article par " + auteur + " — OUADAH DENTAL GROUPE."),
      image: {
        "@type": "ImageObject",
        url: imageUrlAbs,
      },
      author: {
        "@type": "Organization",
        name: auteur,
        url: SITE_URL,
      },
      publisher: { "@id": SITE_URL + "/#organization" },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": articleUrl,
      },
      datePublished: datePublished || undefined,
      dateModified: dateModified || undefined,
      inLanguage: "fr-FR",
      articleSection: "Matériel dentaire",
      keywords: [
        "matériel dentaire",
        "fauteuil dentaire",
        "autoclave",
        "radiologie dentaire",
        "Algérie",
        "Oran",
        COMPANY.name,
      ],
    },
    {
      "@type": "BreadcrumbList",
      "@id": articleUrl + "#breadcrumb",
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
          name: "Blog",
          item: blogBaseUrl,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: titreFr,
          item: articleUrl,
        },
      ],
    },
  ];

  if (faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": articleUrl + "#faq",
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

export default async function BlogSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const jsonLd = await buildArticleJsonLd(slug);
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
