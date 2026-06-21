"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Category, Product, BlogPost } from "./types";
import { MOCK_CATEGORIES, MOCK_PRODUCTS, MOCK_BLOG_POSTS, CATEGORY_DESCRIPTIONS } from "./mock-data";
import { isSupabaseConfigured, supabase, getProductImageUrl, getBlogImageUrl } from "./supabase";

interface DataContextValue {
  categories: Category[];
  products: Product[];
  blogPosts: BlogPost[];
  loading: boolean;
  usingMock: boolean;
  error: string | null;
}

const DataContext = createContext<DataContextValue>({
  categories: MOCK_CATEGORIES,
  products: MOCK_PRODUCTS,
  blogPosts: MOCK_BLOG_POSTS,
  loading: false,
  usingMock: true,
  error: null,
});

export function useData() {
  return useContext(DataContext);
}

function mapCategory(row: any): Category {
  const slug = row.slug || "";
  return {
    id: row.id,
    slug,
    name: { fr: row.nom_fr || slug, ar: row.nom_ar || row.nom_fr || slug },
    description: CATEGORY_DESCRIPTIONS[slug] || { fr: "", ar: "" },
    icon: row.icone || "Package",
    order: row.ordre ?? 0,
  };
}

function mapProduct(row: any): Product {
  const images: string[] = Array.isArray(row.images) ? row.images : [];
  const specsRaw = row.specs && typeof row.specs === "object" ? row.specs : {};
  const specs = Object.entries(specsRaw).map(([k, v]) => ({
    label: { fr: k, ar: k },
    value: String(v ?? ""),
  }));
  return {
    id: row.id,
    slug: row.slug,
    name: { fr: row.nom_fr || row.slug, ar: row.nom_ar || row.nom_fr || row.slug },
    description: {
      fr: row.description_fr || "",
      ar: row.description_ar || row.description_fr || "",
    },
    specs,
    images,
    pdfUrl: row.pdf_url || undefined,
    brochurePdf: row.brochure_pdf || undefined,
    categoryId: row.category_id || "",
    categorySlug: row.category_slug || "",
    brand: (row.marque || "").trim(),
    model: row.modele || "",
    featured: Boolean(row.en_vedette),
    available: row.disponible !== false,
    order: row.ordre ?? 0,
    audience: Array.isArray(row.cible) ? row.cible : [],
  };
}

function mapBlogPost(row: any): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: { fr: row.titre_fr || row.slug, ar: row.titre_ar || row.titre_fr || row.slug },
    excerpt: {
      fr: (row.contenu_fr || "").replace(/<[^>]+>/g, "").slice(0, 160),
      ar: (row.contenu_ar || "").replace(/<[^>]+>/g, "").slice(0, 160),
    },
    content: { fr: row.contenu_fr || "", ar: row.contenu_ar || row.contenu_fr || "" },
    imageUrl: row.image_url || "",
    published: row.publie !== false,
    author: row.auteur || "Equipe ODG",
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(MOCK_BLOG_POSTS);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const [catRes, prodRes, blogRes] = await Promise.all([
          supabase.from("categories").select("*").order("ordre", { ascending: true }),
          supabase.from("products").select("*").order("ordre", { ascending: true }),
          supabase.from("blog_posts").select("*").eq("publie", true).order("created_at", { ascending: false }),
        ]);

        if (cancelled) return;

        const errs = [catRes.error, prodRes.error, blogRes.error].filter(Boolean);
        if (errs.length) {
          console.warn("Supabase partial error, keeping mock:", errs);
          setError("Some data could not be loaded from Supabase.");
          setLoading(false);
          return;
        }

        // Build category slug lookup
        const cats = (catRes.data || []).map(mapCategory);
        const catById = new Map(cats.map((c) => [c.id, c.slug]));

        const prods = (prodRes.data || []).map((p) => {
          const mapped = mapProduct(p);
          if (!mapped.categorySlug && mapped.categoryId) {
            mapped.categorySlug = catById.get(mapped.categoryId) || "";
          }
          return mapped;
        });

        const posts = (blogRes.data || []).map(mapBlogPost);

        if (cats.length) setCategories(cats);
        if (prods.length) setProducts(prods);
        if (posts.length) setBlogPosts(posts);
        setUsingMock(false);
      } catch (e: any) {
        console.warn("DataProvider: Supabase fetch failed, using mock:", e?.message);
        setError(e?.message || "Fetch failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DataContext.Provider value={{ categories, products, blogPosts, loading, usingMock, error }}>
      {children}
    </DataContext.Provider>
  );
}

// Helpers
export function useProductBySlug(slug?: string) {
  const { products } = useData();
  return products.find((p) => p.slug === slug);
}

export function useProductsByCategory(categorySlug?: string) {
  const { products } = useData();
  if (!categorySlug) return products;
  return products.filter((p) => p.categorySlug === categorySlug);
}

export function useBlogBySlug(slug?: string) {
  const { blogPosts } = useData();
  return blogPosts.find((p) => p.slug === slug);
}

export { getProductImageUrl, getBlogImageUrl };
