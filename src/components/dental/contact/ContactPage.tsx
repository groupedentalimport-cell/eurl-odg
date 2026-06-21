"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Clock, Facebook, Instagram, Linkedin, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n";
import { COMPANY } from "@/lib/types";
import { toast } from "@/components/ui/sonner";

export function ContactPage() {
  const { lang, t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast.error(t("sentFail"));
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          subject: form.subject,
          body: form.message,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success(t("sentOk"));
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err: any) {
      toast.error(t("sentFail"), { description: err.message || "" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{t("contactTitle")}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">{t("contactDesc")}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Form */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{t("name")} *</Label>
                    <Input id="name" required value={form.name} onChange={set("name")} placeholder={t("name")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t("email")} *</Label>
                    <Input id="email" type="email" required value={form.email} onChange={set("email")} placeholder="exemple@email.com" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{t("phone")}</Label>
                    <Input id="phone" value={form.phone} onChange={set("phone")} placeholder="+213 …" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="subject">{t("subject")} *</Label>
                    <Input id="subject" required value={form.subject} onChange={set("subject")} placeholder={t("subject")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">{t("message")} *</Label>
                  <Textarea
                    id="message"
                    required
                    rows={6}
                    value={form.message}
                    onChange={set("message")}
                    placeholder={t("message")}
                  />
                </div>
                <Button type="submit" disabled={sending} className="w-full bg-brand-700 hover:bg-brand-800 sm:w-auto">
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("sending")}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {t("send")}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info card */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-brand-700 text-white">
              <CardTitle className="text-xl">{t("contactInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("addressLabel")}</p>
                  <p className="text-sm text-slate-800">{COMPANY.address[lang]}</p>
                  <p className="text-sm text-slate-700">{COMPANY.city}, {COMPANY.country}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("phone")}</p>
                  <a href={`tel:${COMPANY.phone}`} className="block text-sm font-medium text-slate-800 hover:text-brand-700">
                    {COMPANY.phone}
                  </a>
                  <a href={`tel:${COMPANY.phone2}`} className="block text-sm font-medium text-slate-800 hover:text-brand-700">
                    {COMPANY.phone2}
                  </a>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("email")}</p>
                  <a href={`mailto:${COMPANY.email}`} className="text-sm font-medium text-slate-800 hover:text-brand-700">
                    {COMPANY.email}
                  </a>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("hoursLabel")}</p>
                  <p className="text-sm text-slate-800">{COMPANY.hours[lang]}</p>
                </div>
              </div>

              {/* Social */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("followUs")}</p>
                <div className="flex gap-3">
                  {COMPANY.facebook && (
                    <a href={COMPANY.facebook} aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition-colors hover:bg-brand-700 hover:text-white">
                      <Facebook className="h-4 w-4" />
                    </a>
                  )}
                  {COMPANY.instagram && (
                    <a href={COMPANY.instagram} aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition-colors hover:bg-brand-700 hover:text-white">
                      <Instagram className="h-4 w-4" />
                    </a>
                  )}
                  {COMPANY.linkedin && (
                    <a href={COMPANY.linkedin} aria-label="LinkedIn" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition-colors hover:bg-brand-700 hover:text-white">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Map */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("findUs")}</p>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <iframe
                    title="ODG map"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=-0.7%2C35.65%2C-0.55%2C35.78&layer=mapnik&marker=35.6911%2C-0.6417"
                    className="h-56 w-full"
                    loading="lazy"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
