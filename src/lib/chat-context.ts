// Server-side helper that builds a textual snapshot of the live ODG product
// catalogue, to be injected into the chatbot's system prompt.
//
// Why: the LLM has no knowledge of ODG's actual inventory. By giving it a
// concise list of real product names / brands / models / categories, it can
// answer "quels fauteuils?" with concrete Silver Fox references instead of
// hallucinating generic chairs.
//
// The result is cached for 5 minutes at the module level so we don't hit
// Supabase on every chat message.

import { getServerClient } from "./supabase";

// ---------------------------------------------------------------------------
// Types (loosened — Supabase returns `any` rows)
// ---------------------------------------------------------------------------
interface CategoryRow {
  id?: string;
  slug: string;
  nom_fr?: string | null;
  nom_ar?: string | null;
}

interface ProductRow {
  slug: string;
  nom_fr?: string | null;
  nom_ar?: string | null;
  marque?: string | null;
  modele?: string | null;
  en_vedette?: boolean | null;
  disponible?: boolean | null;
  category_id?: string | null;
}

// ---------------------------------------------------------------------------
// Cache (module-level, per server instance)
// ---------------------------------------------------------------------------
interface CatalogueCache {
  text: string;
  ts: number;
}

let cache: CatalogueCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Fallback used when Supabase is unreachable / misconfigured / empty.
// Keeps the bot functional even with no DB access (e.g. local dev).
// ---------------------------------------------------------------------------
const BRANDS_FALLBACK = `CATALOGUE ODG (mode dégradé — catalogue live indisponible):

Marques distribuées (importateur exclusif):
- Silver Fox — fauteuils dentaires (modèles: 8000C, 8000C Implant, 8000C pro, 8000B-CRS0)
- ICANCLAVE — autoclaves classe B (modèles: STE-18-D 18L, STE-45-T 45L)
- OWANDY — radiologie dentaire (radio murale AC/DC, panoramique I-MAX 3D XPRO CEPH)

Catégories: Fauteuil Dentaire, Unit Dentaire, Radiologie, Stérilisation, Consommables`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function safe(str: string | null | undefined, fallback = ""): string {
  if (!str) return fallback;
  return String(str).trim();
}

function dispoLabel(p: ProductRow): string {
  // `disponible` defaults to true unless explicitly false
  return p.disponible === false ? "Indisponible" : "Disponible";
}

// ---------------------------------------------------------------------------
// Core builder
// ---------------------------------------------------------------------------
async function fetchCatalogueText(): Promise<string> {
  const sb = getServerClient();

  const [productsRes, categoriesRes] = await Promise.all([
    sb
      .from("products")
      .select(
        "slug, nom_fr, nom_ar, marque, modele, en_vedette, disponible, category_id"
      ),
    sb.from("categories").select("id, slug, nom_fr, nom_ar"),
  ]);

  if (productsRes.error) {
    throw new Error(`products query failed: ${productsRes.error.message}`);
  }
  if (categoriesRes.error) {
    throw new Error(`categories query failed: ${categoriesRes.error.message}`);
  }

  const products: ProductRow[] = (productsRes.data || []) as ProductRow[];
  const categories: CategoryRow[] = (categoriesRes.data || []) as CategoryRow[];

  // Empty catalogue → fallback (still better than nothing)
  if (products.length === 0 && categories.length === 0) {
    return BRANDS_FALLBACK;
  }

  // Build a category lookup: id → name (and slug → name as a safety net)
  const catById = new Map<string, string>();
  for (const c of categories) {
    const name = safe(c.nom_fr) || safe(c.nom_ar) || c.slug;
    if (c.id) catById.set(c.id, name);
    catById.set(c.slug, name);
  }

  const catNames = categories
    .map((c) => safe(c.nom_fr) || safe(c.nom_ar) || c.slug)
    .filter(Boolean);

  const featured = products.filter((p) => p.en_vedette === true);

  const lines: string[] = [];
  lines.push(
    `CATALOGUE ODG (${products.length} produits, ${categories.length} catégories):`
  );
  lines.push("");

  if (catNames.length > 0) {
    lines.push(`Catégories: ${catNames.join(", ")}`);
    lines.push("");
  }

  lines.push("Produits en vedette:");
  if (featured.length === 0) {
    lines.push("(aucun produit en vedette)");
  } else {
    for (const p of featured) {
      const cat = p.category_id ? catById.get(p.category_id) || "—" : "—";
      const mm = [safe(p.marque), safe(p.modele)].filter(Boolean).join(" ");
      const name = safe(p.nom_fr) || safe(p.nom_ar) || p.slug;
      const mmStr = mm ? ` (${mm})` : "";
      lines.push(`- ${name}${mmStr} — cat: ${cat} — ${dispoLabel(p)}`);
    }
  }
  lines.push("");

  lines.push("Tous les produits:");
  for (const p of products) {
    const cat = p.category_id ? catById.get(p.category_id) || "—" : "—";
    const name = safe(p.nom_fr) || safe(p.nom_ar) || p.slug;
    const mm = [safe(p.marque), safe(p.modele)].filter(Boolean).join(" ");
    const mmStr = mm ? ` (${mm})` : "";
    const vedette = p.en_vedette ? "oui" : "non";
    const dispo = p.disponible === false ? "non" : "oui";
    lines.push(
      `- [${p.slug}] ${name}${mmStr} — catégorie: ${cat} — vedette:${vedette} — dispo:${dispo}`
    );
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function buildCatalogueContext(): Promise<string> {
  // Serve from cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.text;
  }

  try {
    const text = await fetchCatalogueText();
    cache = { text, ts: Date.now() };
    return text;
  } catch (err: any) {
    // Don't cache the failure — next request should retry.
    console.error(
      "[chat-context] buildCatalogueContext failed:",
      err?.message || err
    );
    return BRANDS_FALLBACK;
  }
}

// Exported mainly for tests / admin debugging.
export function clearCatalogueCache(): void {
  cache = null;
}
