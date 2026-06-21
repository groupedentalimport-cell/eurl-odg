"use client";
import { useEffect, useState } from "react";
import { Loader2, Save, AlertTriangle } from "lucide-react";
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
import type { CompanySettings } from "@/lib/settings-service";
import { toast } from "@/components/ui/sonner";

interface CompanyShape {
  name?: string;
  nameAr?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  address_fr?: string;
  address_ar?: string;
  city?: string;
  country?: string;
  hours_fr?: string;
  hours_ar?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
}

const EMPTY_COMPANY: CompanySettings = {
  name: "",
  nameAr: "",
  phone: "",
  phone2: "",
  email: "",
  address_fr: "",
  address_ar: "",
  city: "",
  country: "",
  hours_fr: "",
  hours_ar: "",
  facebook: "",
  instagram: "",
  linkedin: "",
};

function Field({
  label,
  value,
  onChange,
  dir,
  textarea,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "ltr" | "rtl";
  textarea?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      {textarea ? (
        <Textarea
          dir={dir}
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="resize-y"
          placeholder={placeholder}
        />
      ) : (
        <Input
          dir={dir}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

export function ContactSettingsPanel() {
  const { t } = useTranslation();
  const { refresh } = useSettings();

  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<CompanySettings>(EMPTY_COMPANY);

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
        const c: CompanyShape = (s.company as CompanyShape) || {};
        setCompany({
          name: c.name ?? "",
          nameAr: c.nameAr ?? "",
          phone: c.phone ?? "",
          phone2: c.phone2 ?? "",
          email: c.email ?? "",
          address_fr: c.address_fr ?? "",
          address_ar: c.address_ar ?? "",
          city: c.city ?? "",
          country: c.country ?? "",
          hours_fr: c.hours_fr ?? "",
          hours_ar: c.hours_ar ?? "",
          facebook: c.facebook ?? "",
          instagram: c.instagram ?? "",
          linkedin: c.linkedin ?? "",
        });
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

  const set = (k: keyof CompanySettings) => (v: string) =>
    setCompany((c) => ({ ...c, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "company", value: company }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
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
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">{t("contactSettings")}</CardTitle>
          <CardDescription>{t("contactInfo")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Identity */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label={t("companyName")}
              value={company.name}
              onChange={set("name")}
            />
            <Field
              label={t("companyNameAr")}
              value={company.nameAr}
              onChange={set("nameAr")}
              dir="rtl"
            />
          </div>

          <Separator />

          {/* Phones + email */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field
              label={t("companyPhone")}
              value={company.phone}
              onChange={set("phone")}
              placeholder="+213 …"
            />
            <Field
              label={t("companyPhone2")}
              value={company.phone2}
              onChange={set("phone2")}
              placeholder="+213 …"
            />
            <Field
              label={t("email_field")}
              value={company.email}
              onChange={set("email")}
              type="email"
              placeholder="contact@…"
            />
          </div>

          <Separator />

          {/* Address */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label={t("address_fr")}
              value={company.address_fr}
              onChange={set("address_fr")}
              textarea
            />
            <Field
              label={t("address_ar")}
              value={company.address_ar}
              onChange={set("address_ar")}
              textarea
              dir="rtl"
            />
          </div>

          {/* City / country */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label={t("city")}
              value={company.city}
              onChange={set("city")}
            />
            <Field
              label={t("country")}
              value={company.country}
              onChange={set("country")}
            />
          </div>

          <Separator />

          {/* Hours */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label={t("hours_fr")}
              value={company.hours_fr}
              onChange={set("hours_fr")}
            />
            <Field
              label={t("hours_ar")}
              value={company.hours_ar}
              onChange={set("hours_ar")}
              dir="rtl"
            />
          </div>

          <Separator />

          {/* Social */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field
              label={t("facebook")}
              value={company.facebook}
              onChange={set("facebook")}
              placeholder="https://facebook.com/…"
            />
            <Field
              label={t("instagram")}
              value={company.instagram}
              onChange={set("instagram")}
              placeholder="https://instagram.com/…"
            />
            <Field
              label={t("linkedin")}
              value={company.linkedin}
              onChange={set("linkedin")}
              placeholder="https://linkedin.com/…"
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

export default ContactSettingsPanel;
