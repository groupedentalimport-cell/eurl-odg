"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Star,
  Check,
  X,
  Package,
  AlertTriangle,
  Upload,
  FileText,
  Image as ImageIcon,
  ZoomIn,
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
import { useData } from "@/lib/data-service";
import { getProductImageUrl } from "@/lib/supabase";
import { ImageLightbox, type LightboxImage } from "@/components/dental/ui/ImageLightbox";

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
  images: string[]; // array of storage filenames
  pdf_url: string; // single storage filename (or "")
  brochure_pdf: string; // single storage filename (or "")
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
  images: [],
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
    images: Array.isArray(row.images) ? row.images.filter(Boolean) : [],
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
    images: form.images.filter(Boolean),
    pdf_url: form.pdf_url || null,
    brochure_pdf: form.brochure_pdf || null,
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

// Upload a single file to the admin upload API. Returns the server-stored
// filename on success (the public URL is derived via getProductImageUrl).
// Used by both the multi-image and single-PDF upload flows.
async function uploadFile(
  file: File,
  bucket: "product-images" | "blog-images"
): Promise<
  { ok: true; filename: string; url: string } | { ok: false; error: string }
> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("bucket", bucket);
  try {
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }
    return { ok: true, filename: data.filename, url: data.url };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur réseau" };
  }
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

  // Upload state — one progress indicator per file input.
  const [uploadingImages, setUploadingImages] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingBrochure, setUploadingBrochure] = useState(false);

  // Lightbox state — opens a full-screen viewer for the form's image
  // thumbnails. Index is resolved against `lightboxImages` (which filters
  // out any filenames whose URL couldn't be resolved).
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const lightboxImages: LightboxImage[] = useMemo(
    () =>
      form.images
        .map((fn) => {
          const url = getProductImageUrl(fn);
          return url ? { url, filename: fn, alt: fn } : null;
        })
        .filter((x): x is { url: string; filename: string; alt: string } => x !== null),
    [form.images]
  );

  const openLightbox = (fn: string) => {
    const lbIdx = lightboxImages.findIndex((img) => img.filename === fn);
    if (lbIdx === -1) return;
    setLightboxIndex(lbIdx);
    setLightboxOpen(true);
  };

  // Hidden <input type="file"> refs — clicked via Button onClick.
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const brochureInputRef = useRef<HTMLInputElement>(null);

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

  // ---------- File upload handlers ----------

  // Multi-image upload — accepts several files at once, uploads them
  // sequentially, appends each returned filename to `form.images`.
  const handleImageFiles = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    // Reset so selecting the same file again still fires onChange.
    e.target.value = "";

    setUploadingImages({ current: 0, total: files.length });
    const added: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setUploadingImages({ current: i, total: files.length });
      const result = await uploadFile(files[i], "product-images");
      if (result.ok) {
        added.push(result.filename);
      } else {
        toast.error(t("uploadFailed"), {
          description: `${files[i].name} — ${result.error}`,
        });
      }
    }
    setUploadingImages({ current: files.length, total: files.length });
    if (added.length > 0) {
      setForm((prev) => ({ ...prev, images: [...prev.images, ...added] }));
      toast.success(t("uploadSuccess"), {
        description: `${added.length} / ${files.length}`,
      });
    }
    setUploadingImages(null);
  };

  const removeImage = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }));
  };

  // Single PDF upload — replaces the current pdf_url.
  const handlePdfFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingPdf(true);
    const result = await uploadFile(file, "product-images");
    if (result.ok) {
      setForm((prev) => ({ ...prev, pdf_url: result.filename }));
      toast.success(t("uploadSuccess"), { description: result.filename });
    } else {
      toast.error(t("uploadFailed"), { description: result.error });
    }
    setUploadingPdf(false);
  };

  // Single PDF upload — replaces the current brochure_pdf.
  const handleBrochureFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingBrochure(true);
    const result = await uploadFile(file, "product-images");
    if (result.ok) {
      setForm((prev) => ({ ...prev, brochure_pdf: result.filename }));
      toast.success(t("uploadSuccess"), { description: result.filename });
    } else {
      toast.error(t("uploadFailed"), { description: result.error });
    }
    setUploadingBrochure(false);
  };

  // ---------- CRUD handlers ----------

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
        toast.error(t("saveFailed"), {
          description: data?.error || `HTTP ${res.status}`,
        });
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
      const res = await fetch(
        `/api/admin/products?id=${encodeURIComponent(row.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(t("saveFailed"), {
          description: data?.error || `HTTP ${res.status}`,
        });
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
                      {row.nom_fr || (
                        <span className="italic text-slate-400">—</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{row.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.marque || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{row.modele || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.category_id
                      ? catNameById.get(row.category_id) || "—"
                      : "—"}
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

            {/* ----- Images (multi-upload) ----- */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>{t("images")}</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={!!uploadingImages}
                >
                  {uploadingImages ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("uploading")} {uploadingImages.current}/
                      {uploadingImages.total}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      {t("addImage")}
                    </>
                  )}
                </Button>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handleImageFiles}
              />
              {form.images.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
                  {t("noFile")}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {form.images.map((fn, idx) => {
                    const url = getProductImageUrl(fn);
                    return (
                      <div
                        key={`${fn}-${idx}`}
                        className="group relative overflow-hidden rounded-md border border-slate-200 bg-slate-50"
                      >
                        <button
                          type="button"
                          onClick={() => openLightbox(fn)}
                          disabled={!url}
                          className="relative block aspect-square w-full disabled:cursor-default"
                          aria-label={url ? "Zoom" : undefined}
                          title={url ? "Zoom" : undefined}
                        >
                          {url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={url}
                              alt={fn}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                              <ImageIcon className="h-8 w-8" />
                            </div>
                          )}
                          {url && (
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity duration-150 group-hover:bg-black/30 group-hover:opacity-100">
                              <ZoomIn className="h-7 w-7 text-white" />
                            </span>
                          )}
                        </button>
                        <div
                          className="truncate px-2 py-1 text-[11px] text-slate-600"
                          title={fn}
                        >
                          {fn}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white opacity-90 hover:bg-red-700 hover:opacity-100"
                          aria-label={t("removeImage")}
                          title={t("removeImage")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
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

            {/* ----- PDF (single upload) ----- */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>{t("pdfUrl")}</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={uploadingPdf}
                >
                  {uploadingPdf ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("uploading")}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      {t("uploadPdf")}
                    </>
                  )}
                </Button>
              </div>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handlePdfFile}
              />
              {form.pdf_url ? (
                <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-red-600" />
                  <span
                    className="flex-1 truncate text-sm text-slate-700"
                    title={form.pdf_url}
                  >
                    {form.pdf_url}
                  </span>
                  <a
                    href={getProductImageUrl(form.pdf_url) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-brand-700 hover:underline"
                  >
                    {t("view")}
                  </a>
                  <button
                    type="button"
                    onClick={() => update("pdf_url", "")}
                    className="inline-flex h-7 w-7 items-center justify-center rounded text-red-600 hover:bg-red-50 hover:text-red-700"
                    aria-label={t("removeFile")}
                    title={t("removeFile")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-sm text-slate-400">
                  {t("noFile")}
                </p>
              )}
            </div>

            {/* ----- Brochure PDF (single upload) ----- */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>{t("brochurePdf")}</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => brochureInputRef.current?.click()}
                  disabled={uploadingBrochure}
                >
                  {uploadingBrochure ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("uploading")}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      {t("uploadPdf")}
                    </>
                  )}
                </Button>
              </div>
              <input
                ref={brochureInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleBrochureFile}
              />
              {form.brochure_pdf ? (
                <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-red-600" />
                  <span
                    className="flex-1 truncate text-sm text-slate-700"
                    title={form.brochure_pdf}
                  >
                    {form.brochure_pdf}
                  </span>
                  <a
                    href={getProductImageUrl(form.brochure_pdf) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-brand-700 hover:underline"
                  >
                    {t("view")}
                  </a>
                  <button
                    type="button"
                    onClick={() => update("brochure_pdf", "")}
                    className="inline-flex h-7 w-7 items-center justify-center rounded text-red-600 hover:bg-red-50 hover:text-red-700"
                    aria-label={t("removeFile")}
                    title={t("removeFile")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-sm text-slate-400">
                  {t("noFile")}
                </p>
              )}
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
              <Button
                type="submit"
                disabled={saving}
                className="bg-brand-700 hover:bg-brand-800"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </div>
  );
}

export default ProductsPanel;
