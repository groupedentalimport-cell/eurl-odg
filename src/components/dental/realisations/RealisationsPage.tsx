"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ImageLightbox,
  type LightboxImage,
} from "@/components/dental/ui/ImageLightbox";
import { useTranslation } from "@/lib/i18n";
import { navigate } from "@/lib/router";

// ============================================================
// RealisationsPage (Task REVIEWS-1)
// ------------------------------------------------------------
// Public gallery of dental cabinets equipped by ODG across
// Algeria. The photos are placeholder images for now (we don't
// have real ones yet) — they can be replaced with real project
// photos once the marketing team provides them.
// ============================================================

interface Realisation {
  id: string;
  name: string;
  wilaya: string;
  // Bilingual cabinet name + caption
  caption: { fr: string; ar: string };
  products: string[];
  imageUrl: string;
}

// Sample list — these are illustrative projects. Replace with
// real project photos when available.
const REALISATIONS: Realisation[] = [
  {
    id: "r1",
    name: "Cabinet Dr. Benali",
    wilaya: "Oran",
    caption: {
      fr: "Cabinet dentaire équipé d'un fauteuil Silver Fox 8000C.",
      ar: "عيادة أسنان مجهزة بكرسي Silver Fox 8000C.",
    },
    products: ["Silver Fox 8000C", "ICANCLAVE Class B"],
    imageUrl:
      "https://placehold.co/600x400/0f766e/ffffff?text=Cabinet+dentaire+%C3%A9quip%C3%A9+par+ODG",
  },
  {
    id: "r2",
    name: "Clinique El Houria",
    wilaya: "Alger",
    caption: {
      fr: "Bloc de stérilisation complet avec autoclave ICANCLAVE.",
      ar: "قسم تعقيم كامل مع جهاز ICANCLAVE.",
    },
    products: ["ICANCLAVE Class B", "OWANDY Radio"],
    imageUrl:
      "https://placehold.co/600x400/0f766e/ffffff?text=St%C3%A9rilisation+%C3%A9quip%C3%A9e+par+ODG",
  },
  {
    id: "r3",
    name: "Cabinet Dr. Cherif",
    wilaya: "Oran",
    caption: {
      fr: "Salle de radiologie numérique équipée d'OWANDY.",
      ar: "قاعة أشعة رقمية مجهزة بـ OWANDY.",
    },
    products: ["OWANDY Radio", "Silver Fox 6000"],
    imageUrl:
      "https://placehold.co/600x400/0f766e/ffffff?text=Radiologie+OWANDY+par+ODG",
  },
  {
    id: "r4",
    name: "Centre dentaire Sénia",
    wilaya: "Sénia",
    caption: {
      fr: "Quatre fauteuils Silver Fox installés et mis en service.",
      ar: "أربعة كراسي Silver Fox مركبة ومشغّلة.",
    },
    products: ["Silver Fox 8000C x4", "ICANCLAVE Class B"],
    imageUrl:
      "https://placehold.co/600x400/0f766e/ffffff?text=Centre+dentaire+par+ODG",
  },
  {
    id: "r5",
    name: "Cabinet Dr. Mansouri",
    wilaya: "Sénia",
    caption: {
      fr: "Équipement complet d'un cabinet de 3 unités.",
      ar: "تجهيز كامل لعيادة من 3 وحدات.",
    },
    products: ["Silver Fox 6000 x3", "OWANDY Radio", "ICANCLAVE"],
    imageUrl:
      "https://placehold.co/600x400/0f766e/ffffff?text=Cabinet+3+unit%C3%A9s+par+ODG",
  },
  {
    id: "r6",
    name: "Clinique Ibn Sina",
    wilaya: "Oran",
    caption: {
      fr: "Salle de soins équipée de fauteuils Silver Fox et d'un système de radiologie OWANDY.",
      ar: "قاعة علاج مجهزة بكراسي Silver Fox ونظام أشعة OWANDY.",
    },
    products: ["Silver Fox 8000C x2", "OWANDY Radio"],
    imageUrl:
      "https://placehold.co/600x400/0f766e/ffffff?text=Clinique+Ibn+Sina+par+ODG",
  },
  {
    id: "r7",
    name: "Cabinet Dr. Saïdi",
    wilaya: "Alger",
    caption: {
      fr: "Installation complète d'un cabinet moderne avec formation du personnel.",
      ar: "تركيب كامل لعيادة حديثة مع تكوين الموظفين.",
    },
    products: ["Silver Fox 6000", "ICANCLAVE Class B", "OWANDY Radio"],
    imageUrl:
      "https://placehold.co/600x400/0f766e/ffffff?text=Cabinet+moderne+par+ODG",
  },
  {
    id: "r8",
    name: "Centre dentaire Es-Senia",
    wilaya: "Sénia",
    caption: {
      fr: "Équipement de 6 fauteuils et d'un bloc de stérilisation centralisé.",
      ar: "تجهيز 6 كراسي وقسم تعقيم مركزي.",
    },
    products: ["Silver Fox 8000C x6", "ICANCLAVE Class B x2"],
    imageUrl:
      "https://placehold.co/600x400/0f766e/ffffff?text=Centre+6+fauteuils+par+ODG",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function RealisationsPage() {
  const { t, lang } = useTranslation();
  const [wilayaFilter, setWilayaFilter] = useState<string>("all");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Unique sorted list of wilayas for the filter dropdown.
  const wilayas = useMemo(() => {
    const set = new Set<string>();
    REALISATIONS.forEach((r) => set.add(r.wilaya));
    return Array.from(set).sort();
  }, []);

  const filtered = useMemo(() => {
    if (wilayaFilter === "all") return REALISATIONS;
    return REALISATIONS.filter((r) => r.wilaya === wilayaFilter);
  }, [wilayaFilter]);

  // Build the lightbox images array (only for the currently filtered set).
  const lightboxImages: LightboxImage[] = useMemo(
    () =>
      filtered.map((r) => ({
        url: r.imageUrl,
        filename: r.name,
        alt: `${r.name} — ${r.wilaya}`,
      })),
    [filtered, lang]
  );

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="flex flex-col">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-4 bg-white/20 text-white">
              {t("realisationsTitle")}
            </Badge>
            <h1 className="text-4xl font-bold sm:text-5xl">
              {t("realisationsTitle")}
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-brand-100">
              {t("realisationsSubtitle")}
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-brand-200">
              {t("realisationsGalleryIntro")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* GALLERY + FILTER */}
      <section className="bg-slate-50 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Filter row */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            transition={{ duration: 0.4 }}
            className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
          >
            <div>
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                {t("realisationsTitle")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {filtered.length} {t("productsCount").toLowerCase()}
              </p>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <label
                htmlFor="wilaya-filter"
                className="shrink-0 text-sm font-medium text-slate-600"
              >
                {t("wilaya")} :
              </label>
              <Select value={wilayaFilter} onValueChange={setWilayaFilter}>
                <SelectTrigger
                  id="wilaya-filter"
                  className="w-full bg-white sm:w-56"
                  aria-label={t("wilaya")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("realisationsFilterAll")}
                  </SelectItem>
                  {wilayas.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Gallery grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <ImageIcon className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">{t("noProducts")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r, i) => (
                <motion.button
                  key={r.id}
                  type="button"
                  onClick={() => openLightbox(i)}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.1 }}
                  variants={fadeUp}
                  transition={{ duration: 0.4, delay: (i % 6) * 0.05 }}
                  className="group h-full text-start"
                  aria-label={`${t("realisationsViewProject")} : ${r.name}`}
                >
                  <Card className="h-full overflow-hidden border-slate-200 transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg">
                    {/* Image */}
                    <div className="relative aspect-[3/2] w-full overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.imageUrl}
                        alt={`${r.name} — ${r.wilaya}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-white">
                          <MapPin className="h-3.5 w-3.5 text-brand-300" />
                          <span>{r.wilaya}</span>
                        </div>
                      </div>
                    </div>

                    {/* Caption */}
                    <CardContent className="p-5">
                      <h3 className="text-base font-semibold text-slate-900 group-hover:text-brand-700">
                        {r.name}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
                        {r.caption[lang] || r.caption.fr}
                      </p>

                      {/* Products installed */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {r.products.map((p) => (
                          <Badge
                            key={p}
                            variant="secondary"
                            className="bg-brand-50 text-xs font-normal text-brand-700"
                          >
                            {p}
                          </Badge>
                        ))}
                      </div>

                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                        {t("realisationsViewProject")}
                        <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                      </span>
                    </CardContent>
                  </Card>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 to-brand-900 px-6 py-12 text-center sm:px-12 sm:py-16"
          >
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 80% 20%, white 0, transparent 40%)",
              }}
              aria-hidden
            />
            <div className="relative">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                {t("equipYourCabinet")}
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-brand-100">
                {t("ctaSubtitle")}
              </p>
              <Button
                size="lg"
                onClick={() => navigate("devis")}
                className="mt-6 bg-white text-brand-800 hover:bg-brand-50"
              >
                {t("requestQuote")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </div>
  );
}

export default RealisationsPage;
