"use client";

// ============================================================
// Finance Calculator (Task BONUS-1 v2 — 3 financing tabs)
// ------------------------------------------------------------
// A pure client-side simulator for financing options.
// 3 tabs (just labels — same calculation):
//   - Crédit-bail
//   - Leasing
//   - Achat comptant
//
// Inputs (useMemo-driven, live recalculation):
//   - Total amount (DZD)              — number + range slider
//   - Down payment (apport initial)   — percentage slider 0–50%
//   - Duration                        — radio buttons 12 / 24 / 36 / 48 months
//   - Interest rate (taux)            — slider 3–12%, default 6.5%
//
// Math (standard loan payment formula):
//   M = [P × r] / [1 − (1 + r)^−n]
//     P = principal (amount − downPayment)
//     r = monthly rate (annual% / 12 / 100)
//     n = months
//
// Outputs:
//   - Monthly payment (mensualité)            — big animated number
//   - Total cost (coût total)                 = downPayment + monthly × months
//   - Total interest (intérêts)               = totalCost − principal
//   - CSS bar chart (apport / capital / interest)
//   - Breakdown table
//
// Disclaimer: "Simulation non contractuelle. Offre soumise à validation
//   par l'organisme de financement."
// CTA: "Demander un devis avec financement" → navigate("/devis").
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
  CircleDollarSign,
  type LucideIcon,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "@/lib/i18n";
import { navigate } from "@/lib/router";

// DZD currency formatter (no decimals — DZD amounts are whole).
const dzd = new Intl.NumberFormat("fr-DZ", {
  style: "currency",
  currency: "DZD",
  maximumFractionDigits: 0,
});

// Plain number grouping (for slider min/max labels).
const grouped = new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 });

// ============================================================
// Math
// ============================================================

/**
 * Standard loan monthly payment formula.
 * M = [P × r] / [1 − (1 + r)^−n]
 *   P = principal
 *   r = monthly rate (annual% / 12 / 100)
 *   n = months
 *
 * Handles r=0 (interest-free) by falling back to P / n.
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

// ============================================================
// Duration options — radio buttons
// ============================================================
const DURATIONS = [12, 24, 36, 48];

// ============================================================
// Tabs config
// ============================================================
type TabKey = "leasing" | "leasing-alt" | "cash";

interface TabDef {
  key: TabKey;
  labelKey:
    | "financeLeasing"
    | "financeLeasingAlt"
    | "financeCash";
  descKey:
    | "financeLeasingDesc"
    | "financeLeasingAltDesc"
    | "financeCashDesc";
  noteKey:
    | "financeLeasingNote"
    | "financeLeasingAltDesc"
    | "financeCashNote";
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  {
    key: "leasing",
    labelKey: "financeLeasing",
    descKey: "financeLeasingDesc",
    noteKey: "financeLeasingNote",
    icon: Scale,
  },
  {
    key: "leasing-alt",
    labelKey: "financeLeasingAlt",
    descKey: "financeLeasingAltDesc",
    noteKey: "financeLeasingNote",
    icon: Banknote,
  },
  {
    key: "cash",
    labelKey: "financeCash",
    descKey: "financeCashDesc",
    noteKey: "financeCashNote",
    icon: CircleDollarSign,
  },
];

// ============================================================
// SliderInput — synced range slider + number input.
// ============================================================
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
        className="finance-range h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
      />
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{grouped.format(min)}</span>
        <span>{grouped.format(max)}</span>
      </div>
    </div>
  );
}

// ============================================================
// Duration radio group
// ============================================================
function DurationRadio({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
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
        className="grid grid-cols-4 gap-2"
      >
        {DURATIONS.map((d) => {
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
                mois
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// ResultsCard — sticky right panel: mensualité + breakdown + CTA.
// ============================================================
interface ResultsCardProps {
  badge: string;
  badgeIcon: React.ReactNode;
  monthlyPayment: number;
  monthlyLabel: string;
  rows: { label: string; value: string; strong?: boolean }[];
  breakdown: { label: string; value: number; color: string }[];
  total: number;
  ctaLabel: string;
  note?: string;
  breakdownLabel: string;
  totalLabel: string;
  showMonthly: boolean;
  cashLabel?: string;
}

function ResultsCard({
  badge,
  badgeIcon,
  monthlyPayment,
  monthlyLabel,
  rows,
  breakdown,
  total,
  ctaLabel,
  note,
  breakdownLabel,
  totalLabel,
  showMonthly,
  cashLabel,
}: ResultsCardProps) {
  const totalSum = breakdown.reduce((s, b) => s + b.value, 0) || 1;
  return (
    <Card className="overflow-hidden border-brand-200 shadow-lg">
      <CardHeader className="bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            {badgeIcon}
            {badge}
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-brand-200" />
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        {/* Big mensualité (or full amount for cash purchase) */}
        <div className="rounded-xl bg-brand-50 p-5 text-center ring-1 ring-brand-100">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
            {showMonthly ? monthlyLabel : (cashLabel ?? monthlyLabel)}
          </p>
          <motion.div
            key={monthlyPayment}
            initial={{ opacity: 0.6, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1 text-4xl font-bold tabular-nums text-brand-900 sm:text-5xl"
          >
            {dzd.format(monthlyPayment)}
          </motion.div>
          <p className="mt-1 text-xs text-brand-700">
            {showMonthly ? "/ mois" : "· paiement unique"}
          </p>
        </div>

        {/* Breakdown bars (CSS-only) */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {breakdownLabel}
          </p>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {breakdown.map((b, i) => (
              <div
                key={i}
                className={b.color}
                style={{ width: `${(b.value / totalSum) * 100}%` }}
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
          {rows.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-sm"
            >
              <dt className="text-slate-600">{r.label}</dt>
              <dd
                className={`tabular-nums ${
                  r.strong
                    ? "text-base font-bold text-brand-800"
                    : "font-medium text-slate-900"
                }`}
              >
                {r.value}
              </dd>
            </div>
          ))}
        </dl>

        {note && (
          <p className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{note}</span>
          </p>
        )}

        <Button size="lg" className="w-full" onClick={() => navigate("devis")}>
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>

        <p className="text-center text-[11px] text-slate-400">
          {totalLabel}: {dzd.format(total)}
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main page
// ============================================================
export function FinanceCalculator() {
  const { t } = useTranslation();

  // Shared inputs (kept across tab switches for smoother UX).
  const [amount, setAmount] = useState(1_000_000); // DZD
  const [downPct, setDownPct] = useState(20); // %
  const [duration, setDuration] = useState(36); // months
  const [rate, setRate] = useState(6.5); // %, default per spec
  const [tab, setTab] = useState<TabKey>("leasing");

  // Computed values (live).
  const calc = useMemo(() => {
    const downPayment = (amount * downPct) / 100;
    const principal = Math.max(0, amount - downPayment);
    const mensualite = computeMonthlyPayment(principal, rate, duration);
    const totalCost = downPayment + mensualite * duration;
    const interest = Math.max(0, totalCost - amount);
    return { downPayment, principal, mensualite, totalCost, interest };
  }, [amount, downPct, rate, duration]);

  // For cash purchase (Achat comptant): the user pays the full amount up front,
  // no monthly payments. Same formula applies but with down payment = 100%.
  const calcCash = useMemo(() => {
    const principal = 0;
    const mensualite = 0;
    const totalCost = amount;
    const interest = 0;
    return { downPayment: amount, principal, mensualite, totalCost, interest };
  }, [amount]);

  const isCash = tab === "cash";
  const active = isCash ? calcCash : calc;

  // Build breakdown + rows dynamically.
  const breakdown = isCash
    ? [
        {
          label: t("financePrincipalLabel"),
          value: calcCash.downPayment,
          color: "bg-brand-600",
        },
      ]
    : [
        {
          label: t("financeDownPaymentLabel"),
          value: calc.downPayment,
          color: "bg-brand-300",
        },
        {
          label: t("financePrincipalLabel"),
          value: calc.principal,
          color: "bg-brand-600",
        },
        {
          label: t("financeInterestLabel"),
          value: calc.interest,
          color: "bg-amber-400",
        },
      ];

  const rows = isCash
    ? [
        { label: t("financeAmount"), value: dzd.format(amount) },
        {
          label: t("financeDownPaymentAmount"),
          value: `${dzd.format(calcCash.downPayment)} (100%)`,
        },
        {
          label: t("financeDuration"),
          value: t("financeNoFinancing"),
        },
        {
          label: t("financeCreditCost"),
          value: dzd.format(0),
        },
        {
          label: t("financeTotalCost"),
          value: dzd.format(calcCash.totalCost),
          strong: true,
        },
      ]
    : [
        { label: t("financeAmount"), value: dzd.format(amount) },
        {
          label: t("financeDownPaymentAmount"),
          value: `${dzd.format(calc.downPayment)} (${downPct}%)`,
        },
        { label: t("financeAmountToFinance"), value: dzd.format(calc.principal) },
        {
          label: t("financeDuration"),
          value: `${duration} ${t("financeMonths")}`,
        },
        {
          label: t("financeRate"),
          value: `${rate.toFixed(1).replace(".", ",")} %`,
        },
        { label: t("financeCreditCost"), value: dzd.format(calc.interest) },
        {
          label: t("financeTotalCost"),
          value: dzd.format(calc.totalCost),
          strong: true,
        },
      ];

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
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Badge variant="secondary" className="mb-4 bg-white/20 text-white">
              <Calculator className="mr-1 h-3.5 w-3.5" />
              {t("financeBadge")}
            </Badge>
            <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
              {t("financeTitle")}
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-base text-brand-100 sm:text-lg">
              {t("financeSubtitle")}
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
              {t("financeBadge")}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-amber-800">
              {t("financeDisclaimer")}
            </p>
          </div>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TabKey)}
          className="w-full"
        >
          {/* Tabs list — wraps on mobile */}
          <div className="flex justify-center">
            <TabsList className="h-auto w-full max-w-2xl flex-wrap justify-center gap-1 p-1 sm:inline-flex sm:w-auto">
              {TABS.map((tb) => {
                const Icon = tb.icon;
                return (
                  <TabsTrigger
                    key={tb.key}
                    value={tb.key}
                    className="flex-1 gap-1.5 px-4 py-2 sm:flex-none"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t(tb.labelKey)}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {TABS.map((tb) => {
            const Icon = tb.icon;
            return (
              <TabsContent key={tb.key} value={tb.key} className="mt-8">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* ---------- Inputs ---------- */}
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="h-5 w-5 text-brand-700" />
                        {t(tb.labelKey)}
                      </CardTitle>
                      <CardDescription>{t(tb.descKey)}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <SliderInput
                        id={`amount-${tb.key}`}
                        label={t("financeAmount")}
                        icon={<Wallet className="h-4 w-4" />}
                        value={amount}
                        min={100_000}
                        max={5_000_000}
                        step={50_000}
                        onChange={setAmount}
                        suffix="DZD"
                      />

                      {!isCash && (
                        <>
                          <SliderInput
                            id={`down-${tb.key}`}
                            label={t("financeDownPayment")}
                            icon={<Banknote className="h-4 w-4" />}
                            value={downPct}
                            min={0}
                            max={50}
                            step={1}
                            onChange={setDownPct}
                            suffix="%"
                          />
                          <DurationRadio
                            value={duration}
                            onChange={setDuration}
                            label={t("financeMonthsLabel")}
                          />
                          <SliderInput
                            id={`rate-${tb.key}`}
                            label={t("financeRate")}
                            icon={<Percent className="h-4 w-4" />}
                            value={rate}
                            min={3}
                            max={12}
                            step={0.1}
                            onChange={setRate}
                            suffix="%"
                          />
                        </>
                      )}

                      {isCash && (
                        <div className="rounded-lg border border-brand-100 bg-brand-50/40 p-4 text-sm text-brand-800">
                          <p className="font-semibold">
                            {t("financeCash")}
                          </p>
                          <p className="mt-1 text-xs text-brand-700">
                            {t("financeCashNote")}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* ---------- Results ---------- */}
                  <div className="lg:sticky lg:top-24 lg:self-start">
                    <ResultsCard
                      badge={t(tb.labelKey)}
                      badgeIcon={<Icon className="h-4 w-4" />}
                      monthlyPayment={active.mensualite}
                      monthlyLabel={t("financeMonthlyPayment")}
                      breakdownLabel={t("financeBreakdown")}
                      totalLabel={t("financeTotalCost")}
                      note={t(tb.noteKey)}
                      ctaLabel={t("financeRequestQuote")}
                      total={active.totalCost}
                      breakdown={breakdown}
                      rows={rows}
                      showMonthly={!isCash}
                      cashLabel={t("financeAmount")}
                    />
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* ---------- Bottom CTA ---------- */}
        <div className="mt-10 rounded-2xl bg-gradient-to-r from-brand-700 to-brand-900 p-8 text-center text-white sm:p-10">
          <h2 className="text-2xl font-bold sm:text-3xl">
            {t("financeTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-brand-100">
            {t("financeSubtitle")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="secondary" onClick={() => navigate("devis")}>
              {t("financeRequestQuote")}
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
        .finance-range::-webkit-slider-thumb {
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
        .finance-range::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: #0f766e;
          border: 3px solid #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
          cursor: pointer;
        }
        .finance-range:focus-visible {
          outline: 2px solid #14b8a6;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

export default FinanceCalculator;
