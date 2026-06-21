"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Trash2,
  GitCompare,
  FileText,
  ChevronLeft,
  CheckCircle,
  XCircle,
  PackageSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SupabaseImage } from "@/components/dental/ui/SupabaseImage";
import { useTranslation } from "@/lib/i18n";
import { useCompare } from "@/hooks/useCompare";
import { useData } from "@/lib/data-service";
import { navigate } from "@/lib/router";
import { toast } from "@/components/ui/sonner";
import type { Product } from "@/lib/types";

export function ComparePage() {
  const { t, lang } = useTranslation();
  const { categories } = useData();
  const compare = useCompare((s) => s);
  const items: Product[] = compare.items;

  // Collect all unique spec labels across compared products (preserve insertion order)
  const specLabels = useMemo(() => {
    const labels: { fr: string; ar: string }[] = [];
    const seen = new Set<string>();
    items.forEach((p) => {
      p.specs.forEach((s) => {
        const key = s.label.fr + "|" + s.label.ar;
        if (!seen.has(key)) {
          seen.add(key);
          labels.push({ fr: s.label.fr, ar: s.label.ar });
        }
      });
    });
    return labels;
  }, [items]);

  const getSpecValue = (p: Product, label: { fr: string; ar: string }) => {
    const found = p.specs.find(
      (s) => s.label.fr === label.fr && s.label.ar === label.ar
    );
    return found?.value || "—";
  };

  const getCategoryName = (p: Product) => {
    const c = categories.find((c) => c.slug === p.categorySlug);
    return c ? c.name[lang] : p.categorySlug;
  };

  const handleClear = () => {
    compare.clear();
    toast.success(t("clearAll"));
  };

  const handleRemove = (id: string, name: string) => {
    compare.remove(id);
    toast.success("Retiré du comparateur", { description: name });
  };

  if (items.length === 0) {
    return <CompareEmpty />;
  }

  // Build rows for the comparison table
  const rows: {
    key: string;
    label: string;
    render: (p: Product) => React.ReactNode;
  }[] = [
    {
      key: "image",
      label: "",
      render: (p) => (
        <div className="relative mx-auto aspect-square w-full max-w-[160px] overflow-hidden rounded-lg bg-slate-100">
          <SupabaseImage
            filename={p.images[0]}
            alt={p.name[lang]}
            fallbackText={p.name[lang]}
            className="h-full w-full object-cover"
          />
        </div>
      ),
    },
    {
      key: "name",
      label: t("description"),
      render: (p) => (
        <button
          onClick={() => navigate(`produit/${p.slug}`)}
          className="text-left font-semibold text-brand-700 hover:underline"
        >
          {p.name[lang]}
        </button>
      ),
    },
    {
      key: "brand",
      label: t("brand"),
      render: (p) => <span className="font-medium">{p.brand}</span>,
    },
    {
      key: "model",
      label: t("model"),
      render: (p) => <span>{p.model}</span>,
    },
    {
      key: "category",
      label: t("category"),
      render: (p) => <span>{getCategoryName(p)}</span>,
    },
    {
      key: "featured",
      label: t("featured"),
      render: (p) =>
        p.featured ? (
          <CheckCircle className="mx-auto h-5 w-5 text-brand-600" />
        ) : (
          <XCircle className="mx-auto h-5 w-5 text-slate-300" />
        ),
    },
    {
      key: "available",
      label: t("availability"),
      render: (p) =>
        p.available ? (
          <Badge variant="success">{t("yes")}</Badge>
        ) : (
          <Badge variant="warning">{t("no")}</Badge>
        ),
    },
    // Dynamic spec rows
    ...specLabels.map((label) => ({
      key: `spec-${label.fr}`,
      label: label[lang],
      render: (p: Product) => (
        <span className="text-slate-700">{getSpecValue(p, label)}</span>
      ),
    })),
  ];

  return (
    <div className="bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
            <button onClick={() => navigate("")} className="hover:text-brand-700">
              {t("breadcrumbHome")}
            </button>
            <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
            <span className="text-slate-700">{t("compareTitle")}</span>
          </nav>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <GitCompare className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  {t("compareTitle")}
                </h1>
                <p className="text-sm text-slate-500">
                  {items.length} / 4 {t("productsCount")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={items.length === 0}
              >
                <Trash2 className="h-4 w-4" />
                {t("clearAll")}
              </Button>
              <Button
                onClick={() => navigate("devis")}
                disabled={items.length === 0}
              >
                <FileText className="h-4 w-4" />
                {t("requestQuoteSelected")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="overflow-hidden border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="sticky left-0 z-10 w-32 min-w-32 border-b border-slate-200 bg-slate-50 px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("specs")}
                    </th>
                    {items.map((p) => (
                      <th
                        key={p.id}
                        className="border-b border-l border-slate-200 px-4 py-3 align-top"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="relative aspect-square w-full max-w-[140px] overflow-hidden rounded-lg bg-slate-100">
                            <SupabaseImage
                              filename={p.images[0]}
                              alt={p.name[lang]}
                              fallbackText={p.name[lang]}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <button
                            onClick={() => navigate(`produit/${p.slug}`)}
                            className="text-center text-sm font-semibold text-brand-700 hover:underline"
                          >
                            {p.name[lang]}
                          </button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleRemove(p.id, p.name[lang])}
                            aria-label={t("remove")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </th>
                    ))}
                    {/* Empty slots */}
                    {Array.from({ length: Math.max(0, 4 - items.length) }).map(
                      (_, i) => (
                        <th
                          key={`empty-${i}`}
                          className="border-b border-l border-dashed border-slate-200 px-4 py-3"
                        >
                          <button
                            onClick={() => navigate("catalogue")}
                            className="flex h-32 w-full max-w-[140px] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-200 text-slate-400 transition-colors hover:border-brand-300 hover:text-brand-600"
                          >
                            <PackageSearch className="h-6 w-6" />
                            <span className="text-xs">+</span>
                          </button>
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter((r) => r.key !== "image") // image already in header
                    .map((row, ri) => (
                      <tr
                        key={row.key}
                        className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
                      >
                        <th className="sticky left-0 z-10 w-32 min-w-32 border-b border-slate-200 bg-inherit px-4 py-3 text-start text-xs font-semibold text-slate-600">
                          {row.label}
                        </th>
                        {items.map((p) => (
                          <td
                            key={p.id}
                            className="border-b border-l border-slate-200 px-4 py-3 text-center"
                          >
                            {row.render(p)}
                          </td>
                        ))}
                        {Array.from({
                          length: Math.max(0, 4 - items.length),
                        }).map((_, i) => (
                          <td
                            key={`empty-${i}`}
                            className="border-b border-l border-dashed border-slate-200 bg-slate-50/20"
                          />
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Mobile hint */}
        <p className="mt-4 text-center text-xs text-slate-400 lg:hidden">
          ← {t("search")} →
        </p>
      </div>
    </div>
  );
}

function CompareEmpty() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <GitCompare className="h-10 w-10" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">{t("compareEmpty")}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        {t("compareEmptyDesc")}
      </p>
      <Button className="mt-6" onClick={() => navigate("catalogue")}>
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        {t("browseCatalogue")}
      </Button>
    </div>
  );
}
