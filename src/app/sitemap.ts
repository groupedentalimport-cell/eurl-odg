import type { MetadataRoute } from "next";
import { getServerClient } from "@/lib/supabase";
import { COMPANY } from "@/lib/types";

// Production URL — used as the canonical origin for every sitemap entry.
const SITE_URL = "https://ouadah-dental-groupe.netlify.app";

/**
 * Revalidate the sitemap at most once per hour so newly-published products
 * and blog posts appear in /sitemap.xml without a full redeploy.
 *
 * (Without this, the route would be prerendered once at build time — which
 *  would freeze the sitemap at the 8 static entries because Supabase env vars
 *  are typically not available during the build.)
 */
export const revalidate = 3600;

/**
 * Native App Router sitemap for OUADAH DENTAL GROUPE.
 *
 * The site has migrated from a hash-based SPA router (/#/catalogue, ...) to
 * native Next.js App Router routes (/catalogue, /produit/<slug>, ...). All
 * entries below are therefore real, fully-indexable URLs — no hash fragments.
 *
 * The DB fetches (product + blog slugs) use the Supabase service-role client.
 * If Supabase is not configured (missing env vars) or the tables are absent,
 * we silently fall back to the static section URLs only — the sitemap must
 * NEVER 500 because of a DB hiccup.
 *
 * The /admin route is intentionally NOT listed here (it is gated by auth and
 * marked noindex via its layout metadata).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // --- Static sections (native routes) ---------------------------------
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/catalogue`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/apropos`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/devis`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/mentions-legales`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/confidentialite`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // --- Dynamic: product slugs (/produit/<slug>) ------------------------
  try {
    const client = getServerClient();
    const { data: products, error: prodErr } = await client
      .from("products")
      .select("slug, updated_at")
      .order("ordre", { ascending: true });

    if (!prodErr && Array.isArray(products)) {
      for (const p of products) {
        if (!p?.slug) continue;
        entries.push({
          url: `${SITE_URL}/produit/${p.slug}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : now,
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    }
  } catch {
    // Supabase not configured or table missing — skip products silently.
  }

  // --- Dynamic: blog post slugs (/blog/<slug>) -------------------------
  try {
    const client = getServerClient();
    const { data: posts, error: postErr } = await client
      .from("blog_posts")
      .select("slug, updated_at, created_at")
      .eq("publie", true)
      .order("created_at", { ascending: false });

    if (!postErr && Array.isArray(posts)) {
      for (const b of posts) {
        if (!b?.slug) continue;
        const ts = b.updated_at || b.created_at;
        entries.push({
          url: `${SITE_URL}/blog/${b.slug}`,
          lastModified: ts ? new Date(ts) : now,
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }
  } catch {
    // Same as above — never fail the whole sitemap on a DB error.
  }

  // Soft log so a maintainer can debug missing entries without breaking prod.
  if (entries.length <= 8) {
    console.warn(
      `[sitemap] Only ${entries.length} entries — Supabase slugs unavailable (${COMPANY.name}).`
    );
  }

  return entries;
}
