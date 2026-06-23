"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Mail,
  Phone,
  PhoneCall,
  Copy,
  Trash2,
  Loader2,
  AlertTriangle,
  ClipboardList,
  ArrowRightCircle,
  CheckCircle2,
  Archive,
  MapPin,
  User,
  Tag,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n";
import type { QuoteItem, QuoteRequest, QuoteStatus } from "@/lib/types";

// Normalise the produits_selectionnes field which Supabase returns as a
// jsonb array but could (defensively) be a JSON string or null.
function parseItems(raw: unknown): QuoteItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as QuoteItem[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as QuoteItem[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function sanitizePhone(p: string): string {
  return p.replace(/[\s.-]/g, "");
}

function formatDate(iso: string | null | undefined, lang: "fr" | "ar"): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-DZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// Map a raw type_client value to its translation key suffix.
function clientTypeKey(raw: string): string {
  const v = (raw || "").toLowerCase();
  switch (v) {
    case "dentiste":
    case "dentist":
      return "clientTypeDentist";
    case "clinique":
    case "clinic":
      return "clientTypeClinic";
    case "hopital":
    case "hospital":
      return "clientTypeHospital";
    case "revendeur":
    case "reseller":
      return "clientTypeReseller";
    default:
      return "clientTypeOther";
  }
}

// Statut → badge styling (matches the spec colors exactly).
function statutBadgeClass(statut: string): string {
  switch (statut) {
    case "nouveau":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "en_cours":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "traite":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "archive":
      return "border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function statutLabel(statut: string, t: (k: any) => string): string {
  switch (statut) {
    case "nouveau":
      return t("quoteStatusNew");
    case "en_cours":
      return t("quoteStatusInProgress");
    case "traite":
      return t("quoteStatusDone");
    case "archive":
      return t("quoteStatusArchived");
    default:
      return statut;
  }
}

export function QuotesPanel() {
  const { lang, t } = useTranslation();
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | QuoteStatus>("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    setTableMissing(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/quotes", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        if (data?.tableMissing) setTableMissing(true);
        setError(data?.error || `HTTP ${res.status}`);
        setQuotes([]);
      } else {
        const list = Array.isArray(data.quotes) ? (data.quotes as QuoteRequest[]) : [];
        // Normalise items field on every row.
        setQuotes(
          list.map((q) => ({
            ...q,
            produits_selectionnes: parseItems(
              (q as any).produits_selectionnes
            ),
          }))
        );
      }
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const patchStatus = async (id: string, statut: QuoteStatus) => {
    setBusyId(id);
    try {
      const res = await fetch(
        `/api/admin/quotes?id=${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statut }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      // Optimistic local update so the UI reflects the new statut immediately.
      setQuotes((prev) =>
        prev.map((q) => (q.id === id ? { ...q, statut } : q))
      );
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e?.message || "Erreur réseau");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusyId(id);
    try {
      const res = await fetch(
        `/api/admin/quotes?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e?.message || "Erreur réseau");
    } finally {
      setBusyId(null);
    }
  };

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success(t("copied"));
    } catch {
      const ta = document.createElement("textarea");
      ta.value = email;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        toast.success(t("copied"));
      } catch {
        toast.error("Copie impossible");
      }
      document.body.removeChild(ta);
    }
  };

  const filtered = useMemo(() => {
    if (filter === "all") return quotes;
    return quotes.filter((q) => q.statut === filter);
  }, [quotes, filter]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex animate-pulse flex-col gap-2">
                <div className="h-4 w-1/3 rounded bg-slate-200" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
                <div className="h-3 w-full rounded bg-slate-100" />
                <div className="h-3 w-2/3 rounded bg-slate-100" />
              </div>
            </CardContent>
          </Card>
        ))}
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t("loading")}</span>
        </div>
      </div>
    );
  }

  if (tableMissing) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900">
              {t("tableMissingNotice")}
            </p>
            <Button size="sm" variant="outline" onClick={refresh} className="mt-2">
              {t("retry")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-red-900">{error}</p>
            <Button size="sm" variant="outline" onClick={refresh} className="mt-2">
              {t("retry")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700">
          {t("quoteStatus")}
        </label>
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as "all" | QuoteStatus)}
        >
          <SelectTrigger className="h-9 w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            <SelectItem value="nouveau">{t("quoteStatusNew")}</SelectItem>
            <SelectItem value="en_cours">{t("quoteStatusInProgress")}</SelectItem>
            <SelectItem value="traite">{t("quoteStatusDone")}</SelectItem>
            <SelectItem value="archive">{t("quoteStatusArchived")}</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-slate-500">
          {filtered.length}/{quotes.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <ClipboardList className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">{t("noQuotes")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-[75vh] space-y-3 overflow-y-auto pr-1">
          {filtered.map((q) => {
            const email = (q.email || "").trim();
            const phone = (q.telephone || "").trim();
            const items = q.produits_selectionnes || [];
            const isBusy = busyId === q.id;
            return (
              <Card
                key={q.id}
                className={
                  q.statut === "nouveau"
                    ? "border-brand-200 bg-brand-50/30 shadow-sm"
                    : "border-slate-200 bg-white"
                }
              >
                <CardContent className="p-4 sm:p-5">
                  {/* Header row: quote #, statut badge, date */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {t("quoteNumber")} #
                          <span className="font-mono">
                            {q.id.slice(0, 8)}
                          </span>
                        </span>
                        <Badge className={statutBadgeClass(q.statut)}>
                          {statutLabel(q.statut, t)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(q.created_at, lang)}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  {/* Client info grid */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                      <User className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {t("name")}:
                      </span>
                      <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                        {q.nom || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                      <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {t("wilaya")}:
                      </span>
                      <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                        {q.wilaya || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                      <Tag className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {t("clientType")}:
                      </span>
                      <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                        {t(clientTypeKey(q.type_client) as any)}
                      </span>
                    </div>
                  </div>

                  {/* Email + phone rows (same pattern as MessagesPanel) */}
                  {(email || phone) && (
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {email && (
                        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                          <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                          <a
                            href={`mailto:${email}`}
                            className="min-w-0 truncate text-sm font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
                            title={email}
                          >
                            {email}
                          </a>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="ml-auto h-7 w-7"
                            onClick={() => copyEmail(email)}
                            aria-label={t("copyEmail")}
                            title={t("copyEmail")}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                      {phone && (
                        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                          <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                          <a
                            href={`tel:${sanitizePhone(phone)}`}
                            className="min-w-0 truncate text-sm font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
                            title={phone}
                          >
                            {phone}
                          </a>
                          <a
                            href={`tel:${sanitizePhone(phone)}`}
                            className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-50"
                            aria-label={t("call")}
                            title={t("call")}
                          >
                            <PhoneCall className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message (optional) */}
                  {q.message && (
                    <blockquote className="mt-3 border-l-4 border-slate-200 bg-slate-50 px-3 py-2 text-sm italic leading-relaxed text-slate-700">
                      {q.message}
                    </blockquote>
                  )}

                  {/* Selected products */}
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {t("selectedProducts")}
                    </div>
                    {items.length === 0 ? (
                      <p className="text-sm italic text-slate-400">
                        (panier vide)
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {items.map((it, idx) => (
                          <li
                            key={`${it.productId}-${idx}`}
                            className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                          >
                            {it.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={it.image}
                                alt={it.name?.[lang] || it.name?.fr || ""}
                                className="h-8 w-8 shrink-0 rounded object-cover"
                              />
                            ) : null}
                            <span className="font-medium text-slate-800">
                              {[it.brand, it.model].filter(Boolean).join(" ") ||
                                "—"}
                            </span>
                            <span className="text-slate-400">—</span>
                            <span className="min-w-0 flex-1 truncate text-slate-600">
                              {it.name?.[lang] || it.name?.fr || it.slug}
                            </span>
                            <Badge variant="secondary" className="shrink-0">
                              ×{it.quantity || 1}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Action buttons */}
                  <Separator className="my-3" />
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {q.statut === "nouveau" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => patchStatus(q.id, "en_cours")}
                        disabled={isBusy}
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ArrowRightCircle className="h-3.5 w-3.5" />
                        )}
                        {t("markAsInProgress")}
                      </Button>
                    )}
                    {q.statut === "en_cours" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => patchStatus(q.id, "traite")}
                        disabled={isBusy}
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        {t("markAsDone")}
                      </Button>
                    )}
                    {q.statut === "traite" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => patchStatus(q.id, "archive")}
                        disabled={isBusy}
                        className="border-slate-300 text-slate-600 hover:bg-slate-50"
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Archive className="h-3.5 w-3.5" />
                        )}
                        {t("markAsArchived")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(q.id)}
                      disabled={isBusy}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("delete")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default QuotesPanel;
