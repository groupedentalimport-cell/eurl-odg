"use client";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
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
import type { HomeSettings, StatItem } from "@/lib/settings-service";
import { toast } from "@/components/ui/sonner";

interface HomeShape {
  heroTitle_fr?: string;
  heroTitle_ar?: string;
  heroSubtitle_fr?: string;
  heroSubtitle_ar?: string;
  ctaTitle_fr?: string;
  ctaTitle_ar?: string;
  ctaSubtitle_fr?: string;
  ctaSubtitle_ar?: string;
}

const EMPTY_HOME: HomeSettings = {
  heroTitle_fr: "",
  heroTitle_ar: "",
  heroSubtitle_fr: "",
  heroSubtitle_ar: "",
  ctaTitle_fr: "",
  ctaTitle_ar: "",
  ctaSubtitle_fr: "",
  ctaSubtitle_ar: "",
};

function HomeField({
  label,
  value,
  onChange,
  textarea,
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      {textarea ? (
        <Textarea
          dir={dir}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="resize-y"
        />
      ) : (
        <Input dir={dir} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function HomeSettingsPanel() {
  const { t } = useTranslation();
  const { refresh } = useSettings();

  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [home, setHome] = useState<HomeSettings>(EMPTY_HOME);
  const [stats, setStats] = useState<StatItem[]>([]);

  const load = async () => {
    setLoading(true);
    setTableMissing(false);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      if (res.status === 501) {
        const data = await res.json().catch(() => ({}));
        if (data?.tableMissing) setTableMissing(true);
        else toast.error(t("saveFailed"));
      } else if (!res.ok) {
        toast.error(t("saveFailed"));
      } else {
        const data = await res.json();
        const s = data?.settings || {};
        const h: HomeShape = (s.home as HomeShape) || {};
        setHome({
          heroTitle_fr: h.heroTitle_fr ?? "",
          heroTitle_ar: h.heroTitle_ar ?? "",
          heroSubtitle_fr: h.heroSubtitle_fr ?? "",
          heroSubtitle_ar: h.heroSubtitle_ar ?? "",
          ctaTitle_fr: h.ctaTitle_fr ?? "",
          ctaTitle_ar: h.ctaTitle_ar ?? "",
          ctaSubtitle_fr: h.ctaSubtitle_fr ?? "",
          ctaSubtitle_ar: h.ctaSubtitle_ar ?? "",
        });
        if (Array.isArray(s.stats)) {
          setStats(
            s.stats.map((x: Partial<StatItem>) => ({
              value: x.value ?? "",
              fr: x.fr ?? "",
              ar: x.ar ?? "",
            }))
          );
        }
      }
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setHomeField = (k: keyof HomeSettings) => (v: string) =>
    setHome((h) => ({ ...h, [k]: v }));

  const setStat = (idx: number, k: keyof StatItem) => (v: string) =>
    setStats((arr) => arr.map((s, i) => (i === idx ? { ...s, [k]: v } : s)));

  const addStat = () =>
    setStats((arr) => [...arr, { value: "", fr: "", ar: "" }]);

  const removeStat = (idx: number) =>
    setStats((arr) => arr.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    try {
      // Save home
      const homeRes = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "home", value: home }),
      });
      if (!homeRes.ok) {
        const d = await homeRes.json().catch(() => ({}));
        if (d?.tableMissing) {
          setTableMissing(true);
          toast.error(t("tableMissingNotice"));
          return;
        }
        throw new Error(d?.error || "save failed");
      }
      // Save stats
      const statsRes = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "stats", value: stats }),
      });
      if (!statsRes.ok) {
        const d = await statsRes.json().catch(() => ({}));
        if (d?.tableMissing) {
          setTableMissing(true);
          toast.error(t("tableMissingNotice"));
          return;
        }
        throw new Error(d?.error || "save failed");
      }
      toast.success(t("saved"));
      refresh();
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
          <Button variant="outline" onClick={load}>
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Home content */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">{t("homeSettings")}</CardTitle>
          <CardDescription>
            {t("heroTitle_fr")} / {t("heroTitle_ar")} / {t("ctaTitle_fr")} /{" "}
            {t("ctaTitle_ar")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hero title */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <HomeField
              label={t("heroTitle_fr")}
              value={home.heroTitle_fr}
              onChange={setHomeField("heroTitle_fr")}
            />
            <HomeField
              label={t("heroTitle_ar")}
              value={home.heroTitle_ar}
              onChange={setHomeField("heroTitle_ar")}
              dir="rtl"
            />
          </div>
          {/* Hero subtitle */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <HomeField
              label={t("heroSubtitle_fr")}
              value={home.heroSubtitle_fr}
              onChange={setHomeField("heroSubtitle_fr")}
              textarea
            />
            <HomeField
              label={t("heroSubtitle_ar")}
              value={home.heroSubtitle_ar}
              onChange={setHomeField("heroSubtitle_ar")}
              textarea
              dir="rtl"
            />
          </div>

          <Separator />

          {/* CTA title */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <HomeField
              label={t("ctaTitle_fr")}
              value={home.ctaTitle_fr}
              onChange={setHomeField("ctaTitle_fr")}
            />
            <HomeField
              label={t("ctaTitle_ar")}
              value={home.ctaTitle_ar}
              onChange={setHomeField("ctaTitle_ar")}
              dir="rtl"
            />
          </div>
          {/* CTA subtitle */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <HomeField
              label={t("ctaSubtitle_fr")}
              value={home.ctaSubtitle_fr}
              onChange={setHomeField("ctaSubtitle_fr")}
              textarea
            />
            <HomeField
              label={t("ctaSubtitle_ar")}
              value={home.ctaSubtitle_ar}
              onChange={setHomeField("ctaSubtitle_ar")}
              textarea
              dir="rtl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">{t("statsSettings")}</CardTitle>
          <CardDescription>{t("statsSettings")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.length === 0 && (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
              —
            </p>
          )}
          <div className="space-y-3">
            {stats.map((s, i) => (
              <div
                key={i}
                className="grid grid-cols-1 items-end gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-[100px_1fr_1fr_auto]"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600">
                    {t("statValue")}
                  </Label>
                  <Input
                    value={s.value}
                    onChange={(e) => setStat(i, "value")(e.target.value)}
                    placeholder="15+"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600">
                    {t("statLabelFr")}
                  </Label>
                  <Input
                    dir="ltr"
                    value={s.fr}
                    onChange={(e) => setStat(i, "fr")(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600">
                    {t("statLabelAr")}
                  </Label>
                  <Input
                    dir="rtl"
                    value={s.ar}
                    onChange={(e) => setStat(i, "ar")(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeStat(i)}
                  aria-label={t("delete")}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addStat}
            className="border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("addStat")}
          </Button>
        </CardContent>
      </Card>

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

export default HomeSettingsPanel;
