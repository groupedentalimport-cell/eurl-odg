"use client";

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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// ============================================================
// Finance Calculator — Task BONUS-4
// 3 modes: crédit-bail (leasing), crédit classique (loan), LLD.
// Math: standard loan payment formula.
// M = P * r * (1+r)^n / ((1+r)^n - 1)
//   P = principal (montant à financer)
//   r = monthly rate (annual% / 12 / 100)
//   n = months
// ============================================================

// DZD currency formatter (no decimals — DZD amounts are whole).
const dzd = new Intl.NumberFormat("fr-DZ", {
  style: "currency",
  currency: "DZD",
  maximumFractionDigits: 0,
});

// Plain number grouping (for slider min/max labels).
const grouped = new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 });

// Standard loan monthly payment formula.
function computeMonthlyPayment(
  principal: number,
  annualRatePct: number,
  months: number
): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  const pow = Math.pow(1 + r, months);
  return (principal * r * pow) / (pow - 1);
}

interface AmortRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

// Amortization schedule — first `rowCount` months (default 12).
function buildAmortization(
  principal: number,
  annualRatePct: number,
  months: number,
  rowCount = 12
): AmortRow[] {
  if (principal <= 0 || months <= 0) return [];
  const r = annualRatePct / 100 / 12;
  const payment = computeMonthlyPayment(principal, annualRatePct, months);
  const rows: AmortRow[] = [];
  let balance = principal;
  const n = Math.min(rowCount, months);
  for (let i = 1; i <= n; i++) {
    const interest = balance * r;
    const principalPaid = Math.min(payment - interest, balance);
    balance = Math.max(0, balance - principalPaid);
    rows.push({
      month: i,
      payment,
      principal: principalPaid,
      interest,
      balance,
    });
  }
  return rows;
}

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
}: SliderInputProps) {
  const clamp = (v: number) => {
    if (!Number.isFinite(v)) return min;
    return Math.max(min, Math.min(max, v));
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <span className="text-brand-700">{icon}</span>
          {label}
        </label>
        <div className="flex items-center gap-2">
          <Input
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
// ResultsCard — sticky right panel: mensualité + breakdown + CTA.
// ============================================================
interface ResultsCardProps {
  badge: string;
  badgeIcon: React.ReactNode;
  monthlyPayment: number;
  rows: { label: string; value: string; strong?: boolean }[];
  breakdown: { label: string; value: number; color: string }[];
  total: number;
  ctaLabel: string;
  note?: string;
  monthlyLabel: string;
  breakdownLabel: string;
  totalLabel: string;
}

function ResultsCard({
  badge,
  badgeIcon,
  monthlyPayment,
  rows,
  breakdown,
  total,
  ctaLabel,
  note,
  monthlyLabel,
  breakdownLabel,
  totalLabel,
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
        {/* Big mensualité */}
        <div className="rounded-xl bg-brand-50 p-5 text-center ring-1 ring-brand-100">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
            {monthlyLabel}
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
          <p className="mt-1 text-xs text-brand-700">/ mois</p>
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
// Amortization table (Tab 2 only)
// ============================================================
interface AmortLabels {
  month: string;
  payment: string;
  principal: string;
  interest: string;
  balance: string;
  note: string;
  title: string;
}

function AmortizationTable({
  rows,
  labels,
}: {
  rows: AmortRow[];
  labels: AmortLabels;
}) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Calculator className="h-4 w-4 text-brand-700" />
            {labels.title}
          </CardTitle>
          <Badge variant="secondary">{labels.note}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">
                  {labels.month}
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  {labels.payment}
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  {labels.principal}
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  {labels.interest}
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  {labels.balance}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.month} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {r.month}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-900">
                    {dzd.format(r.payment)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-brand-700">
                    {dzd.format(r.principal)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-amber-700">
                    {dzd.format(r.interest)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                    {dzd.format(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main page
// ============================================================
export function FinanceCalculatorPage() {
  const { t } = useTranslation();

  // Shared inputs (kept across tab switches for smoother UX).
  const [amount, setAmount] = useState(1_000_000); // DZD
  const [downPct, setDownPct] = useState(20); // %
  const [duration, setDuration] = useState(36); // months
  const [rate, setRate] = useState(6); // %

  // Computed values for leasing + credit (same math).
  const loan = useMemo(() => {
    const downPayment = (amount * downPct) / 100;
    const principal = Math.max(0, amount - downPayment);
    const mensualite = computeMonthlyPayment(principal, rate, duration);
    const totalCost = downPayment + mensualite * duration;
    const creditCost = Math.max(0, totalCost - amount);
    const amort = buildAmortization(principal, rate, duration, 12);
    return {
      downPayment,
      principal,
      mensualite,
      totalCost,
      creditCost,
      amort,
    };
  }, [amount, downPct, rate, duration]);

  // LLD: 2.5% of montant per month — rough estimate.
  const lld = useMemo(() => {
    const mensualite = amount * 0.025;
    const totalCost = mensualite * duration;
    return { mensualite, totalCost };
  }, [amount, duration]);

  // Common amortization labels (used in Tab 2).
  const amortLabels: AmortLabels = {
    month: t("financeMonth"),
    payment: t("financePayment"),
    principal: t("financePrincipal"),
    interest: t("financeInterest"),
    balance: t("financeBalance"),
    note: t("financeAmortizationNote"),
    title: t("financeAmortizationTable"),
  };

  // Loan results rows (shared between leasing + credit).
  const loanRows = [
    { label: t("financeAmount"), value: dzd.format(amount) },
    {
      label: t("financeDownPaymentAmount"),
      value: `${dzd.format(loan.downPayment)} (${downPct}%)`,
    },
    { label: t("financeAmountToFinance"), value: dzd.format(loan.principal) },
    {
      label: t("financeDuration"),
      value: `${duration} ${t("financeMonths")}`,
    },
    {
      label: t("financeRate"),
      value: `${rate.toFixed(1).replace(".", ",")} %`,
    },
    { label: t("financeCreditCost"), value: dzd.format(loan.creditCost) },
    {
      label: t("financeTotalCost"),
      value: dzd.format(loan.totalCost),
      strong: true,
    },
  ];

  const loanBreakdown = [
    {
      label: t("financeDownPaymentLabel"),
      value: loan.downPayment,
      color: "bg-brand-300",
    },
    {
      label: t("financePrincipalLabel"),
      value: loan.principal,
      color: "bg-brand-600",
    },
    {
      label: t("financeInterestLabel"),
      value: loan.creditCost,
      color: "bg-amber-400",
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
        <Tabs defaultValue="leasing" className="w-full">
          {/* Tabs list — wraps on mobile */}
          <div className="flex justify-center">
            <TabsList className="h-auto w-full max-w-2xl flex-wrap justify-center gap-1 p-1 sm:inline-flex sm:w-auto">
              <TabsTrigger
                value="leasing"
                className="flex-1 gap-1.5 px-4 py-2 sm:flex-none"
              >
                <Scale className="h-4 w-4" />
                <span>{t("financeLeasing")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="credit"
                className="flex-1 gap-1.5 px-4 py-2 sm:flex-none"
              >
                <Banknote className="h-4 w-4" />
                <span>{t("financeCredit")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="lld"
                className="flex-1 gap-1.5 px-4 py-2 sm:flex-none"
              >
                <CalendarDays className="h-4 w-4" />
                <span>{t("financeLLD")}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ============== TAB 1: Crédit-bail (Leasing) ============== */}
          <TabsContent value="leasing" className="mt-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Scale className="h-5 w-5 text-brand-700" />
                    {t("financeLeasing")}
                  </CardTitle>
                  <CardDescription>
                    {t("financeLeasingDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <SliderInput
                    label={t("financeAmount")}
                    icon={<Wallet className="h-4 w-4" />}
                    value={amount}
                    min={100_000}
                    max={5_000_000}
                    step={50_000}
                    onChange={setAmount}
                    suffix="DZD"
                  />
                  <SliderInput
                    label={t("financeDownPayment")}
                    icon={<Banknote className="h-4 w-4" />}
                    value={downPct}
                    min={0}
                    max={50}
                    step={1}
                    onChange={setDownPct}
                    suffix="%"
                  />
                  <SliderInput
                    label={t("financeDuration")}
                    icon={<CalendarDays className="h-4 w-4" />}
                    value={duration}
                    min={12}
                    max={60}
                    step={1}
                    onChange={setDuration}
                    suffix={t("financeMonths")}
                  />
                  <SliderInput
                    label={t("financeRate")}
                    icon={<Percent className="h-4 w-4" />}
                    value={rate}
                    min={3}
                    max={12}
                    step={0.1}
                    onChange={setRate}
                    suffix="%"
                  />
                </CardContent>
              </Card>

              <div className="lg:sticky lg:top-24 lg:self-start">
                <ResultsCard
                  badge={t("financeLeasing")}
                  badgeIcon={<Scale className="h-4 w-4" />}
                  monthlyPayment={loan.mensualite}
                  monthlyLabel={t("financeMonthlyPayment")}
                  breakdownLabel={t("financeBreakdown")}
                  totalLabel={t("financeTotalCost")}
                  note={t("financeLeasingNote")}
                  ctaLabel={t("financeRequestQuote")}
                  total={loan.totalCost}
                  breakdown={loanBreakdown}
                  rows={loanRows}
                />
              </div>
            </div>
          </TabsContent>

          {/* ============== TAB 2: Crédit classique ============== */}
          <TabsContent value="credit" className="mt-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Banknote className="h-5 w-5 text-brand-700" />
                    {t("financeCredit")}
                  </CardTitle>
                  <CardDescription>
                    {t("financeCreditDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <SliderInput
                    label={t("financeAmount")}
                    icon={<Wallet className="h-4 w-4" />}
                    value={amount}
                    min={100_000}
                    max={5_000_000}
                    step={50_000}
                    onChange={setAmount}
                    suffix="DZD"
                  />
                  <SliderInput
                    label={t("financeDownPayment")}
                    icon={<Banknote className="h-4 w-4" />}
                    value={downPct}
                    min={0}
                    max={50}
                    step={1}
                    onChange={setDownPct}
                    suffix="%"
                  />
                  <SliderInput
                    label={t("financeDuration")}
                    icon={<CalendarDays className="h-4 w-4" />}
                    value={duration}
                    min={12}
                    max={60}
                    step={1}
                    onChange={setDuration}
                    suffix={t("financeMonths")}
                  />
                  <SliderInput
                    label={t("financeRate")}
                    icon={<Percent className="h-4 w-4" />}
                    value={rate}
                    min={3}
                    max={12}
                    step={0.1}
                    onChange={setRate}
                    suffix="%"
                  />
                </CardContent>
              </Card>

              <div className="lg:sticky lg:top-24 lg:self-start">
                <ResultsCard
                  badge={t("financeCredit")}
                  badgeIcon={<Banknote className="h-4 w-4" />}
                  monthlyPayment={loan.mensualite}
                  monthlyLabel={t("financeMonthlyPayment")}
                  breakdownLabel={t("financeBreakdown")}
                  totalLabel={t("financeTotalCost")}
                  note={t("financeCreditNote")}
                  ctaLabel={t("financeRequestQuote")}
                  total={loan.totalCost}
                  breakdown={loanBreakdown}
                  rows={loanRows}
                />
              </div>
            </div>

            {/* Amortization table — full width below */}
            <div className="mt-6">
              <AmortizationTable rows={loan.amort} labels={amortLabels} />
            </div>
          </TabsContent>

          {/* ============== TAB 3: LLD ============== */}
          <TabsContent value="lld" className="mt-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarDays className="h-5 w-5 text-brand-700" />
                    {t("financeLLD")}
                  </CardTitle>
                  <CardDescription>{t("financeLLDDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <SliderInput
                    label={t("financeAmount")}
                    icon={<Wallet className="h-4 w-4" />}
                    value={amount}
                    min={100_000}
                    max={5_000_000}
                    step={50_000}
                    onChange={setAmount}
                    suffix="DZD"
                  />
                  <SliderInput
                    label={t("financeDuration")}
                    icon={<CalendarDays className="h-4 w-4" />}
                    value={duration}
                    min={12}
                    max={60}
                    step={1}
                    onChange={setDuration}
                    suffix={t("financeMonths")}
                  />
                </CardContent>
              </Card>

              <div className="lg:sticky lg:top-24 lg:self-start">
                <ResultsCard
                  badge={t("financeLLD")}
                  badgeIcon={<CalendarDays className="h-4 w-4" />}
                  monthlyPayment={lld.mensualite}
                  monthlyLabel={t("financeMonthlyPayment")}
                  breakdownLabel={t("financeBreakdown")}
                  totalLabel={t("financeTotalCost")}
                  note={t("financeLLDNote")}
                  ctaLabel={t("financeRequestQuote")}
                  total={lld.totalCost}
                  breakdown={[
                    {
                      label: t("financePrincipalLabel"),
                      value: lld.totalCost,
                      color: "bg-brand-600",
                    },
                  ]}
                  rows={[
                    { label: t("financeAmount"), value: dzd.format(amount) },
                    {
                      label: t("financeDuration"),
                      value: `${duration} ${t("financeMonths")}`,
                    },
                    {
                      label: t("financeTotalCost"),
                      value: dzd.format(lld.totalCost),
                      strong: true,
                    },
                  ]}
                />
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("financeIndicativeRate")}</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ---------- Disclaimer (prominent, amber) ---------- */}
        <div className="mt-10 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
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

        {/* ---------- Bottom CTA ---------- */}
        <div className="mt-8 rounded-2xl bg-gradient-to-r from-brand-700 to-brand-900 p-8 text-center text-white sm:p-10">
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

export default FinanceCalculatorPage;
