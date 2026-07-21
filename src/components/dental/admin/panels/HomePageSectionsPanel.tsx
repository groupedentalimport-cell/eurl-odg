"use client";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save, AlertTriangle, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-service";
import { toast } from "@/components/ui/sonner";

/* ---------- Types ---------- */
interface WhyCard {
  title_fr: string;
  title_ar: string;
  desc_fr: string;
  desc_ar: string;
  icon: string;
}

interface HeroBrand {
  name: string;
}

interface HomePageSections {
  whyTitle_fr: string;
  whyTitle_ar: string;
  whyCards: WhyCard[];
  heroBrands: HeroBrand[];
}

const DEFAULT_WHY_CARDS: WhyCard[] = [
  { title_fr: "Marques certifiées", title_ar: "علامات معتمدة", desc_fr: "Silver Fox, ICANCLAVE, OWANDY — qualité internationale.", desc_ar: "Silver Fox، ICANCLAVE، OWANDY — جودة دولية.", icon: "ShieldCheck" },
  { title_fr: "Service après-vente", title_ar: "خدمة ما بعد البيع", desc_fr: "Pièces détachées et techniciens en Algérie.", desc_ar: "قطع غيار وفنيون في الجزائر.", icon: "Wrench" },
  { title_fr: "Formation incluse", title_ar: "تكوين مشمول", desc_fr: "Installation et formation à la prise en main.", desc_ar: "التركيب والتكوين على الاستعمال.", icon: "GraduationCap" },
  { title_fr: "Garantie 24 mois", title_ar: "ضمان 24 شهر", desc_fr: "Tous nos produits sont garantis 2 ans.", desc_ar: "كل منتجاتنا مضمونة سنتين.", icon: "BadgeCheck" },
];

const DEFAULT_HERO_BRANDS: HeroBrand[] = [
  { name: "Silver Fox" },
  { name: "ICANCLAVE" },
  { name: "OWANDY" },
];

const ICON_OPTIONS = ["ShieldCheck", "Wrench", "GraduationCap", "BadgeCheck", "Star", "Award", "Heart", "Zap", "Tool", "CheckCircle"];

/* ---------- Sub-components ---------- */
function Field({ label, value, onChange, textarea, dir }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; dir?: "ltr" | "rtl" }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      {textarea ? <Textarea dir={dir} rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="resize-y" /> : <Input dir={dir} value={value} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

/* ---------- Main Panel ---------- */
export function HomePageSectionsPanel() {
  const { t } = useTranslation();
  const { settings, flat, loading, tableMissing, refresh } = useSettings();
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<HomePageSections>({
    whyTitle_fr: "",
    whyTitle_ar: "",
    whyCards: DEFAULT_WHY_CARDS,
    heroBrands: DEFAULT_HERO_BRANDS,
  });

  // Load from flat settings
  useEffect(() => {
    if (loading) return;
    const g = (k: string) => flat[k]?.value_fr || flat[k]?.value_ar || "";

    // Why Us cards from home.why_cards (JSON)
    const whyCardsRow = flat["home.why_cards"];
    let whyCards: WhyCard[] = DEFAULT_WHY_CARDS;
    if (whyCardsRow?.value_json && Array.isArray(whyCardsRow.value_json)) {
      whyCards = whyCardsRow.value_json as WhyCard[];
    }

    // Hero brands from home.hero_brands (JSON)
    const brandsRow = flat["home.hero_brands"];
    let heroBrands: HeroBrand[] = DEFAULT_HERO_BRANDS;
    if (brandsRow?.value_json && Array.isArray(brandsRow.value_json)) {
      heroBrands = brandsRow.value_json as HeroBrand[];
    }

    setData({
      whyTitle_fr: g("home.why_title_fr") || "Pourquoi nous choisir ?",
      whyTitle_ar: g("home.why_title_ar") || "لماذا تختارنا؟",
      whyCards,
      heroBrands,
    });
  }, [flat, loading]);

  /* ---- Why Cards handlers ---- */
  const setWhyCard = (idx: number, field: keyof WhyCard, val: string) =>
    setData((d) => ({ ...d, whyCards: d.whyCards.map((c, i) => (i === idx ? { ...c, [field]: val } : c)) }));
  const addWhyCard = () => setData((d) => ({ ...d, whyCards: [...d.whyCards, { title_fr: "", title_ar: "", desc_fr: "", desc_ar: "", icon: "Star" }] }));
  const removeWhyCard = (idx: number) => setData((d) => ({ ...d, whyCards: d.whyCards.filter((_, i) => i !== idx) }));

  /* ---- Hero Brands handlers ---- */
  const setBrand = (idx: number, val: string) =>
    setData((d) => ({ ...d, heroBrands: d.heroBrands.map((b, i) => (i === idx ? { name: val } : b)) }));
  const addBrand = () => setData((d) => ({ ...d, heroBrands: [...d.heroBrands, { name: "" }] }));
  const removeBrand = (idx: number) => setData((d) => ({ ...d, heroBrands: d.heroBrands.filter((_, i) => i !== idx) }));

  /* ---- Save ---- */
  const save = async () => {
    setSaving(true);
    try {
      // Save "why" section
      const whyRes = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "home_sections", value: { whyTitle_fr: data.whyTitle_fr, whyTitle_ar: data.whyTitle_ar, whyCards: data.whyCards, heroBrands: data.heroBrands } }),
      });
      const whyData = await whyRes.json().catch(() => ({}));
      if (!whyRes.ok || !whyData?.ok) throw new Error(whyData?.error || "save failed");

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
      {/* Hero Brands */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">{t("heroBrandsTitle")}</CardTitle>
          <CardDescription>{t("heroBrandsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.heroBrands.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={b.name} onChange={(e) => setBrand(i, e.target.value)} placeholder="Silver Fox" />
              <Button variant="outline" size="icon" onClick={() => removeBrand(i)} className="text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" onClick={addBrand} className="border-dashed"><Plus className="mr-2 h-4 w-4" />{t("addBrand")}</Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Why Us Section */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-brand-700" />{t("whyUsSectionTitle")}</CardTitle>
          <CardDescription>{t("whyUsSectionDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("whyUsTitle") + " (FR)"} value={data.whyTitle_fr} onChange={(v) => setData((d) => ({ ...d, whyTitle_fr: v }))} />
            <Field label={t("whyUsTitle") + " (AR)"} value={data.whyTitle_ar} onChange={(v) => setData((d) => ({ ...d, whyTitle_ar: v }))} dir="rtl" />
          </div>
          <Separator />
          {data.whyCards.map((card, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">#{i + 1}</span>
                <div className="flex items-center gap-2">
                  <select value={card.icon} onChange={(e) => setWhyCard(i, "icon", e.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">
                    {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                  <Button variant="ghost" size="icon" onClick={() => removeWhyCard(i)} className="h-7 w-7 text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label={t("name_fr")} value={card.title_fr} onChange={(v) => setWhyCard(i, "title_fr", v)} />
                <Field label={t("name_ar")} value={card.title_ar} onChange={(v) => setWhyCard(i, "title_ar", v)} dir="rtl" />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label={t("description") + " (FR)"} value={card.desc_fr} onChange={(v) => setWhyCard(i, "desc_fr", v)} textarea />
                <Field label={t("description") + " (AR)"} value={card.desc_ar} onChange={(v) => setWhyCard(i, "desc_ar", v)} textarea dir="rtl" />
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addWhyCard} className="border-dashed"><Plus className="mr-2 h-4 w-4" />{t("addWhyCard")}</Button>
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

export default HomePageSectionsPanel;
