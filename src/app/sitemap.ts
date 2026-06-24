import type { MetadataRoute } from "next";
import { getServerClient } from "@/lib/supabase";
import { COMPANY } from "@/lib/types";

// Production URL — used as the canonical origin for every sitemap entry.
const SITE_URL = "https://ouadah-dental-groupe.vercel.app";

/**
 * ODG uses a hash-based router (single "/" route, navigation via "#/catalogue",
 * "#/produit/:slug", ...). Google does NOT index hash fragments reliably, so the
 * base URL "/" is the only fully-indexable entry. We still emit hash URLs as
 * "hints" — modern Googlebot can sometimes execute JS and discover the SPA routes.
 *
 * The DB fetches (product + blog slugs) use the Supabase service-role client.
 * If Supabase is not configured (missing env vars) or the tables are absent,
 * we silently fall back to the base + section URLs only — the sitemap must
 * NEVER 500 because of a DB hiccup.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // --- Static / hash-routed sections -----------------------------------
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/#/catalogue`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/#/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/#/apropos`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/#/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // --- Dynamic: product slugs ------------------------------------------
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
          url: `${SITE_URL}/#/produit/${p.slug}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : now,
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    }
  } catch {
    // Supabase not configured or table missing — skip products silently.
  }

  // --- Dynamic: blog post slugs ----------------------------------------
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
          url: `${SITE_URL}/#/blog/${b.slug}`,
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
  if (entries.length <= 5) {
    console.warn(
      `[sitemap] Only ${entries.length} entries — Supabase slugs unavailable (${COMPANY.name}).`
    );
  }

  return entries;
}
