"use client";
import { useEffect, useState } from "react";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-service";
import type { AboutSettings } from "@/lib/settings-service";
import { toast } from "@/components/ui/sonner";

const EMPTY_ABOUT: AboutSettings = {
  story_fr: "",
  story_ar: "",
};

export function AboutSettingsPanel() {
  const { t } = useTranslation();
  const { settings, loading, tableMissing, refresh } = useSettings();

  const [saving, setSaving] = useState(false);
  const [about, setAbout] = useState<AboutSettings>(EMPTY_ABOUT);

  // Sync from context whenever settings load/change
  useEffect(() => {
    const a = settings.about;
    setAbout({
      story_fr: a.story_fr ?? "",
      story_ar: a.story_ar ?? "",
    });
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "about", value: about }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "save failed");
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
