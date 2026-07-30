"use client";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  MapPin,
  Calendar,
  ShieldCheck,
  Wrench,
  Layers,
  Phone,
  Mail,
  PackageSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProductCard } from "@/components/dental/catalogue/ProductCard";
import { useTranslation } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { COMPANY } from "@/lib/types";
import type { BrandData } from "@/lib/brands-data";
import type { Product } from "@/lib/types";

function formatPrice(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => new Intl.NumberFormat("fr-DZ").format(n) + " DZD";
  if (min && max && min !== max) return fmt(min) + " – " + fmt(max);
  return fmt(min || max || 0);
}

function RichContent({ html }: { html: string }) {
  return (
    <div
      className="prose prose-sm max-w-none text-slate-700 [&_a]:font-medium [&_a]:text-brand-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-brand-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-900 [&_img]:rounded-lg [&_li]:ml-6 [&_li]:my-1 [&_li]:list-disc [&_ol>li]:list-decimal [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:my-3"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function BrandPage({
  brand,
  products,
}: {
  brand: BrandData;
  products: Product[];
}) {
  const { t } = useTranslation();

  // Stats
  const stats = {
    total: products.length,
    priceMin: Math.min(...products.map((p) => p.prixMin || Infinity).filter((n) => n !== Infinity)),
    priceMax: Math.max(...products.map((p) => p.prixMax || 0).filter((n) => n > 0)),
  };
  const priceRangeLabel = formatPrice(
    stats.priceMin !== Infinity ? stats.priceMin : null,
    stats.priceMax > 0 ? stats.priceMax : null
  );

  return (
    <div className="bg-slate-50">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <button onClick={() => navigate("")} className="hover:text-brand-700">
              {t("breadcrumbHome")}
            </button>
            <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
            <button onClick={() => navigate("marques")} className="hover:text-brand-700">
              Marques
            </button>
            <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
            <span className="line-clamp-1 text-slate-700">{brand.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Badge variant="secondary" className="mb-4 bg-white/20 text-white">
              <Layers className="mr-1 h-3 w-3" />
              Marque distribuée en Algérie
            </Badge>
            <h1 className="text-4xl font-bold sm:text-5xl">{brand.name}</h1>
            {brand.nameAr && (
              <p className="mt-2 text-xl text-white/80">{brand.nameAr}</p>
            )}
            <p className="mt-4 max-w-3xl text-lg text-white/90">{brand.tagline}</p>

            {/* Quick facts */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
              {brand.country && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>Origine : {brand.country}</span>
                </div>
              )}
              {brand.yearFounded && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>Fondée en {brand.yearFounded}</span>
                </div>
              )}
              {stats.total > 0 && (
                <div className="flex items-center gap-1.5">
                  <PackageSearch className="h-4 w-4" />
                  <span>
                    {stats.total} produit{stats.total > 1 ? "s" : ""} disponible
                    {stats.total > 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {priceRangeLabel && (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">À partir de {priceRangeLabel}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* LEFT — main content (2/3) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Présentation */}
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <h2 className="mb-4 text-2xl font-bold text-slate-900">Présentation</h2>
                <RichContent html={brand.presentation} />
              </CardContent>
            </Card>

            {/* Histoire */}
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <h2 className="mb-4 text-2xl font-bold text-slate-900">
                  Histoire de la marque
                </h2>
                <RichContent html={brand.histoire} />
              </CardContent>
            </Card>

            {/* Avantages */}
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-slate-900">
                  <ShieldCheck className="h-6 w-6 text-brand-700" />
                  Avantages
                </h2>
                <RichContent html={brand.avantages} />
              </CardContent>
            </Card>

            {/* Produits */}
            {products.length > 0 && (
              <div>
                <h2 className="mb-5 text-2xl font-bold text-slate-900">
                  Produits {brand.name} disponibles
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {products.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
                    >
                      <ProductCard product={p} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* SAV */}
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-slate-900">
                  <Wrench className="h-6 w-6 text-brand-700" />
                  Service après-vente en Algérie
                </h2>
                <RichContent html={brand.sav} />
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — sidebar (1/3) */}
          <aside className="space-y-6">
            {/* CTA */}
            <Card className="border-brand-200 bg-brand-50/50">
              <CardContent className="pt-6">
                <h3 className="mb-3 text-lg font-bold text-slate-900">
                  Demandez un devis
                </h3>
                <p className="mb-4 text-sm text-slate-600">
                  Notre équipe vous conseille sur le choix du matériel {brand.name}{" "}
                  adapté à votre cabinet. Réponse sous 24h ouvrées.
                </p>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => navigate("devis")} className="w-full">
                    Demander un devis
                  </Button>
                  <Button variant="outline" onClick={() => navigate("contact")} className="w-full">
                    Nous contacter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Contact direct */}
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <h3 className="mb-4 text-lg font-bold text-slate-900">Contact direct</h3>
                <div className="space-y-3 text-sm">
                  <a
                    href={"tel:" + COMPANY.phone.replace(/\s/g, "")}
                    className="flex items-center gap-2 text-slate-700 hover:text-brand-700"
                  >
                    <Phone className="h-4 w-4 text-brand-700" />
                    {COMPANY.phone}
                  </a>
                  <a
                    href={"tel:" + COMPANY.phone2.replace(/\s/g, "")}
                    className="flex items-center gap-2 text-slate-700 hover:text-brand-700"
                  >
                    <Phone className="h-4 w-4 text-brand-700" />
                    {COMPANY.phone2}
                  </a>
                  <a
                    href={"mailto:" + COMPANY.email}
                    className="flex items-center gap-2 text-slate-700 hover:text-brand-700"
                  >
                    <Mail className="h-4 w-4 text-brand-700" />
                    {COMPANY.email}
                  </a>
                  <div className="flex items-start gap-2 text-slate-700">
                    <MapPin className="mt-0.5 h-4 w-4 text-brand-700" />
                    <span>
                      {COMPANY.address.fr}
                      <br />
                      {COMPANY.city}, {COMPANY.country}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Autres marques */}
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <h3 className="mb-4 text-lg font-bold text-slate-900">Autres marques</h3>
                <p className="mb-4 text-sm text-slate-600">
                  Découvrez les autres marques distribuées par OUADAH DENTAL GROUPE.
                </p>
                <Button variant="ghost" onClick={() => navigate("marques")} className="w-full">
                  Toutes les marques
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>

        {/* sr-only block for AI crawlers */}
        <section
          className="sr-only"
          aria-label={"Description de la marque " + brand.name}
        >
          <h2>{brand.name} — distributeur officiel en Algérie</h2>
          <p>
            {brand.name} ({brand.nameAr || ""}) est une marque de matériel dentaire
            distribuée en Algérie par {COMPANY.name}. Origine : {brand.country}.
            {brand.yearFounded ? "Fondée en " + brand.yearFounded + "." : ""}
          </p>
          <p>
            {brand.tagline}. {stats.total} produit
            {stats.total > 1 ? "s" : ""} disponible{stats.total > 1 ? "s" : ""} :{" "}
            {products.map((p) => p.name.fr + " (" + p.brand + " " + p.model + ")").join(", ")}.
          </p>
          <p>
            Services inclus : installation, formation, maintenance préventive et
            curative. Garantie fabricant 2 ans (sauf indications contraires).
            Livraison dans toute l'Algérie, SAV basé à {COMPANY.city}.
          </p>
          <p>
            Pour un devis personnalisé sur un produit {brand.name}, contactez{" "}
            {COMPANY.name} au {COMPANY.phone} ou par email à {COMPANY.email}.
          </p>
        </section>
      </div>
    </div>
  );
}
