"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  Printer,
  AlertTriangle,
  X,
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
import type { Devis, DevisClientSnapshot, DevisLigne, DevisStatut } from "@/lib/types";
import { COMPANY } from "@/lib/types";

// ============================================================
// DevisPanel — full quote generator module (Task CRM-B)
// ============================================================

const DZD = new Intl.NumberFormat("fr-DZ", {
  style: "currency",
  currency: "DZD",
  maximumFractionDigits: 2,
});
function formatDZD(n: number): string {
  try {
    return DZD.format(Number.isFinite(n) ? n : 0);
  } catch {
    return `${n} DZD`;
  }
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-DZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

const STATUTS: DevisStatut[] = [
  "brouillon",
  "envoye",
  "accepte",
  "refuse",
  "expire",
];

// Tailwind classes per statut (badge color coding).
function statutBadgeClass(statut: DevisStatut): string {
  switch (statut) {
    case "brouillon":
      return "border-transparent bg-slate-100 text-slate-700";
    case "envoye":
      return "border-transparent bg-sky-100 text-sky-800";
    case "accepte":
      return "border-transparent bg-emerald-100 text-emerald-800";
    case "refuse":
      return "border-transparent bg-red-100 text-red-800";
    case "expire":
      return "border-transparent bg-amber-100 text-amber-800";
    default:
      return "border-transparent bg-slate-100 text-slate-700";
  }
}

// ---- Lightweight types for fetched lookups ----
interface ClientLite {
  id: string;
  nom: string;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  wilaya?: string | null;
}

interface ProductLite {
  id: string;
  slug?: string | null;
  nom_fr?: string | null;
  nom_ar?: string | null;
  marque?: string | null;
  modele?: string | null;
}

// ---- Ligne form state ----
interface LigneForm {
  product_id: string; // "" = free
  designation: string;
  qte: string;
  prix_unitaire: string;
  remise_pct: string;
}

function emptyLigne(): LigneForm {
  return {
    product_id: "",
    designation: "",
    qte: "1",
    prix_unitaire: "0",
    remise_pct: "0",
  };
}

function toLigneForm(l: DevisLigne): LigneForm {
  return {
    product_id: l.product_id || "",
    designation: l.designation || "",
    qte: String(l.qte ?? 1),
    prix_unitaire: String(l.prix_unitaire ?? 0),
    remise_pct: String(l.remise_pct ?? 0),
  };
}

function parseNum(s: string, fallback = 0): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}

interface Totals {
  sous_total: number;
  remise_total: number;
  base_imposable: number;
  tva_montant: number;
  montant_total: number;
}

function computeTotals(lignes: LigneForm[], tvaTaux: number): Totals {
  let sousTotal = 0;
  let remiseTotal = 0;
  for (const l of lignes) {
    const qte = parseNum(l.qte, 0);
    const pu = parseNum(l.prix_unitaire, 0);
    const remisePct = parseNum(l.remise_pct, 0);
    const brut = qte * pu;
    sousTotal += brut;
    remiseTotal += (brut * remisePct) / 100;
  }
  const base = Math.max(0, sousTotal - remiseTotal);
  const tva = (base * (Number.isFinite(tvaTaux) ? tvaTaux : 0)) / 100;
  return {
    sous_total: sousTotal,
    remise_total: remiseTotal,
    base_imposable: base,
    tva_montant: tva,
    montant_total: base + tva,
  };
}

function defaultDateValidite(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// Main component
// ============================================================
export function DevisPanel() {
  const { t } = useTranslation();
  const { user } = useAdminSession();
  const role = user?.role;

  const [devis, setDevis] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<"all" | DevisStatut>("all");

  const [clients, setClients] = useState<ClientLite[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);

  // Generator dialog
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [editingDevis, setEditingDevis] = useState<Devis | null>(null);

  // View dialog
  const [viewingDevis, setViewingDevis] = useState<Devis | null>(null);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<Devis | null>(null);

  // ---- Fetch list ----
  const fetchDevis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/devis", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || t("devisLoadError"));
      }
      setDevis(Array.isArray(data.devis) ? data.devis : []);
      if (data?.tableMissing) {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e?.message || t("devisLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // ---- Fetch lookups (clients + products) once ----
  const fetchLookups = useCallback(async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/admin/clients", { cache: "no-store" }),
        fetch("/api/admin/products", { cache: "no-store" }),
      ]);
      if (cRes.ok) {
        const cd = await cRes.json();
        setClients(Array.isArray(cd.clients) ? cd.clients : []);
      } else {
        // Silent — the ClientsPanel may show an empty list. We don't toast here
        // because the route might legitimately return 0 clients (e.g. table missing).
        setClients([]);
      }
      if (pRes.ok) {
        const pd = await pRes.json();
        setProducts(Array.isArray(pd.products) ? pd.products : []);
      } else {
        setProducts([]);
      }
    } catch {
      setClients([]);
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    fetchDevis();
    fetchLookups();
  }, [fetchDevis, fetchLookups]);

  // ---- Filtered list ----
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devis.filter((d) => {
      if (statutFilter !== "all" && d.statut !== statutFilter) return false;
      if (!q) return true;
      const num = (d.numero || "").toLowerCase();
      const clientNom =
        (d.client_snapshot?.nom || d.client?.nom || "").toLowerCase();
      return num.includes(q) || clientNom.includes(q);
    });
  }, [devis, search, statutFilter]);

  // ---- Action helpers ----
  const openCreate = () => {
    setEditingDevis(null);
    setGeneratorOpen(true);
  };

  const openEdit = (d: Devis) => {
    setEditingDevis(d);
    setGeneratorOpen(true);
  };

  const handleSaved = () => {
    setGeneratorOpen(false);
    setEditingDevis(null);
    fetchDevis();
  };

  const changeStatut = async (d: Devis, statut: DevisStatut) => {
    try {
      const res = await fetch("/api/admin/devis", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: d.id, statut }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || t("devisCannotValidate"));
        return;
      }
      toast.success(t("devisStatusOk"));
      fetchDevis();
    } catch (e: any) {
      toast.error(e?.message || t("devisCannotValidate"));
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const d = confirmDelete;
    try {
      const res = await fetch(`/api/admin/devis?id=${encodeURIComponent(d.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || t("devisCannotDelete"));
        return;
      }
      toast.success(t("devisDeleteOk"));
      setConfirmDelete(null);
      fetchDevis();
    } catch (e: any) {
      toast.error(e?.message || t("devisCannotDelete"));
    }
  };

  // ---- Permission helpers ----
  const canCreate = can(role, "crm.devis.create");
  const canValidate = can(role, "crm.devis.validate"); // manager+ only
  const isManagerPlus =
    role === "super_admin" || role === "manager";

  const canEdit = (d: Devis) => {
    if (!canCreate) return false;
    if (isManagerPlus) return true;
    // commercial: only own brouillons
    if (role === "commercial") {
      return d.statut === "brouillon" && d.commercial_id === user?.id;
    }
    return false;
  };

  const canDeleteRow = (d: Devis) => {
    if (!isManagerPlus && role !== "commercial") return false;
    if (isManagerPlus) return true;
    // commercial: only own brouillons
    return d.statut === "brouillon" && d.commercial_id === user?.id;
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {t("devisTitle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{t("devisSubtitle")}</p>
        </div>
        {canCreate && (
          <Button
            onClick={openCreate}
            className="bg-brand-700 hover:bg-brand-800"
          >
            <Plus className="h-4 w-4" />
            {t("devisNew")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("devisSearch")}
              className="pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="clear"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="sm:w-56">
            <Select
              value={statutFilter}
              onValueChange={(v) => setStatutFilter(v as "all" | DevisStatut)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("devisFilterStatut")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("devisFilterStatut")}</SelectItem>
                {STATUTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`devisStatut${s.charAt(0).toUpperCase() + s.slice(1)}` as any)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table-missing banner */}
      {error && !loading && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 p-8 text-center">
              <FileText className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                {t("devisEmpty")}
              </p>
              <p className="text-xs text-slate-400">{t("devisEmptyHint")}</p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{t("devisColNumero")}</th>
                    <th className="px-4 py-3 font-semibold">{t("devisColClient")}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t("devisColMontant")}</th>
                    <th className="px-4 py-3 font-semibold">{t("devisColStatut")}</th>
                    <th className="px-4 py-3 font-semibold">{t("devisColDate")}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t("devisColActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                        {d.numero}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {d.client_snapshot?.nom ||
                          d.client?.nom ||
                          "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {formatDZD(Number(d.montant_total) || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statutBadgeClass(d.statut)}>
                          {t(`devisStatut${d.statut.charAt(0).toUpperCase() + d.statut.slice(1)}` as any)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(d.date_emission)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setViewingDevis(d)}
                            title={t("devisView")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit(d) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEdit(d)}
                              title={t("devisEdit")}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canValidate && d.statut === "brouillon" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-sky-700 hover:bg-sky-50 hover:text-sky-800"
                              onClick={() => changeStatut(d, "envoye")}
                              title={t("devisSend")}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {canValidate && d.statut === "envoye" && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                onClick={() => changeStatut(d, "accepte")}
                                title={t("devisMarkAccepted")}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-700 hover:bg-red-50 hover:text-red-800"
                                onClick={() => changeStatut(d, "refuse")}
                                title={t("devisMarkRefused")}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {canDeleteRow(d) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => setConfirmDelete(d)}
                              title={t("devisDelete")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generator dialog */}
      {generatorOpen && (
        <DevisGenerator
          open={generatorOpen}
          onOpenChange={setGeneratorOpen}
          editing={editingDevis}
          clients={clients}
          products={products}
          onSaved={handleSaved}
        />
      )}

      {/* View dialog */}
      {viewingDevis && (
        <DevisViewDialog
          devis={viewingDevis}
          onClose={() => setViewingDevis(null)}
        />
      )}

      {/* Delete confirm */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("devisDelete")}</DialogTitle>
            <DialogDescription>{t("devisDeleteConfirm")}</DialogDescription>
          </DialogHeader>
          {confirmDelete && (
            <div className="rounded-md bg-slate-50 p-3 text-sm">
              <div className="font-mono text-xs font-semibold text-slate-900">
                {confirmDelete.numero}
              </div>
              <div className="text-slate-600">
                {confirmDelete.client_snapshot?.nom ||
                  confirmDelete.client?.nom ||
                  "—"}
              </div>
              <div className="font-semibold text-slate-900">
                {formatDZD(Number(confirmDelete.montant_total) || 0)}
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("devisCancel")}</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              {t("devisDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// DevisGenerator — dialog with the full generator UI
// ============================================================
interface GeneratorProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Devis | null;
  clients: ClientLite[];
  products: ProductLite[];
  onSaved: () => void;
}

function DevisGenerator({
  open,
  onOpenChange,
  editing,
  clients,
  products,
  onSaved,
}: GeneratorProps) {
  const { t } = useTranslation();

  const [clientId, setClientId] = useState<string>("");
  const [quickMode, setQuickMode] = useState(false);
  const [quickNom, setQuickNom] = useState("");
  const [quickTelephone, setQuickTelephone] = useState("");

  const [lignes, setLignes] = useState<LigneForm[]>([emptyLigne()]);
  const [tvaTaux, setTvaTaux] = useState<string>("19");
  const [dateValidite, setDateValidite] = useState<string>(defaultDateValidite());
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Hydrate form when editing changes
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setClientId(editing.client_id || "");
      setQuickMode(false);
      setQuickNom("");
      setQuickTelephone("");
      const ls = Array.isArray(editing.lignes) ? editing.lignes : [];
      setLignes(ls.length > 0 ? ls.map(toLigneForm) : [emptyLigne()]);
      setTvaTaux(String(editing.tva_taux ?? 19));
      setDateValidite(editing.date_validite || defaultDateValidite());
      setNotes(editing.notes || "");
    } else {
      setClientId("");
      setQuickMode(false);
      setQuickNom("");
      setQuickTelephone("");
      setLignes([emptyLigne()]);
      setTvaTaux("19");
      setDateValidite(defaultDateValidite());
      setNotes("");
    }
  }, [open, editing]);

  const totals = useMemo(
    () => computeTotals(lignes, parseNum(tvaTaux, 0)),
    [lignes, tvaTaux]
  );

  // ---- Lignes mutations ----
  const addLigne = () => setLignes((p) => [...p, emptyLigne()]);
  const removeLigne = (idx: number) =>
    setLignes((p) => (p.length === 1 ? p : p.filter((_, i) => i !== idx)));
  const updateLigne = (idx: number, patch: Partial<LigneForm>) =>
    setLignes((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const onProductPick = (idx: number, productId: string) => {
    if (!productId) {
      updateLigne(idx, { product_id: "" });
      return;
    }
    const p = products.find((x) => x.id === productId);
    if (!p) {
      updateLigne(idx, { product_id: productId });
      return;
    }
    // Build designation: name.fr + brand + model (avoid trailing dashes).
    const parts: string[] = [];
    const nom = p.nom_fr || p.nom_ar || p.slug || "";
    if (nom) parts.push(nom);
    if (p.marque) parts.push(p.marque);
    if (p.modele) parts.push(p.modele);
    const designation = parts.join(" — ");
    updateLigne(idx, {
      product_id: productId,
      designation,
    });
  };

  // ---- Save ----
  const handleSave = async () => {
    // Validate.
    if (quickMode) {
      if (!quickNom.trim()) {
        toast.error(t("devisNeedClient"));
        return;
      }
    } else {
      if (!clientId) {
        toast.error(t("devisNeedClient"));
        return;
      }
    }
    if (lignes.length === 0) {
      toast.error(t("devisNeedLignes"));
      return;
    }
    for (const l of lignes) {
      if (!l.designation.trim()) {
        toast.error(t("devisLigneNeedDesignation"));
        return;
      }
    }

    // If quickMode: create the client first (POST /api/admin/clients).
    let finalClientId = clientId;
    let clientSnapshotOverride: Record<string, unknown> | null = null;
    if (quickMode) {
      try {
        const res = await fetch("/api/admin/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nom: quickNom.trim(),
            telephone: quickTelephone.trim() || null,
            type_client: "autre",
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.client?.id) {
          toast.error(data?.error || t("devisLoadClientsError"));
          return;
        }
        finalClientId = data.client.id;
        clientSnapshotOverride = {
          nom: data.client.nom || quickNom.trim(),
          email: data.client.email || null,
          telephone: data.client.telephone || quickTelephone.trim() || null,
          adresse: data.client.adresse || null,
          wilaya: data.client.wilaya || null,
        };
      } catch (e: any) {
        toast.error(e?.message || t("devisLoadClientsError"));
        return;
      }
    }

    const payload: Record<string, unknown> = {
      client_id: finalClientId,
      lignes: lignes.map((l) => ({
        product_id: l.product_id || null,
        designation: l.designation.trim(),
        qte: parseNum(l.qte, 0),
        prix_unitaire: parseNum(l.prix_unitaire, 0),
        remise_pct: parseNum(l.remise_pct, 0),
      })),
      tva_taux: parseNum(tvaTaux, 19),
      date_validite: dateValidite || null,
      notes: notes.trim() || null,
    };
    if (clientSnapshotOverride) {
      // Pass through so the backend can use it (it refetches if absent).
      payload.client_snapshot = clientSnapshotOverride;
    }

    setSaving(true);
    try {
      const isEdit = !!editing;
      const url = "/api/admin/devis";
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit ? { id: editing!.id, ...payload } : payload;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Erreur");
        return;
      }
      toast.success(isEdit ? t("devisUpdateOk") : t("devisCreateOk"));
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0 sm:rounded-xl">
        <DialogHeader className="border-b border-slate-200 px-6 py-4">
          <DialogTitle>
            {editing ? t("devisGeneratorEdit") : t("devisGeneratorTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editing ? t("devisGeneratorEdit") : t("devisGeneratorTitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-9rem)] overflow-y-auto px-6 py-4">
          {/* Client section */}
          <section className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-semibold">
                {t("devisClient")}
              </Label>
              <button
                type="button"
                onClick={() => setQuickMode((m) => !m)}
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                {quickMode ? t("devisClientSelect") : t("devisClientQuickAdd")}
              </button>
            </div>
            {quickMode ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-slate-500">{t("name")}</Label>
                  <Input
                    value={quickNom}
                    onChange={(e) => setQuickNom(e.target.value)}
                    placeholder="Nom du client"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">{t("phone")}</Label>
                  <Input
                    value={quickTelephone}
                    onChange={(e) => setQuickTelephone(e.target.value)}
                    placeholder="+213 …"
                  />
                </div>
                <p className="sm:col-span-2 text-xs text-slate-400">
                  {t("devisClientQuickAddHint")}
                </p>
              </div>
            ) : (
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("devisClientSelect")} />
                </SelectTrigger>
                <SelectContent>
                  {clients.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      {t("devisClientNone")}
                    </SelectItem>
                  ) : (
                    clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nom}
                        {c.wilaya ? ` · ${c.wilaya}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </section>

          {/* Lignes section */}
          <section className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-semibold">{t("devisLignes")}</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addLigne}
              >
                <Plus className="h-4 w-4" />
                {t("devisAddLigne")}
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">
                      {t("devisLigneProduct")}
                    </th>
                    <th className="px-3 py-2 font-semibold">
                      {t("devisLigneDesignation")}
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      {t("devisLigneQte")}
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      {t("devisLignePu")}
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      {t("devisLigneRemise")}
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      {t("devisLigneTotal")}
                    </th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lignes.map((l, idx) => {
                    const lt =
                      parseNum(l.qte, 0) *
                      parseNum(l.prix_unitaire, 0) *
                      (1 - parseNum(l.remise_pct, 0) / 100);
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2 align-top">
                          <Select
                            value={l.product_id || "__free"}
                            onValueChange={(v) =>
                              v === "__free"
                                ? updateLigne(idx, { product_id: "" })
                                : onProductPick(idx, v)
                            }
                          >
                            <SelectTrigger className="min-w-[160px]">
                              <SelectValue placeholder={t("devisLigneProductFree")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__free">
                                {t("devisLigneProductFree")}
                              </SelectItem>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.nom_fr || p.nom_ar || p.slug || p.id}
                                  {p.marque ? ` · ${p.marque}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Input
                            value={l.designation}
                            onChange={(e) =>
                              updateLigne(idx, { designation: e.target.value })
                            }
                            placeholder="Désignation"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={l.qte}
                            onChange={(e) =>
                              updateLigne(idx, { qte: e.target.value })
                            }
                            className="w-20 text-right"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.prix_unitaire}
                            onChange={(e) =>
                              updateLigne(idx, { prix_unitaire: e.target.value })
                            }
                            className="w-28 text-right"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={l.remise_pct}
                            onChange={(e) =>
                              updateLigne(idx, { remise_pct: e.target.value })
                            }
                            className="w-20 text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right align-top font-semibold tabular-nums text-slate-900">
                          {formatDZD(lt)}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => removeLigne(idx)}
                            disabled={lignes.length === 1}
                            title={t("devisDelete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* TVA + dates + notes */}
          <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-slate-500">
                {t("devisTauxTva")}
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={tvaTaux}
                onChange={(e) => setTvaTaux(e.target.value)}
                className="w-32"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">
                {t("devisDateValidite")}
              </Label>
              <Input
                type="date"
                value={dateValidite}
                onChange={(e) => setDateValidite(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-slate-500">{t("devisNotes")}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("devisNotesPlaceholder")}
                rows={3}
              />
            </div>
          </section>

          {/* Totals */}
          <section className="rounded-lg bg-slate-50 p-4">
            <div className="ml-auto max-w-sm space-y-1.5 text-sm">
              <Row label={t("devisSousTotal")} value={formatDZD(totals.sous_total)} />
              <Row
                label={t("devisRemiseTotal")}
                value={`- ${formatDZD(totals.remise_total)}`}
                className="text-red-700"
              />
              <Row
                label={t("devisBaseImposable")}
                value={formatDZD(totals.base_imposable)}
                className="text-slate-700"
              />
              <Row
                label={`${t("devisTvaMontant")} (${parseNum(tvaTaux, 0)}%)`}
                value={formatDZD(totals.tva_montant)}
              />
              <div className="my-2 border-t border-slate-300" />
              <Row
                label={t("devisMontantTotal")}
                value={formatDZD(totals.montant_total)}
                className="text-base font-bold text-brand-800"
              />
            </div>
          </section>
        </div>

        <DialogFooter className="border-t border-slate-200 bg-white px-6 py-4">
          <DialogClose asChild>
            <Button variant="outline" disabled={saving}>
              {t("devisCancel")}
            </Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-700 hover:bg-brand-800"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("devisSaving")}
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                {t("devisSave")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className="text-slate-600">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

// ============================================================
// DevisViewDialog — read-only detail + print
// ============================================================
interface ViewProps {
  devis: Devis;
  onClose: () => void;
}

function DevisViewDialog({ devis, onClose }: ViewProps) {
  const { t } = useTranslation();
  const snapshot: DevisClientSnapshot = devis.client_snapshot ||
    (devis.client
      ? {
          nom: devis.client.nom,
          email: devis.client.email,
          telephone: devis.client.telephone,
          adresse: devis.client.adresse,
          wilaya: devis.client.wilaya,
        }
      : {});

  const lignes: DevisLigne[] = Array.isArray(devis.lignes)
    ? devis.lignes
    : [];
  const tvaTaux = Number(devis.tva_taux) || 0;
  const totals = computeTotals(
    lignes.map(toLigneForm),
    tvaTaux
  );

  const handlePrint = () => {
    // Inject a print-only stylesheet + printable area, then call window.print().
    const existing = document.getElementById("devis-print-style");
    if (existing) existing.remove();
    const style = document.createElement("style");
    style.id = "devis-print-style";
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #devis-print-area, #devis-print-area * { visibility: visible !important; }
        #devis-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 24px !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    // Cleanup after print dialog closes.
    setTimeout(() => {
      const s = document.getElementById("devis-print-style");
      if (s) s.remove();
    }, 1000);
  };

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0 sm:rounded-xl">
          <DialogHeader className="border-b border-slate-200 px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-700" />
              {t("devisViewTitle")} {devis.numero}
            </DialogTitle>
            <DialogDescription>
              {formatDate(devis.date_emission)} ·{" "}
              {t(
                `devisStatut${devis.statut.charAt(0).toUpperCase() + devis.statut.slice(1)}` as any
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(90vh-9rem)] overflow-y-auto px-6 py-4">
            {/* Header block: company + client */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {COMPANY.name}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {COMPANY.address.fr}
                </p>
                <p className="text-xs text-slate-600">
                  {COMPANY.phone} · {COMPANY.email}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("devisClient")}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {snapshot?.nom || "—"}
                </p>
                {snapshot?.telephone && (
                  <p className="text-xs text-slate-600">{snapshot.telephone}</p>
                )}
                {snapshot?.email && (
                  <p className="text-xs text-slate-600">{snapshot.email}</p>
                )}
                {snapshot?.adresse && (
                  <p className="text-xs text-slate-600">{snapshot.adresse}</p>
                )}
                {snapshot?.wilaya && (
                  <p className="text-xs text-slate-600">{snapshot.wilaya}</p>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-4">
              <div>
                <p className="uppercase tracking-wide text-slate-400">
                  {t("devisFrom")}
                </p>
                <p className="font-medium text-slate-900">
                  {formatDate(devis.date_emission)}
                </p>
              </div>
              <div>
                <p className="uppercase tracking-wide text-slate-400">
                  {t("devisValidUntil")}
                </p>
                <p className="font-medium text-slate-900">
                  {formatDate(devis.date_validite)}
                </p>
              </div>
              <div>
                <p className="uppercase tracking-wide text-slate-400">
                  {t("devisColStatut")}
                </p>
                <Badge className={statutBadgeClass(devis.statut)}>
                  {t(
                    `devisStatut${devis.statut.charAt(0).toUpperCase() + devis.statut.slice(1)}` as any
                  )}
                </Badge>
              </div>
              <div>
                <p className="uppercase tracking-wide text-slate-400">
                  {t("devisColNumero")}
                </p>
                <p className="font-mono font-semibold text-slate-900">
                  {devis.numero}
                </p>
              </div>
            </div>

            {/* Lignes table */}
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">
                      {t("devisLigneDesignation")}
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      {t("devisLigneQte")}
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      {t("devisLignePu")}
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      {t("devisLigneRemise")}
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      {t("devisLigneTotal")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lignes.map((l, i) => {
                    const lt =
                      (Number(l.qte) || 0) *
                      (Number(l.prix_unitaire) || 0) *
                      (1 - (Number(l.remise_pct) || 0) / 100);
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2 text-slate-800">
                          {l.designation}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {l.qte}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatDZD(Number(l.prix_unitaire) || 0)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {Number(l.remise_pct) || 0}%
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {formatDZD(lt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 ml-auto max-w-sm space-y-1.5 text-sm">
              <Row
                label={t("devisSousTotal")}
                value={formatDZD(Number(devis.sous_total) || totals.sous_total)}
              />
              <Row
                label={t("devisRemiseTotal")}
                value={`- ${formatDZD(
                  Number(devis.remise_total) || totals.remise_total
                )}`}
                className="text-red-700"
              />
              <Row
                label={t("devisBaseImposable")}
                value={formatDZD(
                  (Number(devis.sous_total) || totals.sous_total) -
                    (Number(devis.remise_total) || totals.remise_total)
                )}
                className="text-slate-700"
              />
              <Row
                label={`${t("devisTvaMontant")} (${tvaTaux}%)`}
                value={formatDZD(Number(devis.tva_montant) || totals.tva_montant)}
              />
              <div className="my-2 border-t border-slate-300" />
              <Row
                label={t("devisMontantTotal")}
                value={formatDZD(Number(devis.montant_total) || totals.montant_total)}
                className="text-base font-bold text-brand-800"
              />
            </div>

            {/* Notes */}
            {devis.notes && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("devisNotes")}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {devis.notes}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-200 bg-white px-6 py-4">
            <DialogClose asChild>
              <Button variant="outline">{t("devisCancel")}</Button>
            </DialogClose>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4" />
              {t("devisPrint")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Off-screen printable area (brought on-screen only via @media print) */}
      <div
        id="devis-print-area"
        style={{ position: "absolute", left: "-9999px", top: 0, width: "100%" }}
        aria-hidden
      >
        <PrintableDevis devis={devis} snapshot={snapshot} totals={totals} />
      </div>
    </>
  );
}

// Printable devis — uses inline styles so it survives the @media print
// visibility flip. Designed to fit a standard A4 portrait.
function PrintableDevis({
  devis,
  snapshot,
  totals,
}: {
  devis: Devis;
  snapshot: DevisClientSnapshot;
  totals: Totals;
}) {
  const lignes: DevisLigne[] = Array.isArray(devis.lignes) ? devis.lignes : [];
  const tvaTaux = Number(devis.tva_taux) || 0;
  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#1e293b" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            {COMPANY.name}
          </h1>
          <p style={{ fontSize: 12, margin: "4px 0 0" }}>{COMPANY.address.fr}</p>
          <p style={{ fontSize: 12, margin: 0 }}>
            {COMPANY.phone} · {COMPANY.email}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            DEVIS
          </h2>
          <p style={{ fontSize: 13, margin: "4px 0 0", fontFamily: "monospace", fontWeight: 700 }}>
            {devis.numero}
          </p>
          <p style={{ fontSize: 12, margin: 0 }}>
            Date : {formatDate(devis.date_emission)}
          </p>
          <p style={{ fontSize: 12, margin: 0 }}>
            Valable jusqu&apos;au : {formatDate(devis.date_validite)}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 16, padding: 12, border: "1px solid #e2e8f0", borderRadius: 6 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b", margin: 0 }}>
          Client
        </p>
        <p style={{ fontSize: 14, fontWeight: 700, margin: "4px 0 0" }}>
          {String(snapshot?.nom || "—")}
        </p>
        {snapshot?.telephone && (
          <p style={{ fontSize: 12, margin: 0 }}>Tél : {String(snapshot.telephone)}</p>
        )}
        {snapshot?.email && (
          <p style={{ fontSize: 12, margin: 0 }}>{String(snapshot.email)}</p>
        )}
        {snapshot?.adresse && (
          <p style={{ fontSize: 12, margin: 0 }}>{String(snapshot.adresse)}</p>
        )}
        {snapshot?.wilaya && (
          <p style={{ fontSize: 12, margin: 0 }}>{String(snapshot.wilaya)}</p>
        )}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}>Désignation</th>
            <th style={{ textAlign: "right", padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}>Qté</th>
            <th style={{ textAlign: "right", padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}>P.U.</th>
            <th style={{ textAlign: "right", padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}>Remise</th>
            <th style={{ textAlign: "right", padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => {
            const lt =
              (Number(l.qte) || 0) *
              (Number(l.prix_unitaire) || 0) *
              (1 - (Number(l.remise_pct) || 0) / 100);
            return (
              <tr key={i}>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}>{l.designation}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>{l.qte}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>{formatDZD(Number(l.prix_unitaire) || 0)}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>{Number(l.remise_pct) || 0}%</td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, borderBottom: "1px solid #e2e8f0" }}>{formatDZD(lt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginLeft: "auto", width: 280, fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
          <span>Sous-total</span>
          <span>{formatDZD(Number(devis.sous_total) || totals.sous_total)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", color: "#b91c1c" }}>
          <span>Remise</span>
          <span>- {formatDZD(Number(devis.remise_total) || totals.remise_total)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
          <span>TVA ({tvaTaux}%)</span>
          <span>{formatDZD(Number(devis.tva_montant) || totals.tva_montant)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", borderTop: "2px solid #0f766e", marginTop: 8, fontWeight: 700, fontSize: 15 }}>
          <span>Total</span>
          <span>{formatDZD(Number(devis.montant_total) || totals.montant_total)}</span>
        </div>
      </div>

      {devis.notes && (
        <div style={{ marginTop: 24, padding: 12, border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }}>
          <p style={{ fontWeight: 700, margin: "0 0 4px" }}>Notes / Conditions</p>
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{devis.notes}</p>
        </div>
      )}

      <p style={{ marginTop: 32, fontSize: 11, color: "#64748b", textAlign: "center" }}>
        {COMPANY.name} — {COMPANY.address.fr}, {COMPANY.city}, {COMPANY.country}
      </p>
    </div>
  );
}

export default DevisPanel;
