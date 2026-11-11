// Server-side helper that builds a textual snapshot of the published blog
// posts, to be injected into the chatbot's system prompt.
//
// Why: questions like "comment choisir un fauteuil ?" or "norme de
// stérilisation ?" are covered by ODG's blog articles. Without this context
// the LLM answers generically and never points to the blog. With it, the
// assistant can cite real article titles and link to #/blog/<slug>.
//
// The result is cached for 5 minutes at the module level so we don't hit
// Supabase on every chat message (same pattern as chat-context.ts).

import { getServerClient } from "./supabase";

// ---------------------------------------------------------------------------
// Row shape (loosened — Supabase returns `any` rows)
// ---------------------------------------------------------------------------
interface BlogRow {
  slug: string;
  titre_fr?: string | null;
  titre_ar?: string | null;
  contenu_fr?: string | null;
  contenu_ar?: string | null;
}

// ---------------------------------------------------------------------------
// Cache (module-level, per server instance)
// ---------------------------------------------------------------------------
interface BlogCache {
  text: string;
  ts: number;
}

let cache: BlogCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Keep the prompt bounded: 12 recent posts × ~220 chars ≈ 3 KB.
const MAX_POSTS = 12;
const MAX_EXCERPT_CHARS = 180;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function safe(str: string | null | undefined): string {
  return String(str || "").trim();
}

function excerptFrom(html: string): string {
  const text = html
    .replace(/<[^>]+>/g, " ") // strip tags
    .replace(/&nbsp;|&amp;|&quot;|&#39;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length <= MAX_EXCERPT_CHARS
    ? text
    : `${text.slice(0, MAX_EXCERPT_CHARS - 1).trimEnd()}…`;
}

// ---------------------------------------------------------------------------
// Core builder
// ---------------------------------------------------------------------------
async function fetchBlogText(): Promise<string> {
  const sb = getServerClient();

  const res = await sb
    .from("blog_posts")
    .select("slug, titre_fr, titre_ar, contenu_fr, contenu_ar")
    .eq("publie", true)
    .order("created_at", { ascending: false })
    .limit(MAX_POSTS);

  if (res.error) {
    throw new Error(`blog_posts query failed: ${res.error.message}`);
  }

  const rows: BlogRow[] = (res.data || []) as BlogRow[];
  if (rows.length === 0) {
    // No published posts (or empty table) → nothing to inject.
    return "";
  }

  const lines: string[] = [];
  lines.push(`ARTICLES DE BLOG ODG (${rows.length} articles publiés — propose le lien correspondant quand le sujet s'y prête):`);
  for (const r of rows) {
    const title = safe(r.titre_fr) || safe(r.titre_ar) || r.slug;
    const exc = excerptFrom(safe(r.contenu_fr) || safe(r.contenu_ar));
    lines.push(`- ${title} → #/blog/${r.slug}${exc ? ` — ${exc}` : ""}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function buildBlogContext(): Promise<string> {
  // Serve from cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.text;
  }

  try {
    const text = await fetchBlogText();
    cache = { text, ts: Date.now() };
    return text;
  } catch (err: any) {
    // Don't cache the failure — next request should retry.
    console.error("[chat-blog] buildBlogContext failed:", err?.message || err);
    // Blog is optional for the assistant: return empty, the prompt simply
    // won't include the blog section.
    return "";
  }
}

// Exported mainly for tests / admin debugging.
export function clearBlogCache(): void {
  cache = null;
}
