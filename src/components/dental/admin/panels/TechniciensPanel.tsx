"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  Wrench,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n";
import { useAdminSession, can } from "@/hooks/useAdminSession";

// ============================================================
// TechniciensPanel — CRM-C (Task CRM-C2)
// Multi-role:
//   - manager + super_admin : full CRUD
//   - technician            : read-only
// Backend re-validates via requireRole(request, ["manager","technician"]).
// ============================================================

interface TechnicienRow {
  id: string;
  nom: string | null;
  telephone: string | null;
  email: string | null;
  specialites: string[] | null;
  zones_couvertes: string[] | null;
  actif: boolean | null;
  created_at?: string;
  updated_at?: string;
}

interface TechnicienForm {
  id?: string;
  nom: string;
  telephone: string;
  email: string;
  specialites: string; // comma-separated input
  zones_couvertes: string; // comma-separated input
  actif: boolean;
}

const EMPTY_FORM: TechnicienForm = {
  nom: "",
  telephone: "",
  email: "",
  specialites: "",
  zones_couvertes: "",
  actif: true,
};

function sanitizePhone(p: string): string {
  return (p || "").replace(/[\s.-]/g, "");
}

// Parse a comma-separated input into a clean string[].
function parseList(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function TechniciensPanel() {
  const { t } = useTranslation();
  const { user } = useAdminSession();
  const role = user?.role;

  const canRead = can(role, "ops.techniciens") || role === "technician";
  const canWrite = role === "manager" || role === "super_admin";
  const canDelete = role === "manager" || role === "super_admin";

  const [techniciens, setTechniciens] = useState<TechnicienRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TechnicienForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ----- Fetch list -----
  // When showInactive is true, we ask the API for all rows (?all=1) — the
  // default GET returns only actif=true rows.
  const refresh = useCallback(async () => {
    setLoading(true);
    setTableMissing(false);
    setError(null);
    try {
      const qs = showInactive ? "?all=1" : "";
      const res = await fetch(`/api/admin/techniciens${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        if (data?.tableMissing) setTableMissing(true);
        setError(data?.error || `HTTP ${res.status}`);
        setTechniciens([]);
      } else {
        setTechniciens(Array.isArray(data.techniciens) ? (data.techniciens as TechnicienRow[]) : []);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
      setTechniciens([]);
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Client-side search filter.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return techniciens;
    return techniciens.filter((tc) => {
      const specs = Array.isArray(tc.specialites) ? tc.specialites.join(" ") : "";
      const zones = Array.isArray(tc.zones_couvertes) ? tc.zones_couvertes.join(" ") : "";
      return (
        (tc.nom || "").toLowerCase().includes(q) ||
        (tc.email || "").toLowerCase().includes(q) ||
        (tc.telephone || "").toLowerCase().includes(q) ||
        specs.toLowerCase().includes(q) ||
        zones.toLowerCase().includes(q)
      );
    });
  }, [techniciens, search]);

  // ----- Dialog openers -----
  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (tc: TechnicienRow) => {
    setForm({
      id: tc.id,
      nom: tc.nom || "",
      telephone: tc.telephone || "",
      email: tc.email || "",
      specialites: Array.isArray(tc.specialites) ? tc.specialites.join(", ") : "",
      zones_couvertes: Array.isArray(tc.zones_couvertes) ? tc.zones_couvertes.join(", ") : "",
      actif: tc.actif !== false,
    });
    setDialogOpen(true);
  };

  // ----- Persist (create OR update) -----
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.nom.trim()) {
      toast.error(t("requiredField"));
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        nom: form.nom.trim(),
        telephone: form.telephone.trim(),
        email: form.email.trim(),
        specialites: parseList(form.specialites),
        zones_couvertes: parseList(form.zones_couvertes),
        actif: form.actif,
      };
      if (form.id) body.id = form.id;

      const res = await fetch("/api/admin/techniciens", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }

      const saved: TechnicienRow = data.technicien;
      setTechniciens((prev) => {
        const idx = prev.findIndex((tc) => tc.id === saved.id);
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

  // ----- Delete -----
  const remove = async (tc: TechnicienRow) => {
    if (!canDelete) return;
    if (!window.confirm(t("confirmDelete"))) return;
    setBusyId(tc.id);
    try {
      const res = await fetch(`/api/admin/techniciens?id=${encodeURIComponent(tc.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      setTechniciens((prev) => prev.filter((x) => x.id !== tc.id));
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
    } finally {
      setBusyId(null);
    }
  };

  // Quick toggle actif (manager+ only) — uses PUT.
  const toggleActif = async (tc: TechnicienRow) => {
    if (!canWrite) return;
    setBusyId(tc.id);
    try {
      const res = await fetch("/api/admin/techniciens", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tc.id, actif: !tc.actif }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      const updated: TechnicienRow = data.technicien;
      setTechniciens((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Wrench className="h-5 w-5 text-brand-700" />
            {t("techniciensTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{t("techniciensDesc")}</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} size="sm" className="bg-brand-700 hover:bg-brand-800">
            <Plus className="h-4 w-4" />
            {t("newTechnicien")}
          </Button>
        )}
      </div>

      {/* Read-only notice for technicians */}
      {role === "technician" && (
        <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
          <span>{t("techReadOnly")}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`${t("search")}…`}
          className="sm:max-w-xs"
        />
        {canWrite && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
            />
            {t("inactive")}
          </label>
        )}
      </div>

      <p className="text-xs text-slate-500">
        {filtered.length} {t("clientsCount")}
      </p>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <Wrench className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">{t("noTechniciens")}</p>
            {canWrite && (
              <Button onClick={openCreate} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                {t("newTechnicien")}
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
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("techNom")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("techTelephone")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("techEmail")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("techSpecialites")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("techZones")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("techActif")}</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">{t("devisColActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((tc) => {
                  const phone = (tc.telephone || "").trim();
                  const email = (tc.email || "").trim();
                  const specs = Array.isArray(tc.specialites) ? tc.specialites : [];
                  const zones = Array.isArray(tc.zones_couvertes) ? tc.zones_couvertes : [];
                  return (
                    <tr key={tc.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{tc.nom || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {phone ? (
                          <a
                            href={`tel:${sanitizePhone(phone)}`}
                            className="flex items-center gap-1.5 font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
                            title={phone}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {email ? (
                          <a
                            href={`mailto:${email}`}
                            className="flex items-center gap-1.5 truncate font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
                            title={email}
                          >
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">{email}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {specs.length > 0 ? (
                          <div className="flex max-w-[200px] flex-wrap gap-1">
                            {specs.map((s, i) => (
                              <Badge
                                key={`${tc.id}-sp-${i}`}
                                variant="secondary"
                                className="bg-teal-50 text-teal-800"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {zones.length > 0 ? (
                          <div className="flex max-w-[200px] flex-wrap gap-1">
                            {zones.map((z, i) => (
                              <Badge
                                key={`${tc.id}-zo-${i}`}
                                variant="outline"
                                className="border-slate-300 text-slate-700"
                              >
                                <MapPin className="mr-1 h-3 w-3" />
                                {z}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {canWrite ? (
                          <button
                            type="button"
                            onClick={() => toggleActif(tc)}
                            disabled={busyId === tc.id}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors disabled:opacity-50"
                            title={tc.actif ? t("techActif") : t("inactive")}
                          >
                            {busyId === tc.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                            ) : tc.actif ? (
                              <>
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-emerald-700">{t("techActif")}</span>
                              </>
                            ) : (
                              <>
                                <ShieldX className="h-3.5 w-3.5 text-slate-500" />
                                <span className="text-slate-600">{t("inactive")}</span>
                              </>
                            )}
                          </button>
                        ) : tc.actif ? (
                          <Badge variant="success">
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            {t("techActif")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <ShieldX className="mr-1 h-3 w-3" />
                            {t("inactive")}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {canWrite && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEdit(tc)}
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
                              onClick={() => remove(tc)}
                              disabled={busyId === tc.id}
                              aria-label={t("delete")}
                              title={t("delete")}
                            >
                              {busyId === tc.id ? (
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
            <DialogTitle>
              {form.id ? t("editTechnicien") : t("newTechnicien")}
            </DialogTitle>
            <DialogDescription>{t("techniciensDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tc-nom">
                {t("techNom")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tc-nom"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="Ahmed Benali"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tc-phone">{t("techTelephone")}</Label>
                <Input
                  id="tc-phone"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  placeholder="+213 5xx xxx xxx"
                  inputMode="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tc-email">{t("techEmail")}</Label>
                <Input
                  id="tc-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ahmed@odg.dz"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tc-spec">{t("techSpecialites")}</Label>
              <Input
                id="tc-spec"
                value={form.specialites}
                onChange={(e) => setForm({ ...form, specialites: e.target.value })}
                placeholder="Fauteuils, Autoclaves, Radiologie"
              />
              <p className="text-xs text-slate-500">{t("techSpecialitesHint")}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tc-zones">{t("techZones")}</Label>
              <Input
                id="tc-zones"
                value={form.zones_couvertes}
                onChange={(e) => setForm({ ...form, zones_couvertes: e.target.value })}
                placeholder="Oran, Mostaganem, Mascara"
              />
              <p className="text-xs text-slate-500">{t("techZonesHint")}</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="tc-actif"
                type="checkbox"
                checked={form.actif}
                onChange={(e) => setForm({ ...form, actif: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
              />
              <Label htmlFor="tc-actif" className="cursor-pointer text-sm font-medium text-slate-800">
                {t("techActif")}
              </Label>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving || !form.nom.trim()}>
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

export default TechniciensPanel;
