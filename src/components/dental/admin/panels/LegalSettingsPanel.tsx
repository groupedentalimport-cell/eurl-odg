"use client";
import { useEffect, useState } from "react";
import { Loader2, Save, AlertTriangle, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-service";
import { toast } from "@/components/ui/sonner";

interface LegalInfo {
  rccm: string;
  nif: string;
  capital: string;
  gerant: string;
  hebergeur: string;
  hebergeurAdresse: string;
  hebergeurUrl: string;
}

const EMPTY: LegalInfo = {
  rccm: "",
  nif: "",
  capital: "",
  gerant: "",
  hebergeur: "Vercel Inc.",
  hebergeurAdresse: "340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis",
  hebergeurUrl: "https://vercel.com",
};

function Field({ label, value, onChange, textarea, dir, placeholder }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; dir?: "ltr" | "rtl"; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      {textarea ? <Textarea dir={dir} rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="resize-y" /> : <Input dir={dir} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}
    </div>
  );
}

export function LegalSettingsPanel() {
  const { t } = useTranslation();
  const { flat, loading, tableMissing, refresh } = useSettings();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LegalInfo>(EMPTY);

  useEffect(() => {
    if (loading) return;
    const g = (k: string) => flat[k]?.value_fr || "";
    setForm({
      rccm: g("legal.rccm"),
      nif: g("legal.nif"),
      capital: g("legal.capital"),
      gerant: g("legal.gerant"),
      hebergeur: g("legal.hebergeur") || EMPTY.hebergeur,
      hebergeurAdresse: g("legal.hebergeur_adresse") || EMPTY.hebergeurAdresse,
      hebergeurUrl: g("legal.hebergeur_url") || EMPTY.hebergeurUrl,
    });
  }, [flat, loading]);

  const set = (k: keyof LegalInfo) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "legal", value: form }),
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
      {/* Entreprise — champs légaux */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Scale className="h-5 w-5 text-brand-700" />{t("legalCompanyTitle")}</CardTitle>
          <CardDescription>{t("legalCompanyDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("legalRccm")} value={form.rccm} onChange={set("rccm")} placeholder="RCCM Oran — ..." />
            <Field label={t("legalNif")} value={form.nif} onChange={set("nif")} placeholder="NIF ..." />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("legalCapital")} value={form.capital} onChange={set("capital")} placeholder="1 000 000 DZD" />
            <Field label={t("legalGerant")} value={form.gerant} onChange={set("gerant")} placeholder="M. Nom Prénom" />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Hébergeur */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">{t("legalHostTitle")}</CardTitle>
          <CardDescription>{t("legalHostDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label={t("legalHostCompany")} value={form.hebergeur} onChange={set("hebergeur")} />
          <Field label={t("legalHostAddress")} value={form.hebergeurAdresse} onChange={set("hebergeurAdresse")} textarea />
          <Field label={t("legalHostUrl")} value={form.hebergeurUrl} onChange={set("hebergeurUrl")} placeholder="https://..." />
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

export default LegalSettingsPanel;
