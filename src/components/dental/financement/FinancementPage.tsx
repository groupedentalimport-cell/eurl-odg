"use client";

// ============================================================
// FinancementPage — Task BONUS-4
// ------------------------------------------------------------
// Interactive financing calculator for ODG (Oran, Algeria).
// Two modes:
//   • Crédit-bail (leasing) — same amortization formula, with a
//     residual value (typically 10 % of price) at the end.
//   • Prêt bancaire (bank loan) — standard amortization, no residual.
//
// Math (standard loan payment formula):
//   M = (P − D) × r / (1 − (1 + r)^−n)
//     P = price (montant total)
//     D = down payment (apport initial = price × downPct / 100)
//     r = monthly rate (annualRatePct / 12 / 100)
//     n = months
//
// Per-month amortization (first 12 preview):
//   interest  = balance × r
//   principal = M − interest
//   balance   = balance − principal
//
// All amounts in DZD, rounded to whole dinars (no decimals).
// ============================================================

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calculator,
  TrendingUp,
  ArrowRight,
  Info,
  Wallet,
  Percent,
  CalendarDays,
  Banknote,
  Scale,
  AlertTriangle,
  Landmark,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n";
import { useData } from "@/lib/data-service";
import { navigate } from "@/lib/router";

// ------------------------------------------------------------
// Formatters
// ------------------------------------------------------------
// DZD currency — no decimals (Algerian dinars are whole).
const dzd = new Intl.NumberFormat("fr-DZ", {
  style: "currency",
  currency: "DZD",
  maximumFractionDigits: 0,
});
// Plain grouping (for slider min/max labels).
const grouped = new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 });

// ------------------------------------------------------------
// Math
// ------------------------------------------------------------
/**
 * Standard loan monthly payment formula.
 * M = (P − D) × r / (1 − (1 + r)^−n)
 *   P = principal (price − downPayment)
 *   r = monthly rate (annualRatePct / 12 / 100)
 *   n = months
 *
 * Handles r = 0 (interest-free) by falling back to principal / n.
 */
function computeMonthlyPayment(
  principal: number,
  annualRatePct: number,
  months: number
): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  const pow = Math.pow(1 + r, months);
  return (principal * r) / (1 - 1 / pow);
}

/**
 * Build the per-month amortization rows up to `maxMonths`.
 * Each row: { month, payment, interest, principal, balance }.
 */
function buildAmortization(
  principal: number,
  annualRatePct: number,
  months: number,
  maxMonths: number
): {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}[] {
  if (principal <= 0 || months <= 0) return [];
  const r = annualRatePct / 100 / 12;
  const payment = computeMonthlyPayment(principal, annualRatePct, months);
  const rows: {
    month: number;
    payment: number;
    interest: number;
    principal: number;
    balance: number;
  }[] = [];
  let balance = principal;
  const limit = Math.min(maxMonths, months);
  for (let m = 1; m <= limit; m++) {
    const interest = balance * r;
    let principalPart = payment - interest;
    // Last month: clamp to remaining balance to avoid negative drift.
    if (m === months || balance - principalPart < 0) {
      principalPart = balance;
    }
    balance = Math.max(0, balance - principalPart);
    rows.push({
      month: m,
      payment: Math.round(m === months ? principalPart + interest : payment),
      interest: Math.round(interest),
      principal: Math.round(principalPart),
      balance: Math.round(balance),
    });
    if (balance === 0) break;
  }
  return rows;
}

// ------------------------------------------------------------
// Product price estimates (mirrors the configurateur).
// Hardcoded midpoints per category slug, in DZD.
// fauteuil 800k–1.5M, autoclave 300k–600k, radio 400k–1.2M.
// ------------------------------------------------------------
const PRICE_ESTIMATES_DZD: Record<string, number> = {
  "fauteuil-dentaire": 1_150_000, // midpoint of 800k–1.5M
  "unit-dentaire": 1_150_000,
  sterilisation: 450_000, // midpoint of 300k–600k
  radiologie: 800_000, // midpoint of 400k–1.2M
  consommables: 100_000,
};

// ------------------------------------------------------------
// Term options (months). 12 / 24 / 36 / 48 / 60.
// ------------------------------------------------------------
const TERMS = [12, 24, 36, 48, 60];

// Sentinel for the "Saisie manuelle" option in the product dropdown
// (Radix UI Select requires non-empty string values for items).
const NO_PRODUCT_VALUE = "__none__";

// ------------------------------------------------------------
// Mode config — leasing vs loan.
// ------------------------------------------------------------
type Mode = "leasing" | "loan";

// ------------------------------------------------------------
// SliderInput — synced range slider + number input.
// ------------------------------------------------------------
interface SliderInputProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
  id?: string;
}

function SliderInput({
  label,
  icon,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
  id,
}: SliderInputProps) {
  const clamp = (v: number) => {
    if (!Number.isFinite(v)) return min;
    return Math.max(min, Math.min(max, v));
  };
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <Label
          htmlFor={id}
          className="flex items-center gap-2 text-sm font-medium text-slate-700"
        >
          <span className="text-brand-700">{icon}</span>
          {label}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onChange(clamp(v));
            }}
            className="h-9 w-32 text-right text-sm tabular-nums"
          />
          {suffix && (
            <span className="w-10 shrink-0 text-xs font-medium text-slate-500">
              {suffix}
            </span>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clamp(parseFloat(e.target.value)))}
        aria-label={label}
        className="financement-range h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
      />
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{grouped.format(min)}</span>
        <span>{grouped.format(max)}</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// TermRadio — pill-style radio group for the lease/loan term.
// ------------------------------------------------------------
function TermRadio({
  value,
  onChange,
  label,
  monthLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  monthLabel: string;
}) {
  return (
    <div className="space-y-2.5">
      <Label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <span className="text-brand-700">
          <CalendarDays className="h-4 w-4" />
        </span>
        {label}
      </Label>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-5 gap-2"
      >
        {TERMS.map((d) => {
          const selected = value === d;
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(d)}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-2 py-2.5 text-sm font-semibold transition-all ${
                selected
                  ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-300"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/30"
              }`}
            >
              <span className="text-base font-bold leading-none">{d}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                {monthLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Main page
// ============================================================
export function FinancementPage() {
  const { t, lang } = useTranslation();
  const { products } = useData();

  // Mode: leasing vs loan.
  const [mode, setMode] = useState<Mode>("leasing");

  // Shared inputs (kept across mode switches for smoother UX).
  const [price, setPrice] = useState(1_000_000); // DZD
  const [downPct, setDownPct] = useState(20); // %
  const [term, setTerm] = useState(36); // months
  // Default rate: 7.5 % per the spec (typical Algerian leasing: 6–9 %).
  const [rate, setRate] = useState(7.5); // % annual
  const [selectedProductSlug, setSelectedProductSlug] = useState<string>("");

  // ----------------------------------------
  // Live calculation (useMemo — recomputes on any input change).
  // ----------------------------------------
  const calc = useMemo(() => {
    const downPayment = Math.round((price * downPct) / 100);
    const principal = Math.max(0, Math.round(price - downPayment));
    const monthly = Math.round(computeMonthlyPayment(principal, rate, term));
    // For leasing: total cost = downPayment + monthly × term + residual.
    // Residual is typically 10 % of the original price (option d'achat).
    const residual = mode === "leasing" ? Math.round(price * 0.1) : 0;
    const totalCost =
      mode === "leasing"
        ? downPayment + monthly * term + residual
        : downPayment + monthly * term;
    const totalInterest = Math.max(0, totalCost - price);
    const schedule = buildAmortization(principal, rate, term, 12);
    return {
      downPayment,
      principal,
      monthly,
      residual,
      totalCost,
      totalInterest,
      schedule,
    };
  }, [price, downPct, rate, term, mode]);

  // ----------------------------------------
  // Product prefill — when a product is selected, set the price
  // to the category midpoint estimate.
  // ----------------------------------------
  function onProductChange(value: string) {
    if (value === NO_PRODUCT_VALUE) {
      setSelectedProductSlug("");
      return;
    }
    setSelectedProductSlug(value);
    const product = products.find((p) => p.slug === value);
    if (!product) return;
    const est = PRICE_ESTIMATES_DZD[product.categorySlug];
    if (est) setPrice(est);
  }

  // The Select's `value` prop — maps our internal "" state to the sentinel.
  const selectValue = selectedProductSlug || NO_PRODUCT_VALUE;

  // ----------------------------------------
  // CTA — stash the simulation in localStorage and navigate to /devis.
  // The quote page can read this prefill in a future enhancement.
  // ----------------------------------------
  function onRequestQuote() {
    if (typeof window === "undefined") return;
    try {
      const payload = {
        mode,
        price,
        downPct,
        downPayment: calc.downPayment,
        principal: calc.principal,
        term,
        rate,
        monthly: calc.monthly,
        totalCost: calc.totalCost,
        totalInterest: calc.totalInterest,
        residual: calc.residual,
        productSlug: selectedProductSlug || null,
        createdAt: new Date().toISOString(),
      };
      window.localStorage.setItem(
        "odg-financement-prefill",
        JSON.stringify(payload)
      );
    } catch {
      // localStorage may be unavailable (private mode, quota) — fail silently.
    }
    navigate("devis");
  }

  // Breakdown bars (CSS-only).
  const breakdown =
    mode === "leasing"
      ? [
          {
            label: t("financementDownPaymentAmount"),
            value: calc.downPayment,
            color: "bg-brand-300",
          },
          {
            label: t("financementPrincipal"),
            value: calc.principal,
            color: "bg-brand-600",
          },
          {
            label: t("financementTotalInterest"),
            value: calc.totalInterest,
            color: "bg-amber-400",
          },
          {
            label: t("financementResidual"),
            value: calc.residual,
            color: "bg-slate-400",
          },
        ]
      : [
          {
            label: t("financementDownPaymentAmount"),
            value: calc.downPayment,
            color: "bg-brand-300",
          },
          {
            label: t("financementPrincipal"),
            value: calc.principal,
            color: "bg-brand-600",
          },
          {
            label: t("financementTotalInterest"),
            value: calc.totalInterest,
            color: "bg-amber-400",
          },
        ];
  const breakdownTotal = breakdown.reduce((s, b) => s + b.value, 0) || 1;

  // Mode metadata.
  const modeMeta = {
    leasing: {
      icon: Scale,
      labelKey: "financementLeasing" as const,
      descKey: "financementLeasingDesc" as const,
      noteKey: "financementLeasingNote" as const,
    },
    loan: {
      icon: Landmark,
      labelKey: "financementLoan" as const,
      descKey: "financementLoanDesc" as const,
      noteKey: "financementLoanNote" as const,
    },
  };
  const ActiveIcon = modeMeta[mode].icon;

  return (
    <div className="bg-white">
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Badge variant="secondary" className="mb-4 bg-white/20 text-white">
              <Calculator className="mr-1 h-3.5 w-3.5" />
              {t("financementTitle")}
            </Badge>
            <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
              {t("financementTitle")}
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-base text-brand-100 sm:text-lg">
              {t("financementSubtitle")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---------- Calculator ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {/* ---------- Disclaimer (prominent, amber) ---------- */}
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {lang === "ar" ? "تنبيه" : "Avertissement"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-amber-800">
              {t("financementDisclaimer")}
            </p>
          </div>
        </div>

        {/* ---------- Mode toggle ---------- */}
        <div className="mb-8 flex justify-center">
          <div
            role="tablist"
            aria-label={t("financementTitle")}
            className="inline-flex w-full max-w-xl items-stretch rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-auto"
          >
            {(["leasing", "loan"] as Mode[]).map((m) => {
              const Icon = modeMeta[m].icon;
              const selected = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setMode(m)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all sm:flex-none ${
                    selected
                      ? "bg-white text-brand-700 shadow-sm ring-1 ring-brand-200"
                      : "text-slate-600 hover:text-brand-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t(modeMeta[m].labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---------- Calculator grid ---------- */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ---------- Inputs card ---------- */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ActiveIcon className="h-5 w-5 text-brand-700" />
                {t(modeMeta[mode].labelKey)}
              </CardTitle>
              <CardDescription>{t(modeMeta[mode].descKey)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product prefill */}
              <div className="space-y-2.5">
                <Label
                  htmlFor="financement-product"
                  className="flex items-center gap-2 text-sm font-medium text-slate-700"
                >
                  <span className="text-brand-700">
                    <Package className="h-4 w-4" />
                  </span>
                  {t("financementSelectProduct")}
                </Label>
                <Select value={selectValue} onValueChange={onProductChange}>
                  <SelectTrigger id="financement-product" className="w-full">
                    <SelectValue placeholder={t("financementNoProduct")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value={NO_PRODUCT_VALUE}>
                      {t("financementNoProduct")}
                    </SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.slug}>
                        {p.name[lang]} — {p.brand} {p.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  {t("financementSelectProductHint")}
                </p>
              </div>

              <Separator />

              {/* Price */}
              <SliderInput
                id="financement-price"
                label={t("financementPrice")}
                icon={<Wallet className="h-4 w-4" />}
                value={price}
                min={100_000}
                max={5_000_000}
                step={50_000}
                onChange={(v) => {
                  setPrice(v);
                  setSelectedProductSlug(""); // manual edit clears the product link
                }}
                suffix="DZD"
              />

              {/* Down payment */}
              <SliderInput
                id="financement-down"
                label={t("financementDownPayment")}
                icon={<Banknote className="h-4 w-4" />}
                value={downPct}
                min={0}
                max={50}
                step={1}
                onChange={setDownPct}
                suffix="%"
              />

              {/* Term */}
              <TermRadio
                value={term}
                onChange={setTerm}
                label={t("financementTerm")}
                monthLabel={t("financementMonths")}
              />

              {/* Rate */}
              <SliderInput
                id="financement-rate"
                label={t("financementRate")}
                icon={<Percent className="h-4 w-4" />}
                value={rate}
                min={0}
                max={12}
                step={0.1}
                onChange={setRate}
                suffix="%"
              />
            </CardContent>
          </Card>

          {/* ---------- Results card (sticky on lg) ---------- */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <motion.div
              key={mode + String(calc.monthly)}
              initial={{ opacity: 0.4, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Card className="overflow-hidden border-brand-200 shadow-lg">
                <CardHeader className="bg-gradient-to-br from-brand-700 to-brand-900 text-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
                      <ActiveIcon className="h-4 w-4" />
                      {t(modeMeta[mode].labelKey)}
                    </CardTitle>
                    <TrendingUp className="h-5 w-5 text-brand-200" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-6">
                  {/* BIG mensualité */}
                  <div className="rounded-xl bg-brand-50 p-5 text-center ring-1 ring-brand-100">
                    <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
                      {t("financementMonthly")}
                    </p>
                    <motion.div
                      key={calc.monthly}
                      initial={{ opacity: 0.6, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-1 text-4xl font-bold tabular-nums text-brand-900 sm:text-5xl"
                    >
                      {dzd.format(calc.monthly)}
                    </motion.div>
                    <p className="mt-1 text-xs text-brand-700">
                      {t("financementPerMonth")}
                    </p>
                  </div>

                  {/* Breakdown bars (CSS-only) */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("financementBreakdown")}
                    </p>
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      {breakdown.map((b, i) => (
                        <div
                          key={i}
                          className={b.color}
                          style={{
                            width: `${(b.value / breakdownTotal) * 100}%`,
                          }}
                          title={`${b.label}: ${dzd.format(b.value)}`}
                        />
                      ))}
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {breakdown.map((b, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="flex items-center gap-2 text-slate-600">
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-sm ${b.color}`}
                            />
                            {b.label}
                          </span>
                          <span className="font-medium tabular-nums text-slate-900">
                            {dzd.format(b.value)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  {/* Breakdown table */}
                  <dl className="space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <dt className="text-slate-600">{t("financementPrice")}</dt>
                      <dd className="font-medium tabular-nums text-slate-900">
                        {dzd.format(price)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <dt className="text-slate-600">
                        {t("financementDownPaymentAmount")}
                      </dt>
                      <dd className="font-medium tabular-nums text-slate-900">
                        {dzd.format(calc.downPayment)} ({downPct}%)
                      </dd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <dt className="text-slate-600">
                        {t("financementAmountToFinance")}
                      </dt>
                      <dd className="font-medium tabular-nums text-slate-900">
                        {dzd.format(calc.principal)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <dt className="text-slate-600">{t("financementTerm")}</dt>
                      <dd className="font-medium tabular-nums text-slate-900">
                        {term} {t("financementMonths")}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <dt className="text-slate-600">{t("financementRate")}</dt>
                      <dd className="font-medium tabular-nums text-slate-900">
                        {rate.toFixed(1).replace(".", ",")} %
                      </dd>
                    </div>
                    {mode === "leasing" && (
                      <div className="flex items-center justify-between text-sm">
                        <dt className="text-slate-600">
                          {t("financementResidual")}
                        </dt>
                        <dd className="font-medium tabular-nums text-slate-900">
                          {dzd.format(calc.residual)}
                        </dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <dt className="text-slate-600">
                        {t("financementTotalInterest")}
                      </dt>
                      <dd className="font-medium tabular-nums text-slate-900">
                        {dzd.format(calc.totalInterest)}
                      </dd>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex items-center justify-between text-sm">
                      <dt className="font-semibold text-brand-800">
                        {t("financementTotalCost")}
                      </dt>
                      <dd className="text-base font-bold tabular-nums text-brand-800">
                        {dzd.format(calc.totalCost)}
                      </dd>
                    </div>
                  </dl>

                  {/* Mode-specific note */}
                  <p className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{t(modeMeta[mode].noteKey)}</span>
                  </p>
                  {mode === "leasing" && (
                    <p className="flex items-start gap-2 rounded-lg bg-brand-50/60 p-3 text-xs text-brand-700">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                      <span>{t("financementResidualHint")}</span>
                    </p>
                  )}

                  {/* CTA */}
                  <Button size="lg" className="w-full" onClick={onRequestQuote}>
                    {t("financementRequestQuote")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* ---------- Amortization preview table (first 12 months) ---------- */}
        <div className="mt-10">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarDays className="h-5 w-5 text-brand-700" />
                    {t("financementAmortization")}
                  </CardTitle>
                  <CardDescription>
                    {t("financementAmortizationNote")}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="w-fit">
                  {t(modeMeta[mode].labelKey)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {calc.schedule.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  {lang === "ar"
                    ? "أدخل مبلغًا ومدة لعرض جدول الإطفاء."
                    : "Saisissez un montant et une durée pour afficher le tableau d'amortissement."}
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-semibold">
                          {t("financementMonth")}
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          {t("financementMonthly")}
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          {t("financementPrincipal")}
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          {t("financementInterestCol")}
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          {t("financementBalance")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {calc.schedule.map((row) => (
                        <tr key={row.month} className="hover:bg-brand-50/40">
                          <td className="px-3 py-2.5 font-medium text-slate-700">
                            {row.month}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">
                            {dzd.format(row.payment)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-brand-700">
                            {dzd.format(row.principal)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-amber-600">
                            {dzd.format(row.interest)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                            {dzd.format(row.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ---------- Bottom CTA ---------- */}
        <div className="mt-10 rounded-2xl bg-gradient-to-r from-brand-700 to-brand-900 p-8 text-center text-white sm:p-10">
          <h2 className="text-2xl font-bold sm:text-3xl">
            {t("financementLeasing")} · {t("financementLoan")}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-brand-100">
            {t("financementSubtitle")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="secondary" onClick={onRequestQuote}>
              {t("financementRequestQuote")}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10"
              onClick={() => navigate("contact")}
            >
              {t("contactUs")}
            </Button>
          </div>
        </div>
      </section>

      {/* Range slider thumb styling — scoped via class */}
      <style jsx global>{`
        .financement-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: #0f766e;
          border: 3px solid #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
          cursor: pointer;
        }
        .financement-range::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: #0f766e;
          border: 3px solid #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
          cursor: pointer;
        }
        .financement-range:focus-visible {
          outline: 2px solid #14b8a6;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

export default FinancementPage;
