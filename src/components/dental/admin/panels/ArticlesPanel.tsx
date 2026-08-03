"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
  FileText,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Sparkles,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n";
import { getBlogImageUrl } from "@/lib/supabase";
import { HtmlEditor } from "@/components/dental/admin/HtmlEditor";
import { FaqEditor, type FaqItem } from "@/components/dental/admin/FaqEditor";

interface PostRow {
  id: string;
  slug: string;
  titre_fr: string | null;
  titre_ar: string | null;
  contenu_fr: string | null;
  contenu_ar: string | null;
  // Rich content fields (added 2026-07-29 for SEO/IA).
  excerpt_fr?: string | null;
  excerpt_ar?: string | null;
  meta_description_fr?: string | null;
  meta_description_ar?: string | null;
  faq_fr?: Array<{ q: string; a: string }> | string | null;
  faq_ar?: Array<{ q: string; a: string }> | string | null;
  category?: string | null;
  tags?: string[] | null;
  image_url: string | null;
  publie: boolean | null;
  auteur: string | null;
  created_at?: string;
  updated_at?: string;
}

interface PostForm {
  id?: string;
  slug: string;
  titre_fr: string;
  titre_ar: string;
  contenu_fr: string;
  contenu_ar: string;
  excerpt_fr: string;
  excerpt_ar: string;
  meta_description_fr: string;
  meta_description_ar: string;
  faq_fr: FaqItem[];
  faq_ar: FaqItem[];
  category: string;
  tags: string;
  image_url: string;
  auteur: string;
  publie: boolean;
}

const EMPTY_FORM: PostForm = {
  slug: "",
  titre_fr: "",
  titre_ar: "",
  contenu_fr: "",
  contenu_ar: "",
  excerpt_fr: "",
  excerpt_ar: "",
  meta_description_fr: "",
  meta_description_ar: "",
  faq_fr: [],
  faq_ar: [],
  category: "",
  tags: "",
  image_url: "",
  auteur: "Equipe ODG",
  publie: true,
};

const CATEGORIES = [
  "Fauteuil dentaire",
  "Stérilisation",
  "Radiologie",
  "Implantologie",
  "Maintenance",
  "Conseils pratiques",
  "Achat et devis",
  "Actualités",
];

function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Parse FAQ from DB — could be array, stringified JSON, or null.
function parseFaq(val: unknown): FaqItem[] {
  if (!val) return [];
  let arr: unknown = val;
  if (typeof val === "string") {
    try {
      arr = JSON.parse(val);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item: any) => ({
      q: String(item?.q ?? item?.question ?? "").trim(),
      a: String(item?.a ?? item?.answer ?? "").trim(),
    }))
    .filter((item) => item.q && item.a);
}

function rowToForm(row: PostRow): PostForm {
  return {
    id: row.id,
    slug: row.slug || "",
    titre_fr: row.titre_fr || "",
    titre_ar: row.titre_ar || "",
    contenu_fr: row.contenu_fr || "",
    contenu_ar: row.contenu_ar || "",
    excerpt_fr: row.excerpt_fr || "",
    excerpt_ar: row.excerpt_ar || "",
    meta_description_fr: row.meta_description_fr || "",
    meta_description_ar: row.meta_description_ar || "",
    faq_fr: parseFaq(row.faq_fr),
    faq_ar: parseFaq(row.faq_ar),
    category: row.category || "",
    tags: Array.isArray(row.tags) ? row.tags.join(", ") : "",
    image_url: row.image_url || "",
    auteur: row.auteur || "Equipe ODG",
    publie: row.publie !== false,
  };
}

function formToPayload(form: PostForm) {
  return {
    slug: form.slug,
    titre_fr: form.titre_fr,
    titre_ar: form.titre_ar,
    contenu_fr: form.contenu_fr,
    contenu_ar: form.contenu_ar,
    excerpt_fr: form.excerpt_fr,
    excerpt_ar: form.excerpt_ar,
    meta_description_fr: form.meta_description_fr,
    meta_description_ar: form.meta_description_ar,
    faq_fr: form.faq_fr,
    faq_ar: form.faq_ar,
    category: form.category,
    tags: form.tags,
    image_url: form.image_url || null,
    auteur: form.auteur,
    publie: form.publie,
  };
}

function formatDate(iso?: string, lang: "fr" | "ar" = "fr"): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

// Upload a single image to the blog-images bucket.
async function uploadImage(
  file: File
): Promise<
  { ok: true; filename: string; url: string } | { ok: false; error: string }
> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("bucket", "blog-images");
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

export function ArticlesPanel() {
  const { lang, t } = useTranslation();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PostRow | null>(null);
  const [form, setForm] = useState<PostForm>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  // Upload state.
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setTableMissing(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/posts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        if (data?.tableMissing) setTableMissing(true);
        setError(data?.error || `HTTP ${res.status}`);
        setPosts([]);
      } else {
        setPosts(Array.isArray(data.posts) ? data.posts : []);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
      setPosts([]);
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

  const openEdit = (row: PostRow) => {
    setEditing(row);
    setForm(rowToForm(row));
    setSlugTouched(true);
    setDialogOpen(true);
  };

  const update = <K extends keyof PostForm>(key: K, value: PostForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTitleFrChange = (val: string) => {
    setForm((prev) => {
      const next = { ...prev, titre_fr: val };
      if (!slugTouched) next.slug = slugify(val);
      return next;
    });
  };

  const handleSlugChange = (val: string) => {
    setSlugTouched(true);
    update("slug", val);
  };

  // Single image upload — replaces the current image_url.
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingImage(true);
    const result = await uploadImage(file);
    if (result.ok) {
      setForm((prev) => ({ ...prev, image_url: result.filename }));
      toast.success(t("uploadSuccess"), { description: result.filename });
    } else {
      toast.error(t("uploadFailed"), { description: result.error });
    }
    setUploadingImage(false);
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
      const res = await fetch("/api/admin/posts", {
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

  const remove = async (row: PostRow) => {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(
        `/api/admin/posts?id=${encodeURIComponent(row.id)}`,
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
          <FileText className="h-4 w-4" />
          <span>
            {posts.length} {t("posts").toLowerCase()}
          </span>
        </div>
        <Button onClick={openNew} className="bg-brand-700 hover:bg-brand-800">
          <Plus className="h-4 w-4" />
          {t("newArticle")}
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-500">—</CardContent>
        </Card>
      ) : (
        <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("title_fr")}</th>
                <th className="px-4 py-3 font-semibold">Catégorie</th>
                <th className="px-4 py-3 font-semibold">{t("slug")}</th>
                <th className="px-4 py-3 font-semibold">{t("author")}</th>
                <th className="px-4 py-3 font-semibold">{lang === "ar" ? "التاريخ" : "Date"}</th>
                <th className="px-4 py-3 font-semibold">{t("published")}</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {row.titre_fr || (
                        <span className="italic text-slate-400">—</span>
                      )}
                    </div>
                    {row.titre_ar ? (
                      <div className="text-xs text-slate-500" dir="rtl">
                        {row.titre_ar}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {row.category ? (
                      <Badge variant="secondary" className="text-xs">
                        {row.category}
                      </Badge>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.slug}</td>
                  <td className="px-4 py-3 text-slate-700">{row.auteur || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(row.created_at, lang)}
                  </td>
                  <td className="px-4 py-3">
                    {row.publie !== false ? (
                      <Badge variant="success" className="gap-1">
                        <Check className="h-3 w-3" />
                        {t("published")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <X className="h-3 w-3" />
                        {t("no")}
                      </Badge>
                    )}
                  </td>
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
            <DialogTitle>{editing ? t("editArticle") : t("newArticle")}</DialogTitle>
            <DialogDescription>
              {editing ? rowToForm(editing).slug : t("newArticle")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="space-y-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="flex w-full flex-wrap gap-1 bg-slate-100 p-1">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="content">
                  <FileText className="mr-1 h-3 w-3" />
                  Contenu
                </TabsTrigger>
                <TabsTrigger value="seo">
                  <Sparkles className="mr-1 h-3 w-3" />
                  SEO/IA
                </TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
              </TabsList>

              {/* === ONGLET GÉNÉRAL === */}
              <TabsContent value="general" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="a_titre_fr">{t("title_fr")}</Label>
                    <Input
                      id="a_titre_fr"
                      value={form.titre_fr}
                      onChange={(e) => handleTitleFrChange(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="a_titre_ar">{t("title_ar")}</Label>
                    <Input
                      id="a_titre_ar"
                      value={form.titre_ar}
                      onChange={(e) => update("titre_ar", e.target.value)}
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="a_slug">{t("slug")}</Label>
                    <Input
                      id="a_slug"
                      value={form.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="mon-article"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="a_auteur">{t("author")}</Label>
                    <Input
                      id="a_auteur"
                      value={form.auteur}
                      onChange={(e) => update("auteur", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="a_category">Catégorie</Label>
                    <select
                      id="a_category"
                      value={form.category}
                      onChange={(e) => update("category", e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">— Non classé —</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="a_tags">Tags (mots-clés, séparés par virgules)</Label>
                    <Input
                      id="a_tags"
                      value={form.tags}
                      onChange={(e) => update("tags", e.target.value)}
                      placeholder="fauteuil dentaire, Silver Fox, guide"
                    />
                  </div>
                </div>

                {/* ----- Image (single upload) ----- */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t("images")}</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("uploading")}
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          {t("uploadImage")}
                        </>
                      )}
                    </Button>
                  </div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleImageFile}
                  />
                  {form.image_url ? (
                    <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="h-20 w-28 shrink-0 overflow-hidden rounded border border-slate-200 bg-white">
                        {(() => {
                          const url = getBlogImageUrl(form.image_url);
                          return url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={url}
                              alt={form.image_url}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                              <ImageIcon className="h-6 w-6" />
                            </div>
                          );
                        })()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm text-slate-700"
                          title={form.image_url}
                        >
                          {form.image_url}
                        </p>
                        <div className="mt-2 flex gap-3">
                          <a
                            href={getBlogImageUrl(form.image_url) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-brand-700 hover:underline"
                          >
                            {t("view")}
                          </a>
                          <button
                            type="button"
                            onClick={() => update("image_url", "")}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t("removeFile")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">
                      {t("noFile")}
                    </p>
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.publie}
                    onChange={(e) => update("publie", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                  />
                  {t("published")}
                </label>
              </TabsContent>

              {/* === ONGLET CONTENU === */}
              <TabsContent value="content" className="space-y-4 pt-4">
                <Card className="border-brand-200 bg-brand-50/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                      <div className="text-xs text-slate-600">
                        <strong className="text-slate-900">Contenu de l'article</strong>
                        <br />
                        Utilisez l'éditeur pour structurer le contenu avec des titres
                        <strong> &lt;h2&gt;</strong> et <strong>&lt;h3&gt;</strong>. Les titres
                        qui se terminent par <strong>"?"</strong> suivis d'un paragraphe
                        sont automatiquement transformés en schema FAQPage JSON-LD sur la
                        page publique (Featured Snippets Google).
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-1.5">
                  <Label htmlFor="a_contenu_fr">{t("content_fr")}</Label>
                  <HtmlEditor
                    value={form.contenu_fr}
                    onChange={(v) => update("contenu_fr", v)}
                    placeholder="Contenu de l'article en français. Utilisez les titres H2/H3 pour structurer. Les questions en H2 (?) génèrent automatiquement le schema FAQPage."
                    rows={12}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="a_contenu_ar">{t("content_ar")}</Label>
                  <HtmlEditor
                    value={form.contenu_ar}
                    onChange={(v) => update("contenu_ar", v)}
                    placeholder="محتوى المقال بالعربية"
                    rows={10}
                    dir="rtl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="a_excerpt_fr">Extrait / Résumé (FR) — bloc "En bref"</Label>
                  <Textarea
                    id="a_excerpt_fr"
                    value={form.excerpt_fr}
                    onChange={(e) => update("excerpt_fr", e.target.value)}
                    rows={3}
                    placeholder="Résumé court (200 caractères max) affiché en haut de l'article dans le bloc 'En bref'. Si vide, auto-extrait du contenu. Ce résumé est repris par les IA (ChatGPT, Claude) pour citer l'article."
                  />
                  <p className="text-xs text-slate-500">
                    {form.excerpt_fr.length}/200 caractères
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="a_excerpt_ar">Extrait / Résumé (AR)</Label>
                  <Textarea
                    id="a_excerpt_ar"
                    value={form.excerpt_ar}
                    onChange={(e) => update("excerpt_ar", e.target.value)}
                    rows={3}
                    dir="rtl"
                  />
                </div>
              </TabsContent>

              {/* === ONGLET SEO/IA === */}
              <TabsContent value="seo" className="space-y-4 pt-4">
                <Card className="border-brand-200 bg-brand-50/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                      <div className="text-xs text-slate-600">
                        <strong className="text-slate-900">Optimisation Google et IA</strong>
                        <br />
                        La <strong>meta description</strong> apparaît dans les résultats
                        Google sous le titre. Si elle est vide, Google génère un extrait
                        automatique (moins performant). Longueur optimale : 150-155 caractères.
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-1.5">
                  <Label htmlFor="a_meta_fr">Meta description (FR) — pour Google</Label>
                  <Textarea
                    id="a_meta_fr"
                    value={form.meta_description_fr}
                    onChange={(e) => update("meta_description_fr", e.target.value)}
                    rows={3}
                    placeholder="Description courte pour Google (155 caractères max). Ex: 'Guide complet pour choisir un fauteuil dentaire Silver Fox en Algérie : critères, prix, modèles Pro et Classic.'"
                  />
                  <p className="text-xs text-slate-500">
                    {form.meta_description_fr.length}/155 caractères
                    {form.meta_description_fr.length > 155 && (
                      <span className="text-red-600 font-medium"> ⚠ Trop long</span>
                    )}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="a_meta_ar">Meta description (AR)</Label>
                  <Textarea
                    id="a_meta_ar"
                    value={form.meta_description_ar}
                    onChange={(e) => update("meta_description_ar", e.target.value)}
                    rows={3}
                    dir="rtl"
                  />
                </div>

                <Card className="border-slate-200 bg-slate-50/50">
                  <CardContent className="p-4">
                    <div className="text-xs text-slate-600">
                      <strong className="text-slate-900">Aperçu Google</strong>
                      <div className="mt-2 rounded border border-slate-200 bg-white p-3">
                        <div className="text-xs text-emerald-700">
                          ouadah-dental-groupe.netlify.app › blog › {form.slug || "mon-article"}
                        </div>
                        <div className="mt-0.5 text-base font-medium text-blue-700">
                          {form.titre_fr || "Titre de l'article"}
                        </div>
                        <div className="mt-0.5 text-sm text-slate-600">
                          {form.meta_description_fr || "La meta description apparaîtra ici. Si vide, Google extraira du contenu automatiquement."}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* === ONGLET FAQ === */}
              <TabsContent value="faq" className="space-y-4 pt-4">
                <Card className="border-brand-200 bg-brand-50/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                      <div className="text-xs text-slate-600">
                        <strong className="text-slate-900">FAQ explicite = Featured Snippets Google</strong>
                        <br />
                        Chaque question/réponse est automatiquement transformée en schema
                        <strong> FAQPage JSON-LD</strong> sur la page publique. Google peut alors
                        afficher votre réponse dans les <strong>"People Also Ask"</strong> et les
                        <strong> Featured Snippets</strong>.
                        <br />
                        <br />
                        <em>Note :</em> si vous laissez ce champ vide ET que votre contenu contient
                        des <code>&lt;h2&gt;Question ?&lt;/h2&gt;</code> suivis d'un paragraphe,
                        la FAQ sera auto-extraite du contenu. L'FAQ explicite ci-dessous prend
                        toujours le dessus.
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <Label className="mb-2 block">FAQ en français</Label>
                  <FaqEditor
                    value={form.faq_fr}
                    onChange={(items) => update("faq_fr", items)}
                  />
                </div>

                <div>
                  <Label className="mb-2 block">FAQ en arabe (optionnel)</Label>
                  <FaqEditor
                    value={form.faq_ar}
                    onChange={(items) => update("faq_ar", items)}
                  />
                </div>
              </TabsContent>
            </Tabs>

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
    </div>
  );
}

export default ArticlesPanel;
