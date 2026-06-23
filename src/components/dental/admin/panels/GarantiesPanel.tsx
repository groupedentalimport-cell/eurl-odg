"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  ShieldX,
  CalendarClock,
  FileText,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n";
import { useAdminSession, can } from "@/hooks/useAdminSession";

// ============================================================
// GarantiesPanel — CRM-D
// Multi-role:
//   - manager + super_admin : full CRUD
//   - technician + accountant: read-only (the API gates them to GET only)
// Reuses /api/admin/garanties + /api/admin/maintenances (for the detail dialog)
// + /api/admin/clients (lookup) + /api/admin/commandes (lookup, optional).
// ============================================================

interface GarantieRow {
  id: string;
  client_id: string | null;
  commande_id: string | null;
  produit_id: string | null;
  produit_nom: string | null;
  date_debut: string | null;
  date_fin: string | null;
  duree_mois: number | null;
  conditions: string | null;
  actif: boolean | null;
  created_at?: string;
  // Joined field set by the API.
  client_nom?: string | null;
}

interface ClientRow {
  id: string;
  nom: string | null;
}

interface CommandeRow {
  id: string;
  numero: string | null;
  client_id: string | null;
}

interface MaintenanceRow {
  id: string;
  garantie_id: string | null;
  client_id: string | null;
  type: string | null;
  date_prevue: string | null;
  date_realisee: string | null;
  description: string | null;
  rapport: string | null;
  statut: string | null;
  technicien_id: string | null;
  // Joined fields set by the API.
  garantie_produit_nom?: string | null;
  garantie_date_fin?: string | null;
  client_nom?: string | null;
}

interface GarantieForm {
  id?: string;
  client_id: string;
  produit_nom: string;
  date_debut: string;
  duree_mois: string;
  conditions: string;
  commande_id: string;
}

const EMPTY_FORM: GarantieForm = {
  client_id: "",
  produit_nom: "",
  date_debut: "",
  duree_mois: "24",
  conditions: "",
  commande_id: "",
};

// ---- Date helpers ----
function formatDate(iso: string | null, lang: "fr" | "ar"): string {
  if (!iso) return "—";
  const s = String(iso).slice(0, 10);
  const d = new Date(`${s}T00:00:00Z`);
  if (isNaN(d.getTime())) return s;
  const locale = lang === "ar" ? "ar-DZ" : "fr-DZ";
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Returns the number of days from today to date_fin (negative = past).
function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const s = String(iso).slice(0, 10);
  const d = new Date(`${s}T00:00:00Z`);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - today.getTime()) / 86400000);
}

type GarantieStatus = "active" | "expiring" | "expired" | "inactive";

function computeStatus(g: GarantieRow): GarantieStatus {
  if (g.actif === false) return "inactive";
  const days = daysUntil(g.date_fin);
  if (days === null) return "inactive";
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "active";
}

function statusBadgeClass(s: GarantieStatus): string {
  switch (s) {
    case "active":
      return "border-transparent bg-emerald-100 text-emerald-800";
    case "expiring":
      return "border-transparent bg-amber-100 text-amber-800";
    case "expired":
      return "border-transparent bg-red-100 text-red-800";
    case "inactive":
      return "border-transparent bg-slate-100 text-slate-500";
  }
}

function statusLabel(s: GarantieStatus, t: (k: any) => string): string {
  switch (s) {
    case "active":
      return t("garActive");
    case "expiring":
      return t("garExpiringSoon");
    case "expired":
      return t("garExpired");
    case "inactive":
      return t("garInactive");
  }
}

function maintenanceStatutBadgeClass(statut: string): string {
  switch (statut) {
    case "planifie":
      return "border-transparent bg-amber-100 text-amber-800";
    case "en_cours":
      return "border-transparent bg-sky-100 text-sky-800";
    case "termine":
      return "border-transparent bg-emerald-100 text-emerald-800";
    case "annule":
      return "border-transparent bg-slate-100 text-slate-500 line-through";
    case "en_retard":
      return "border-transparent bg-red-100 text-red-800";
    default:
      return "border-transparent bg-slate-100 text-slate-700";
  }
}

function maintenanceStatutLabel(statut: string, t: (k: any) => string): string {
  switch (statut) {
    case "planifie":
      return t("statutPlanifie");
    case "en_cours":
      return t("statutEnCours");
    case "termine":
      return t("statutTermine");
    case "annule":
      return t("statutAnnule");
    case "en_retard":
      return t("statutEnRetard");
    default:
      return statut || "—";
  }
}

export function GarantiesPanel() {
  const { t, lang } = useTranslation();
  const { user } = useAdminSession();
  const role = user?.role;

  const canRead = can(role, "ops.garanties");
  const canWrite = role === "manager" || role === "super_admin";
  const canDelete = role === "manager" || role === "super_admin";

  const [garanties, setGaranties] = useState<GarantieRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [commandes, setCommandes] = useState<CommandeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<string>("all");

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<GarantieForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Detail dialog (shows the garantie + linked maintenances)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<GarantieRow | null>(null);
  const [detailMaintenances, setDetailMaintenances] = useState<MaintenanceRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // ---- Fetch the garanties list ----
  const refresh = useCallback(async () => {
    setLoading(true);
    setTableMissing(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/garanties", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        if (data?.tableMissing) setTableMissing(true);
        setError(data?.error || `HTTP ${res.status}`);
        setGaranties([]);
      } else {
        setGaranties(Array.isArray(data.garanties) ? (data.garanties as GarantieRow[]) : []);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
      setGaranties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Fetch lookups (clients + commandes) ----
  const fetchLookups = useCallback(async () => {
    try {
      const [c, cmd] = await Promise.all([
        fetch("/api/admin/clients", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch("/api/admin/commandes", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      if (c?.clients) setClients(c.clients as ClientRow[]);
      if (cmd?.commandes) setCommandes(cmd.commandes as CommandeRow[]);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    refresh();
    fetchLookups();
  }, [refresh, fetchLookups]);

  // ---- Helpers ----
  const clientName = useCallback(
    (id: string | null): string => {
      if (!id) return "—";
      const c = clients.find((x) => x.id === id);
      return c?.nom || "—";
    },
    [clients]
  );

  const commandeLabel = useCallback(
    (id: string | null): string => {
      if (!id) return "—";
      const c = commandes.find((x) => x.id === id);
      return c?.numero || "—";
    },
    [commandes]
  );

  // Filtered list — search by produit_nom or client name + status filter.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return garanties.filter((g) => {
      const st = computeStatus(g);
      if (statutFilter !== "all" && st !== statutFilter) return false;
      if (!q) return true;
      const nom = (g.produit_nom || "").toLowerCase();
      const cli = (g.client_nom || clientName(g.client_id)).toLowerCase();
      return nom.includes(q) || cli.includes(q);
    });
  }, [garanties, search, statutFilter, clientName]);

  // ---- Dialog openers ----
  const openCreate = () => {
    const today = new Date().toISOString().slice(0, 10);
    setForm({ ...EMPTY_FORM, date_debut: today });
    setDialogOpen(true);
  };

  const openEdit = (g: GarantieRow) => {
    setForm({
      id: g.id,
      client_id: g.client_id || "",
      produit_nom: g.produit_nom || "",
      date_debut: g.date_debut ? String(g.date_debut).slice(0, 10) : "",
      duree_mois: g.duree_mois != null ? String(g.duree_mois) : "24",
      conditions: g.conditions || "",
      commande_id: g.commande_id || "",
    });
    setDialogOpen(true);
  };

  const openDetail = async (g: GarantieRow) => {
    setDetail(g);
    setDetailMaintenances([]);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(
        `/api/admin/maintenances?garantie_id=${encodeURIComponent(g.id)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.maintenances)) {
        setDetailMaintenances(data.maintenances as MaintenanceRow[]);
      }
    } catch {
      /* silent */
    } finally {
      setDetailLoading(false);
    }
  };

  // ---- Persist (create OR update) ----
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.client_id) {
      toast.error(t("garNeedClient"));
      return;
    }
    if (!form.produit_nom.trim()) {
      toast.error(t("garNeedProduit"));
      return;
    }
    if (!form.date_debut) {
      toast.error(t("garNeedDateDebut"));
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        client_id: form.client_id,
        produit_nom: form.produit_nom.trim(),
        date_debut: form.date_debut,
        duree_mois: Number(form.duree_mois) || 24,
        conditions: form.conditions.trim() || null,
        commande_id: form.commande_id || null,
      };
      if (form.id) body.id = form.id;

      const res = await fetch("/api/admin/garanties", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }

      const saved: GarantieRow = data.garantie;
      setGaranties((prev) => {
        const idx = prev.findIndex((g) => g.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...saved, client_nom: clientName(saved.client_id) };
          return copy;
        }
        return [{ ...saved, client_nom: clientName(saved.client_id) }, ...prev];
      });
      setDialogOpen(false);
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (g: GarantieRow) => {
    if (!canDelete) return;
    if (!window.confirm(t("confirmDelete"))) return;
    setBusyId(g.id);
    try {
      const res = await fetch(`/api/admin/garanties?id=${encodeURIComponent(g.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      setGaranties((prev) => prev.filter((x) => x.id !== g.id));
      if (detail?.id === g.id) setDetailOpen(false);
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
    } finally {
      setBusyId(null);
    }
  };

  // ---- Permission gate ----
  if (!canRead) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-amber-900">{t("techReadOnly")}</p>
        </CardContent>
      </Card>
    );
  }

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex animate-pulse gap-4">
                <div className="h-4 w-32 rounded bg-slate-200" />
                <div className="h-4 w-40 rounded bg-slate-100" />
                <div className="h-4 w-20 rounded bg-slate-100" />
                <div className="h-4 w-24 rounded bg-slate-100" />
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
            <p className="text-sm font-medium text-amber-900">{t("tableMissingNotice")}</p>
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
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ShieldCheck className="h-5 w-5 text-brand-700" />
            {t("garantiesTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{t("garantiesDesc")}</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} size="sm" className="bg-brand-700 hover:bg-brand-800">
            <Plus className="h-4 w-4" />
            {t("newGarantie")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("devisSearch")}
          className="sm:max-w-xs"
        />
        <div className="w-full sm:w-56">
          <Select value={statutFilter} onValueChange={setStatutFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("garFilterAll")}</SelectItem>
              <SelectItem value="active">{t("garFilterActive")}</SelectItem>
              <SelectItem value="expiring">{t("garFilterExpiring")}</SelectItem>
              <SelectItem value="expired">{t("garFilterExpired")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        {filtered.length} {t("clientsCount")}
      </p>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <ShieldCheck className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">{t("noGaranties")}</p>
            {canWrite && (
              <Button onClick={openCreate} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                {t("newGarantie")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-slate-200">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("garProduit")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("garClient")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("garDateDebut")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("garDateFin")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("garDuree")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("garStatut")}</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">{t("devisColActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((g) => {
                  const st = computeStatus(g);
                  const days = daysUntil(g.date_fin);
                  const isExpiringRow = st === "expiring";
                  return (
                    <tr
                      key={g.id}
                      className={`cursor-pointer hover:bg-slate-50/60 ${
                        isExpiringRow ? "bg-amber-50/50" : ""
                      }`}
                      onClick={() => openDetail(g)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">
                          {g.produit_nom || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {g.client_nom || clientName(g.client_id)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(g.date_debut, lang)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex flex-col">
                          <span>{formatDate(g.date_fin, lang)}</span>
                          {days !== null && days >= 0 && days <= 30 && (
                            <span className="text-[10px] font-medium text-amber-700">
                              {days} {t("garDaysLeft")}
                            </span>
                          )}
                          {days !== null && days < 0 && (
                            <span className="text-[10px] font-medium text-red-700">
                              {Math.abs(days)} {t("garDays")} ({t("garExpiredAgo")})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {g.duree_mois != null ? `${g.duree_mois}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusBadgeClass(st)}>{statusLabel(st, t)}</Badge>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap justify-end gap-1">
                          {canWrite && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEdit(g)}
                              aria-label={t("edit")}
                              title={t("edit")}
                              disabled={busyId === g.id}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => remove(g)}
                              disabled={busyId === g.id}
                              aria-label={t("delete")}
                              title={t("delete")}
                            >
                              {busyId === g.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? t("editGarantie") : t("newGarantie")}</DialogTitle>
            <DialogDescription>{t("garantiesDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="gar-client">
                {t("garClient")} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.client_id}
                onValueChange={(v) => setForm({ ...form, client_id: v })}
              >
                <SelectTrigger id="gar-client">
                  <SelectValue placeholder={t("garSelectClient")} />
                </SelectTrigger>
                <SelectContent>
                  {clients.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      {t("noClients")}
                    </SelectItem>
                  ) : (
                    clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nom || "—"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gar-produit">
                {t("garProduit")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="gar-produit"
                value={form.produit_nom}
                onChange={(e) => setForm({ ...form, produit_nom: e.target.value })}
                placeholder="Fauteuil Silver Fox SF-9000"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="gar-debut">
                  {t("garDateDebut")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="gar-debut"
                  type="date"
                  value={form.date_debut}
                  onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gar-duree">{t("garDuree")}</Label>
                <Input
                  id="gar-duree"
                  type="number"
                  min={1}
                  max={120}
                  value={form.duree_mois}
                  onChange={(e) => setForm({ ...form, duree_mois: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gar-commande">{t("garCommandeLiee")}</Label>
              <Select
                value={form.commande_id || "__none"}
                onValueChange={(v) =>
                  setForm({ ...form, commande_id: v === "__none" ? "" : v })
                }
              >
                <SelectTrigger id="gar-commande">
                  <SelectValue placeholder={t("none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{t("none")}</SelectItem>
                  {commandes
                    .filter(
                      (c) => !form.client_id || !c.client_id || c.client_id === form.client_id
                    )
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.numero || c.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gar-conditions">{t("garConditions")}</Label>
              <Textarea
                id="gar-conditions"
                value={form.conditions}
                onChange={(e) => setForm({ ...form, conditions: e.target.value })}
                rows={3}
                placeholder={t("garConditionsPlaceholder")}
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={saving || !form.client_id || !form.produit_nom.trim() || !form.date_debut}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("sending")}
                  </>
                ) : (
                  t("save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-700" />
              {detail?.produit_nom || t("garantiesTitle")}
            </DialogTitle>
            <DialogDescription>
              {detail?.client_nom || clientName(detail?.client_id || null)}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-4">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("garDateDebut")}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {formatDate(detail.date_debut, lang)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("garDateFin")}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {formatDate(detail.date_fin, lang)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("garDuree")}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {detail.duree_mois != null ? `${detail.duree_mois}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("garStatut")}
                  </p>
                  <Badge className={statusBadgeClass(computeStatus(detail))}>
                    {statusLabel(computeStatus(detail), t)}
                  </Badge>
                </div>
              </div>

              {detail.commande_id && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("garCommandeLiee")}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {commandeLabel(detail.commande_id)}
                  </p>
                </div>
              )}

              {detail.conditions && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("garConditions")}
                  </p>
                  <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                    {detail.conditions}
                  </p>
                </div>
              )}

              <Separator />

              {/* Linked maintenances */}
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Wrench className="h-4 w-4 text-brand-700" />
                  {t("garMaintenancesLiees")}
                </h3>
                {detailLoading ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{t("loading")}</span>
                  </div>
                ) : detailMaintenances.length === 0 ? (
                  <p className="text-sm text-slate-500">{t("garNoMaintenances")}</p>
                ) : (
                  <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {detailMaintenances.map((m) => (
                      <li
                        key={m.id}
                        className="rounded-md border border-slate-200 bg-white p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-slate-900">
                            {m.type === "preventive"
                              ? t("typePreventive")
                              : m.type === "curative"
                              ? t("typeCurative")
                              : m.type || "—"}
                          </span>
                          {m.statut && (
                            <Badge className={maintenanceStatutBadgeClass(m.statut)}>
                              {maintenanceStatutLabel(m.statut, t)}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {formatDate(m.date_prevue, lang)}
                          </span>
                          {m.date_realisee && (
                            <span className="flex items-center gap-1 text-emerald-700">
                              <FileText className="h-3 w-3" />
                              {formatDate(m.date_realisee, lang)}
                            </span>
                          )}
                        </div>
                        {m.description && (
                          <p className="mt-1 text-xs text-slate-600">{m.description}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <DialogFooter>
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {detail.actif === false ? (
                      <ShieldX className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    )}
                    {detail.actif === false ? t("garInactive") : t("garActive")}
                  </div>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      {t("cancel")}
                    </Button>
                  </DialogClose>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GarantiesPanel;
