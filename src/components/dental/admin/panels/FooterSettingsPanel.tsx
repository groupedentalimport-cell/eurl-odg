"use client";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save, GripVertical, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-service";
import { toast } from "@/components/ui/sonner";

interface FooterLink {
  label_fr: string;
  label_ar: string;
  path: string;
}

interface FooterSettings {
  tagline_fr: string;
  tagline_ar: string;
  bottomText_fr: string;
  bottomText_ar: string;
  quickLinks: FooterLink[];
}

const DEFAULT_LINKS: FooterLink[] = [
  { label_fr: "Catalogue", label_ar: "الكتالوج", path: "catalogue" },
  { label_fr: "Configurateur", label_ar: "المكوّن", path: "configurateur" },
  { label_fr: "Financement", label_ar: "التمويل", path: "financement" },
  { label_fr: "Blog", label_ar: "المدونة", path: "blog" },
  { label_fr: "À propos", label_ar: "من نحن", path: "apropos" },
  { label_fr: "Réalisations", label_ar: "إنجازاتنا", path: "realisations" },
  { label_fr: "Contact", label_ar: "اتصل بنا", path: "contact" },
  { label_fr: "Comparer", label_ar: "مقارنة", path: "comparer" },
];

const PATH_OPTIONS = [
  "catalogue", "configurateur", "financement", "blog", "apropos",
  "realisations", "contact", "comparer", "devis", "portal",
  "mentions-legales", "confidentialite",
];

function Field({ label, value, onChange, dir, placeholder }: { label: string; value: string; onChange: (v: string) => void; dir?: "ltr" | "rtl"; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      <Input dir={dir} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function FooterSettingsPanel() {
  const { t } = useTranslation();
  const { flat, loading, tableMissing, refresh } = useSettings();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FooterSettings>({
    tagline_fr: "Importateur de matériel dentaire",
    tagline_ar: "مستورد معدات طب الأسنان",
    bottomText_fr: "",
    bottomText_ar: "",
    quickLinks: DEFAULT_LINKS,
  });

  useEffect(() => {
    if (loading) return;
    const g = (k: string) => flat[k]?.value_fr || flat[k]?.value_ar || "";

    const linksRow = flat["footer.quick_links"];
    let quickLinks: FooterLink[] = DEFAULT_LINKS;
    if (linksRow?.value_json && Array.isArray(linksRow.value_json)) {
      quickLinks = linksRow.value_json as FooterLink[];
    }

    setForm({
      tagline_fr: g("footer.tagline_fr") || "Importateur de matériel dentaire",
      tagline_ar: g("footer.tagline_ar") || "مستورد معدات طب الأسنان",
      bottomText_fr: g("footer.bottom_text_fr") || "",
      bottomText_ar: g("footer.bottom_text_ar") || "",
      quickLinks,
    });
  }, [flat, loading]);

  const setLink = (idx: number, field: keyof FooterLink, val: string) =>
    setForm((f) => ({ ...f, quickLinks: f.quickLinks.map((l, i) => (i === idx ? { ...l, [field]: val } : l)) }));
  const addLink = () => setForm((f) => ({ ...f, quickLinks: [...f.quickLinks, { label_fr: "", label_ar: "", path: "catalogue" }] }));
  const removeLink = (idx: number) => setForm((f) => ({ ...f, quickLinks: f.quickLinks.filter((_, i) => i !== idx) }));
  const moveLink = (idx: number, dir: -1 | 1) =>
    setForm((f) => {
      const arr = [...f.quickLinks];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return f;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...f, quickLinks: arr };
    });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "footer", value: form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "save failed");
      toast.success(t("saved"));
      refresh();
    } catch (err: any) {
      toast.error(t("saveFailed"), { description: err?.message || "" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-700" /></div>;
  if (tableMissing) return <Card className="border-amber-200 bg-amber-50"><CardHeader><CardTitle className="text-amber-900">{t("tableMissingNotice")}</CardTitle></CardHeader></Card>;

  return (
    <div className="space-y-6">
      {/* Tagline */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">{t("footerTaglineTitle")}</CardTitle>
          <CardDescription>{t("footerTaglineDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("footerTagline") + " (FR)"} value={form.tagline_fr} onChange={(v) => setForm((f) => ({ ...f, tagline_fr: v }))} placeholder="Importateur de matériel dentaire" />
            <Field label={t("footerTagline") + " (AR)"} value={form.tagline_ar} onChange={(v) => setForm((f) => ({ ...f, tagline_ar: v }))} dir="rtl" placeholder="مستورد معدات طب الأسنان" />
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("footerBottomText") + " (FR)"} value={form.bottomText_fr} onChange={(v) => setForm((f) => ({ ...f, bottomText_fr: v }))} placeholder="Oran, Algérie — ..." />
            <Field label={t("footerBottomText") + " (AR)"} value={form.bottomText_ar} onChange={(v) => setForm((f) => ({ ...f, bottomText_ar: v }))} dir="rtl" />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Quick Links */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Link2 className="h-5 w-5 text-brand-700" />{t("footerQuickLinksTitle")}</CardTitle>
          <CardDescription>{t("footerQuickLinksDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.quickLinks.map((link, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => moveLink(i, -1)} disabled={i === 0} className="text-slate-400 hover:text-slate-600 disabled:opacity-30"><GripVertical className="h-3 w-3" /></button>
                <button type="button" onClick={() => moveLink(i, 1)} disabled={i === form.quickLinks.length - 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-30 rotate-180"><GripVertical className="h-3 w-3" /></button>
              </div>
              <div className="flex-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input value={link.label_fr} onChange={(e) => setLink(i, "label_fr", e.target.value)} placeholder="Catalogue" />
                <Input value={link.label_ar} onChange={(e) => setLink(i, "label_ar", e.target.value)} dir="rtl" placeholder="الكتالوج" />
                <select value={link.path} onChange={(e) => setLink(i, "path", e.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm">
                  {PATH_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeLink(i)} className="h-8 w-8 shrink-0 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" onClick={addLink} className="border-dashed"><Plus className="mr-2 h-4 w-4" />{t("footerAddLink")}</Button>
        </CardContent>
      </Card>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10 flex justify-end gap-3">
        <Button onClick={save} disabled={saving} className="bg-brand-700 hover:bg-brand-800 shadow-lg">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("loading")}</> : <><Save className="mr-2 h-4 w-4" />{t("save")}</>}
        </Button>
      </div>
    </div>
  );
}

export default FooterSettingsPanel;
