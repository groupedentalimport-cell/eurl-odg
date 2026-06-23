"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Loader2,
  AlertTriangle,
  Calendar as CalendarIcon,
  Truck,
  Wrench,
  GraduationCap,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  CheckCircle2,
  PlayCircle,
  XCircle,
  Save,
  Pencil,
  User,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
// InterventionsPanel — CRM-C (Task CRM-C2)
// Weekly planning view: interventions grouped by day.
// Multi-role:
//   - manager + super_admin : full CRUD
//   - technician            : CRUD own interventions only (server-enforced)
// Backend re-validates via requireRole(request, ["manager","technician"]).
// ============================================================

// ---- Types ----
type InterventionType =
  | "livraison"
  | "installation"
  | "formation"
  | "maintenance_preventive"
  | "maintenance_curative";

const TYPES: InterventionType[] = [
  "livraison",
  "installation",
  "formation",
  "maintenance_preventive",
  "maintenance_curative",
];

const STATUTS = ["planifie", "en_cours", "termine", "annule"] as const;

interface InterventionRow {
  id: string;
  type: string | null;
  client_id: string | null;
  commande_id: string | null;
  produit_nom: string | null;
  technicien_id: string | null;
  date_prevue: string | null;
  duree_estimee_min: number | null;
  date_realisee: string | null;
  adresse_intervention: string | null;
  statut: string | null;
  rapport: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ClientRow { id: string; nom: string | null; }
interface TechnicienRow {
  id: string;
  nom: string | null;
  telephone?: string | null;
  email?: string | null;
}
interface CommandeRow { id: string; numero: string | null; client_id: string | null; }

interface InterventionForm {
  id?: string;
  type: InterventionType;
  client_id: string;
  commande_id: string;
  produit_nom: string;
  technicien_id: string;
  date_prevue: string; // datetime-local format "YYYY-MM-DDTHH:mm"
  duree_estimee_min: string;
  adresse_intervention: string;
  notes: string;
}

const EMPTY_FORM: InterventionForm = {
  type: "livraison",
  client_id: "",
  commande_id: "",
  produit_nom: "",
  technicien_id: "",
  date_prevue: "",
  duree_estimee_min: "60",
  adresse_intervention: "",
  notes: "",
};

// ----- Type icon -----
function TypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "livraison":
      return <Truck className={className} />;
    case "installation":
      return <Wrench className={className} />;
    case "formation":
      return <GraduationCap className={className} />;
    case "maintenance_preventive":
      return <ShieldCheck className={className} />;
    case "maintenance_curative":
      return <AlertTriangle className={className} />;
    default:
      return <CalendarIcon className={className} />;
  }
}

function typeBadgeClass(type: string): string {
  switch (type) {
    case "livraison":
      return "border-transparent bg-teal-100 text-teal-800";
    case "installation":
      return "border-transparent bg-violet-100 text-violet-800";
    case "formation":
      return "border-transparent bg-sky-100 text-sky-800";
    case "maintenance_preventive":
      return "border-transparent bg-emerald-100 text-emerald-800";
    case "maintenance_curative":
      return "border-transparent bg-amber-100 text-amber-800";
    default:
      return "border-transparent bg-slate-100 text-slate-700";
  }
}

function statutBadgeClass(statut: string): string {
  switch (statut) {
    case "planifie":
      return "border-transparent bg-sky-100 text-sky-800";
    case "en_cours":
      return "border-transparent bg-blue-100 text-blue-800";
    case "termine":
      return "border-transparent bg-emerald-100 text-emerald-800";
    case "annule":
      return "border-transparent bg-slate-100 text-slate-500 line-through";
    default:
      return "border-transparent bg-slate-100 text-slate-700";
  }
}

function typeLabel(type: string, t: (k: any) => string): string {
  switch (type) {
    case "livraison":
      return t("typeLivraison");
    case "installation":
      return t("typeInstallation");
    case "formation":
      return t("typeFormation");
    case "maintenance_preventive":
      return t("typeMaintenancePreventive");
    case "maintenance_curative":
      return t("typeMaintenanceCurative");
    default:
      return type || "—";
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
    default:
      return statut || "—";
  }
}

// ---- Date helpers ----
// Returns the local Monday (00:00) of the week containing `date`.
function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon … 6=Sat
  const diff = (day + 6) % 7; // Monday=0 … Sunday=6
  d.setDate(d.getDate() - diff);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// "YYYY-MM-DD" (UTC-safe — uses local components to match weekStart).
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Format a long date range header like "12 – 18 juin 2026".
function formatWeekRange(monday: Date, lang: "fr" | "ar"): string {
  const sunday = addDays(monday, 6);
  const locale = lang === "ar" ? "ar-DZ" : "fr-DZ";
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const sameYear = monday.getFullYear() === sunday.getFullYear();
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long" };
  const optsWithYear: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric" };
  if (sameMonth && sameYear) {
    const dayMonth = monday.toLocaleDateString(locale, { day: "2-digit", month: "long" });
    const endDay = sunday.toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" });
    return `${dayMonth} – ${endDay}`;
  }
  return `${monday.toLocaleDateString(locale, opts)} – ${sunday.toLocaleDateString(locale, optsWithYear)}`;
}

// Format "2026-06-15T14:30:00Z" → "14:30" (local time).
function formatTime(iso: string | null, lang: "fr" | "ar"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const locale = lang === "ar" ? "ar-DZ" : "fr-DZ";
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

// Format ISO date → long weekday + day label, e.g. "lun. 15 juin".
function formatDayHeader(iso: string, lang: "fr" | "ar"): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const locale = lang === "ar" ? "ar-DZ" : "fr-DZ";
  return d.toLocaleDateString(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

// Convert ISO timestamp → "YYYY-MM-DDTHH:mm" for datetime-local input.
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InterventionsPanel() {
  const { t, lang } = useTranslation();
  const { user } = useAdminSession();
  const role = user?.role;

  const canRead = can(role, "ops.interventions");
  // Both manager and technician can write (server enforces technician own-only).
  const canWrite = role === "manager" || role === "super_admin" || role === "technician";
  const canDelete = role === "manager" || role === "super_admin";

  // ---- List state ----
  const [interventions, setInterventions] = useState<InterventionRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [techniciens, setTechniciens] = useState<TechnicienRow[]>([]);
  const [commandes, setCommandes] = useState<CommandeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // ---- Week navigation ----
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  // ---- Filters (client-side type filter only; statut & tech are server-filtered) ----
  const [filterTechnicien, setFilterTechnicien] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatut, setFilterStatut] = useState<string>("all");

  // ---- Create / Edit dialog ----
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<InterventionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ---- Detail dialog (with rapport textarea) ----
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<InterventionRow | null>(null);
  const [rapportDraft, setRapportDraft] = useState("");
  const [rapportSaving, setRapportSaving] = useState(false);

  // ---- Fetch the weekly list ----
  const refresh = useCallback(async () => {
    setLoading(true);
    setTableMissing(false);
    setError(null);
    try {
      const from = toISODate(weekStart);
      const to = toISODate(addDays(weekStart, 6));
      const params = new URLSearchParams({ from, to });
      if (filterTechnicien && filterTechnicien !== "all") params.set("technicien_id", filterTechnicien);
      if (filterStatut && filterStatut !== "all") params.set("statut", filterStatut);
      const res = await fetch(`/api/admin/interventions?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        if (data?.tableMissing) setTableMissing(true);
        setError(data?.error || `HTTP ${res.status}`);
        setInterventions([]);
      } else {
        setInterventions(Array.isArray(data.interventions) ? (data.interventions as InterventionRow[]) : []);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
      setInterventions([]);
    } finally {
      setLoading(false);
    }
  }, [weekStart, filterTechnicien, filterStatut]);

  // ---- Fetch lookups (clients + techniciens + commandes) ----
  const fetchLookups = useCallback(async () => {
    try {
      const [c, tc, cmd] = await Promise.all([
        fetch("/api/admin/clients", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/admin/techniciens?all=1", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/admin/commandes", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (c?.clients) setClients(c.clients as ClientRow[]);
      if (tc?.techniciens) setTechniciens(tc.techniciens as TechnicienRow[]);
      if (cmd?.commandes) setCommandes(cmd.commandes as CommandeRow[]);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  // ---- Name resolvers ----
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
  const commandeLabel = useCallback(
    (id: string | null): string => {
      if (!id) return "—";
      const c = commandes.find((x) => x.id === id);
      return c?.numero || "—";
    },
    [commandes]
  );

  // ---- Group interventions by YYYY-MM-DD ----
  // First apply the type filter (server doesn't filter type, so we do it client-side).
  const filtered = useMemo(() => {
    return interventions.filter((iv) => {
      if (filterType !== "all" && iv.type !== filterType) return false;
      return true;
    });
  }, [interventions, filterType]);

  const groupedByDay = useMemo(() => {
    const map = new Map<string, InterventionRow[]>();
    // Pre-seed all 7 days so empty days still render a header (better UX).
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      map.set(toISODate(d), []);
    }
    for (const iv of filtered) {
      if (!iv.date_prevue) continue;
      const dayKey = new Date(iv.date_prevue);
      if (isNaN(dayKey.getTime())) continue;
      const key = toISODate(dayKey);
      const arr = map.get(key) || [];
      arr.push(iv);
      map.set(key, arr);
    }
    // Sort each day's interventions by date_prevue ascending.
    map.forEach((arr) => {
      arr.sort((a, b) => {
        const ta = a.date_prevue ? new Date(a.date_prevue).getTime() : 0;
        const tb = b.date_prevue ? new Date(b.date_prevue).getTime() : 0;
        return ta - tb;
      });
    });
    return map;
  }, [filtered, weekStart]);

  // Sorted list of day keys (Mon → Sun).
  const dayKeys = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < 7; i++) {
      arr.push(toISODate(addDays(weekStart, i)));
    }
    return arr;
  }, [weekStart]);

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
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="h-4 w-24 rounded bg-slate-100" />
                <div className="h-4 w-32 rounded bg-slate-100" />
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

  // ---- Dialog openers ----
  const openCreate = () => {
    // Default date_prevue = today at 09:00 (local).
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const defaultDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T09:00`;
    setForm({
      ...EMPTY_FORM,
      date_prevue: defaultDate,
      // Pre-select the technician's own row if they're a technician.
      technicien_id: role === "technician" ? "" : "",
    });
    setDialogOpen(true);
  };

  const openEdit = (iv: InterventionRow) => {
    setForm({
      id: iv.id,
      type: (iv.type as InterventionType) || "livraison",
      client_id: iv.client_id || "",
      commande_id: iv.commande_id || "",
      produit_nom: iv.produit_nom || "",
      technicien_id: iv.technicien_id || "",
      date_prevue: toDatetimeLocalValue(iv.date_prevue),
      duree_estimee_min: iv.duree_estimee_min != null ? String(iv.duree_estimee_min) : "60",
      adresse_intervention: iv.adresse_intervention || "",
      notes: iv.notes || "",
    });
    setDialogOpen(true);
  };

  const openDetail = (iv: InterventionRow) => {
    setDetail(iv);
    setRapportDraft(iv.rapport || "");
    setDetailOpen(true);
  };

  // ---- Save (create OR update) ----
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.date_prevue) {
      toast.error(t("intDate"));
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        type: form.type,
        client_id: form.client_id || null,
        commande_id: form.commande_id || null,
        produit_nom: form.produit_nom.trim() || null,
        technicien_id: form.technicien_id || null,
        date_prevue: form.date_prevue, // API accepts datetime-local OR ISO.
        duree_estimee_min: Number(form.duree_estimee_min) || 60,
        adresse_intervention: form.adresse_intervention.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (form.id) body.id = form.id;

      const res = await fetch("/api/admin/interventions", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }

      const saved: InterventionRow = data.intervention;
      setInterventions((prev) => {
        const idx = prev.findIndex((x) => x.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [saved, ...prev];
      });
      setDialogOpen(false);
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  // ---- Statut transitions ----
  const changeStatut = async (iv: InterventionRow, nextStatut: string, opts?: { rapport?: string }) => {
    setBusyId(iv.id);
    try {
      const body: Record<string, unknown> = { id: iv.id, statut: nextStatut };
      if (opts?.rapport !== undefined) body.rapport = opts.rapport;
      const res = await fetch("/api/admin/interventions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      const updated: InterventionRow = data.intervention;
      setInterventions((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      if (detail?.id === updated.id) {
        setDetail(updated);
        setRapportDraft(updated.rapport || "");
      }
      toast.success(t("devisStatusOk"));
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
    } finally {
      setBusyId(null);
    }
  };

  // ---- Save rapport (without changing statut) ----
  const saveRapport = async () => {
    if (!detail) return;
    setRapportSaving(true);
    try {
      const res = await fetch("/api/admin/interventions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: detail.id, rapport: rapportDraft }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      const updated: InterventionRow = data.intervention;
      setInterventions((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setDetail(updated);
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
    } finally {
      setRapportSaving(false);
    }
  };

  // ---- Delete (manager only) ----
  const remove = async (iv: InterventionRow) => {
    if (!canDelete) return;
    if (!window.confirm(t("confirmDelete"))) return;
    setBusyId(iv.id);
    try {
      const res = await fetch(`/api/admin/interventions?id=${encodeURIComponent(iv.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      setInterventions((prev) => prev.filter((x) => x.id !== iv.id));
      if (detail?.id === iv.id) setDetailOpen(false);
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
    } finally {
      setBusyId(null);
    }
  };

  // ---- Total interventions this week ----
  const totalThisWeek = filtered.length;

  // ---- Commandes filtered by selected client (for the commande select) ----
  const commandesForClient = useMemo(() => {
    if (!form.client_id) return commandes;
    return commandes.filter((c) => !c.client_id || c.client_id === form.client_id);
  }, [commandes, form.client_id]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <CalendarIcon className="h-5 w-5 text-brand-700" />
            {t("interventionsTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{t("interventionsDesc")}</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} size="sm" className="bg-brand-700 hover:bg-brand-800">
            <Plus className="h-4 w-4" />
            {t("newIntervention")}
          </Button>
        )}
      </div>

      {/* Filters + week navigation */}
      <Card className="border-slate-200">
        <CardContent className="flex flex-col gap-3 p-4">
          {/* Week navigation */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setWeekStart((w) => addDays(w, -7))}
                aria-label={t("intPrevWeek")}
                title={t("intPrevWeek")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setWeekStart(getMonday(new Date()))}
              >
                {t("intToday")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setWeekStart((w) => addDays(w, 7))}
                aria-label={t("intNextWeek")}
                title={t("intNextWeek")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-slate-400" />
              <span className="font-medium capitalize text-slate-800">
                {formatWeekRange(weekStart, lang)}
              </span>
              <Badge variant="secondary" className="ml-1">
                {totalThisWeek}
              </Badge>
            </div>
          </div>

          {/* Filters row */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Select value={filterTechnicien} onValueChange={setFilterTechnicien}>
              <SelectTrigger>
                <SelectValue placeholder={t("intFilterTechnicien")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("intFilterTechnicien")}</SelectItem>
                {techniciens.map((tc) => (
                  <SelectItem key={tc.id} value={tc.id}>
                    {tc.nom || "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder={t("intFilterType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("intFilterType")}</SelectItem>
                {TYPES.map((tp) => (
                  <SelectItem key={tp} value={tp}>
                    {typeLabel(tp, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger>
                <SelectValue placeholder={t("intFilterStatut")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("intFilterStatut")}</SelectItem>
                {STATUTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statutLabel(s, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Weekly list grouped by day */}
      {totalThisWeek === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <CalendarIcon className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">{t("noInterventions")}</p>
            {canWrite && (
              <Button onClick={openCreate} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                {t("newIntervention")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {dayKeys.map((dayKey) => {
            const list = groupedByDay.get(dayKey) || [];
            const isToday = dayKey === toISODate(new Date());
            return (
              <div key={dayKey} className="overflow-hidden rounded-lg border border-slate-200">
                {/* Day header */}
                <div
                  className={`flex items-center justify-between border-b border-slate-200 px-4 py-2 ${
                    isToday ? "bg-brand-50" : "bg-slate-50"
                  }`}
                >
                  <span className="text-sm font-semibold capitalize text-slate-800">
                    {formatDayHeader(dayKey, lang)}
                    {isToday && (
                      <Badge variant="default" className="ml-2">
                        {t("intToday")}
                      </Badge>
                    )}
                  </span>
                  <span className="text-xs text-slate-500">
                    {list.length} {t("clientsCount")}
                  </span>
                </div>
                {/* Day body */}
                {list.length === 0 ? (
                  <div className="bg-white px-4 py-3 text-xs text-slate-400">—</div>
                ) : (
                  <div className="divide-y divide-slate-100 bg-white">
                    {list.map((iv) => (
                      <div
                        key={iv.id}
                        className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-slate-50/60 sm:flex-row sm:items-center"
                      >
                        {/* Left: time + type icon */}
                        <div className="flex items-center gap-3 sm:w-32 sm:shrink-0">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full ${
                              typeBadgeClass(iv.type || "")
                            }`}
                          >
                            <TypeIcon type={iv.type || ""} className="h-4 w-4" />
                          </div>
                          <div className="text-sm">
                            <div className="font-semibold tabular-nums text-slate-800">
                              {formatTime(iv.date_prevue, lang)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {iv.duree_estimee_min ? `${iv.duree_estimee_min} min` : ""}
                            </div>
                          </div>
                        </div>

                        {/* Middle: details (clickable → detail dialog) */}
                        <button
                          type="button"
                          onClick={() => openDetail(iv)}
                          className="flex-1 cursor-pointer text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={typeBadgeClass(iv.type || "")}>
                              {typeLabel(iv.type || "", t)}
                            </Badge>
                            {iv.statut && (
                              <Badge className={statutBadgeClass(iv.statut)}>
                                {statutLabel(iv.statut, t)}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700">
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span className="font-medium">{clientName(iv.client_id)}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Wrench className="h-3.5 w-3.5 text-slate-400" />
                              {technicienName(iv.technicien_id)}
                            </span>
                            {iv.produit_nom && (
                              <span className="flex items-center gap-1">
                                <Package className="h-3.5 w-3.5 text-slate-400" />
                                <span className="truncate">{iv.produit_nom}</span>
                              </span>
                            )}
                            {iv.adresse_intervention && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                <span className="truncate">{iv.adresse_intervention}</span>
                              </span>
                            )}
                          </div>
                        </button>

                        {/* Right: actions */}
                        <div className="flex flex-wrap items-center gap-1 sm:shrink-0">
                          {iv.statut === "planifie" && canWrite && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
                              onClick={() => changeStatut(iv, "en_cours")}
                              disabled={busyId === iv.id}
                              title={t("intMarkEnCours")}
                            >
                              {busyId === iv.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <PlayCircle className="h-3.5 w-3.5" />
                              )}
                              <span className="hidden sm:inline">{t("intMarkEnCours")}</span>
                            </Button>
                          )}
                          {(iv.statut === "planifie" || iv.statut === "en_cours") && canWrite && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              onClick={() => {
                                // Open detail dialog so the technician can fill the rapport
                                // at the moment they mark the intervention as done.
                                openDetail(iv);
                              }}
                              disabled={busyId === iv.id}
                              title={t("intMarkTermine")}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">{t("intMarkTermine")}</span>
                            </Button>
                          )}
                          {iv.statut !== "annule" && iv.statut !== "termine" && canWrite && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                              onClick={() => changeStatut(iv, "annule")}
                              disabled={busyId === iv.id}
                              title={t("intCancel")}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">{t("intCancel")}</span>
                            </Button>
                          )}
                          {canWrite && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEdit(iv)}
                              disabled={busyId === iv.id}
                              aria-label={t("edit")}
                              title={t("edit")}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => remove(iv)}
                              disabled={busyId === iv.id}
                              aria-label={t("delete")}
                              title={t("delete")}
                            >
                              {busyId === iv.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {form.id ? t("editIntervention") : t("newIntervention")}
            </DialogTitle>
            <DialogDescription>{t("interventionsDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="iv-type">{t("intType")}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as InterventionType })}
                >
                  <SelectTrigger id="iv-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((tp) => (
                      <SelectItem key={tp} value={tp}>
                        {typeLabel(tp, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="iv-client">{t("intClient")}</Label>
                <Select
                  value={form.client_id}
                  onValueChange={(v) => setForm({ ...form, client_id: v, commande_id: "" })}
                >
                  <SelectTrigger id="iv-client">
                    <SelectValue placeholder={t("selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("none")}</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nom || "—"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="iv-commande">{t("intCommande")}</Label>
                <Select
                  value={form.commande_id}
                  onValueChange={(v) => setForm({ ...form, commande_id: v })}
                >
                  <SelectTrigger id="iv-commande">
                    <SelectValue placeholder={t("none")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("none")}</SelectItem>
                    {commandesForClient.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.numero || c.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="iv-tech">{t("intTechnicien")}</Label>
                <Select
                  value={form.technicien_id}
                  onValueChange={(v) => setForm({ ...form, technicien_id: v })}
                  disabled={role === "technician"}
                >
                  <SelectTrigger id="iv-tech">
                    <SelectValue placeholder={t("selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("none")}</SelectItem>
                    {techniciens.map((tc) => (
                      <SelectItem key={tc.id} value={tc.id}>
                        {tc.nom || "—"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {role === "technician" && (
                  <p className="text-xs text-slate-500">
                    {t("techReadOnly")}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="iv-produit">{t("intProduit")}</Label>
                <Input
                  id="iv-produit"
                  value={form.produit_nom}
                  onChange={(e) => setForm({ ...form, produit_nom: e.target.value })}
                  placeholder="Fauteuil Silver Fox SF-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="iv-date">
                  {t("intDate")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="iv-date"
                  type="datetime-local"
                  value={form.date_prevue}
                  onChange={(e) => setForm({ ...form, date_prevue: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="iv-duree">{t("intDuree")}</Label>
                <Input
                  id="iv-duree"
                  type="number"
                  min={1}
                  step={5}
                  value={form.duree_estimee_min}
                  onChange={(e) => setForm({ ...form, duree_estimee_min: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="iv-adresse">{t("intAdresse")}</Label>
                <Input
                  id="iv-adresse"
                  value={form.adresse_intervention}
                  onChange={(e) => setForm({ ...form, adresse_intervention: e.target.value })}
                  placeholder="Cabinet Dr. X, 12 rue …, Oran"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="iv-notes">{t("intNotes")}</Label>
                <Textarea
                  id="iv-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder={t("devisNotesPlaceholder")}
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving || !form.date_prevue}>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TypeIcon type={detail?.type || ""} className="h-5 w-5 text-brand-700" />
              {detail ? typeLabel(detail.type || "", t) : t("intDetails")}
            </DialogTitle>
            <DialogDescription>{t("intDetails")}</DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-4">
              {/* Meta grid */}
              <div className="grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {t("intClient")}
                  </div>
                  <div className="font-medium text-slate-900">{clientName(detail.client_id)}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {t("intTechnicien")}
                  </div>
                  <div className="font-medium text-slate-900">{technicienName(detail.technicien_id)}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {t("intDate")}
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-900">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {formatDayHeader(detail.date_prevue || "", lang)} —{" "}
                    {formatTime(detail.date_prevue, lang)}
                    {detail.duree_estimee_min ? ` (${detail.duree_estimee_min} min)` : ""}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {t("intStatut")}
                  </div>
                  <div>
                    {detail.statut && (
                      <Badge className={statutBadgeClass(detail.statut)}>
                        {statutLabel(detail.statut, t)}
                      </Badge>
                    )}
                    {detail.date_realisee && (
                      <span className="ml-2 text-xs text-slate-500">
                        {t("intRealisee")} {formatDayHeader(detail.date_realisee, lang)}
                      </span>
                    )}
                  </div>
                </div>
                {detail.commande_id && (
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {t("intCommande")}
                    </div>
                    <div className="font-mono text-xs text-slate-900">{commandeLabel(detail.commande_id)}</div>
                  </div>
                )}
                {detail.produit_nom && (
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {t("intProduit")}
                    </div>
                    <div className="font-medium text-slate-900">{detail.produit_nom}</div>
                  </div>
                )}
                {detail.adresse_intervention && (
                  <div className="sm:col-span-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {t("intAdresse")}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-900">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {detail.adresse_intervention}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes (read-only) */}
              {detail.notes && (
                <div className="space-y-1">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {t("intNotes")}
                  </div>
                  <p className="whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    {detail.notes}
                  </p>
                </div>
              )}

              {/* Rapport (editable) */}
              <div className="space-y-1.5">
                <Label htmlFor="iv-rapport">{t("intRapport")}</Label>
                <Textarea
                  id="iv-rapport"
                  value={rapportDraft}
                  onChange={(e) => setRapportDraft(e.target.value)}
                  rows={5}
                  placeholder={t("intLienRapport")}
                />
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {canWrite && detail.statut !== "termine" && detail.statut !== "annule" && (
                    <>
                      {detail.statut === "planifie" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
                          onClick={() => changeStatut(detail, "en_cours")}
                          disabled={busyId === detail.id}
                        >
                          {busyId === detail.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <PlayCircle className="h-3.5 w-3.5" />
                          )}
                          {t("intMarkEnCours")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-emerald-700 hover:bg-emerald-800"
                        onClick={async () => {
                          // Mark termine + persist rapport in one go.
                          await changeStatut(detail, "termine", { rapport: rapportDraft });
                        }}
                        disabled={busyId === detail.id}
                      >
                        {busyId === detail.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        {t("intMarkTermine")}
                      </Button>
                    </>
                  )}
                  <Button
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
                    {t("save")}
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    {t("cancel")}
                  </Button>
                </DialogClose>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InterventionsPanel;
