import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { BlogPage } from "@/components/dental/blog/BlogPage";
import { getServerClient, getBlogImageUrl } from "@/lib/supabase";
import { SITE_URL } from "@/lib/env";
import type { BlogPost } from "@/lib/types";

// ---------------------------------------------------------------------------
// /blog — server-rendered blog index.
// ---------------------------------------------------------------------------
//
// CRITICAL SEO: the previous version was a "use client" component that
// rendered an empty shell on the server, with the post list only appearing
// after a client-side Supabase fetch. Googlebot received a blank page.
//
// This version fetches the published posts server-side and passes them to
// <BlogPage> as `initialPosts`. The cards are now in the initial HTML.
//
// Revalidate every hour so newly-published posts appear without a redeploy.

export const revalidate = 3600;

function mapRowToPost(row: any): BlogPost {
  return {
    id: String(row.id || ""),
    slug: String(row.slug || ""),
    title: {
      fr: String(row.titre_fr || row.slug || ""),
      ar: String(row.titre_ar || row.titre_fr || row.slug || ""),
    },
    excerpt: {
      fr: (String(row.contenu_fr || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "").slice(0, 200),
      ar: (String(row.contenu_ar || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "").slice(0, 200),
    },
    content: {
      fr: String(row.contenu_fr || ""),
      ar: String(row.contenu_ar || row.contenu_fr || ""),
    },
    imageUrl: String(row.image_url || ""),
    published: row.publie !== false,
    author: String(row.auteur || "Equipe ODG"),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  };
}

// JSON-LD Blog (collection) + ItemList of all posts — helps Google discover
// every article from the index page even before the sitemap is crawled.
function buildBlogIndexJsonLd(posts: BlogPost[]) {
  const itemList = posts.map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${SITE_URL}/blog/${p.slug}`,
    name: p.title.fr,
    datePublished: p.createdAt,
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": `${SITE_URL}/blog#blog`,
        name: "Blog OUADAH DENTAL GROUPE",
        description:
          "Conseils, guides d'achat et actualités sur le matériel dentaire en Algérie : fauteuils, autoclaves, radiologie, maintenance. Pour les chirurgiens-dentistes et cliniques.",
        url: `${SITE_URL}/blog`,
        publisher: { "@id": `${SITE_URL}/#organization` },
        blogPost: posts.map((p) => ({
          "@type": "BlogPosting",
          headline: p.title.fr,
          url: `${SITE_URL}/blog/${p.slug}`,
          datePublished: p.createdAt,
          dateModified: p.updatedAt,
          author: { "@type": "Organization", name: p.author },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}/blog#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        ],
      },
      {
        "@type": "ItemList",
        "@id": `${SITE_URL}/blog#itemlist`,
        itemListElement: itemList,
      },
    ],
  };
}

export default async function BlogRoute() {
  let posts: BlogPost[] = [];

  try {
    const client = getServerClient();
    const { data } = await client
      .from("blog_posts")
      .select(
        "id, slug, titre_fr, titre_ar, contenu_fr, contenu_ar, image_url, auteur, publie, created_at, updated_at"
      )
      .eq("publie", true)
      .order("created_at", { ascending: false });
    if (Array.isArray(data)) {
      posts = data.map(mapRowToPost).filter((p: BlogPost) => p.slug && p.title.fr);
    }
  } catch {
    // Supabase not configured — fall back to client-side fetch via useData().
  }

  const jsonLd = buildBlogIndexJsonLd(posts);

  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogPage initialPosts={posts} />
    </PublicLayout>
  );
}
