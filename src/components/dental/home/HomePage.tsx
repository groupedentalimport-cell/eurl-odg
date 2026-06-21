"use client";
import { useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Wrench,
  GraduationCap,
  BadgeCheck,
  Armchair,
  Stethoscope,
  Radiation,
  Package,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/dental/catalogue/ProductCard";
import { Newsletter } from "@/components/dental/newsletter/Newsletter";
import { useTranslation, type TKey } from "@/lib/i18n";
import { useData } from "@/lib/data-service";
import { navigate } from "@/lib/router";
import { STATS, COMPANY } from "@/lib/types";
import { getBlogImageUrl } from "@/lib/supabase";

// Map icon string names from categories to lucide components
const ICONS: Record<string, LucideIcon> = {
  Armchair,
  Stethoscope,
  Radiation,
  ShieldCheck,
  Package,
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function HomePage() {
  const { t, lang } = useTranslation();
  const { categories, products, blogPosts, loading } = useData();

  const featured = useMemo(
    () => products.filter((p) => p.featured).slice(0, 8),
    [products]
  );
  const latestPosts = useMemo(() => blogPosts.slice(0, 3), [blogPosts]);

  const whyCards = [
    { icon: ShieldCheck, titleKey: "why1Title", descKey: "why1Desc" },
    { icon: Wrench, titleKey: "why2Title", descKey: "why2Desc" },
    { icon: GraduationCap, titleKey: "why3Title", descKey: "why3Desc" },
    { icon: BadgeCheck, titleKey: "why4Title", descKey: "why4Desc" },
  ] as const;

  return (
    <div className="flex flex-col">
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-950/95 via-brand-900/85 to-brand-800/70" />
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_25%_30%,rgba(255,255,255,0.3)_0,transparent_45%)]" />
        </div>

        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center px-4 py-20 sm:px-6 lg:py-28">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <Badge
              variant="default"
              className="mb-4 border-0 bg-white/15 text-white backdrop-blur-sm"
            >
              {COMPANY.city}, {COMPANY.country}
            </Badge>
            <h1 className="text-balance text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-brand-100">
              {t("heroSubtitle")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => navigate("catalogue")}
                className="bg-white text-brand-800 hover:bg-brand-50"
              >
                {t("heroCta")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("contact")}
                className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                {t("heroCta2")}
              </Button>
            </div>

            {/* Trust row */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-brand-100">
              <span className="font-semibold uppercase tracking-wide text-brand-200">
                {lang === "ar" ? "علاماتنا الحصرية:" : "Nos marques exclusives :"}
              </span>
              {["Silver Fox", "ICANCLAVE", "OWANDY"].map((b) => (
                <span key={b} className="font-bold text-white">
                  {b}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mb-8 text-center text-2xl font-bold text-slate-900 sm:text-3xl"
          >
            {t("statsTitle")}
          </motion.h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <motion.div
                key={s.value}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Card className="h-full border-slate-200 bg-gradient-to-b from-brand-50/60 to-white text-center shadow-sm">
                  <CardContent className="p-6">
                    <div className="text-3xl font-extrabold text-brand-700 sm:text-4xl">
                      {s.value}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {s[lang]}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="bg-slate-50 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeader
            title={t("categoriesTitle")}
            actionLabel={t("viewAll")}
            onAction={() => navigate("catalogue")}
          />
          {loading ? (
            <CategoryGridSkeleton />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c, i) => {
                const Icon = ICONS[c.icon] || Package;
                return (
                  <motion.button
                    key={c.id}
                    onClick={() => navigate(`catalogue/${c.slug}`)}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={fadeUp}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="group text-start"
                  >
                    <Card className="h-full overflow-hidden border-slate-200 transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg">
                      <CardContent className="flex items-start gap-4 p-6">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-white">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-slate-900 group-hover:text-brand-700">
                            {c.name[lang]}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                            {c.description[lang]}
                          </p>
                          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                            {t("viewDetails")}
                            <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeader
            title={t("featuredTitle")}
            actionLabel={t("viewAll")}
            onAction={() => navigate("catalogue")}
          />
          {loading ? (
            <ProductGridSkeleton />
          ) : featured.length === 0 ? (
            <p className="text-center text-sm text-slate-500">{t("noProducts")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featured.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.1 }}
                  variants={fadeUp}
                  transition={{ duration: 0.4, delay: (i % 4) * 0.05 }}
                >
                  <ProductCard product={p} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* WHY US */}
      <section className="bg-slate-50 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeader title={t("whyUsTitle")} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {whyCards.map((w, i) => {
              const Icon = w.icon;
              return (
                <motion.div
                  key={w.titleKey}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  variants={fadeUp}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Card className="h-full border-slate-200 text-center shadow-sm">
                    <CardContent className="flex flex-col items-center p-6">
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                        <Icon className="h-7 w-7" />
                      </div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {t(w.titleKey as TKey)}
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">
                        {t(w.descKey as TKey)}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 to-brand-900 px-6 py-12 text-center sm:px-12 sm:py-16"
          >
            <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_80%_20%,white_0,transparent_40%)]" />
            <div className="relative">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                {t("ctaTitle")}
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-brand-100">
                {t("ctaSubtitle")}
              </p>
              <Button
                size="lg"
                onClick={() => navigate("contact")}
                className="mt-6 bg-white text-brand-800 hover:bg-brand-50"
              >
                {t("heroCta2")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* BLOG PREVIEW */}
      {latestPosts.length > 0 && (
        <section className="bg-slate-50 py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeader
              title={t("blogTitle")}
              actionLabel={t("viewAll")}
              onAction={() => navigate("blog")}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {latestPosts.map((post, i) => {
                const url = getBlogImageUrl(post.imageUrl);
                return (
                  <motion.button
                    key={post.id}
                    onClick={() => navigate(`blog/${post.slug}`)}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                    variants={fadeUp}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="group text-start"
                  >
                    <Card className="h-full overflow-hidden border-slate-200 transition-all hover:-translate-y-1 hover:shadow-lg">
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                        {post.imageUrl && url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={post.title[lang]}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50 text-brand-700">
                            <Stethoscope className="h-10 w-10 opacity-40" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-5">
                        <time className="text-xs text-slate-400">
                          {new Date(post.createdAt).toLocaleDateString(
                            lang === "ar" ? "ar-DZ" : "fr-FR",
                            { year: "numeric", month: "long", day: "numeric" }
                          )}
                        </time>
                        <h3 className="mt-1 line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-brand-700">
                          {post.title[lang]}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                          {post.excerpt[lang]}
                        </p>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                          {t("readMore")}
                          <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
                        </span>
                      </CardContent>
                    </Card>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* NEWSLETTER */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Newsletter />
        </div>
      </section>
    </div>
  );
}

/* ---------- Local helper components ---------- */

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
      {actionLabel && onAction && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAction}
          className="shrink-0 text-brand-700 hover:bg-brand-50"
        >
          {actionLabel}
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </Button>
      )}
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="overflow-hidden border-slate-200">
          <div className="aspect-[4/3] w-full animate-pulse bg-slate-100" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="border-slate-200">
          <div className="flex items-start gap-4 p-6">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
