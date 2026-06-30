"use client";
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
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SupabaseImage } from "@/components/dental/ui/SupabaseImage";
import { useTranslation, type TKey } from "@/lib/i18n";
import { useData } from "@/lib/data-service";
import { useQuoteCart } from "@/hooks/useQuoteCart";
import { navigate } from "@/lib/router";
import { toast } from "@/components/ui/sonner";
import type { Product } from "@/lib/types";

// ============================================================
// Cabinet configurator (Task BONUS-1)
// Interactive 3-step configurator:
//   1. Fauteuil dentaire (Silver Fox)   — required-ish (can be skipped too,
//      but we recommend selecting one; the summary handles empties)
//   2. Stérilisation (autoclave ICANCLAVE) — optional ("Aucun")
//   3. Radiologie (OWANDY)              — optional ("Aucun")
// Live total = sum of selected items, TVA 19%, Total TTC.
// "Demander un devis" pushes every selected product into the quote cart
// (useQuoteCart) then navigates to /devis.
// All prices are INDICATIVE estimates — the real quote comes from the devis.
// ============================================================

// Default indicative prices keyed by product `model` (the most stable
// human-readable identifier across mock + Supabase data). Falls back to slug.
// Values are estimates in DZD — the user can override per-item in the UI.
const PRODUCT_PRICES: Record<string, number> = {
  // Fauteuils Silver Fox
  "8000C": 450000,
  "8000C Implant": 620000,
  "8000C pro": 550000,
  "8000B-CRS0": 380000,
  // Autoclaves ICANCLAVE
  "STE-18-D": 280000,
  "STE-45-T": 420000,
  // Radiologie OWANDY
  "OWANDY-RX AC": 350000,
  "OWANDY-RX DC": 450000,
  "I-MAX 3D XPRO CEPH": 2800000,
};

const TVA_RATE = 0.19;

function getBasePrice(product: Product): number {
  if (product.model && PRODUCT_PRICES[product.model] != null) {
    return PRODUCT_PRICES[product.model];
  }
  if (product.slug && PRODUCT_PRICES[product.slug] != null) {
    return PRODUCT_PRICES[product.slug];
  }
  return 0;
}

function formatDZD(n: number): string {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " DZD";
}

type StepKey = "fauteuil" | "autoclave" | "radio";

interface Selections {
  fauteuil?: Product;
  autoclave?: Product;
  radio?: Product;
}

interface StepDef {
  key: StepKey;
  categorySlug: string;
  titleKey: TKey;
  hintKey: TKey;
  icon: LucideIcon;
  allowNone: boolean;
}

const STEPS: StepDef[] = [
  {
    key: "fauteuil",
    categorySlug: "fauteuil-dentaire",
    titleKey: "configStep1",
    hintKey: "configStep1Hint",
    icon: Armchair,
    allowNone: false,
  },
  {
    key: "autoclave",
    categorySlug: "sterilisation",
    titleKey: "configStep2",
    hintKey: "configStep2Hint",
    icon: ShieldCheck,
    allowNone: true,
  },
  {
    key: "radio",
    categorySlug: "radiologie",
    titleKey: "configStep3",
    hintKey: "configStep3Hint",
    icon: Radiation,
    allowNone: true,
  },
];

export function ConfiguratorPage() {
  const { t, lang, dir } = useTranslation();
  const { products, loading } = useData();
  const add = useQuoteCart((s) => s.add);

  const [stepIndex, setStepIndex] = useState(0);
  const [selections, setSelections] = useState<Selections>({});
  // Per-product price overrides, keyed by productId.
  const [prices, setPrices] = useState<Record<string, number>>({});

  const step = STEPS[stepIndex];
  const stepProducts = useMemo(
    () =>
      products
        .filter((p) => p.categorySlug === step.categorySlug)
        .sort((a, b) => a.order - b.order),
    [products, step.categorySlug]
  );

  const selectedList = useMemo(
    () =>
      [selections.fauteuil, selections.autoclave, selections.radio].filter(
        Boolean
      ) as Product[],
    [selections]
  );

  const totalHT = useMemo(
    () =>
      selectedList.reduce(
        (sum, p) => sum + (prices[p.id] ?? getBasePrice(p)),
        0
      ),
    [selectedList, prices]
  );
  const tva = Math.round(totalHT * TVA_RATE);
  const totalTTC = totalHT + tva;

  function selectItem(stepKey: StepKey, product: Product) {
    setSelections((prev) => ({ ...prev, [stepKey]: product }));
    // Lazily seed the price for this product if not already set.
    setPrices((prev) =>
      prev[product.id] == null
        ? { ...prev, [product.id]: getBasePrice(product) }
        : prev
    );
  }

  function clearSelection(stepKey: StepKey) {
    setSelections((prev) => {
      const next = { ...prev };
      delete next[stepKey];
      return next;
    });
  }

  function setPrice(productId: string, value: number) {
    setPrices((prev) => ({ ...prev, [productId]: value }));
  }

  function handleReset() {
    setSelections({});
    setPrices({});
    setStepIndex(0);
  }

  function handleRequestQuote() {
    if (selectedList.length === 0) {
      toast.error(t("configNoSelection"));
      return;
    }
    // Push every selected product into the quote cart (qty 1 each).
    selectedList.forEach((p) => add(p, 1));
    toast.success(t("configAddedToQuote"), {
      description: `${selectedList.length} ${t("configSelectedCount")} · ${formatDZD(
        totalTTC
      )}`,
    });
    navigate("devis");
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function goPrev() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  const currentSelection = selections[step.key];
  const selectedCount = selectedList.length;

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
            {/* Progress indicator */}
            <Stepper
              steps={STEPS}
              current={stepIndex}
              selections={selections}
              onJump={setStepIndex}
            />

            {/* Step card with animated content swap */}
            <Card className="mt-4 border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {t(step.titleKey)}
                    </CardTitle>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {t(step.hintKey)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <StepSkeleton />
                ) : stepProducts.length === 0 && !step.allowNone ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    {t("configEmptyCategory")}
                  </p>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step.key}
                      initial={{ opacity: 0, x: dir === "rtl" ? -16 : 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: dir === "rtl" ? 16 : -16 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                    >
                      {/* "Aucun" option — only for steps 2 & 3 */}
                      {step.allowNone && (
                        <NoneCard
                          selected={!currentSelection}
                          onClick={() => clearSelection(step.key)}
                        />
                      )}
                      {stepProducts.map((p) => (
                        <ProductOptionCard
                          key={p.id}
                          product={p}
                          selected={currentSelection?.id === p.id}
                          price={prices[p.id] ?? getBasePrice(p)}
                          onSelect={() => selectItem(step.key, p)}
                          onPriceChange={(v) => setPrice(p.id, v)}
                        />
                      ))}
                    </motion.div>
                  </AnimatePresence>
                )}
              </CardContent>
              {/* Footer nav: Previous / Next */}
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-4">
                <Button
                  variant="ghost"
                  onClick={goPrev}
                  disabled={stepIndex === 0}
                  className="text-slate-600"
                >
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                  {t("configPrevious")}
                </Button>
                {stepIndex < STEPS.length - 1 ? (
                  <Button onClick={goNext}>
                    {t("configNext")}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleRequestQuote}
                    disabled={selectedCount === 0}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {t("configRequestQuote")}
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT — sticky summary (desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <SummaryCard
                selections={selections}
                prices={prices}
                totalHT={totalHT}
                tva={tva}
                totalTTC={totalTTC}
                selectedCount={selectedCount}
                onReset={handleReset}
                onRequestQuote={handleRequestQuote}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== Mobile sticky bottom bar ===== */}
      <MobileSummaryBar
        totalTTC={totalTTC}
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
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const done = Boolean(selections[s.key]);
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
              {done && !active ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                i + 1
              )}
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
      className={`relative flex items-center gap-3 rounded-xl border-2 p-4 text-start transition-all ${
        selected
          ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-300"
          : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/30"
      }`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
          selected ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-400"
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
  price,
  onSelect,
  onPriceChange,
}: {
  product: Product;
  selected: boolean;
  price: number;
  onSelect: () => void;
  onPriceChange: (v: number) => void;
}) {
  const { t, lang } = useTranslation();
  const name = product.name[lang] || product.name.fr;
  const keySpecs = product.specs.slice(0, 3);
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-xl border-2 bg-white transition-all ${
        selected
          ? "border-brand-500 ring-1 ring-brand-300"
          : "border-slate-200 hover:border-brand-300 hover:shadow-sm"
      }`}
    >
      {selected && (
        <span className="absolute end-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white shadow">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex flex-1 items-start gap-3 p-3 text-start"
      >
        <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          <SupabaseImage
            filename={product.images[0]}
            alt={name}
            fallbackText={name}
            width={160}
            height={160}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            {product.brand && (
              <span className="font-semibold text-brand-700">
                {product.brand}
              </span>
            )}
            {product.model && (
              <>
                <span>•</span>
                <span>{product.model}</span>
              </>
            )}
          </div>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-900">
            {name}
          </h3>
          {keySpecs.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-slate-500">
              {keySpecs.map((sp, i) => (
                <li key={i} className="flex gap-1">
                  <span className="font-medium text-slate-600">
                    {sp.label[lang]}:
                  </span>
                  <span className="truncate">{sp.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </button>

      {/* Price input — always visible, editable. Highlighted when selected. */}
      <div
        className={`border-t px-3 py-2.5 ${
          selected ? "border-brand-100 bg-brand-50/40" : "border-slate-100 bg-slate-50/40"
        }`}
      >
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {t("configEstimatedPrice")}
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            step={1000}
            value={price}
            onChange={(e) =>
              onPriceChange(Math.max(0, Number(e.target.value) || 0))
            }
            onFocus={(e) => e.target.select()}
            className="h-8 text-sm"
            aria-label={t("configEstimatedPrice")}
          />
          <span className="shrink-0 text-xs font-semibold text-slate-500">
            DZD
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Summary card (desktop sidebar)                                      */
/* ------------------------------------------------------------------ */

function SummaryCard({
  selections,
  prices,
  totalHT,
  tva,
  totalTTC,
  selectedCount,
  onReset,
  onRequestQuote,
}: {
  selections: Selections;
  prices: Record<string, number>;
  totalHT: number;
  tva: number;
  totalTTC: number;
  selectedCount: number;
  onReset: () => void;
  onRequestQuote: () => void;
}) {
  const { t, lang } = useTranslation();
  const rows = (["fauteuil", "autoclave", "radio"] as StepKey[]).map((k) => ({
    key: k,
    product: selections[k],
  }));
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
        {/* Selected items */}
        {selectedCount === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
            {t("configNoSelection")}
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map(({ key, product }) => (
              <li key={key}>
                {product ? (
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
                        {product.brand} {product.model ? `· ${product.model}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-end text-xs font-semibold text-slate-700">
                      {formatDZD(prices[product.id] ?? getBasePrice(product))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-slate-200 px-2.5 py-2 text-xs text-slate-400">
                    <Package className="h-4 w-4" />
                    <span>{t("configNone")}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <Separator />

        {/* Totals */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">{t("configTotal")}</span>
            <span className="font-medium text-slate-800">{formatDZD(totalHT)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">{t("configTVA")}</span>
            <span className="font-medium text-slate-800">{formatDZD(tva)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-slate-100 pt-2">
            <span className="font-semibold text-slate-900">
              {t("configTotalTTC")}
            </span>
            <span className="text-lg font-extrabold text-brand-700">
              {formatDZD(totalTTC)}
            </span>
          </div>
        </div>

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

/* ------------------------------------------------------------------ */
/* Mobile sticky bottom bar                                            */
/* ------------------------------------------------------------------ */

function MobileSummaryBar({
  totalTTC,
  selectedCount,
  onReset,
  onRequestQuote,
}: {
  totalTTC: number;
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
            <span className="text-xs text-slate-500">{t("configTotalTTC")}</span>
            <span className="text-base font-extrabold text-brand-700">
              {formatDZD(totalTTC)}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            {selectedCount} {t("configSelectedCount")} · TVA 19% incluse
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
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */

function StepSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl border-2 border-slate-200 bg-white p-3"
        >
          <div className="h-20 w-20 shrink-0 animate-pulse rounded-lg bg-slate-100" />
          <div className="flex-1 space-y-2 py-1">
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

export default ConfiguratorPage;
