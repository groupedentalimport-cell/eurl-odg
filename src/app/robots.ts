import type { MetadataRoute } from "next";

const SITE_URL = "https://ouadah-dental-groupe.netlify.app";

/**
 * robots.txt for OUADAH DENTAL GROUPE.
 *
 * - Allow the entire public site (single "/" route, hash-router SPA).
 * - Block /api/ (internal endpoints, never useful to index).
 * - The admin panel lives at "/#/admin" (hash route) — robots.txt cannot
 *   disallow a URL fragment, so we cannot block it here. Access is gated by
 *   an admin password + signed cookie at the API layer instead.
 * - Reference the sitemap so Google can discover the (limited) indexable URLs.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
