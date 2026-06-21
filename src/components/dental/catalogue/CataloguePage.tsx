"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  PackageSearch,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCard } from "@/components/dental/catalogue/ProductCard";
import { useTranslation } from "@/lib/i18n";
import { useData } from "@/lib/data-service";
import { navigate } from "@/lib/router";

export function CataloguePage({ category }: { category?: string }) {
  const { t, lang } = useTranslation();
  const { categories, products, loading } = useData();

  // Pre-fill filters based on URL category
  const [categoryFilter, setCategoryFilter] = useState<string>(category || "all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Sync URL category prop changes
  useEffect(() => {
    setCategoryFilter(category || "all");
  }, [category]);

  // Unique brands from products
  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== "all" && p.categorySlug !== categoryFilter) return false;
      if (brandFilter !== "all" && p.brand !== brandFilter) return false;
      if (featuredOnly && !p.featured) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [
          p.name.fr,
          p.name.ar,
          p.brand,
          p.model,
          p.slug,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, categoryFilter, brandFilter, search, featuredOnly]);

  const activeCategory = categories.find((c) => c.slug === categoryFilter);
  const pageTitle = activeCategory
    ? activeCategory.name[lang]
    : t("catalogue");

  const resetFilters = () => {
    setCategoryFilter("all");
    setBrandFilter("all");
    setSearch("");
    setFeaturedOnly(false);
  };

  const hasActiveFilters =
    categoryFilter !== "all" ||
    brandFilter !== "all" ||
    search !== "" ||
    featuredOnly;

  const Filters = (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search")}
          className="pl-9 rtl:pl-3 rtl:pr-9"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 rtl:right-auto rtl:left-2"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category select */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
          {t("category")}
        </label>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.slug}>
                {c.name[lang]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Brand select */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
          {t("brand")}
        </label>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allBrands")}</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Featured toggle */}
      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
        <button
          type="button"
          role="switch"
          aria-checked={featuredOnly}
          onClick={() => setFeaturedOnly((v) => !v)}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            featuredOnly ? "bg-brand-700" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
              featuredOnly ? "left-4 rtl:left-0.5 rtl:right-4" : "left-0.5 rtl:right-0.5"
            }`}
          />
        </button>
        <Star
          className={`h-4 w-4 ${
            featuredOnly ? "fill-brand-500 text-brand-500" : "text-slate-400"
          }`}
        />
        {t("featured")}
      </label>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="w-full justify-center text-brand-700 hover:bg-brand-50"
        >
          <X className="h-4 w-4" />
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );

  return (
    <div className="bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          {/* Breadcrumb */}
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
            <button
              onClick={() => navigate("")}
              className="hover:text-brand-700"
            >
              {t("breadcrumbHome")}
            </button>
            <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
            <button
              onClick={() => navigate("catalogue")}
              className="hover:text-brand-700"
            >
              {t("catalogue")}
            </button>
            {activeCategory && (
              <>
                <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
                <span className="text-slate-700">{activeCategory.name[lang]}</span>
              </>
            )}
          </nav>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                {pageTitle}
              </h1>
              {activeCategory && (
                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  {activeCategory.description[lang]}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="self-start sm:self-auto">
              {filtered.length} {t("productsCount")}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Mobile filter toggle */}
        <div className="mb-4 lg:hidden">
          <Button
            variant="outline"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="w-full justify-center"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t("filterBy")}
          </Button>
        </div>

        <div className="flex gap-6">
          {/* Sidebar filters (desktop) */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-20">
              <Card className="border-slate-200">
                <CardContent className="p-5">{Filters}</CardContent>
              </Card>
            </div>
          </aside>

          {/* Mobile filters drawer */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setMobileFiltersOpen(false)}
              />
              <div className="absolute right-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-white p-5 shadow-xl rtl:left-0 rtl:right-auto">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold">{t("filterBy")}</h3>
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {Filters}
                <Button
                  className="mt-4 w-full"
                  onClick={() => setMobileFiltersOpen(false)}
                >
                  {t("viewProducts")}
                </Button>
              </div>
            </div>
          )}

          {/* Product grid */}
          <div className="flex-1">
            {loading ? (
              <ProductGridSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState
                onReset={resetFilters}
                onBrowse={() => navigate("catalogue")}
                hasFilters={hasActiveFilters}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: (i % 8) * 0.04 }}
                  >
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  onReset,
  onBrowse,
  hasFilters,
}: {
  onReset: () => void;
  onBrowse: () => void;
  hasFilters: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Card className="border-dashed border-slate-300 bg-white">
      <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <PackageSearch className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {t("noProducts")}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{t("noProductsDesc")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasFilters && (
            <Button variant="outline" onClick={onReset}>
              <X className="h-4 w-4" />
              {t("clearFilters")}
            </Button>
          )}
          <Button onClick={onBrowse}>{t("browseCatalogue")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="overflow-hidden border-slate-200">
          <div className="aspect-[4/3] w-full animate-pulse bg-slate-100" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
          </div>
        </Card>
      ))}
    </div>
  );
}
