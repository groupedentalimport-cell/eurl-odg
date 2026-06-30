"use client";

// ============================================================
// Cabinet Configurator (Task BONUS-1 v2 — 5-step interactive wizard)
// ------------------------------------------------------------
// The client builds their dental cabinet equipment package step by step:
//   1. Choose a dental chair    (fauteuil-dentaire)  — single select
//   2. Choose an autoclave      (sterilisation)      — single select
//   3. Choose a radiology system (radiologie)         — single select
//   4. Optional accessories     (consommables)       — multi-select (skip if empty)
//   5. Summary + estimated total + CTA → push to quote cart + /devis
//
// Pricing policy:
//   - If a product has a price in its `specs` (label "Prix" or "Price"),
//     parse the numeric value and use it as the indicative price (DZD).
//   - Otherwise, display "Sur devis" (on request) — no price contribution.
//
// All amounts are INDICATIVE — the real quote comes from /devis.
// ============================================================

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  ShoppingCart,
  Info,
  Armchair,
  ShieldCheck,
  Radiation,
  Package,
  ChevronLeft,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SupabaseImage } from "@/components/dental/ui/SupabaseImage";
import { useTranslation, type TKey } from "@/lib/i18n";
import { useData } from "@/lib/data-service";
import { useQuoteCart } from "@/hooks/useQuoteCart";
import { navigate } from "@/lib/router";
import { toast } from "@/components/ui/sonner";
import type { Product } from "@/lib/types";

// ------------------------------------------------------------
// Price extraction — looks for a spec whose label.fr is "Prix" or "Price",
// parses the numeric portion of the value (strips "DZD", spaces, etc).
// Returns null when no price is found → display "Sur devis".
// ------------------------------------------------------------
function getProductPrice(product: Product): number | null {
  if (!product.specs || product.specs.length === 0) return null;
  for (const sp of product.specs) {
    const label = (sp.label?.fr || "").trim().toLowerCase();
    if (label === "prix" || label === "price" || label === "tarif") {
      const raw = String(sp.value || "").trim();
      // Extract the first numeric group (allow thousands separators: space, comma, dot)
      const match = raw.match(/\d[\d\s.,]*/);
      if (!match) return null;
      // Strip thousand separators: remove spaces, dots, commas in the middle,
      // but be tolerant: keep only digits.
      const digits = match[0].replace(/[^\d]/g, "");
      if (!digits) return null;
      const n = parseInt(digits, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
  }
  return null;
}

const TVA_RATE = 0.19;

function formatDZD(n: number): string {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " DZD";
}

// ------------------------------------------------------------
// Step definitions
// ------------------------------------------------------------
type StepKind = "single" | "multi" | "summary";
type StepKey = "fauteuil" | "autoclave" | "radio" | "accessories" | "summary";

interface StepDef {
  key: StepKey;
  kind: StepKind;
  categorySlug?: string; // for product-fetch steps
  titleKey: TKey;
  hintKey: TKey;
  icon: LucideIcon;
  allowNone: boolean; // can be skipped without selection
}

const STEPS: StepDef[] = [
  {
    key: "fauteuil",
    kind: "single",
    categorySlug: "fauteuil-dentaire",
    titleKey: "configStep1",
    hintKey: "configStep1Hint",
    icon: Armchair,
    allowNone: false,
  },
  {
    key: "autoclave",
    kind: "single",
    categorySlug: "sterilisation",
    titleKey: "configStep2",
    hintKey: "configStep2Hint",
    icon: ShieldCheck,
    allowNone: true,
  },
  {
    key: "radio",
    kind: "single",
    categorySlug: "radiologie",
    titleKey: "configStep3",
    hintKey: "configStep3Hint",
    icon: Radiation,
    allowNone: true,
  },
  {
    key: "accessories",
    kind: "multi",
    categorySlug: "consommables",
    titleKey: "configStep4",
    hintKey: "configStep4Hint",
    icon: Package,
    allowNone: true,
  },
  {
    key: "summary",
    kind: "summary",
    titleKey: "configStep5",
    hintKey: "configStep5Hint",
    icon: Sparkles,
    allowNone: true,
  },
];

interface Selections {
  fauteuil?: Product;
  autoclave?: Product;
  radio?: Product;
  accessories: Product[];
}

// ============================================================
// Main component
// ============================================================
export function CabinetConfigurator() {
  const { t, lang, dir } = useTranslation();
  const { products, loading } = useData();
  const add = useQuoteCart((s) => s.add);

  const [stepIndex, setStepIndex] = useState(0);
  const [selections, setSelections] = useState<Selections>({
    accessories: [],
  });

  const step = STEPS[stepIndex];

  // Available products for the current step (single + multi steps).
  const stepProducts = useMemo(() => {
    if (!step.categorySlug) return [];
    return products
      .filter((p) => p.categorySlug === step.categorySlug)
      .sort((a, b) => a.order - b.order);
  }, [products, step.categorySlug]);

  // The accessories step is auto-skipped when there are no products in
  // the consommables category — the user simply can't see it.
  const visibleSteps = useMemo(() => {
    const consommablesCount = products.filter(
      (p) => p.categorySlug === "consommables"
    ).length;
    if (consommablesCount === 0) {
      return STEPS.filter((s) => s.key !== "accessories");
    }
    return STEPS;
  }, [products]);

  const currentVisibleStep = visibleSteps[stepIndex];

  // List of all selected products (single + multi) for totals + CTA.
  const selectedList = useMemo(() => {
    const list: Product[] = [];
    if (selections.fauteuil) list.push(selections.fauteuil);
    if (selections.autoclave) list.push(selections.autoclave);
    if (selections.radio) list.push(selections.radio);
    list.push(...selections.accessories);
    return list;
  }, [selections]);

  const totalWithPrice = useMemo(() => {
    let sum = 0;
    let hasAnyPrice = false;
    let allHavePrice = true;
    for (const p of selectedList) {
      const price = getProductPrice(p);
      if (price == null) {
        allHavePrice = false;
      } else {
        sum += price;
        hasAnyPrice = true;
      }
    }
    return { sum, hasAnyPrice, allHavePrice, count: selectedList.length };
  }, [selectedList]);

  const tva = Math.round(totalWithPrice.sum * TVA_RATE);
  const totalTTC = totalWithPrice.sum + tva;

  // ---- Selection handlers ----
  function selectSingle(stepKey: StepKey, product: Product) {
    setSelections((prev) => ({ ...prev, [stepKey]: product }));
  }
  function clearSingle(stepKey: StepKey) {
    setSelections((prev) => {
      const next = { ...prev };
      delete next[stepKey as "fauteuil" | "autoclave" | "radio"];
      return next;
    });
  }
  function toggleAccessory(product: Product) {
    setSelections((prev) => {
      const exists = prev.accessories.some((p) => p.id === product.id);
      return {
        ...prev,
        accessories: exists
          ? prev.accessories.filter((p) => p.id !== product.id)
          : [...prev.accessories, product],
      };
    });
  }
  function isAccessorySelected(productId: string) {
    return selections.accessories.some((p) => p.id === productId);
  }

  function handleReset() {
    setSelections({ accessories: [] });
    setStepIndex(0);
  }

  function handleRequestQuote() {
    if (selectedList.length === 0) {
      toast.error(t("configNoSelection"));
      return;
    }
    selectedList.forEach((p) => add(p, 1));
    toast.success(t("configAddedToQuote"), {
      description: `${selectedList.length} ${t("configSelectedCount")}`,
    });
    navigate("devis");
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, visibleSteps.length - 1));
  }
  function goPrev() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }
  function jumpTo(i: number) {
    setStepIndex(Math.max(0, Math.min(i, visibleSteps.length - 1)));
  }

  const isLast = stepIndex === visibleSteps.length - 1;
  const isFirst = stepIndex === 0;
  const selectedCount = selectedList.length;
  const currentSelection =
    currentVisibleStep?.key === "fauteuil"
      ? selections.fauteuil
      : currentVisibleStep?.key === "autoclave"
      ? selections.autoclave
      : currentVisibleStep?.key === "radio"
      ? selections.radio
      : undefined;

  return (
    <div className="bg-slate-50">
      {/* ===== Page header ===== */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
            <button
              onClick={() => navigate("")}
              className="hover:text-brand-700"
            >
              {t("breadcrumbHome")}
            </button>
            <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
            <span className="text-slate-700">{t("configuratorNav")}</span>
          </nav>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                {t("configuratorTitle")}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                {t("configuratorSubtitle")}
              </p>
            </div>
          </div>

          {/* Disclaimer banner — prominent */}
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>{t("configDisclaimer")}</span>
          </div>
        </div>
      </div>

      {/* ===== Body: steps + sticky summary ===== */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT — steps */}
          <div className="lg:col-span-2">
            <Stepper
              steps={visibleSteps}
              current={stepIndex}
              selections={selections}
              onJump={jumpTo}
            />

            <Card className="mt-4 border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <currentVisibleStep.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                      <span>{t(currentVisibleStep.titleKey)}</span>
                      {currentVisibleStep.allowNone && (
                        <Badge
                          variant="secondary"
                          className="bg-slate-100 text-xs font-medium text-slate-500"
                        >
                          {t("configOptional")}
                        </Badge>
                      )}
                      {!currentVisibleStep.allowNone &&
                        currentVisibleStep.kind === "single" && (
                          <Badge
                            variant="secondary"
                            className="bg-brand-50 text-xs font-medium text-brand-700"
                          >
                            {t("configRequired")}
                          </Badge>
                        )}
                    </CardTitle>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {t(currentVisibleStep.hintKey)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <StepSkeleton />
                ) : currentVisibleStep.kind === "summary" ? (
                  <SummaryStep
                    selections={selections}
                    totalSum={totalWithPrice.sum}
                    hasAnyPrice={totalWithPrice.hasAnyPrice}
                    allHavePrice={totalWithPrice.allHavePrice}
                    tva={tva}
                    totalTTC={totalTTC}
                    selectedCount={selectedCount}
                    onJump={jumpTo}
                    onRequestQuote={handleRequestQuote}
                    onReset={handleReset}
                  />
                ) : stepProducts.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Package className="h-7 w-7" />
                    </div>
                    <p className="text-sm text-slate-500">
                      {currentVisibleStep.key === "accessories"
                        ? t("configNoAccessories")
                        : t("configEmptyCategory")}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentVisibleStep.key}
                      initial={{ opacity: 0, x: dir === "rtl" ? -16 : 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: dir === "rtl" ? 16 : -16 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      {/* "Aucun" option — only for optional single steps */}
                      {currentVisibleStep.kind === "single" &&
                        currentVisibleStep.allowNone && (
                          <NoneCard
                            selected={!currentSelection}
                            onClick={() =>
                              clearSingle(currentVisibleStep.key)
                            }
                          />
                        )}
                      {stepProducts.map((p) => {
                        if (currentVisibleStep.kind === "multi") {
                          return (
                            <ProductOptionCard
                              key={p.id}
                              product={p}
                              selected={isAccessorySelected(p.id)}
                              multi
                              onSelect={() => toggleAccessory(p)}
                            />
                          );
                        }
                        return (
                          <ProductOptionCard
                            key={p.id}
                            product={p}
                            selected={currentSelection?.id === p.id}
                            onSelect={() =>
                              selectSingle(currentVisibleStep.key, p)
                            }
                          />
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                )}
              </CardContent>

              {/* Footer nav: Previous / Next */}
              {currentVisibleStep.kind !== "summary" && (
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-4">
                  <Button
                    variant="ghost"
                    onClick={goPrev}
                    disabled={isFirst}
                    className="text-slate-600"
                  >
                    <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    {t("configPrevious")}
                  </Button>
                  <Button onClick={goNext}>
                    {t("configNext")}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT — sticky summary (desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <SummaryCard
                selections={selections}
                totalSum={totalWithPrice.sum}
                hasAnyPrice={totalWithPrice.hasAnyPrice}
                allHavePrice={totalWithPrice.allHavePrice}
                tva={tva}
                totalTTC={totalTTC}
                selectedCount={selectedCount}
                onReset={handleReset}
                onRequestQuote={handleRequestQuote}
                onJump={jumpTo}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== Mobile sticky bottom bar ===== */}
      <MobileSummaryBar
        totalSum={totalWithPrice.sum}
        hasAnyPrice={totalWithPrice.hasAnyPrice}
        selectedCount={selectedCount}
        onReset={handleReset}
        onRequestQuote={handleRequestQuote}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress indicator                                                  */
/* ------------------------------------------------------------------ */
function Stepper({
  steps,
  current,
  selections,
  onJump,
}: {
  steps: StepDef[];
  current: number;
  selections: Selections;
  onJump: (i: number) => void;
}) {
  const { t } = useTranslation();
  const isDone = (s: StepDef) => {
    if (s.kind === "summary") return false;
    if (s.kind === "multi") return selections.accessories.length > 0;
    return Boolean(selections[s.key as "fauteuil" | "autoclave" | "radio"]);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => {
        const done = isDone(s);
        const active = i === current;
        const reached = i <= current;
        const Icon = s.icon;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onJump(i)}
            className={`group flex flex-1 items-center gap-2.5 rounded-lg border-2 bg-white px-3 py-2.5 text-start transition-all ${
              active
                ? "border-brand-400 ring-1 ring-brand-300"
                : done
                ? "border-brand-200"
                : "border-slate-200 hover:border-brand-200"
            }`}
            aria-current={active ? "step" : undefined}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                active
                  ? "bg-brand-700 text-white"
                  : done
                  ? "bg-brand-100 text-brand-700"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {done && !active ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className="hidden min-w-0 flex-1 sm:block">
              <span
                className={`block truncate text-xs font-semibold ${
                  reached ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {t(s.titleKey)}
              </span>
              <span className="block text-[10px] uppercase tracking-wide text-slate-400">
                {t("configStep")} {i + 1} {t("configOf")} {steps.length}
              </span>
            </span>
            <Icon
              className={`hidden h-4 w-4 shrink-0 sm:block ${
                active ? "text-brand-600" : "text-slate-300"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* "Aucun" option card                                                 */
/* ------------------------------------------------------------------ */
function NoneCard({
  selected,
  onClick,
}: {
  selected: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative flex h-full flex-col items-start gap-3 rounded-xl border-2 p-4 text-start transition-all ${
        selected
          ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-300"
          : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/30"
      }`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
          selected
            ? "bg-brand-100 text-brand-700"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        <Package className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900">
          {t("configNone")}
        </div>
        <div className="text-xs text-slate-500">{t("configNoneDesc")}</div>
      </div>
      {selected && (
        <span className="absolute end-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Product option card (selectable)                                    */
/* ------------------------------------------------------------------ */
function ProductOptionCard({
  product,
  selected,
  multi = false,
  onSelect,
}: {
  product: Product;
  selected: boolean;
  multi?: boolean;
  onSelect: () => void;
}) {
  const { t, lang } = useTranslation();
  const name = product.name[lang] || product.name.fr;
  const keySpecs = product.specs.slice(0, 3).filter((sp) => {
    const lbl = (sp.label?.fr || "").toLowerCase();
    return lbl !== "prix" && lbl !== "price" && lbl !== "tarif";
  });
  const price = getProductPrice(product);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl border-2 bg-white text-start transition-all ${
        selected
          ? "border-brand-500 ring-1 ring-brand-300"
          : "border-slate-200 hover:border-brand-300 hover:shadow-sm"
      }`}
    >
      {selected && (
        <span className="absolute end-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white shadow">
          {multi ? <Check className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
        </span>
      )}
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <SupabaseImage
          filename={product.images[0]}
          alt={name}
          fallbackText={name}
          width={400}
          height={300}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          {product.brand && (
            <span className="font-semibold text-brand-700">
              {product.brand}
            </span>
          )}
          {product.model && (
            <>
              <span>•</span>
              <span className="truncate">{product.model}</span>
            </>
          )}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
          {name}
        </h3>
        {keySpecs.length > 0 && (
          <ul className="mt-auto space-y-0.5 text-[11px] text-slate-500">
            {keySpecs.slice(0, 2).map((sp, i) => (
              <li key={i} className="flex gap-1">
                <span className="font-medium text-slate-600">
                  {sp.label[lang]}:
                </span>
                <span className="truncate">{sp.value}</span>
              </li>
            ))}
          </ul>
        )}
        <Separator className="my-1" />
        {/* Price tag */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {t("configEstimatedPrice")}
          </span>
          {price == null ? (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {t("configOnRequest")}
            </span>
          ) : (
            <span className="text-sm font-bold text-brand-700">
              {formatDZD(price)}
            </span>
          )}
        </div>
      </div>
      {/* Select button */}
      <div
        className={`flex items-center justify-center gap-1.5 border-t px-3 py-2 text-xs font-semibold transition-colors ${
          selected
            ? "border-brand-100 bg-brand-50 text-brand-700"
            : "border-slate-100 bg-slate-50/40 text-slate-600 group-hover:bg-brand-50/40 group-hover:text-brand-700"
        }`}
      >
        {selected ? (
          <>
            <Check className="h-3.5 w-3.5" />
            {t("configItemSelected")}
          </>
        ) : (
          <>{t("configSelectItem")}</>
        )}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Summary card (desktop sidebar)                                      */
/* ------------------------------------------------------------------ */
function SummaryCard({
  selections,
  totalSum,
  hasAnyPrice,
  allHavePrice,
  tva,
  totalTTC,
  selectedCount,
  onReset,
  onRequestQuote,
  onJump,
}: {
  selections: Selections;
  totalSum: number;
  hasAnyPrice: boolean;
  allHavePrice: boolean;
  tva: number;
  totalTTC: number;
  selectedCount: number;
  onReset: () => void;
  onRequestQuote: () => void;
  onJump: (i: number) => void;
}) {
  const { t, lang } = useTranslation();
  const rows: { key: string; product?: Product }[] = [
    { key: "fauteuil", product: selections.fauteuil },
    { key: "autoclave", product: selections.autoclave },
    { key: "radio", product: selections.radio },
  ];
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{t("configSummary")}</span>
          <Badge variant="secondary">
            {selectedCount} {t("configSelectedCount")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {selectedCount === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
            {t("configNoSelection")}
          </p>
        ) : (
          <ul className="space-y-2">
            {/* Single-select rows */}
            {rows.map(({ key, product }) => (
              <li key={key}>
                {product ? (
                  <SummaryRow product={product} />
                ) : (
                  <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-slate-200 px-2.5 py-2 text-xs text-slate-400">
                    <Package className="h-4 w-4" />
                    <span>{t("configNone")}</span>
                  </div>
                )}
              </li>
            ))}
            {/* Accessories (multi) */}
            {selections.accessories.length > 0 && (
              <li className="space-y-2 pt-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {t("configStep4")} ({selections.accessories.length})
                </div>
                {selections.accessories.map((p) => (
                  <SummaryRow key={p.id} product={p} compact />
                ))}
              </li>
            )}
          </ul>
        )}

        <Separator />

        {/* Totals — only shown when at least one item has a price */}
        {hasAnyPrice ? (
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">{t("configTotal")}</span>
              <span className="font-medium text-slate-800">
                {formatDZD(totalSum)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">{t("configTVA")}</span>
              <span className="font-medium text-slate-800">
                {formatDZD(tva)}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t border-slate-100 pt-2">
              <span className="font-semibold text-slate-900">
                {t("configTotalTTC")}
              </span>
              <span className="text-lg font-extrabold text-brand-700">
                {formatDZD(totalTTC)}
              </span>
            </div>
            {!allHavePrice && (
              <p className="pt-1 text-[11px] text-slate-500">
                {t("configOnRequest")} · {t("configDisclaimer")}
              </p>
            )}
          </div>
        ) : selectedCount > 0 ? (
          <div className="rounded-lg bg-brand-50/50 px-3 py-3 text-center">
            <p className="text-sm font-semibold text-brand-700">
              {t("configOnRequest")}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {t("configDisclaimer")}
            </p>
          </div>
        ) : null}

        {/* Disclaimer */}
        <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          {t("configDisclaimer")}
        </p>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <Button
            className="w-full"
            size="lg"
            onClick={onRequestQuote}
            disabled={selectedCount === 0}
          >
            <ShoppingCart className="h-4 w-4" />
            {t("configRequestQuote")}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-slate-500 hover:bg-slate-100"
            onClick={onReset}
          >
            <RotateCcw className="h-4 w-4" />
            {t("configReset")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const { t, lang } = useTranslation();
  const price = getProductPrice(product);
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100">
        <SupabaseImage
          filename={product.images[0]}
          alt={product.name[lang]}
          fallbackText={product.name[lang]}
          width={96}
          height={96}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold text-slate-900">
          {product.name[lang]}
        </div>
        <div className="truncate text-[11px] text-slate-500">
          {product.brand}
          {product.model ? ` · ${product.model}` : ""}
        </div>
      </div>
      <div className="shrink-0 text-end text-xs font-semibold text-slate-700">
        {price == null ? (
          <span className="text-slate-500">{t("configOnRequest")}</span>
        ) : (
          formatDZD(price)
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile sticky bottom bar                                            */
/* ------------------------------------------------------------------ */
function MobileSummaryBar({
  totalSum,
  hasAnyPrice,
  selectedCount,
  onReset,
  onRequestQuote,
}: {
  totalSum: number;
  hasAnyPrice: boolean;
  selectedCount: number;
  onReset: () => void;
  onRequestQuote: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
          aria-label={t("configReset")}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-slate-500">
              {t("configTotalTTC")}
            </span>
            <span className="text-base font-extrabold text-brand-700">
              {hasAnyPrice ? formatDZD(totalSum) : t("configOnRequest")}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            {selectedCount} {t("configSelectedCount")}
          </div>
        </div>
        <Button
          size="sm"
          onClick={onRequestQuote}
          disabled={selectedCount === 0}
          className="shrink-0"
        >
          <ShoppingCart className="h-4 w-4" />
          {t("configRequestQuote")}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Summary step (final step content)                                   */
/* ------------------------------------------------------------------ */
function SummaryStep({
  selections,
  totalSum,
  hasAnyPrice,
  allHavePrice,
  tva,
  totalTTC,
  selectedCount,
  onJump,
  onRequestQuote,
  onReset,
}: {
  selections: Selections;
  totalSum: number;
  hasAnyPrice: boolean;
  allHavePrice: boolean;
  tva: number;
  totalTTC: number;
  selectedCount: number;
  onJump: (i: number) => void;
  onRequestQuote: () => void;
  onReset: () => void;
}) {
  const { t, lang } = useTranslation();
  const rows: { key: string; product?: Product; stepIdx: number }[] = [
    { key: "fauteuil", product: selections.fauteuil, stepIdx: 0 },
    { key: "autoclave", product: selections.autoclave, stepIdx: 1 },
    { key: "radio", product: selections.radio, stepIdx: 2 },
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2.5 rounded-lg bg-brand-50 p-3 text-brand-900">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
        <div>
          <p className="text-sm font-semibold">{t("configSummaryTitle")}</p>
          <p className="mt-0.5 text-xs text-brand-800">
            {t("configSummaryDesc")}
          </p>
        </div>
      </div>

      {selectedCount === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
          {t("configNoSelection")}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ key, product, stepIdx }) => (
            <li key={key}>
              <SummaryEditRow
                product={product}
                stepIdx={stepIdx}
                onEdit={() => onJump(stepIdx)}
              />
            </li>
          ))}
          {selections.accessories.length > 0 && (
            <li className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {t("configStep4")} ({selections.accessories.length}{" "}
                  {t("configAccessoriesCount")})
                </div>
                <button
                  type="button"
                  onClick={() => onJump(3)}
                  className="text-[10px] font-semibold text-brand-700 hover:underline"
                >
                  {t("configEditStep")}
                </button>
              </div>
              {selections.accessories.map((p) => (
                <SummaryRow key={p.id} product={p} compact />
              ))}
            </li>
          )}
        </ul>
      )}

      {/* Totals */}
      <Separator />
      {hasAnyPrice ? (
        <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/60 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">{t("configTotal")}</span>
            <span className="font-medium text-slate-800">
              {formatDZD(totalSum)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">{t("configTVA")}</span>
            <span className="font-medium text-slate-800">{formatDZD(tva)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-slate-200 pt-2">
            <span className="font-semibold text-slate-900">
              {t("configTotalTTC")}
            </span>
            <span className="text-xl font-extrabold text-brand-700">
              {formatDZD(totalTTC)}
            </span>
          </div>
          {!allHavePrice && (
            <p className="pt-1 text-[11px] text-slate-500">
              {t("configOnRequest")} · {t("configDisclaimer")}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-4 text-center">
          <p className="text-sm font-semibold text-brand-700">
            {t("configOnRequest")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t("configDisclaimer")}
          </p>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          className="flex-1"
          onClick={onRequestQuote}
          disabled={selectedCount === 0}
        >
          <ShoppingCart className="h-4 w-4" />
          {t("configRequestQuote")}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-slate-100"
          onClick={onReset}
        >
          <RotateCcw className="h-4 w-4" />
          {t("configReset")}
        </Button>
      </div>
    </div>
  );
}

function SummaryEditRow({
  product,
  stepIdx,
  onEdit,
}: {
  product?: Product;
  stepIdx: number;
  onEdit: () => void;
}) {
  const { t, lang } = useTranslation();
  if (!product) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="flex w-full items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 text-start transition-colors hover:border-brand-300 hover:bg-brand-50/30"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400">
          <Package className="h-5 w-5" />
        </div>
        <span className="flex-1 text-xs font-medium text-slate-500">
          {t("configNone")} — {t("configEditStep")}
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-slate-400 rtl:rotate-180" />
      </button>
    );
  }
  const price = getProductPrice(product);
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-start gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-start transition-colors hover:border-brand-300 hover:bg-brand-50/30"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100">
        <SupabaseImage
          filename={product.images[0]}
          alt={product.name[lang]}
          fallbackText={product.name[lang]}
          width={96}
          height={96}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900">
          {product.name[lang]}
        </div>
        <div className="truncate text-xs text-slate-500">
          {product.brand}
          {product.model ? ` · ${product.model}` : ""}
        </div>
      </div>
      <div className="shrink-0 text-end">
        <div className="text-sm font-bold text-brand-700">
          {price == null ? (
            <span className="text-slate-500">{t("configOnRequest")}</span>
          ) : (
            formatDZD(price)
          )}
        </div>
        <div className="text-[10px] text-slate-400">
          {t("configEditStep")}
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */
function StepSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-xl border-2 border-slate-200 bg-white"
        >
          <div className="aspect-[4/3] w-full animate-pulse bg-slate-100" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default CabinetConfigurator;
