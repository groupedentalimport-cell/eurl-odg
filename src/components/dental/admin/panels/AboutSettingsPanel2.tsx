"use client";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save, AlertTriangle, Sparkles, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-service";
import { toast } from "@/components/ui/sonner";

interface ValueCard {
  title_fr: string;
  title_ar: string;
  desc_fr: string;
  desc_ar: string;
  icon: string;
}

interface BrandCard {
  name_fr: string;
  name_ar: string;
  desc_fr: string;
  desc_ar: string;
  emoji: string;
  color: string;
}

interface AboutPageData {
  valuesTitle_fr: string;
  valuesTitle_ar: string;
  values: ValueCard[];
  brands: BrandCard[];
}

const DEFAULT_VALUES: ValueCard[] = [
  { title_fr: "Marques certifiées", title_ar: "علامات معتمدة", desc_fr: "Silver Fox, ICANCLAVE, OWANDY — qualité internationale.", desc_ar: "Silver Fox، ICANCLAVE، OWANDY — جودة دولية.", icon: "ShieldCheck" },
  { title_fr: "Service après-vente", title_ar: "خدمة ما بعد البيع", desc_fr: "Pièces détachées et techniciens en Algérie.", desc_ar: "قطع غيار وفنيون في الجزائر.", icon: "Wrench" },
  { title_fr: "Formation incluse", title_ar: "تكوين مشمول", desc_fr: "Installation et formation à la prise en main.", desc_ar: "التركيب والتكوين على الاستعمال.", icon: "GraduationCap" },
  { title_fr: "Garantie 24 mois", title_ar: "ضمان 24 شهر", desc_fr: "Tous nos produits sont garantis 2 ans.", desc_ar: "كل منتجاتنا مضمونة سنتين.", icon: "Award" },
];

const DEFAULT_BRANDS: BrandCard[] = [
  { name_fr: "Silver Fox", name_ar: "Silver Fox", desc_fr: "Fauteuils dentaires ergonomiques et fiables.", desc_ar: "كراسي أسنان مريحة وموثوقة.", emoji: "🪑", color: "from-brand-700 to-brand-900" },
  { name_fr: "ICANCLAVE", name_ar: "ICANCLAVE", desc_fr: "Autoclaves classe B conformes EN 13060.", desc_ar: "أوتوكلاف فئة B مطابق للمعايير.", emoji: "🧼", color: "from-brand-600 to-brand-800" },
  { name_fr: "OWANDY", name_ar: "OWANDY", desc_fr: "Radiologie numérique et capteurs haute définition.", desc_ar: "أشعة رقمية ومستشعرات عالية الدقة.", emoji: "📷", color: "from-brand-500 to-brand-700" },
];

const ICON_OPTIONS = ["ShieldCheck", "Wrench", "GraduationCap", "Award", "Star", "BadgeCheck", "Heart", "Zap", "CheckCircle"];
const COLOR_OPTIONS = [
  { label: "Teal foncé", value: "from-brand-700 to-brand-900" },
  { label: "Teal moyen", value: "from-brand-600 to-brand-800" },
  { label: "Teal clair", value: "from-brand-500 to-brand-700" },
  { label: "Bleu", value: "from-blue-600 to-blue-800" },
  { label: "Violet", value: "from-purple-600 to-purple-800" },
  { label: "Ambre", value: "from-amber-600 to-amber-800" },
];

function Field({ label, value, onChange, textarea, dir, placeholder }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; dir?: "ltr" | "rtl"; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      {textarea ? <Textarea dir={dir} rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="resize-y" /> : <Input dir={dir} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}
    </div>
  );
}

export function AboutSettingsPanel2() {
  const { t } = useTranslation();
  const { flat, loading, tableMissing, refresh } = useSettings();
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<AboutPageData>({
    valuesTitle_fr: "Nos valeurs",
    valuesTitle_ar: "قيمنا",
    values: DEFAULT_VALUES,
    brands: DEFAULT_BRANDS,
  });

  useEffect(() => {
    if (loading) return;
    const g = (k: string) => flat[k]?.value_fr || flat[k]?.value_ar || "";

    const valuesRow = flat["about.values"];
    let values: ValueCard[] = DEFAULT_VALUES;
    if (valuesRow?.value_json && Array.isArray(valuesRow.value_json)) {
      values = valuesRow.value_json as ValueCard[];
    }

    const brandsRow = flat["about.about_brands"];
    let brands: BrandCard[] = DEFAULT_BRANDS;
    if (brandsRow?.value_json && Array.isArray(brandsRow.value_json)) {
      brands = brandsRow.value_json as BrandCard[];
    }

    setData({
      valuesTitle_fr: g("about.values_title_fr") || "Nos valeurs",
      valuesTitle_ar: g("about.values_title_ar") || "قيمنا",
      values,
      brands,
    });
  }, [flat, loading]);

  /* ---- Values handlers ---- */
  const setValue = (idx: number, field: keyof ValueCard, val: string) =>
    setData((d) => ({ ...d, values: d.values.map((c, i) => (i === idx ? { ...c, [field]: val } : c)) }));
  const addValue = () => setData((d) => ({ ...d, values: [...d.values, { title_fr: "", title_ar: "", desc_fr: "", desc_ar: "", icon: "Star" }] }));
  const removeValue = (idx: number) => setData((d) => ({ ...d, values: d.values.filter((_, i) => i !== idx) }));

  /* ---- Brands handlers ---- */
  const setBrand = (idx: number, field: keyof BrandCard, val: string) =>
    setData((d) => ({ ...d, brands: d.brands.map((b, i) => (i === idx ? { ...b, [field]: val } : b)) }));
  const addBrand = () => setData((d) => ({ ...d, brands: [...d.brands, { name_fr: "", name_ar: "", desc_fr: "", desc_ar: "", emoji: "🦷", color: "from-brand-700 to-brand-900" }] }));
  const removeBrand = (idx: number) => setData((d) => ({ ...d, brands: d.brands.filter((_, i) => i !== idx) }));

  /* ---- Save ---- */
  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "about_page", value: data }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok || !resData?.ok) throw new Error(resData?.error || "save failed");
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
      {/* Values Section */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-brand-700" />{t("aboutValuesTitle")}</CardTitle>
          <CardDescription>{t("aboutValuesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("valuesTitle") + " (FR)"} value={data.valuesTitle_fr} onChange={(v) => setData((d) => ({ ...d, valuesTitle_fr: v }))} />
            <Field label={t("valuesTitle") + " (AR)"} value={data.valuesTitle_ar} onChange={(v) => setData((d) => ({ ...d, valuesTitle_ar: v }))} dir="rtl" />
          </div>
          <Separator />
          {data.values.map((card, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">#{i + 1}</span>
                <div className="flex items-center gap-2">
                  <select value={card.icon} onChange={(e) => setValue(i, "icon", e.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">
                    {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                  <Button variant="ghost" size="icon" onClick={() => removeValue(i)} className="h-7 w-7 text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label={t("name_fr")} value={card.title_fr} onChange={(v) => setValue(i, "title_fr", v)} />
                <Field label={t("name_ar")} value={card.title_ar} onChange={(v) => setValue(i, "title_ar", v)} dir="rtl" />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label={t("description") + " (FR)"} value={card.desc_fr} onChange={(v) => setValue(i, "desc_fr", v)} textarea />
                <Field label={t("description") + " (AR)"} value={card.desc_ar} onChange={(v) => setValue(i, "desc_ar", v)} textarea dir="rtl" />
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addValue} className="border-dashed"><Plus className="mr-2 h-4 w-4" />{t("addWhyCard")}</Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Brands Section */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Building2 className="h-5 w-5 text-brand-700" />{t("aboutBrandsTitle")}</CardTitle>
          <CardDescription>{t("aboutBrandsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.brands.map((brand, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">{brand.emoji} #{i + 1}</span>
                <div className="flex items-center gap-2">
                  <Input value={brand.emoji} onChange={(e) => setBrand(i, "emoji", e.target.value)} className="w-16 text-center" />
                  <select value={brand.color} onChange={(e) => setBrand(i, "color", e.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">
                    {COLOR_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <Button variant="ghost" size="icon" onClick={() => removeBrand(i)} className="h-7 w-7 text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label={t("brandName") + " (FR)"} value={brand.name_fr} onChange={(v) => setBrand(i, "name_fr", v)} />
                <Field label={t("brandName") + " (AR)"} value={brand.name_ar} onChange={(v) => setBrand(i, "name_ar", v)} dir="rtl" />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label={t("description") + " (FR)"} value={brand.desc_fr} onChange={(v) => setBrand(i, "desc_fr", v)} textarea />
                <Field label={t("description") + " (AR)"} value={brand.desc_ar} onChange={(v) => setBrand(i, "desc_ar", v)} textarea dir="rtl" />
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addBrand} className="border-dashed"><Plus className="mr-2 h-4 w-4" />{t("addBrand")}</Button>
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

export default AboutSettingsPanel2;
