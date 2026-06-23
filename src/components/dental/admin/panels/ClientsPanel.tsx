"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  Users,
  Mail,
  Phone,
  PhoneCall,
  Copy,
  Search,
  Info,
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
import { useAdminSession } from "@/hooks/useAdminSession";

// ============================================================
// ClientsPanel — multi-role (manager, commercial, super_admin).
// UI gating: only shown in sidebar if can(role, "crm.clients").
// Backend re-validates via requireRole(request, ["manager","commercial"]).
// ============================================================

type ClientType = "dentiste" | "clinique" | "hopital" | "revendeur" | "autre";

const TYPES: ClientType[] = ["dentiste", "clinique", "hopital", "revendeur", "autre"];

interface ClientRow {
  id: string;
  nom: string | null;
  type_client: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  wilaya: string | null;
  contact_personne: string | null;
  notes: string | null;
  commercial_id: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined commercial row (single object from supabase .select with FK).
  commercial?: { full_name: string | null; email: string | null } | null;
}

interface ClientForm {
  id?: string;
  nom: string;
  type_client: ClientType;
  email: string;
  telephone: string;
  adresse: string;
  wilaya: string;
  contact_personne: string;
  notes: string;
}

const EMPTY_FORM: ClientForm = {
  nom: "",
  type_client: "dentiste",
  email: "",
  telephone: "",
  adresse: "",
  wilaya: "",
  contact_personne: "",
  notes: "",
};

// Badge styling per client type.
function typeBadgeClass(type: string): string {
  switch (type) {
    case "dentiste":
      return "border-transparent bg-teal-100 text-teal-800";
    case "clinique":
      return "border-transparent bg-sky-100 text-sky-800";
    case "hopital":
      return "border-transparent bg-rose-100 text-rose-800";
    case "revendeur":
      return "border-transparent bg-amber-100 text-amber-800";
    case "autre":
    default:
      return "border-transparent bg-slate-100 text-slate-700";
  }
}

function typeLabel(type: string, t: (k: any) => string): string {
  switch (type) {
    case "dentiste":
      return t("clientTypeDentist");
    case "clinique":
      return t("clientTypeClinic");
    case "hopital":
      return t("clientTypeHospital");
    case "revendeur":
      return t("clientTypeReseller");
    case "autre":
    default:
      return t("clientTypeOther");
  }
}

function sanitizePhone(p: string): string {
  return (p || "").replace(/[\s.-]/g, "");
}

export function ClientsPanel() {
  const { t } = useTranslation();
  const { user } = useAdminSession();
  const isCommercial = user?.role === "commercial";

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setTableMissing(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/clients", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        if (data?.tableMissing) setTableMissing(true);
        setError(data?.error || `HTTP ${res.status}`);
        setClients([]);
      } else {
        setClients(Array.isArray(data.clients) ? (data.clients as ClientRow[]) : []);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Client-side filter (search + type).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (typeFilter !== "all" && c.type_client !== typeFilter) return false;
      if (!q) return true;
      return (
        (c.nom || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.wilaya || "").toLowerCase().includes(q) ||
        (c.contact_personne || "").toLowerCase().includes(q)
      );
    });
  }, [clients, search, typeFilter]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (c: ClientRow) => {
    setForm({
      id: c.id,
      nom: c.nom || "",
      type_client: (c.type_client as ClientType) || "autre",
      email: c.email || "",
      telephone: c.telephone || "",
      adresse: c.adresse || "",
      wilaya: c.wilaya || "",
      contact_personne: c.contact_personne || "",
      notes: c.notes || "",
    });
    setDialogOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.nom.trim()) {
      toast.error("Le nom est requis.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        nom: form.nom.trim(),
        type_client: form.type_client,
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        adresse: form.adresse.trim(),
        wilaya: form.wilaya.trim(),
        contact_personne: form.contact_personne.trim(),
        notes: form.notes.trim(),
      };
      if (form.id) body.id = form.id;

      const res = await fetch("/api/admin/clients", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }

      const saved: ClientRow = data.client;
      setClients((prev) => {
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

  const remove = async (c: ClientRow) => {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/clients?id=${encodeURIComponent(c.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      setClients((prev) => prev.filter((x) => x.id !== c.id));
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
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
                <div className="h-4 w-20 rounded bg-slate-100" />
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
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Users className="h-5 w-5 text-brand-700" />
            {t("clientsPanel")}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{t("clientsDesc")}</p>
        </div>
        <Button onClick={openCreate} size="sm" className="bg-brand-700 hover:bg-brand-800">
          <Plus className="h-4 w-4" />
          {t("newClient")}
        </Button>
      </div>

      {/* Commercial scoping notice */}
      {isCommercial && (
        <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
          <span>{t("commercialOnlyNotice")}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchClients")}
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("allTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTypes")}</SelectItem>
              {TYPES.map((tp) => (
                <SelectItem key={tp} value={tp}>
                  {typeLabel(tp, t)}
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
            <Users className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">{t("noClients")}</p>
            <Button onClick={openCreate} size="sm" variant="outline">
              <Plus className="h-4 w-4" />
              {t("newClient")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-slate-200">
          {/* Desktop table — horizontally scrollable on smaller screens */}
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("name")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("clientType")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("email")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("phone")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("wilaya")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("contactPerson")}</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">{t("edit")}/{t("delete")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => {
                  const email = (c.email || "").trim();
                  const phone = (c.telephone || "").trim();
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{c.nom || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {c.type_client ? (
                          <Badge className={typeBadgeClass(c.type_client)}>
                            {typeLabel(c.type_client, t)}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {email ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`mailto:${email}`}
                              className="truncate font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
                              title={email}
                            >
                              {email}
                            </a>
                            <button
                              type="button"
                              onClick={() => copyEmail(email)}
                              className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                              aria-label={t("copyEmail")}
                              title={t("copyEmail")}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {phone ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${sanitizePhone(phone)}`}
                              className="truncate font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
                              title={phone}
                            >
                              {phone}
                            </a>
                            <a
                              href={`tel:${sanitizePhone(phone)}`}
                              className="shrink-0 rounded p-1 text-emerald-700 hover:bg-emerald-50"
                              aria-label={t("call")}
                              title={t("call")}
                            >
                              <PhoneCall className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{c.wilaya || "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{c.contact_personne || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(c)}
                            aria-label={t("edit")}
                            title={t("edit")}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
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
            <DialogTitle>{form.id ? t("editClient") : t("newClient")}</DialogTitle>
            <DialogDescription>{t("clientsDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cl-nom">
                  {t("name")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cl-nom"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Cabinet Dr. X"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cl-type">{t("clientType")}</Label>
                <Select
                  value={form.type_client}
                  onValueChange={(v) => setForm({ ...form, type_client: v as ClientType })}
                >
                  <SelectTrigger id="cl-type">
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
                <Label htmlFor="cl-wilaya">{t("wilaya")}</Label>
                <Input
                  id="cl-wilaya"
                  value={form.wilaya}
                  onChange={(e) => setForm({ ...form, wilaya: e.target.value })}
                  placeholder="Oran"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cl-email">{t("email")}</Label>
                <Input
                  id="cl-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@cabinet.dz"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cl-phone">{t("phone")}</Label>
                <Input
                  id="cl-phone"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  placeholder="+213 5xx xxx xxx"
                  inputMode="tel"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cl-contact">{t("contactPerson")}</Label>
                <Input
                  id="cl-contact"
                  value={form.contact_personne}
                  onChange={(e) => setForm({ ...form, contact_personne: e.target.value })}
                  placeholder="Dr. X / M. Y"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cl-adresse">{t("address")}</Label>
                <Input
                  id="cl-adresse"
                  value={form.adresse}
                  onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  placeholder="N° rue, ville"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cl-notes">{t("notes")}</Label>
                <Textarea
                  id="cl-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notes internes (historique, préférences, etc.)"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
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

export default ClientsPanel;
