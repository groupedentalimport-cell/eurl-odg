import { notFound } from "next/navigation";
import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { BlogPostPage } from "@/components/dental/blog/BlogPostPage";
import { getServerClient, getBlogImageUrl } from "@/lib/supabase";
import type { BlogPost } from "@/lib/types";

// ---------------------------------------------------------------------------
// /blog/<slug> — server-rendered blog article.
// ---------------------------------------------------------------------------
//
// CRITICAL SEO: this route was previously a "use client" component that
// fetched the article from Supabase AFTER hydration. Googlebot received an
// empty HTML shell and could not index article content.
//
// Now the page is a SERVER component: it fetches the post server-side,
// passes it as a prop to <BlogPostPage> (which is still "use client" for
// UI state — lightbox, related-posts interactions), and the article HTML
// is rendered into the initial server response so Googlebot can read it.
//
// Per-article <title>, meta description, OG tags, canonical URL, and JSON-LD
// (BlogPosting + BreadcrumbList + FAQPage) are emitted by the adjacent
// `layout.tsx`.

type Params = { params: Promise<{ slug: string }> };

// Revalidate every hour so newly-published articles appear without a redeploy.
export const revalidate = 3600;

function mapRowToPost(row: any): BlogPost | null {
  if (!row) return null;
  // Prefer the admin-curated excerpt_fr/ar field if available.
  // Fall back to auto-extracting the first 200 chars of the content (HTML stripped).
  const autoExcerptFr = (String(row.contenu_fr || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "").slice(0, 200);
  const autoExcerptAr = (String(row.contenu_ar || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "").slice(0, 200);
  return {
    id: String(row.id || ""),
    slug: String(row.slug || ""),
    title: {
      fr: String(row.titre_fr || row.slug || ""),
      ar: String(row.titre_ar || row.titre_fr || row.slug || ""),
    },
    excerpt: {
      fr: String(row.excerpt_fr || "").trim() || autoExcerptFr,
      ar: String(row.excerpt_ar || "").trim() || autoExcerptAr,
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

export default async function BlogPostRoute({ params }: Params) {
  const { slug } = await params;
  if (!slug) return notFound();

  let post: BlogPost | null = null;

  try {
    const client = getServerClient();
    // Try the full query first (with new excerpt_fr/ar columns).
    // If the migration hasn't been applied yet, fallback to basic query.
    const fullResult = await client
      .from("blog_posts")
      .select(
        "id, slug, titre_fr, titre_ar, contenu_fr, contenu_ar, excerpt_fr, excerpt_ar, image_url, auteur, publie, created_at, updated_at"
      )
      .eq("slug", slug)
      .eq("publie", true)
      .maybeSingle();

    let data: any = fullResult.data;
    let error: any = fullResult.error;

    if (error && (error.code === "42703" || /column .* does not exist/i.test(error.message || ""))) {
      // Migration not applied — fallback to basic query.
      const basicResult = await client
        .from("blog_posts")
        .select(
          "id, slug, titre_fr, titre_ar, contenu_fr, contenu_ar, image_url, auteur, publie, created_at, updated_at"
        )
        .eq("slug", slug)
        .eq("publie", true)
        .maybeSingle();
      data = basicResult.data;
      error = basicResult.error;
    }

    if (!error) {
      post = mapRowToPost(data);
    }
  } catch {
    // Supabase not configured (dev) — fall through to client-side fetch.
  }

  return (
    <PublicLayout>
      {/* `post` is undefined when the server couldn't fetch (dev without
          env vars, or transient DB hiccup). BlogPostPage then falls back
          to client-side fetch via useBlogBySlug. */}
      <BlogPostPage slug={slug} serverPost={post ?? undefined} />
    </PublicLayout>
  );
}
