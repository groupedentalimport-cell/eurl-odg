import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

/**
 * robots.txt for OUADAH DENTAL GROUPE.
 *
 * AI / LLM crawler policy:
 *   We EXPLICITLY allow all major AI crawlers so the site appears in
 *   answers from ChatGPT (OpenAI), Claude (Anthropic), Perplexity,
 *   Gemini (Google), Copilot (Microsoft), Apple Intelligence, etc.
 *
 *   Each AI vendor documents its crawler User-Agent:
 *     - GPTBot, OAI-SearchBot         → OpenAI / ChatGPT / SearchGPT
 *     - ClaudeBot, Claude-Web, anthropic-ai → Anthropic / Claude
 *     - PerplexityBot, Perplexity-User → Perplexity
 *     - Google-Extended               → Gemini (Google's AI training)
 *     - CCBot                         → Common Crawl (used by many open LLMs)
 *     - Bytespider                    → ByteDance / Doubao
 *     - Applebot-Extended             → Apple Intelligence
 *     - cohere-ai                     → Cohere
 *     - Meta-ExternalAgent            → Meta AI
 *
 * The `ai.txt` and `/llms.txt` files (served separately) provide
 * additional machine-readable permission and content summaries.
 *
 * Non-AI policy:
 *   - Allow the entire public site.
 *   - Block /api/ (internal endpoints, never useful to index).
 *   - /admin is gated by auth + noindex metadata at the layout level.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // OpenAI / ChatGPT / SearchGPT
      {
        userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User"],
        allow: "/",
        disallow: ["/api/", "/admin", "/portal"],
      },
      // Anthropic / Claude
      {
        userAgent: ["ClaudeBot", "Claude-Web", "anthropic-ai", "Claude-SearchBot"],
        allow: "/",
        disallow: ["/api/", "/admin", "/portal"],
      },
      // Perplexity
      {
        userAgent: ["PerplexityBot", "Perplexity-User", "PerplexityBot-Recrawler"],
        allow: "/",
        disallow: ["/api/", "/admin", "/portal"],
      },
      // Google Gemini (AI training)
      {
        userAgent: "Google-Extended",
        allow: "/",
      },
      // Common Crawl (open dataset used by Llama, Mistral, etc.)
      {
        userAgent: "CCBot",
        allow: "/",
      },
      // Apple Intelligence
      {
        userAgent: "Applebot-Extended",
        allow: "/",
      },
      // Cohere
      {
        userAgent: "cohere-ai",
        allow: "/",
      },
      // Meta AI
      {
        userAgent: "Meta-ExternalAgent",
        allow: "/",
      },
      // ByteDance / Doubao
      {
        userAgent: "Bytespider",
        allow: "/",
      },
      // Amazon / Alexa AI
      {
        userAgent: "Amazonbot",
        allow: "/",
      },
      // Default rule for everyone else (Googlebot, Bingbot, etc.)
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/portal"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
