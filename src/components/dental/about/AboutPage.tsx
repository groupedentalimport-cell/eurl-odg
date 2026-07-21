"use client";
import { motion } from "framer-motion";
import { ShieldCheck, Wrench, GraduationCap, Award, ArrowRight, Phone, Star, BadgeCheck, Heart, Zap, CheckCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import { useSettings, useCompanyInfo } from "@/lib/settings-service";
import { navigate } from "@/lib/router";

const ICONS: Record<string, LucideIcon> = {
  ShieldCheck, Wrench, GraduationCap, Award, Star, BadgeCheck, Heart, Zap, CheckCircle,
};

export function AboutPage() {
  const { lang, t } = useTranslation();
  const { settings } = useSettings();
  const company = useCompanyInfo();
  const stats = settings.stats;
  const companyName = lang === "ar" ? company.nameAr : company.name;
  const storyText = lang === "ar" ? settings.about.story_ar : settings.about.story_fr;
  const storyParagraphs = storyText.split(/\n{1,2}/).map((p) => p.trim()).filter(Boolean);

  // Dynamic values & brands from admin settings
  const valuesTitle = lang === "ar" ? settings.aboutPage.valuesTitle_ar : settings.aboutPage.valuesTitle_fr;
  const values = settings.aboutPage.values;
  const brands = settings.aboutPage.brands;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Badge variant="secondary" className="mb-4 bg-white/20 text-white">
              {t("aboutTitle")}
            </Badge>
            <h1 className="text-4xl font-bold sm:text-5xl">{companyName}</h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-brand-100">{t("aboutHero")}</p>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-brand-200">{company.tagline[lang]}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button variant="secondary" onClick={() => navigate("contact")}>
                {t("contactUs")}
              </Button>
              <Button variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10" onClick={() => navigate("catalogue")}>
                {t("viewProducts")}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <h2 className="text-3xl font-bold text-slate-900">{t("storyTitle")}</h2>
          <div className="mt-6 space-y-4 text-slate-700">
            {storyParagraphs.length > 0 ? (
              storyParagraphs.map((p, i) => (
                <p key={i} className="leading-relaxed">{p}</p>
              ))
            ) : (
              <p className="leading-relaxed text-slate-400">{t("loading")}</p>
            )}
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="bg-brand-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">{t("statsTitle")}</h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="rounded-xl bg-white p-6 text-center shadow-sm"
              >
                <div className="text-3xl font-bold text-brand-700 sm:text-4xl">{s.value}</div>
                <div className="mt-1 text-sm text-slate-600">{lang === "ar" ? s.ar : s.fr}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center text-3xl font-bold text-slate-900">{valuesTitle || t("valuesTitle")}</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => {
            const Icon = ICONS[v.icon] || Star;
            return (
              <motion.div
                key={`${v.icon}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card className="h-full border-slate-200 text-center shadow-sm">
                  <CardContent className="flex flex-col items-center p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">{lang === "ar" ? v.title_ar : v.title_fr}</h3>
                    <p className="mt-2 text-sm text-slate-600">{lang === "ar" ? v.desc_ar : v.desc_fr}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Brands */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-slate-900">{t("brandsTitle")}</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {brands.map((b, i) => (
              <motion.div
                key={`${b.name_fr}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card className="overflow-hidden border-slate-200 shadow-sm">
                  <div className={`flex h-32 items-center justify-center bg-gradient-to-br ${b.color} text-5xl`}>
                    <span aria-hidden>{b.emoji}</span>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-slate-900">{lang === "ar" ? b.name_ar : b.name_fr}</h3>
                    <p className="mt-2 text-sm text-slate-600">{lang === "ar" ? b.desc_ar : b.desc_fr}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-brand-700 p-8 text-center text-white sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-brand-100">{t("ctaSubtitle")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="secondary" onClick={() => navigate("contact")}>
              <Phone className="mr-2 h-4 w-4" />
              {t("contactUs")}
            </Button>
            <Button variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10" onClick={() => navigate("catalogue")}>
              {t("viewProducts")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
