"use client";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  MapPin,
  Clock,
  Wrench,
  Truck,
  ArrowRight,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import type { CityData } from "@/lib/cities-data";

export function VillesIndexClient({ cities }: { cities: CityData[] }) {
  const { t } = useTranslation();
  const directCities = cities.filter((c) => c.zone === "directe");
  const deliveryCities = cities.filter((c) => c.zone === "livraison");

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
            <span className="line-clamp-1 text-slate-700">Villes desservies</span>
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
            <MapPin className="mr-1 h-3 w-3" />
            {cities.length} villes desservies
          </Badge>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Matériel dentaire en Algérie par ville
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            OUADAH DENTAL GROUPE dessert toutes les wilayas d'Algérie depuis son
            siège d'Oran. <strong>Zone d'intervention directe</strong> : Oran et
            wilayas voisines (intervention SAV sous 48h). <strong>Zone de
            livraison</strong> : toutes les autres wilayas (livraison 3-7 jours,
            déplacement technicien pour installation).
          </p>
        </motion.div>

        {/* Zone directe */}
        {directCities.length > 0 && (
          <section className="mb-12">
            <div className="mb-6 flex items-center gap-2">
              <Wrench className="h-6 w-6 text-brand-700" />
              <h2 className="text-2xl font-bold text-slate-900">
                Zone d'intervention directe
              </h2>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                {directCities.length} villes
              </Badge>
            </div>
            <p className="mb-6 text-sm text-slate-600">
              Techniciens sur place, intervention SAV sous 48h, livraison le jour
              même pour Oran ville.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {directCities.map((city, i) => (
                <motion.div
                  key={city.slug}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4) }}
                >
                  <CityCard city={city} highlight />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Zone livraison */}
        <section>
          <div className="mb-6 flex items-center gap-2">
            <Truck className="h-6 w-6 text-brand-700" />
            <h2 className="text-2xl font-bold text-slate-900">
              Zone de livraison
            </h2>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {deliveryCities.length} villes
            </Badge>
          </div>
          <p className="mb-6 text-sm text-slate-600">
            Livraison par transporteurs spécialisés (3-7 jours), installation et
            formation par nos techniciens lors de déplacements programmés.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {deliveryCities.map((city, i) => (
              <motion.div
                key={city.slug}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
              >
                <CityCard city={city} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-14 rounded-xl bg-brand-50 p-8 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-brand-700" />
          <h2 className="mb-3 text-2xl font-bold text-slate-900">
            Votre ville n'est pas listée ?
          </h2>
          <p className="mb-6 mx-auto max-w-2xl text-slate-700">
            OUADAH DENTAL GROUPE livre dans toute l'Algérie, y compris les wilayas
            non listées ci-dessus. Contactez-nous pour étudier votre projet
            d'équipement dentaire.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" onClick={() => navigate("devis")}>
              Demander un devis
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

function CityCard({ city, highlight = false }: { city: CityData; highlight?: boolean }) {
  return (
    <Card
      className={
        "group h-full cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg " +
        (highlight
          ? "border-emerald-200 bg-emerald-50/30"
          : "border-slate-200")
      }
      onClick={() => navigate("villes/" + city.slug)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") navigate("villes/" + city.slug);
      }}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{city.name}</h3>
            {city.nameAr && (
              <p className="text-sm text-slate-500" dir="rtl">
                {city.nameAr}
              </p>
            )}
          </div>
          <ArrowRight className="h-5 w-5 text-brand-700 opacity-0 transition-opacity group-hover:opacity-100 rtl:rotate-180" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Wilaya {city.wilayaCode}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {city.interventionDelay}
          </div>
        </div>

        <div className="mt-3">
          {highlight ? (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              <Wrench className="mr-1 h-3 w-3" />
              Intervention directe
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              <Truck className="mr-1 h-3 w-3" />
              Livraison
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
