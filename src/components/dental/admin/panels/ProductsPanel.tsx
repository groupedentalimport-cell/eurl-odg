"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Star, Check, X, Package, AlertTriangle } from "lucide-react";
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
import { useData } from "@/lib/data-service";

interface ProductRow {
  id: string;
  slug: string;
  nom_fr: string | null;
  nom_ar: string | null;
  description_fr: string | null;
  description_ar: string | null;
  specs: any;
  images: string[] | null;
  pdf_url: string | null;
  brochure_pdf: string | null;
  video_url?: string | null;
  category_id: string | null;
  marque: string | null;
  modele: string | null;
  en_vedette: boolean | null;
  disponible: boolean | null;
  ordre: number | null;
  cible: string[] | null;
  created_at?: string;
  updated_at?: string;
}

interface ProductForm {
  id?: string;
  slug: string;
  nom_fr: string;
  nom_ar: string;
  description_fr: string;
  description_ar: string;
  specs: string; // textarea: "Label|Value" per line
  images: string; // comma-separated
  pdf_url: string;
  brochure_pdf: string;
  video_url: string;
  category_id: string;
  marque: string;
  modele: string;
  en_vedette: boolean;
  disponible: boolean;
  ordre: number;
  cible: string; // comma-separated
}

const EMPTY_FORM: ProductForm = {
  slug: "",
  nom_fr: "",
  nom_ar: "",
  description_fr: "",
  description_ar: "",
  specs: "",
  images: "",
  pdf_url: "",
  brochure_pdf: "",
  video_url: "",
  category_id: "",
  marque: "",
  modele: "",
  en_vedette: false,
  disponible: true,
  ordre: 0,
  cible: "",
};

function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function rowToForm(row: ProductRow): ProductForm {
  let specsText = "";
  const s = row.specs;
  if (Array.isArray(s)) {
    specsText = s
      .map((it: any) => {
        const label =
          (it && typeof it === "object" && (it.label?.fr || it.label?.ar)) ||
          (typeof it === "string" ? it : "");
        const value = it && typeof it === "object" ? it.value ?? "" : "";
        return `${label}|${value}`;
      })
      .join("\n");
  } else if (s && typeof s === "object") {
    specsText = Object.entries(s)
      .map(([k, v]) => `${k}|${v}`)
      .join("\n");
  }
  return {
    id: row.id,
    slug: row.slug || "",
    nom_fr: row.nom_fr || "",
    nom_ar: row.nom_ar || "",
    description_fr: row.description_fr || "",
    description_ar: row.description_ar || "",
    specs: specsText,
    images: Array.isArray(row.images) ? row.images.join(", ") : "",
    pdf_url: row.pdf_url || "",
    brochure_pdf: row.brochure_pdf || "",
    video_url: row.video_url || "",
    category_id: row.category_id || "",
    marque: row.marque || "",
    modele: row.modele || "",
    en_vedette: Boolean(row.en_vedette),
    disponible: row.disponible !== false,
    ordre: row.ordre ?? 0,
    cible: Array.isArray(row.cible) ? row.cible.join(", ") : "",
  };
}

function formToPayload(form: ProductForm) {
  // Parse specs textarea → array of { label: { fr, ar }, value }
  const specs = form.specs
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf("|");
      let label = "";
      let value = "";
      if (idx === -1) {
        label = line.trim();
      } else {
        label = line.slice(0, idx).trim();
        value = line.slice(idx + 1).trim();
      }
      return { label: { fr: label, ar: label }, value };
    });
  return {
    slug: form.slug,
    nom_fr: form.nom_fr,
    nom_ar: form.nom_ar,
    description_fr: form.description_fr,
    description_ar: form.description_ar,
    specs,
    images: form.images
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    pdf_url: form.pdf_url,
    brochure_pdf: form.brochure_pdf,
    video_url: form.video_url,
    category_id: form.category_id,
    marque: form.marque,
    modele: form.modele,
    en_vedette: form.en_vedette,
    disponible: form.disponible,
    ordre: form.ordre,
    cible: form.cible
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

export function ProductsPanel() {
  const { lang, t } = useTranslation();
  const { categories } = useData();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setTableMissing(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/products", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        if (data?.tableMissing) setTableMissing(true);
        setError(data?.error || `HTTP ${res.status}`);
        setProducts([]);
      } else {
        setProducts(Array.isArray(data.products) ? data.products : []);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openNew = () => {
    const firstCatId = categories[0]?.id || "";
    setEditing(null);
    setForm({ ...EMPTY_FORM, category_id: firstCatId });
    setSlugTouched(false);
    setDialogOpen(true);
  };

  const openEdit = (row: ProductRow) => {
    setEditing(row);
    setForm(rowToForm(row));
    setSlugTouched(true);
    setDialogOpen(true);
  };

  const update = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleNameFrChange = (val: string) => {
    setForm((prev) => {
      const next = { ...prev, nom_fr: val };
      if (!slugTouched) next.slug = slugify(val);
      return next;
    });
  };

  const handleSlugChange = (val: string) => {
    setSlugTouched(true);
    update("slug", val);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.slug.trim()) {
      toast.error(t("saveFailed"), { description: "Slug requis" });
      return;
    }
    setSaving(true);
    const payload = formToPayload(form);
    try {
      const isEdit = Boolean(editing);
      const res = await fetch("/api/admin/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: editing?.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(t("saveFailed"), { description: data?.error || `HTTP ${res.status}` });
        return;
      }
      toast.success(t("saved"));
      setDialogOpen(false);
      refresh();
    } catch (e: any) {
      toast.error(t("saveFailed"), { description: e?.message || "Erreur réseau" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: ProductRow) => {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(row.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(t("saveFailed"), { description: data?.error || `HTTP ${res.status}` });
        return;
      }
      toast.success(t("saved"));
      refresh();
    } catch (e: any) {
      toast.error(t("saveFailed"), { description: e?.message || "Erreur réseau" });
    }
  };

  const catNameById = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, c.name[lang] || c.name.fr));
    return m;
  }, [categories, lang]);

  // ---- Render states ----
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Package className="h-4 w-4" />
          <span>
            {products.length} {t("products").toLowerCase()}
          </span>
        </div>
        <Button onClick={openNew} className="bg-brand-700 hover:bg-brand-800">
          <Plus className="h-4 w-4" />
          {t("newProduct")}
        </Button>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-500">
            —
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("name_fr")}</th>
                <th className="px-4 py-3 font-semibold">{t("brand")}</th>
                <th className="px-4 py-3 font-semibold">{t("model")}</th>
                <th className="px-4 py-3 font-semibold">{t("categoryField")}</th>
                <th className="px-4 py-3 font-semibold">{t("featured")}</th>
                <th className="px-4 py-3 font-semibold">{t("available")}</th>
                <th className="px-4 py-3 font-semibold">{t("order")}</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {row.nom_fr || <span className="italic text-slate-400">—</span>}
                    </div>
                    <div className="text-xs text-slate-500">{row.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.marque || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{row.modele || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.category_id ? catNameById.get(row.category_id) || "—" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row.en_vedette ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <Star className="h-3.5 w-3.5 fill-current" />
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.disponible !== false ? (
                      <Badge variant="success" className="gap-1">
                        <Check className="h-3 w-3" />
                        {t("available")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <X className="h-3 w-3" />
                        {t("no")}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.ordre ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(row)}
                        aria-label={t("edit")}
                        title={t("edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(row)}
                        aria-label={t("delete")}
                        title={t("delete")}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("editProduct") : t("newProduct")}
            </DialogTitle>
            <DialogDescription>
              {editing ? rowToForm(editing).slug : t("newProduct")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p_nom_fr">{t("name_fr")}</Label>
                <Input
                  id="p_nom_fr"
                  value={form.nom_fr}
                  onChange={(e) => handleNameFrChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p_nom_ar">{t("name_ar")}</Label>
                <Input
                  id="p_nom_ar"
                  value={form.nom_ar}
                  onChange={(e) => update("nom_ar", e.target.value)}
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p_slug">{t("slug")}</Label>
                <Input
                  id="p_slug"
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="fauteuil-dental-x"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p_cat">{t("categoryField")}</Label>
                <Select
                  value={form.category_id || undefined}
                  onValueChange={(v) => update("category_id", v)}
                >
                  <SelectTrigger id="p_cat">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name[lang] || c.name.fr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p_marque">{t("brand")}</Label>
                <Input
                  id="p_marque"
                  value={form.marque}
                  onChange={(e) => update("marque", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p_modele">{t("model")}</Label>
                <Input
                  id="p_modele"
                  value={form.modele}
                  onChange={(e) => update("modele", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p_desc_fr">{t("description")} (FR)</Label>
              <Textarea
                id="p_desc_fr"
                value={form.description_fr}
                onChange={(e) => update("description_fr", e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p_desc_ar">{t("description")} (AR)</Label>
              <Textarea
                id="p_desc_ar"
                value={form.description_ar}
                onChange={(e) => update("description_ar", e.target.value)}
                rows={4}
                dir="rtl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p_specs">{t("specsField")}</Label>
              <Textarea
                id="p_specs"
                value={form.specs}
                onChange={(e) => update("specs", e.target.value)}
                rows={5}
                placeholder={"Voltage|220V\nPoids|50 kg"}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p_images">{t("images")}</Label>
              <Input
                id="p_images"
                value={form.images}
                onChange={(e) => update("images", e.target.value)}
                placeholder="image1.jpg, image2.jpg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p_cible">{t("audience_field")}</Label>
              <Input
                id="p_cible"
                value={form.cible}
                onChange={(e) => update("cible", e.target.value)}
                placeholder="cabinet, hôpital"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="p_pdf">{t("pdfUrl")}</Label>
                <Input
                  id="p_pdf"
                  value={form.pdf_url}
                  onChange={(e) => update("pdf_url", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p_brochure">{t("brochurePdf")}</Label>
                <Input
                  id="p_brochure"
                  value={form.brochure_pdf}
                  onChange={(e) => update("brochure_pdf", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p_video">{t("videoUrl")}</Label>
                <Input
                  id="p_video"
                  value={form.video_url}
                  onChange={(e) => update("video_url", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="p_ordre">{t("order")}</Label>
                <Input
                  id="p_ordre"
                  type="number"
                  value={form.ordre}
                  onChange={(e) => update("ordre", Number(e.target.value))}
                />
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.en_vedette}
                  onChange={(e) => update("en_vedette", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                />
                {t("featured")}
              </label>
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.disponible}
                  onChange={(e) => update("disponible", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                />
                {t("available")}
              </label>
            </div>

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={saving}>
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving} className="bg-brand-700 hover:bg-brand-800">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductsPanel;
