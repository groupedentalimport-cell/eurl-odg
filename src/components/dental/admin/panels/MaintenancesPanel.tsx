"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  Settings,
  CheckCircle2,
  XCircle,
  Save,
  Wrench,
  CalendarClock,
  FileText,
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
// MaintenancesPanel — CRM-D
// Multi-role:
//   - manager + super_admin : full CRUD
//   - technician            : CRUD own assigned (server-enforced)
// Backend re-validates via requireRole(request, ["manager","technician"]).
// ============================================================

type MaintenanceType = "preventive" | "curative";
const TYPES: MaintenanceType[] = ["preventive", "curative"];
const STATUTS = ["planifie", "en_cours", "termine", "annule", "en_retard"] as const;

interface MaintenanceRow {
  id: string;
  garantie_id: string | null;
  client_id: string | null;
  type: string | null;
  date_prevue: string | null;
  date_realisee: string | null;
  intervention_id: string | null;
  description: string | null;
  rapport: string | null;
  statut: string | null;
  technicien_id: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined fields (set by the API).
  garantie_produit_nom?: string | null;
  garantie_date_fin?: string | null;
  client_nom?: string | null;
}

interface ClientRow { id: string; nom: string | null; }
interface GarantieRow {
  id: string;
  produit_nom: string | null;
  date_fin: string | null;
  client_id: string | null;
  client_nom?: string | null;
}
interface TechnicienRow { id: string; nom: string | null; }

interface MaintenanceForm {
  id?: string;
  garantie_id: string;
  client_id: string;
  type: MaintenanceType;
  date_prevue: string;
  description: string;
  technicien_id: string;
}

const EMPTY_FORM: MaintenanceForm = {
  garantie_id: "",
  client_id: "",
  type: "preventive",
  date_prevue: "",
  description: "",
  technicien_id: "",
};

// ---- Styling helpers ----
function typeBadgeClass(type: string): string {
  switch (type) {
    case "preventive":
      return "border-transparent bg-sky-100 text-sky-800";
    case "curative":
      return "border-transparent bg-red-100 text-red-800";
    default:
      return "border-transparent bg-slate-100 text-slate-700";
  }
}
function typeLabel(type: string, t: (k: any) => string): string {
  switch (type) {
    case "preventive":
      return t("typePreventive");
    case "curative":
      return t("typeCurative");
    default:
      return type || "—";
  }
}
function statutBadgeClass(statut: string): string {
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
function statutLabel(statut: string, t: (k: any) => string): string {
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

export function MaintenancesPanel() {
  const { t, lang } = useTranslation();
  const { user } = useAdminSession();
  const role = user?.role;

  const canRead = can(role, "ops.maintenances");
  const canWrite = role === "manager" || role === "super_admin" || role === "technician";
  const canDelete = role === "manager" || role === "super_admin";

  const [maintenances, setMaintenances] = useState<MaintenanceRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [garanties, setGaranties] = useState<GarantieRow[]>([]);
  const [techniciens, setTechniciens] = useState<TechnicienRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatut, setFilterStatut] = useState<string>("all");

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<MaintenanceForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Detail dialog (with editable rapport textarea)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<MaintenanceRow | null>(null);
  const [rapportDraft, setRapportDraft] = useState("");
  const [rapportSaving, setRapportSaving] = useState(false);

  // ---- Fetch list ----
  const refresh = useCallback(async () => {
    setLoading(true);
    setTableMissing(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/maintenances", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        if (data?.tableMissing) setTableMissing(true);
        setError(data?.error || `HTTP ${res.status}`);
        setMaintenances([]);
      } else {
        setMaintenances(
          Array.isArray(data.maintenances) ? (data.maintenances as MaintenanceRow[]) : []
        );
      }
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
      setMaintenances([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Fetch lookups ----
  const fetchLookups = useCallback(async () => {
    try {
      const [c, g, tc] = await Promise.all([
        fetch("/api/admin/clients", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch("/api/admin/garanties", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch("/api/admin/techniciens?all=1", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      if (c?.clients) setClients(c.clients as ClientRow[]);
      if (g?.garanties) setGaranties(g.garanties as GarantieRow[]);
      if (tc?.techniciens) setTechniciens(tc.techniciens as TechnicienRow[]);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    refresh();
    fetchLookups();
  }, [refresh, fetchLookups]);

  // ---- Resolvers ----
  const clientName = useCallback(
    (id: string | null): string => {
      if (!id) return "—";
      return clients.find((x) => x.id === id)?.nom || "—";
    },
    [clients]
  );
  const technicienName = useCallback(
    (id: string | null): string => {
      if (!id) return "—";
      return techniciens.find((x) => x.id === id)?.nom || "—";
    },
    [techniciens]
  );
  const garantieProduit = useCallback(
    (m: MaintenanceRow): string => {
      if (m.garantie_produit_nom) return m.garantie_produit_nom;
      if (m.garantie_id) {
        const g = garanties.find((x) => x.id === m.garantie_id);
        if (g?.produit_nom) return g.produit_nom;
      }
      return "—";
    },
    [garanties]
  );

  // ---- Client-side filters ----
  const filtered = useMemo(() => {
    return maintenances.filter((m) => {
      if (filterType !== "all" && m.type !== filterType) return false;
      if (filterStatut !== "all" && m.statut !== filterStatut) return false;
      return true;
    });
  }, [maintenances, filterType, filterStatut]);

  // ---- Dialog openers ----
  const openCreate = () => {
    const today = new Date().toISOString().slice(0, 10);
    setForm({ ...EMPTY_FORM, date_prevue: today });
    setDialogOpen(true);
  };

  const openEdit = (m: MaintenanceRow) => {
    setForm({
      id: m.id,
      garantie_id: m.garantie_id || "",
      client_id: m.client_id || "",
      type: (m.type as MaintenanceType) || "preventive",
      date_prevue: m.date_prevue ? String(m.date_prevue).slice(0, 10) : "",
      description: m.description || "",
      technicien_id: m.technicien_id || "",
    });
    setDialogOpen(true);
  };

  const openDetail = (m: MaintenanceRow) => {
    setDetail(m);
    setRapportDraft(m.rapport || "");
    setDetailOpen(true);
  };

  // ---- Persist (create OR update) ----
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.client_id) {
      toast.error(t("mainNeedClient"));
      return;
    }
    if (!form.date_prevue) {
      toast.error(t("mainNeedDatePrevue"));
      return;
    }
    if (!form.description.trim()) {
      toast.error(t("mainNeedDescription"));
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        garantie_id: form.garantie_id || null,
        client_id: form.client_id,
        type: form.type,
        date_prevue: form.date_prevue,
        description: form.description.trim(),
        technicien_id: form.technicien_id || null,
      };
      if (form.id) body.id = form.id;

      const res = await fetch("/api/admin/maintenances", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }

      const saved: MaintenanceRow = data.maintenance;
      setMaintenances((prev) => {
        const idx = prev.findIndex((m) => m.id === saved.id);
        const enriched: MaintenanceRow = {
          ...saved,
          client_nom: clientName(saved.client_id),
          garantie_produit_nom: garantieProduit({ ...saved, garantie_produit_nom: null }),
        };
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = enriched;
          return copy;
        }
        return [enriched, ...prev];
      });
      setDialogOpen(false);
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  // ---- Mark termine (set date_realisee = today + open rapport) ----
  const markTermine = async (m: MaintenanceRow) => {
    setBusyId(m.id);
    try {
      const res = await fetch("/api/admin/maintenances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: m.id,
          statut: "termine",
          date_realisee: new Date().toISOString().slice(0, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      const updated: MaintenanceRow = data.maintenance;
      setMaintenances((prev) => prev.map((x) => (x.id === updated.id ? {
        ...updated,
        client_nom: clientName(updated.client_id),
        garantie_produit_nom: garantieProduit({ ...updated, garantie_produit_nom: null }),
      } : x)));
      // Open the detail dialog so the tech can fill the rapport right away.
      openDetail({ ...updated, rapport: updated.rapport || "" });
      toast.success(t("devisStatusOk"));
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
    } finally {
      setBusyId(null);
    }
  };

  // ---- Cancel maintenance ----
  const cancelMaintenance = async (m: MaintenanceRow) => {
    setBusyId(m.id);
    try {
      const res = await fetch("/api/admin/maintenances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id, statut: "annule" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      const updated: MaintenanceRow = data.maintenance;
      setMaintenances((prev) => prev.map((x) => (x.id === updated.id ? {
        ...updated,
        client_nom: clientName(updated.client_id),
        garantie_produit_nom: garantieProduit({ ...updated, garantie_produit_nom: null }),
      } : x)));
      toast.success(t("devisStatusOk"));
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
    } finally {
      setBusyId(null);
    }
  };

  // ---- Save rapport (without statut change) ----
  const saveRapport = async () => {
    if (!detail) return;
    setRapportSaving(true);
    try {
      const res = await fetch("/api/admin/maintenances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: detail.id, rapport: rapportDraft }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      const updated: MaintenanceRow = data.maintenance;
      setMaintenances((prev) => prev.map((x) => (x.id === updated.id ? {
        ...updated,
        client_nom: clientName(updated.client_id),
        garantie_produit_nom: garantieProduit({ ...updated, garantie_produit_nom: null }),
      } : x)));
      setDetail(updated);
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
    } finally {
      setRapportSaving(false);
    }
  };

  // ---- Delete ----
  const remove = async (m: MaintenanceRow) => {
    if (!canDelete) return;
    if (!window.confirm(t("confirmDelete"))) return;
    setBusyId(m.id);
    try {
      const res = await fetch(`/api/admin/maintenances?id=${encodeURIComponent(m.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      setMaintenances((prev) => prev.filter((x) => x.id !== m.id));
      if (detail?.id === m.id) setDetailOpen(false);
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
                <div className="h-4 w-24 rounded bg-slate-200" />
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
            <Settings className="h-5 w-5 text-brand-700" />
            {t("maintenancesTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{t("maintenancesDesc")}</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} size="sm" className="bg-brand-700 hover:bg-brand-800">
            <Plus className="h-4 w-4" />
            {t("newMaintenance")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="w-full sm:w-56">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder={t("mainFilterType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("mainFilterType")}</SelectItem>
              {TYPES.map((ty) => (
                <SelectItem key={ty} value={ty}>
                  {typeLabel(ty, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-56">
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger>
              <SelectValue placeholder={t("mainFilterStatut")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("mainFilterStatut")}</SelectItem>
              {STATUTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {statutLabel(s, t)}
                </SelectItem>
              ))}
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
            <Settings className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">{t("noMaintenances")}</p>
            {canWrite && (
              <Button onClick={openCreate} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                {t("newMaintenance")}
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
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("mainType")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("mainClient")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("mainProduit")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("mainDatePrevue")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("mainDateRealisee")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("mainStatut")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("mainTechnicien")}</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">{t("devisColActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((m) => {
                  const produit = garantieProduit(m);
                  const isLate =
                    m.statut === "en_retard" ||
                    (m.statut !== "termine" &&
                      m.statut !== "annule" &&
                      m.date_prevue &&
                      new Date(`${String(m.date_prevue).slice(0, 10)}T00:00:00Z`).getTime() <
                        Date.now());
                  return (
                    <tr
                      key={m.id}
                      className={`cursor-pointer hover:bg-slate-50/60 ${
                        isLate ? "bg-red-50/40" : ""
                      }`}
                      onClick={() => openDetail(m)}
                    >
                      <td className="px-4 py-3">
                        {m.type && (
                          <Badge className={typeBadgeClass(m.type)}>
                            {typeLabel(m.type, t)}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {m.client_nom || clientName(m.client_id)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{produit}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(m.date_prevue, lang)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDate(m.date_realisee, lang)}
                      </td>
                      <td className="px-4 py-3">
                        {m.statut && (
                          <Badge className={statutBadgeClass(m.statut)}>
                            {statutLabel(m.statut, t)}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {technicienName(m.technicien_id)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap justify-end gap-1">
                          {/* Mark termine — only when not already termine/annule */}
                          {canWrite && m.statut !== "termine" && m.statut !== "annule" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              onClick={() => markTermine(m)}
                              disabled={busyId === m.id}
                              title={t("mainMarkTermine")}
                            >
                              {busyId === m.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              <span className="hidden sm:inline">{t("mainMarkTermine")}</span>
                            </Button>
                          )}
                          {/* Cancel — only when not already termine/annule */}
                          {canWrite && m.statut !== "termine" && m.statut !== "annule" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                              onClick={() => cancelMaintenance(m)}
                              disabled={busyId === m.id}
                              title={t("mainCancel")}
                              aria-label={t("mainCancel")}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {/* Edit */}
                          {canWrite && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEdit(m)}
                              aria-label={t("edit")}
                              title={t("edit")}
                              disabled={busyId === m.id}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {/* Delete */}
                          {canDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => remove(m)}
                              disabled={busyId === m.id}
                              aria-label={t("delete")}
                              title={t("delete")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
            <DialogTitle>{form.id ? t("editMaintenance") : t("newMaintenance")}</DialogTitle>
            <DialogDescription>{t("maintenancesDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="main-garantie">{t("mainGarantie")}</Label>
              {garanties.length === 0 ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  {t("mainNoGarantie")}
                </p>
              ) : (
                <Select
                  value={form.garantie_id || "__none"}
                  onValueChange={(v) => {
                    const gId = v === "__none" ? "" : v;
                    const g = garanties.find((x) => x.id === gId);
                    setForm({
                      ...form,
                      garantie_id: gId,
                      // Auto-fill client_id from the garantie if available.
                      client_id: g?.client_id || form.client_id,
                    });
                  }}
                >
                  <SelectTrigger id="main-garantie">
                    <SelectValue placeholder={t("mainSelectGarantie")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">{t("none")}</SelectItem>
                    {garanties.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.produit_nom || "—"} · {g.client_nom || clientName(g.client_id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="main-client">
                {t("mainClient")} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.client_id}
                onValueChange={(v) => setForm({ ...form, client_id: v })}
              >
                <SelectTrigger id="main-client">
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="main-type">
                  {t("mainType")} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as MaintenanceType })}
                >
                  <SelectTrigger id="main-type">
                    <SelectValue placeholder={t("selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((ty) => (
                      <SelectItem key={ty} value={ty}>
                        {typeLabel(ty, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="main-date">
                  {t("mainDatePrevue")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="main-date"
                  type="date"
                  value={form.date_prevue}
                  onChange={(e) => setForm({ ...form, date_prevue: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="main-technicien">{t("mainTechnicien")}</Label>
              <Select
                value={form.technicien_id || "__none"}
                onValueChange={(v) =>
                  setForm({ ...form, technicien_id: v === "__none" ? "" : v })
                }
              >
                <SelectTrigger id="main-technicien">
                  <SelectValue placeholder={t("none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{t("none")}</SelectItem>
                  {techniciens.map((tc) => (
                    <SelectItem key={tc.id} value={tc.id}>
                      {tc.nom || "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="main-description">
                {t("mainDescription")} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="main-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder={t("mainDescriptionPlaceholder")}
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
                disabled={
                  saving || !form.client_id || !form.date_prevue || !form.description.trim()
                }
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

      {/* Detail dialog (with editable rapport) */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-brand-700" />
              {detail ? typeLabel(detail.type || "", t) : t("mainDetails")}
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
                    {t("mainDatePrevue")}
                  </p>
                  <p className="flex items-center gap-1 text-sm font-medium text-slate-900">
                    <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                    {formatDate(detail.date_prevue, lang)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("mainDateRealisee")}
                  </p>
                  <p className="flex items-center gap-1 text-sm font-medium text-slate-900">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    {formatDate(detail.date_realisee, lang)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("mainStatut")}
                  </p>
                  {detail.statut && (
                    <Badge className={statutBadgeClass(detail.statut)}>
                      {statutLabel(detail.statut, t)}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("mainTechnicien")}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {technicienName(detail.technicien_id)}
                  </p>
                </div>
              </div>

              {/* Produit (from garantie) */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {t("mainProduit")}
                </p>
                <p className="text-sm font-medium text-slate-900">{garantieProduit(detail)}</p>
              </div>

              {detail.description && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("mainDescription")}
                  </p>
                  <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                    {detail.description}
                  </p>
                </div>
              )}

              <Separator />

              {/* Rapport (editable) */}
              <div className="space-y-1.5">
                <Label htmlFor="main-rapport">{t("mainRapport")}</Label>
                <Textarea
                  id="main-rapport"
                  value={rapportDraft}
                  onChange={(e) => setRapportDraft(e.target.value)}
                  rows={5}
                  placeholder={t("mainRapportPlaceholder")}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={saveRapport}
                    disabled={rapportSaving || rapportDraft === (detail.rapport || "")}
                  >
                    {rapportSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {t("mainSaveRapport")}
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {canWrite && detail.statut !== "termine" && detail.statut !== "annule" && (
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => markTermine(detail)}
                        disabled={busyId === detail.id}
                      >
                        {busyId === detail.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {t("mainMarkTermine")}
                      </Button>
                    )}
                    {canWrite && detail.statut !== "termine" && detail.statut !== "annule" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1 text-slate-600"
                        onClick={() => cancelMaintenance(detail)}
                        disabled={busyId === detail.id}
                      >
                        <XCircle className="h-4 w-4" />
                        {t("mainCancel")}
                      </Button>
                    )}
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

export default MaintenancesPanel;
