"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Tag,
  AlertTriangle,
  Armchair,
  Stethoscope,
  Radiation,
  ShieldCheck,
  Package,
  Server,
  Scan,
  Boxes,
  Microscope,
  Syringe,
  FlaskConical,
  HeartPulse,
  Activity,
  Pill,
  Beaker,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// Map of common lucide icon names → components, used for live preview in the
// table and the edit dialog. Falls back to `Tag` for unknown names.
const ICON_MAP: Record<string, LucideIcon> = {
  Armchair,
  Stethoscope,
  Radiation,
  ShieldCheck,
  Package,
  Server,
  Scan,
  Boxes,
  Microscope,
  Syringe,
  FlaskConical,
  HeartPulse,
  Activity,
  Pill,
  Beaker,
};

function getIcon(name?: string | null): LucideIcon {
  if (name && ICON_MAP[name]) return ICON_MAP[name];
  return Tag;
}

interface CategoryRow {
  id: string;
  slug: string;
  nom_fr: string | null;
  nom_ar: string | null;
  icone: string | null;
  ordre: number | null;
  created_at?: string;
}

interface CategoryForm {
  id?: string;
  slug: string;
  nom_fr: string;
  nom_ar: string;
  icone: string;
  ordre: number;
}

const EMPTY_FORM: CategoryForm = {
  slug: "",
  nom_fr: "",
  nom_ar: "",
  icone: "Package",
  ordre: 0,
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

function rowToForm(row: CategoryRow): CategoryForm {
  return {
    id: row.id,
    slug: row.slug || "",
    nom_fr: row.nom_fr || "",
    nom_ar: row.nom_ar || "",
    icone: row.icone || "Package",
    ordre: row.ordre ?? 0,
  };
}

export function CategoriesPanel() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setTableMissing(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        if (data?.tableMissing) setTableMissing(true);
        setError(data?.error || `HTTP ${res.status}`);
        setCategories([]);
      } else {
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setSlugTouched(false);
    setDialogOpen(true);
  };

  const openEdit = (row: CategoryRow) => {
    setEditing(row);
    setForm(rowToForm(row));
    setSlugTouched(true);
    setDialogOpen(true);
  };

  const update = <K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) => {
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
      toast.error(t("saveFailed"), { description: t("slug") });
      return;
    }
    if (!form.nom_fr.trim()) {
      toast.error(t("saveFailed"), { description: t("name_fr") });
      return;
    }
    setSaving(true);
    const payload = {
      slug: form.slug.trim(),
      nom_fr: form.nom_fr,
      nom_ar: form.nom_ar,
      icone: form.icone,
      ordre: form.ordre,
    };
    try {
      const isEdit = Boolean(editing);
      const res = await fetch("/api/admin/categories", {
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

  const remove = async (row: CategoryRow) => {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(row.id)}`, {
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

  // ---- Render states ----
  if (loading) {
    return (
      <div className="flex min-h-[20vh] items-center justify-center">
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

  const PreviewIcon = getIcon(form.icone);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Tag className="h-4 w-4" />
          <span>
            {categories.length} {t("categories").toLowerCase()}
          </span>
        </div>
        <Button onClick={openNew} className="bg-brand-700 hover:bg-brand-800">
          <Plus className="h-4 w-4" />
          {t("newCategory")}
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-500">
            {t("noCategories")}
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("name_fr")}</th>
                <th className="px-4 py-3 font-semibold">{t("name_ar")}</th>
                <th className="px-4 py-3 font-semibold">{t("slug")}</th>
                <th className="px-4 py-3 font-semibold">{t("iconName")}</th>
                <th className="px-4 py-3 font-semibold">{t("order")}</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((row) => {
                const RowIcon = getIcon(row.icone);
                return (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.nom_fr || <span className="italic text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700" dir="rtl">
                      {row.nom_ar || <span className="italic text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.slug}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-slate-700">
                        <RowIcon className="h-4 w-4 text-brand-700" />
                        <span className="text-xs">{row.icone || "—"}</span>
                      </div>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("editCategory") : t("newCategory")}
            </DialogTitle>
            <DialogDescription>
              {editing ? rowToForm(editing).slug : t("newCategory")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c_nom_fr">{t("name_fr")}</Label>
                <Input
                  id="c_nom_fr"
                  value={form.nom_fr}
                  onChange={(e) => handleNameFrChange(e.target.value)}
                  required
                  placeholder="Fauteuil Dentaire"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c_nom_ar">{t("name_ar")}</Label>
                <Input
                  id="c_nom_ar"
                  value={form.nom_ar}
                  onChange={(e) => update("nom_ar", e.target.value)}
                  dir="rtl"
                  placeholder="كرسي الأسنان"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c_slug">{t("slug")}</Label>
                <Input
                  id="c_slug"
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="fauteuil-dentaire"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c_ordre">{t("order")}</Label>
                <Input
                  id="c_ordre"
                  type="number"
                  value={form.ordre}
                  onChange={(e) => update("ordre", Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c_icone">{t("iconName")}</Label>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                  <PreviewIcon className="h-5 w-5 text-brand-700" />
                </div>
                <Input
                  id="c_icone"
                  value={form.icone}
                  onChange={(e) => update("icone", e.target.value)}
                  placeholder="Package"
                />
              </div>
              <p className="text-xs text-slate-500">{t("iconHint")}</p>
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

export default CategoriesPanel;
