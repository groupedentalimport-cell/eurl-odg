"use client";
import { motion } from "framer-motion";
import { ChevronLeft, MapPin, Calendar, PackageSearch, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import type { BrandData } from "@/lib/brands-data";

export function MarquesIndexClient({ brands }: { brands: BrandData[] }) {
  const { t } = useTranslation();

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
            <span className="line-clamp-1 text-slate-700">Marques</span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-10 text-center"
        >
          <Badge variant="secondary" className="mb-3 bg-brand-50 text-brand-700">
            {brands.length} marques distribuées
          </Badge>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Nos marques de matériel dentaire
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            OUADAH DENTAL GROUPE distribue en Algérie les principales marques de
            matériel dentaire professionnel : fauteuils, autoclaves, radiologie,
            scanners intra-oraux. Installation, formation et SAV inclus.
          </p>
        </motion.div>

        {/* Grid of brands */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {brands.map((brand, i) => (
            <motion.div
              key={brand.slug}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.08, 0.4) }}
            >
              <Card
                className="group h-full cursor-pointer overflow-hidden border-slate-200 transition-all hover:-translate-y-1 hover:shadow-lg"
                onClick={() => navigate("marques/" + brand.slug)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate("marques/" + brand.slug);
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{brand.name}</h2>
                      {brand.nameAr && (
                        <p className="mt-1 text-sm text-slate-500">{brand.nameAr}</p>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-brand-700 opacity-0 transition-opacity group-hover:opacity-100 rtl:rotate-180" />
                  </div>

                  <p className="mt-3 text-sm text-slate-600">{brand.tagline}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {brand.country && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {brand.country}
                      </div>
                    )}
                    {brand.yearFounded && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Depuis {brand.yearFounded}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <PackageSearch className="h-3 w-3" />
                      {brand.categorySlugs.length} catégorie
                      {brand.categorySlugs.length > 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {brand.seoKeywords.slice(0, 3).map((kw) => (
                      <Badge key={kw} variant="outline" className="border-slate-200 text-slate-600">
                        {kw}
                      </Badge>
                    ))}
                  </div>

                  <Button variant="ghost" className="mt-4 -ml-2 px-2 text-brand-700">
                    Découvrir {brand.name}
                    <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <section className="mt-14 rounded-xl bg-brand-50 p-8 text-center">
          <h2 className="mb-3 text-2xl font-bold text-slate-900">
            Vous ne trouvez pas la marque que vous cherchez ?
          </h2>
          <p className="mb-6 mx-auto max-w-2xl text-slate-700">
            ODG peut importer d'autres marques sur demande (KaVo, Anthos, Stern Weber,
            KDC, etc.). Contactez-nous pour étudier votre projet.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" onClick={() => navigate("devis")}>
              Demander un devis personnalisé
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("contact")}>
              Nous contacter
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
