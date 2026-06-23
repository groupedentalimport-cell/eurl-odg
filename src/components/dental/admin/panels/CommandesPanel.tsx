"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  ShoppingCart,
  PackageCheck,
  Truck,
  FileText,
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
// CommandesPanel — CRM-C (Task CRM-C2)
// Multi-role:
//   - manager + super_admin : full CRUD, statut changes, delete
//   - commercial            : create (own devis only), edit own, NO statut
//   - accountant            : read-only
// Backend re-validates via requireRole(request, ["manager","commercial","accountant"]).
// ============================================================

interface CommandeRow {
  id: string;
  numero: string | null;
  devis_id: string | null;
  client_id: string | null;
  statut: string | null;
  date_commande: string | null;
  date_livraison_prevue: string | null;
  date_livraison_reelle: string | null;
  notes: string | null;
  commercial_id: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ClientRow {
  id: string;
  nom: string | null;
}

interface DevisRow {
  id: string;
  numero: string | null;
  client_id: string | null;
  statut: string | null;
  date_emission?: string | null;
}

interface CommandeForm {
  id?: string;
  devis_id: string;
  date_livraison_prevue: string;
  notes: string;
}

const EMPTY_FORM: CommandeForm = {
  devis_id: "",
  date_livraison_prevue: "",
  notes: "",
};

const STATUTS = ["en_attente", "en_preparation", "livree", "annulee"] as const;

// ----- Statut styling & labels -----
function statutBadgeClass(statut: string): string {
  switch (statut) {
    case "en_attente":
      return "border-transparent bg-amber-100 text-amber-800";
    case "en_preparation":
      return "border-transparent bg-sky-100 text-sky-800";
    case "livree":
      return "border-transparent bg-emerald-100 text-emerald-800";
    case "annulee":
      return "border-transparent bg-slate-100 text-slate-600 line-through";
    default:
      return "border-transparent bg-slate-100 text-slate-700";
  }
}

function statutLabel(statut: string, t: (k: any) => string): string {
  switch (statut) {
    case "en_attente":
      return t("statutEnAttente");
    case "en_preparation":
      return t("statutEnPreparation");
    case "livree":
      return t("statutLivre");
    case "annulee":
      return t("statutAnnule");
    default:
      return statut || "—";
  }
}

// Format "YYYY-MM-DD" → localized short date. Falls back to the raw
// string when input is null / invalid.
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

export function CommandesPanel() {
  const { t, lang } = useTranslation();
  const { user } = useAdminSession();
  const role = user?.role;

  // Can the current user interact with commandes at all?
  const canRead = can(role, "crm.commandes");
  // Statut changes + delete are manager+ only (matches the API).
  const canChangeStatut = role === "manager" || role === "super_admin";
  const canDelete = role === "manager" || role === "super_admin";
  // Create / edit (commercial can create+edit own).
  const canWrite = role === "manager" || role === "super_admin" || role === "commercial";

  const [commandes, setCommandes] = useState<CommandeRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [devis, setDevis] = useState<DevisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<string>("all");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CommandeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ----- Fetch the list of commandes -----
  const refresh = useCallback(async () => {
    setLoading(true);
    setTableMissing(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/commandes", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        if (data?.tableMissing) setTableMissing(true);
        setError(data?.error || `HTTP ${res.status}`);
        setCommandes([]);
      } else {
        setCommandes(Array.isArray(data.commandes) ? (data.commandes as CommandeRow[]) : []);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
      setCommandes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ----- Fetch clients (for id→nom map) + devis acceptés (for the dialog select) -----
  const fetchLookups = useCallback(async () => {
    // Clients
    try {
      const r = await fetch("/api/admin/clients", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setClients(Array.isArray(d.clients) ? (d.clients as ClientRow[]) : []);
      }
    } catch {
      /* silent — clients stays [] */
    }
    // Devis (we'll filter to statut='accepte' for the create dialog)
    try {
      const r = await fetch("/api/admin/devis", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setDevis(Array.isArray(d.devis) ? (d.devis as DevisRow[]) : []);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    refresh();
    fetchLookups();
  }, [refresh, fetchLookups]);

  // id → nom map for clients.
  const clientName = useCallback(
    (id: string | null): string => {
      if (!id) return "—";
      const c = clients.find((x) => x.id === id);
      return c?.nom || "—";
    },
    [clients]
  );

  // Filtered list — search by numero or client name.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return commandes.filter((c) => {
      if (statutFilter !== "all" && c.statut !== statutFilter) return false;
      if (!q) return true;
      return (
        (c.numero || "").toLowerCase().includes(q) ||
        clientName(c.client_id).toLowerCase().includes(q)
      );
    });
  }, [commandes, search, statutFilter, clientName]);

  // Accepted devis only — those are the only ones eligible to become a commande.
  const acceptedDevis = useMemo(
    () => devis.filter((d) => d.statut === "accepte"),
    [devis]
  );

  // ----- Create / edit dialog openers -----
  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (c: CommandeRow) => {
    setForm({
      id: c.id,
      devis_id: c.devis_id || "",
      date_livraison_prevue: c.date_livraison_prevue
        ? String(c.date_livraison_prevue).slice(0, 10)
        : "",
      notes: c.notes || "",
    });
    setDialogOpen(true);
  };

  // ----- Persist (create OR update) -----
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.id && !form.devis_id) {
      toast.error(t("cmdSelectDevis"));
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        date_livraison_prevue: form.date_livraison_prevue || null,
        notes: form.notes.trim() || null,
      };
      if (!form.id) body.devis_id = form.devis_id;
      if (form.id) body.id = form.id;

      const res = await fetch("/api/admin/commandes", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }

      const saved: CommandeRow = data.commande;
      setCommandes((prev) => {
        const idx = prev.findIndex((c) => c.id === saved.id);
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

  // ----- Statut transition helper -----
  const changeStatut = async (c: CommandeRow, nextStatut: string) => {
    if (!canChangeStatut) {
      toast.error(t("devisCannotValidate"));
      return;
    }
    setBusyId(c.id);
    try {
      const res = await fetch("/api/admin/commandes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, statut: nextStatut }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      const updated: CommandeRow = data.commande;
      setCommandes((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast.success(t("devisStatusOk"));
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: CommandeRow) => {
    if (!canDelete) return;
    if (!window.confirm(t("confirmDelete"))) return;
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/commandes?id=${encodeURIComponent(c.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      setCommandes((prev) => prev.filter((x) => x.id !== c.id));
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
    } finally {
      setBusyId(null);
    }
  };

  // ---- Permission gate (shouldn't be reached if sidebar hides it) ----
  if (!canRead) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-amber-900">
            {t("techReadOnly")}
          </p>
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
            <ShoppingCart className="h-5 w-5 text-brand-700" />
            {t("commandesTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{t("commandesDesc")}</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} size="sm" className="bg-brand-700 hover:bg-brand-800">
            <Plus className="h-4 w-4" />
            {t("newCommande")}
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
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
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
            <ShoppingCart className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">{t("noCommandes")}</p>
            {canWrite && (
              <Button onClick={openCreate} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                {t("newCommande")}
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
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("cmdNumero")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("cmdClient")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("cmdStatus")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("cmdDateCommande")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("cmdDateLivraison")}</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">{t("devisColActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => {
                  const numero = c.numero || "—";
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-medium text-slate-900">{numero}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{clientName(c.client_id)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {c.statut ? (
                          <Badge className={statutBadgeClass(c.statut)}>
                            {statutLabel(c.statut, t)}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(c.date_commande, lang)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(c.date_livraison_prevue, lang)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1">
                          {/* Edit */}
                          {canWrite && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEdit(c)}
                              aria-label={t("edit")}
                              title={t("edit")}
                              disabled={busyId === c.id}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {/* Mark en_preparation — manager only, on en_attente */}
                          {canChangeStatut && c.statut === "en_attente" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
                              onClick={() => changeStatut(c, "en_preparation")}
                              disabled={busyId === c.id}
                              title={t("cmdMarkPreparation")}
                            >
                              {busyId === c.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <PackageCheck className="h-3.5 w-3.5" />
                              )}
                              <span className="hidden sm:inline">{t("cmdMarkPreparation")}</span>
                            </Button>
                          )}
                          {/* Mark livree — manager only, on en_attente / en_preparation */}
                          {canChangeStatut && (c.statut === "en_attente" || c.statut === "en_preparation") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              onClick={() => changeStatut(c, "livree")}
                              disabled={busyId === c.id}
                              title={t("cmdMarkLivre")}
                            >
                              <Truck className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">{t("cmdMarkLivre")}</span>
                            </Button>
                          )}
                          {/* Delete */}
                          {canDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => remove(c)}
                              disabled={busyId === c.id}
                              aria-label={t("delete")}
                              title={t("delete")}
                            >
                              {busyId === c.id ? (
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

      {/* Hint about garantie auto-creation */}
      {canWrite && (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <FileText className="h-3.5 w-3.5" />
          {t("cmdLivreGarantie")}
        </p>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {form.id ? t("editCommande") : t("newCommande")}
            </DialogTitle>
            <DialogDescription>{t("commandesDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            {/* Devis select — only when creating (cannot re-bind on edit). */}
            {!form.id && (
              <div className="space-y-1.5">
                <Label htmlFor="cmd-devis">
                  {t("cmdDevis")} <span className="text-red-500">*</span>
                </Label>
                {acceptedDevis.length === 0 ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    {t("cmdNoDevis")}
                  </p>
                ) : (
                  <Select
                    value={form.devis_id}
                    onValueChange={(v) => setForm({ ...form, devis_id: v })}
                  >
                    <SelectTrigger id="cmd-devis">
                      <SelectValue placeholder={t("cmdSelectDevis")} />
                    </SelectTrigger>
                    <SelectContent>
                      {acceptedDevis.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.numero || d.id.slice(0, 8)} — {clientName(d.client_id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="cmd-livraison">{t("cmdDateLivraison")}</Label>
              <Input
                id="cmd-livraison"
                type="date"
                value={form.date_livraison_prevue}
                onChange={(e) => setForm({ ...form, date_livraison_prevue: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cmd-notes">{t("cmdNotes")}</Label>
              <Textarea
                id="cmd-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder={t("devisNotesPlaceholder")}
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving || (!form.id && !form.devis_id)}>
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
    </div>
  );
}

export default CommandesPanel;
