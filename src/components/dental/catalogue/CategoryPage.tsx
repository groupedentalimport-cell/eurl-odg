"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, ChevronLeft, PackageSearch, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/dental/catalogue/ProductCard";
import { useTranslation } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import type { Product } from "@/lib/types";

interface CategoryInfo {
  slug: string;
  name: { fr: string; ar: string };
  description?: { fr?: string; ar?: string };
}

// (Public pricing policy: no prices are displayed on the site —
//  every product shows "Sur devis". Price fields are never rendered.)

export function CategoryPage({
  category,
  initialProducts,
}: {
  category?: CategoryInfo;
  initialProducts?: Product[];
}) {
  const { t, lang } = useTranslation();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"default" | "rating">("default");

  const products = initialProducts || [];

  const filtered = useMemo(() => {
    let list = products;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const hay = [p.name.fr, p.name.ar, p.brand, p.model, p.slug]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (sort === "rating") {
      list = [...list].sort((a, b) => (b.ratingValue || 0) - (a.ratingValue || 0));
    }
    return list;
  }, [products, query, sort]);

  const categoryName = category?.name?.[lang] || category?.slug || "";
  const categoryDesc =
    category?.description?.[lang] || category?.description?.fr || "";

  // Stats — shown above the product grid for SEO + UX.
  const stats = useMemo(() => {
    const featuredCount = products.filter((p) => p.featured).length;
    const brands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean)));
    return {
      total: products.length,
      featured: featuredCount,
      brands,
    };
  }, [products]);

  return (
    <div className="bg-slate-50">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <button onClick={() => navigate("")} className="hover:text-brand-700">
              {t("breadcrumbHome")}
            </button>
            <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
            <button onClick={() => navigate("catalogue")} className="hover:text-brand-700">
              {t("catalogue")}
            </button>
            <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
            <span className="line-clamp-1 text-slate-700">{categoryName}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Badge variant="secondary" className="mb-3 bg-brand-50 text-brand-700">
            {stats.total} produit{stats.total > 1 ? "s" : ""}
          </Badge>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            {categoryName}
          </h1>
          {categoryDesc && (
            <p className="mx-auto mt-4 max-w-3xl text-slate-600 leading-relaxed">
              {categoryDesc}
            </p>
          )}

          {/* Stats bar */}
          {stats.total > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              {stats.brands.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Marques :</span>
                  {stats.brands.map((b) => (
                    <Badge key={b} variant="outline" className="border-brand-200 text-brand-700">
                      {b}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="font-semibold text-brand-700">{t("configOnRequest")}</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Filters */}
        {stats.total > 0 && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher dans cette catégorie..."
                className="pl-9"
                aria-label="Rechercher"
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label htmlFor="sort-select" className="text-slate-600">
                Trier par :
              </label>
              <select
                id="sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm"
              >
                <option value="default">Pertinence</option>
                <option value="rating">Mieux notés</option>
              </select>
            </div>
          </div>
        )}

        {/* Products grid */}
        <div className="mt-8">
          {filtered.length === 0 ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
              <PackageSearch className="h-12 w-12 text-slate-300" />
              <p className="mt-4 text-slate-500">
                {stats.total === 0
                  ? "Aucun produit dans cette catégorie pour le moment. Contactez-nous pour plus d'informations."
                  : "Aucun produit ne correspond à votre recherche."}
              </p>
              {stats.total === 0 && (
                <Button className="mt-6" onClick={() => navigate("contact")}>
                  Contactez-nous
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4) }}
                >
                  <ProductCard product={p} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* sr-only block — visible to AI crawlers, hidden from humans.
            Provides a textual description of the category and its products
            for AI knowledge graphs (ChatGPT, Claude, Perplexity, Gemini). */}
        <section
          className="sr-only"
          aria-label={"Description de la catégorie " + categoryName}
        >
          <h2>{categoryName} — matériel dentaire en Algérie</h2>
          <p>
            Cette catégorie présente les produits {categoryName.toLowerCase()}{" "}
            distribués en Algérie par OUADAH DENTAL GROUPE. {stats.total} produit
            {stats.total > 1 ? "s" : ""} disponible{stats.total > 1 ? "s" : ""}.
          </p>
          {stats.brands.length > 0 && (
            <p>Marques représentées : {stats.brands.join(", ")}.</p>
          )}
          <p>Tous les équipements de cette catégorie sont proposés sur devis.</p>
          {products.length > 0 && (
            <div>
              <h3>Produits de cette catégorie</h3>
              <ul>
                {products.map((p) => (
                  <li key={p.id}>
                    {p.name.fr} — {p.brand} {p.model}. Disponible sur devis.
                    {p.ratingValue
                      ? " Note " + p.ratingValue.toFixed(1) + "/5 (" + p.ratingCount + " avis)."
                      : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p>
            Pour un devis personnalisé ou des informations complémentaires,
            contactez OUADAH DENTAL GROUPE au +213 540 00 00 00 ou par email à
            contact@odg-dz.com.
          </p>
        </section>

        {/* CTA */}
        <section className="mt-14 rounded-xl bg-brand-50 p-8 text-center">
          <h2 className="mb-3 text-2xl font-bold text-slate-900">
            Besoin d'aide pour choisir ?
          </h2>
          <p className="mb-6 mx-auto max-w-2xl text-slate-700">
            Notre équipe vous conseille sur le choix du matériel dentaire adapté à
            votre cabinet, votre spécialité et votre budget. Devis personnalisé
            sous 24h ouvrées.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" onClick={() => navigate("devis")}>
              Demander un devis
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("contact")}>
              Nous contacter
            </Button>
            <Button size="lg" variant="ghost" onClick={() => navigate("faq")}>
              <Star className="h-4 w-4" />
              Voir la FAQ
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
