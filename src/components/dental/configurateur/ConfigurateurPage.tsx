"use client";

// ============================================================
// ConfigurateurPage — Task BONUS-1 v3
// ------------------------------------------------------------
// Interactive 3-step cabinet configurator for OUADAH DENTAL GROUPE.
//
//   Step 1 — Fauteuil      (categorySlug = "fauteuil-dentaire") — required
//   Step 2 — Stérilisation (categorySlug = "sterilisation")     — required
//   Step 3 — Radiologie    (categorySlug = "radiologie")        — optional (can skip)
//   Step 4 — Récapitulatif (summary with estimated price range + 2 CTAs)
//
// Pricing policy:
//   ODG does NOT publish public prices, so every amount shown here is a
//   HARDCODED indicative range per category. The label is clearly
//   "Estimation — prix final sur devis".
//     - Fauteuil: 800 000 – 1 500 000 DZD
//     - Autoclave: 300 000 – 600 000 DZD
//     - Radio:    400 000 – 1 200 000 DZD
//   The total range = (sum of mins) – (sum of maxs) for selected items.
//
// CTAs on the summary step:
//   1. "Demander un devis détaillé" → push all selected products into the
//      quote cart (useQuoteCart) and navigate to /devis.
//   2. "Comparer ces produits"      → push all selected products into the
//      compare cart (useCompare) and navigate to /comparer.
// ============================================================

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Armchair,
  ShieldCheck,
  Radiation,
  Check,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  SlidersHorizontal,
  ShoppingCart,
  GitCompare,
  Info,
  Package,
  RotateCcw,
  Receipt,
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
import { useCompare } from "@/hooks/useCompare";
import { navigate } from "@/lib/router";
import { toast } from "@/components/ui/sonner";
import type { Product } from "@/lib/types";

// ------------------------------------------------------------
// Hardcoded indicative price ranges per category (DZD).
// These are PLACEHOLDERS — ODG never publishes public prices.
// ------------------------------------------------------------
interface PriceRange {
  min: number;
  max: number;
}

const CATEGORY_RANGES: Record<string, PriceRange> = {
  "fauteuil-dentaire": { min: 800_000, max: 1_500_000 },
  sterilisation: { min: 300_000, max: 600_000 },
  radiologie: { min: 400_000, max: 1_200_000 },
};

function formatDZD(n: number): string {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " DZD";
}

function formatRange(range: PriceRange): string {
  return `${formatDZD(range.min)} – ${formatDZD(range.max)}`;
}

// ------------------------------------------------------------
// Step definitions — 3 selection steps + 1 summary step.
// ------------------------------------------------------------
type StepKey = "fauteuil" | "autoclave" | "radio";
type StepId = 1 | 2 | 3 | 4; // 4 = summary

interface StepDef {
  id: StepId;
  key: StepKey;
  categorySlug: string;
  titleKey: TKey;
  hintKey: TKey;
  icon: LucideIcon;
  optional: boolean; // step 3 is skippable
}

const STEPS: StepDef[] = [
  {
    id: 1,
    key: "fauteuil",
    categorySlug: "fauteuil-dentaire",
    titleKey: "configStep1",
    hintKey: "configStep1Hint",
    icon: Armchair,
    optional: false,
  },
  {
    id: 2,
    key: "autoclave",
    categorySlug: "sterilisation",
    titleKey: "configStep2",
    hintKey: "configStep2Hint",
    icon: ShieldCheck,
    optional: false,
  },
  {
    id: 3,
    key: "radio",
    categorySlug: "radiologie",
    titleKey: "configStep3",
    hintKey: "configStep3Hint",
    icon: Radiation,
    optional: true,
  },
];

interface Selections {
  fauteuil?: Product;
  autoclave?: Product;
  radio?: Product;
}

// ============================================================
// Main component
// ============================================================
export function ConfigurateurPage() {
  const { t, lang, dir } = useTranslation();
  const { products, loading } = useData();
  const addToQuote = useQuoteCart((s) => s.add);
  const compareAdd = useCompare((s) => s.add);
  const compareIds = useCompare((s) => s.ids);

  // `step` goes from 1 → 4, where 4 is the summary.
  const [step, setStep] = useState<StepId>(1);
  const [selections, setSelections] = useState<Selections>({});

  const currentStep = STEPS.find((s) => s.id === step);
  const isSummary = step === 4;

  // Products available for the current step (only for steps 1–3).
  const stepProducts = useMemo(() => {
    if (!currentStep) return [];
    return products
      .filter((p) => p.categorySlug === currentStep.categorySlug)
      .sort((a, b) => a.order - b.order);
  }, [products, currentStep]);

  // Ordered list of selected products (for the summary + CTAs).
  const selectedList = useMemo(
    () =>
      [selections.fauteuil, selections.autoclave, selections.radio].filter(
        Boolean
      ) as Product[],
    [selections]
  );

  // Compute the total estimated range from the selected products.
  const totalRange = useMemo(() => {
    let min = 0;
    let max = 0;
    for (const p of selectedList) {
      const r = CATEGORY_RANGES[p.categorySlug];
      if (r) {
        min += r.min;
        max += r.max;
      }
    }
    return { min, max };
  }, [selectedList]);

  // ---- Selection handlers ----
  function selectItem(stepKey: StepKey, product: Product) {
    setSelections((prev) => ({ ...prev, [stepKey]: product }));
  }
  function clearSelection(stepKey: StepKey) {
    setSelections((prev) => {
      const next = { ...prev };
      delete next[stepKey];
      return next;
    });
  }
  function handleReset() {
    setSelections({});
    setStep(1);
  }

  // Can the user advance from the current step?
  const canAdvance = useMemo(() => {
    if (isSummary) return false;
    if (!currentStep) return false;
    if (currentStep.optional) return true; // step 3 can be skipped
    const sel = selections[currentStep.key];
    return Boolean(sel);
  }, [isSummary, currentStep, selections]);

  function goNext() {
    if (!canAdvance) return;
    setStep((s) => Math.min(s + 1, 4) as StepId);
  }
  function goPrev() {
    setStep((s) => Math.max(s - 1, 1) as StepId);
  }
  function jumpTo(id: StepId) {
    setStep(id);
  }

  function handleRequestQuote() {
    if (selectedList.length === 0) {
      toast.error(t("configNoSelection"));
      return;
    }
    selectedList.forEach((p) => addToQuote(p, 1));
    toast.success(t("configAddedToQuote"), {
      description: `${selectedList.length} ${t("configSelectedCount")}`,
    });
    navigate("devis");
  }

  function handleCompare() {
    if (selectedList.length === 0) {
      toast.error(t("configNoSelection"));
      return;
    }
    // useCompare caps the cart at 4 items; gracefully stop when full.
    let added = 0;
    let skipped = 0;
    for (const p of selectedList) {
      if (compareIds.includes(p.id)) {
        skipped++;
        continue;
      }
      if (compareIds.length + added >= 4) {
        skipped++;
        continue;
      }
      compareAdd(p);
      added++;
    }
    if (added === 0 && skipped > 0) {
      toast.info("Produits déjà dans le comparateur", {
        description: `${skipped} ${t("configSelectedCount")}`,
      });
    } else {
      toast.success("Ajouté au comparateur", {
        description: `${added} ${t("configSelectedCount")}`,
      });
    }
    navigate("comparer");
  }

  const currentSelection = currentStep ? selections[currentStep.key] : undefined;
  const selectedCount = selectedList.length;

  return (
    <div className="min-h-screen bg-slate-50" dir={dir}>
      {/* ===== Page header ===== */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
            <button
              type="button"
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
                {t("configurateurTitle")}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                {t("configurateurSubtitle")}
              </p>
            </div>
          </div>

          {/* Disclaimer banner — prices are estimates only */}
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>{t("configDisclaimer")}</span>
          </div>
        </div>
      </div>

      {/* ===== Body ===== */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Progress indicator — 3 selection steps (summary is step 4, shown separately) */}
        <ProgressIndicator
          steps={STEPS}
          currentStep={step}
          selections={selections}
          onJump={jumpTo}
        />

        <div className="mt-6">
          <AnimatePresence mode="wait">
            {isSummary ? (
              <motion.section
                key="summary"
                initial={{ opacity: 0, x: dir === "rtl" ? -24 : 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir === "rtl" ? 24 : -24 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                <SummaryReceipt
                  selections={selections}
                  steps={STEPS}
                  selectedCount={selectedCount}
                  totalRange={totalRange}
                  onJump={jumpTo}
                  onReset={handleReset}
                  onRequestQuote={handleRequestQuote}
                  onCompare={handleCompare}
                />
              </motion.section>
            ) : (
              <motion.section
                key={currentStep?.key ?? "empty"}
                initial={{ opacity: 0, x: dir === "rtl" ? -24 : 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir === "rtl" ? 24 : -24 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                <Card className="border-slate-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                        {currentStep && <currentStep.icon className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                          <span>{currentStep && t(currentStep.titleKey)}</span>
                          {currentStep?.optional ? (
                            <Badge
                              variant="secondary"
                              className="bg-slate-100 text-xs font-medium text-slate-500"
                            >
                              {t("configOptional")}
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-brand-50 text-xs font-medium text-brand-700"
                            >
                              {t("configRequired")}
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {currentStep && t(currentStep.hintKey)}
                        </p>
                      </div>
                      {currentStep && (
                        <div className="hidden shrink-0 text-end sm:block">
                          <div className="text-[11px] uppercase tracking-wide text-slate-400">
                            {t("configEstimatedPrice")}
                          </div>
                          <div className="text-sm font-semibold text-brand-700">
                            {formatRange(
                              CATEGORY_RANGES[currentStep.categorySlug]
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    {loading ? (
                      <StepSkeleton />
                    ) : stepProducts.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 py-12 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <Package className="h-7 w-7" />
                        </div>
                        <p className="text-sm text-slate-500">
                          {t("configNoProducts")}
                        </p>
                        {currentStep?.optional && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              clearSelection(currentStep.key);
                              goNext();
                            }}
                          >
                            {t("configSkip")}
                            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {stepProducts.map((p) => {
                          const selected = currentSelection?.id === p.id;
                          return (
                            <ProductOptionCard
                              key={p.id}
                              product={p}
                              selected={selected}
                              range={
                                currentStep
                                  ? CATEGORY_RANGES[currentStep.categorySlug]
                                  : undefined
                              }
                              onSelect={() => selectItem(currentStep!.key, p)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </CardContent>

                  {/* Footer navigation: Previous / Skip / Next */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 p-4">
                    <Button
                      variant="ghost"
                      onClick={goPrev}
                      disabled={step === 1}
                      className="text-slate-600"
                    >
                      <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                      {t("configPrevious")}
                    </Button>

                    <div className="flex items-center gap-2">
                      {currentStep?.optional && !loading && stepProducts.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            clearSelection(currentStep.key);
                            goNext();
                          }}
                        >
                          {t("configSkip")}
                        </Button>
                      )}
                      <Button onClick={goNext} disabled={!canAdvance}>
                        {t("configNext")}
                        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Progress indicator — 3 numbered circles + connecting bar.
// Steps already visited/selected show a check. Clicking a step
// jumps to it (but never forward past an unfulfilled required step).
// ============================================================
function ProgressIndicator({
  steps,
  currentStep,
  selections,
  onJump,
}: {
  steps: StepDef[];
  currentStep: StepId;
  selections: Selections;
  onJump: (id: StepId) => void;
}) {
  const { t } = useTranslation();

  // A step is "complete" if it's optional OR has a selection.
  function isComplete(s: StepDef): boolean {
    if (s.optional) return true; // optional steps are always passable
    return Boolean(selections[s.key]);
  }

  // The user can jump to a step if all preceding steps are complete.
  function canJumpTo(target: StepDef): boolean {
    const idx = steps.findIndex((x) => x.id === target.id);
    for (let i = 0; i < idx; i++) {
      if (!isComplete(steps[i])) return false;
    }
    return true;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        {steps.map((s, i) => {
          const isActive = currentStep === s.id;
          const isDone = isComplete(s) && !isActive;
          const reachable = canJumpTo(s) || isActive;
          const Icon = s.icon;
          return (
            <div key={s.id} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => reachable && onJump(s.id)}
                disabled={!reachable}
                className={`group flex flex-1 flex-col items-center gap-1.5 text-center transition disabled:cursor-not-allowed ${
                  reachable ? "cursor-pointer" : "opacity-60"
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
                    isActive
                      ? "border-brand-700 bg-brand-700 text-white shadow-md shadow-brand-700/20"
                      : isDone
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {isDone ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </span>
                <span
                  className={`hidden text-xs font-medium sm:block ${
                    isActive
                      ? "text-brand-700"
                      : isDone
                      ? "text-slate-700"
                      : "text-slate-400"
                  }`}
                >
                  {t(s.titleKey)}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {t("configStep")} {s.id} {t("configOf")} {steps.length}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className={`mx-1 h-0.5 flex-1 rounded-full transition-colors ${
                    isComplete(s) ? "bg-brand-300" : "bg-slate-200"
                  }`}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Product option card — image, name, brand/model, "Sélectionner" CTA.
// Selected state highlights the card with a brand border + checkmark.
// ============================================================
function ProductOptionCard({
  product,
  selected,
  range,
  onSelect,
}: {
  product: Product;
  selected: boolean;
  range?: PriceRange;
  onSelect: () => void;
}) {
  const { t, lang } = useTranslation();
  const name = lang === "ar" ? product.name.ar : product.name.fr;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl border-2 bg-white text-start transition-all hover:shadow-lg ${
        selected
          ? "border-brand-600 shadow-md ring-2 ring-brand-200"
          : "border-slate-200 hover:border-brand-300"
      }`}
    >
      {/* Selected badge */}
      {selected && (
        <div className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-white shadow">
          <Check className="h-4 w-4" />
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <SupabaseImage
          filename={product.images[0]}
          alt={name}
          fallbackText={name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
          {product.brand && (
            <span className="font-semibold text-brand-700">{product.brand}</span>
          )}
          {product.brand && product.model && <span>·</span>}
          {product.model && <span className="truncate">{product.model}</span>}
        </div>
        <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-slate-900">
          {name}
        </h3>

        {/* Indicative price range */}
        {range && (
          <div className="mt-auto rounded-lg bg-slate-50 px-3 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">
              {t("configEstimatedPrice")}
            </div>
            <div className="text-sm font-bold text-brand-700">
              {formatRange(range)}
            </div>
          </div>
        )}

        {/* Selection status pill */}
        <div
          className={`mt-3 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
            selected
              ? "bg-brand-700 text-white"
              : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
          }`}
        >
          {selected ? (
            <>
              <Check className="h-3.5 w-3.5" />
              {t("configSelected")}
            </>
          ) : (
            <>{t("configSelect")}</>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================================
// Summary receipt — the 3 selected products + estimated total range
// + 2 CTAs ("Demander un devis détaillé" + "Comparer ces produits").
// Styled like a paper receipt: monospace numerals, dashed separator.
// ============================================================
function SummaryReceipt({
  selections,
  steps,
  selectedCount,
  totalRange,
  onJump,
  onReset,
  onRequestQuote,
  onCompare,
}: {
  selections: Selections;
  steps: StepDef[];
  selectedCount: number;
  totalRange: PriceRange;
  onJump: (id: StepId) => void;
  onReset: () => void;
  onRequestQuote: () => void;
  onCompare: () => void;
}) {
  const { t, lang, dir } = useTranslation();

  // Ordered list of [step, product?] pairs.
  const rows: { step: StepDef; product?: Product }[] = steps.map((s) => ({
    step: s,
    product: selections[s.key],
  }));

  return (
    <Card className="overflow-hidden border-slate-200">
      {/* Receipt header */}
      <div className="flex items-center justify-between gap-3 border-b border-dashed border-slate-300 bg-gradient-to-r from-brand-50 to-white px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-700 text-white">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {t("configSummaryStep")}
            </h2>
            <p className="text-xs text-slate-500">
              {t("configYourCabinet")} · {selectedCount}{" "}
              {t("configSelectedCount")}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-slate-500 hover:text-brand-700"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="hidden sm:inline">{t("configRestart")}</span>
        </Button>
      </div>

      <CardContent className="p-0">
        {/* Line items */}
        <ul className="divide-y divide-dashed divide-slate-200">
          {rows.map(({ step, product }) => (
            <li
              key={step.id}
              className="flex items-center gap-4 px-6 py-4"
            >
              {/* Thumbnail */}
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {product ? (
                  <SupabaseImage
                    filename={product.images[0]}
                    alt={lang === "ar" ? product.name.ar : product.name.fr}
                    fallbackText={lang === "ar" ? product.name.ar : product.name.fr}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <step.icon className="h-6 w-6" />
                  </div>
                )}
              </div>

              {/* Name + brand/model */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                    {t(step.titleKey)}
                  </span>
                  {!product && step.optional && (
                    <Badge
                      variant="secondary"
                      className="bg-slate-100 text-[10px] text-slate-400"
                    >
                      {t("configOptional")}
                    </Badge>
                  )}
                </div>
                {product ? (
                  <>
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {lang === "ar" ? product.name.ar : product.name.fr}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {[product.brand, product.model]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </>
                ) : (
                  <div className="text-sm italic text-slate-400">
                    {t("configNone")}
                  </div>
                )}
              </div>

              {/* Estimated range */}
              <div className="hidden shrink-0 text-end sm:block">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  {t("configEstimatedPrice")}
                </div>
                <div className="text-sm font-semibold text-slate-700 tabular-nums">
                  {product
                    ? formatRange(CATEGORY_RANGES[step.categorySlug])
                    : "—"}
                </div>
              </div>

              {/* Edit link */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onJump(step.id)}
                className="shrink-0 text-slate-500 hover:text-brand-700"
              >
                {t("configEdit")}
              </Button>
            </li>
          ))}
        </ul>

        {/* Total range */}
        <div className="border-t-2 border-dashed border-slate-300 bg-slate-50 px-6 py-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {t("configTotalRange")}
              </div>
              <div className="text-2xl font-extrabold text-brand-700 tabular-nums sm:text-3xl">
                {formatRange(totalRange)}
              </div>
            </div>
            <div className="text-end">
              <Badge
                variant="warning"
                className="text-[11px] font-medium"
              >
                <Info className="me-1 h-3 w-3" />
                {t("configEstimateLabel")}
              </Badge>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">{t("configSeeOnDevis")}</p>
        </div>

        <Separator />

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row">
          <Button
            size="lg"
            className="flex-1"
            onClick={onRequestQuote}
            disabled={selectedCount === 0}
          >
            <ShoppingCart className="h-5 w-5" />
            {t("configRequestQuote")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 border-brand-300 text-brand-700 hover:bg-brand-50 hover:text-brand-800"
            onClick={onCompare}
            disabled={selectedCount === 0}
          >
            <GitCompare className="h-5 w-5" />
            {t("configCompare")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Skeleton loader — shown while products are being fetched.
// ============================================================
function StepSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-xl border-2 border-slate-200 bg-white"
        >
          <div className="aspect-[4/3] w-full bg-slate-100" />
          <div className="p-4">
            <div className="mb-2 h-3 w-1/3 rounded bg-slate-100" />
            <div className="mb-3 h-4 w-2/3 rounded bg-slate-100" />
            <div className="h-8 w-full rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
