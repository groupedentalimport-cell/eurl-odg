"use client";
import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-service";
import type { AboutSettings } from "@/lib/settings-service";
import { toast } from "@/components/ui/sonner";

interface Brand {
  name: string;
  bg: string;
  text: string;
}

const DEFAULT_BRAND: Brand = { name: "", bg: "#0f766e", text: "#FFFFFF" };

const EMPTY_ABOUT: AboutSettings = {
  story_fr: "",
  story_ar: "",
};

function isBrandArray(v: unknown): v is Brand[] {
  return (
    Array.isArray(v) &&
    v.every((it) => it && typeof it === "object" && typeof (it as Brand).name === "string")
  );
}

// Coerce the stored value_json (which may have any shape) into a Brand[]
function coerceBrands(v: unknown): Brand[] {
  if (!Array.isArray(v)) return [];
  return v.map((b: any) => ({
    name: typeof b?.name === "string" ? b.name : "",
    bg: typeof b?.bg === "string" ? b.bg : DEFAULT_BRAND.bg,
    text: typeof b?.text === "string" ? b.text : DEFAULT_BRAND.text,
  }));
}

export function AboutSettingsPanel() {
  const { t } = useTranslation();
  const { settings, flat, loading, tableMissing, refresh } = useSettings();

  const [saving, setSaving] = useState(false);
  const [about, setAbout] = useState<AboutSettings>(EMPTY_ABOUT);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Sync story + brands from context whenever settings load/change
  useEffect(() => {
    const a = settings.about;
    setAbout({
      story_fr: a.story_fr ?? "",
      story_ar: a.story_ar ?? "",
    });
    const raw = flat["about.brands"]?.value_json;
    if (isBrandArray(raw)) {
      setBrands(
        raw.map((b) => ({
          name: b.name ?? "",
          bg: b.bg ?? DEFAULT_BRAND.bg,
          text: b.text ?? DEFAULT_BRAND.text,
        }))
      );
    } else {
      setBrands(coerceBrands(raw));
    }
  }, [settings, flat]);

  const setBrand = (idx: number, k: keyof Brand) => (v: string) =>
    setBrands((arr) => arr.map((b, i) => (i === idx ? { ...b, [k]: v } : b)));

  const addBrand = () => setBrands((arr) => [...arr, { ...DEFAULT_BRAND }]);
  const removeBrand = (idx: number) =>
    setBrands((arr) => arr.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    try {
      // 1) Save the about story (existing flow — translated to
      //    about.history.p1 / about.history.p2 by the API route).
      const aboutRes = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "about", value: about }),
      });
      const aboutData = await aboutRes.json().catch(() => ({}));
      if (!aboutRes.ok || !aboutData?.ok) {
        throw new Error(aboutData?.error || "save failed");
      }
      // 2) Save the brands array. The orchestrator extends the
      //    /api/admin/settings PUT route to handle key="brands" by upserting
      //    the about.brands row's value_json directly.
      const brandsRes = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "brands", value: brands }),
      });
      const brandsData = await brandsRes.json().catch(() => ({}));
      if (!brandsRes.ok || !brandsData?.ok) {
        throw new Error(brandsData?.error || "save failed");
      }
      toast.success(t("saved"));
      refresh(); // reload context so public pages update
    } catch (err: any) {
      toast.error(t("saveFailed"), { description: err?.message || "" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
        <span className="ml-2 text-sm text-slate-500">{t("loading")}</span>
      </div>
    );
  }

  if (tableMissing) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base text-amber-900">
              {t("tableMissingNotice")}
            </CardTitle>
            <CardDescription className="mt-1 text-amber-800">
              {t("tableMissingNotice")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={refresh}>
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">{t("aboutSettings")}</CardTitle>
          <CardDescription>{t("storyTitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="story_fr" className="text-xs font-medium text-slate-600">
              {t("story_fr")}
            </Label>
            <Textarea
              id="story_fr"
              dir="ltr"
              rows={10}
              value={about.story_fr}
              onChange={(e) =>
                setAbout((a) => ({ ...a, story_fr: e.target.value }))
              }
              className="resize-y"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="story_ar" className="text-xs font-medium text-slate-600">
              {t("story_ar")}
            </Label>
            <Textarea
              id="story_ar"
              dir="rtl"
              rows={10}
              value={about.story_ar}
              onChange={(e) =>
                setAbout((a) => ({ ...a, story_ar: e.target.value }))
              }
              className="resize-y text-right"
            />
          </div>
        </CardContent>
      </Card>

      {/* Brands editor */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">{t("brands")}</CardTitle>
          <CardDescription>{t("brandsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {brands.length === 0 && (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
              {t("noBrands")}
            </p>
          )}

          <div className="space-y-3">
            {brands.map((b, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600">
                      {t("brandName")}
                    </Label>
                    <Input
                      value={b.name}
                      onChange={(e) => setBrand(i, "name")(e.target.value)}
                      placeholder="DentaPro"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600">
                      {t("brandColor")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={b.bg}
                        onChange={(e) => setBrand(i, "bg")(e.target.value)}
                        aria-label={t("brandColor")}
                        className="h-10 w-10 shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                      />
                      <Input
                        value={b.bg}
                        onChange={(e) => setBrand(i, "bg")(e.target.value)}
                        className="w-24 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600">
                      {t("brandTextColor")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={b.text}
                        onChange={(e) => setBrand(i, "text")(e.target.value)}
                        aria-label={t("brandTextColor")}
                        className="h-10 w-10 shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                      />
                      <Input
                        value={b.text}
                        onChange={(e) => setBrand(i, "text")(e.target.value)}
                        className="w-24 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeBrand(i)}
                    aria-label={t("delete")}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Live preview */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-slate-500">{t("preview")}:</span>
                  <span
                    className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{ backgroundColor: b.bg, color: b.text }}
                  >
                    {b.name || t("brandName")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addBrand}
            className="border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("addBrand")}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Save bar */}
      <div className="sticky bottom-4 z-10 flex justify-end gap-3">
        <Button
          onClick={save}
          disabled={saving}
          className="bg-brand-700 hover:bg-brand-800 shadow-lg"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("loading")}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {t("save")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default AboutSettingsPanel;
