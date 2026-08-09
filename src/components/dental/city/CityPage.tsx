"use client";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  MapPin,
  Clock,
  Truck,
  Phone,
  Mail,
  Wrench,
  ShieldCheck,
  Package,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { COMPANY } from "@/lib/types";
import type { CityData } from "@/lib/cities-data";

function RichContent({ html }: { html: string }) {
  return (
    <div
      className="prose prose-sm max-w-none text-slate-700 [&_a]:font-medium [&_a]:text-brand-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-brand-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-900 [&_img]:rounded-lg [&_li]:ml-6 [&_li]:my-1 [&_li]:list-disc [&_ol>li]:list-decimal [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:my-3"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function CityPage({ city }: { city: CityData }) {
  const { t } = useTranslation();
  const isDirect = city.zone === "directe";

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
            <button onClick={() => navigate("villes")} className="hover:text-brand-700">
              Villes desservies
            </button>
            <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
            <span className="line-clamp-1 text-slate-700">{city.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div
        className={
          isDirect
            ? "bg-gradient-to-br from-brand-700 to-brand-900 text-white"
            : "bg-gradient-to-br from-slate-700 to-slate-900 text-white"
        }
      >
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge
                variant="secondary"
                className={
                  isDirect
                    ? "bg-white/20 text-white"
                    : "bg-white/15 text-white"
                }
              >
                <MapPin className="mr-1 h-3 w-3" />
                Wilaya {city.wilayaCode} — {city.wilaya}
              </Badge>
              {isDirect ? (
                <Badge variant="secondary" className="bg-emerald-400/20 text-emerald-100">
                  <Wrench className="mr-1 h-3 w-3" />
                  Zone d'intervention directe
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-blue-400/20 text-blue-100">
                  <Truck className="mr-1 h-3 w-3" />
                  Zone de livraison
                </Badge>
              )}
            </div>

            <h1 className="text-4xl font-bold sm:text-5xl">
              Matériel dentaire à {city.name}
            </h1>
            {city.nameAr && (
              <p className="mt-2 text-xl text-white/80">{city.nameAr}</p>
            )}
            <p className="mt-4 max-w-3xl text-lg text-white/90">
              {isDirect
                ? `OUADAH DENTAL GROUPE intervient directement à ${city.name} depuis son siège d'Oran. Installation, formation et SAV sous ${city.interventionDelay}.`
                : `OUADAH DENTAL GROUPE livre et installe du matériel dentaire à ${city.name}. Délai de livraison : ${city.deliveryDelay}. Installation et formation par nos techniciens.`}
            </p>

            {/* Quick facts */}
            <div className="mt-6 flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <div>
                  <div className="text-xs uppercase tracking-wide text-white/60">
                    Intervention
                  </div>
                  <div className="font-semibold">{city.interventionDelay}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                <div>
                  <div className="text-xs uppercase tracking-wide text-white/60">
                    Livraison
                  </div>
                  <div className="font-semibold">{city.deliveryDelay}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <div>
                  <div className="text-xs uppercase tracking-wide text-white/60">
                    Population
                  </div>
                  <div className="font-semibold">{city.population}</div>
                </div>
              </div>
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
                <h2 className="mb-4 text-2xl font-bold text-slate-900">
                  Matériel dentaire à {city.name}
                </h2>
                <RichContent html={city.presentation} />
              </CardContent>
            </Card>

            {/* Zone de couverture */}
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-slate-900">
                  <MapPin className="h-6 w-6 text-brand-700" />
                  Zone desservie
                </h2>
                <RichContent html={city.zoneCouverture} />
              </CardContent>
            </Card>

            {/* Produits disponibles */}
            <div>
              <h2 className="mb-5 text-2xl font-bold text-slate-900">
                Produits disponibles à {city.name}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: Package,
                    title: "Fauteuils dentaires Silver Fox",
                    desc: "Modèles basique, classique, Pro 8000C et Implant. Installation et formation incluses.",
                    cat: "fauteuil-dentaire",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Autoclaves ICANCLAVE classe B",
                    desc: "Modèles 18L et 45L, conformes à la norme EN 13060. Cycle prion, traçabilité USB.",
                    cat: "sterilisation",
                  },
                  {
                    icon: Package,
                    title: "Radiologie OWANDY",
                    desc: "Radio mural standard et nouvelle génération DC, capteurs intra-oraux, panoramique 3D.",
                    cat: "radiologie",
                  },
                  {
                    icon: Package,
                    title: "Scanners intra-oraux Launca",
                    desc: "Empreinte numérique sans pâte, précision 20 microns. Idéal implantologie et aligneurs.",
                    cat: "radiologie",
                  },
                ].map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
                  >
                    <Card
                      className="group h-full cursor-pointer border-slate-200 transition-all hover:-translate-y-1 hover:shadow-md"
                      onClick={() => navigate("categorie/" + p.cat)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") navigate("categorie/" + p.cat);
                      }}
                    >
                      <CardContent className="p-5">
                        <div className="mb-2 flex items-center gap-2">
                          <p.icon className="h-5 w-5 text-brand-700" />
                          <h3 className="font-bold text-slate-900">{p.title}</h3>
                        </div>
                        <p className="text-sm text-slate-600">{p.desc}</p>
                        <div className="mt-3 flex items-center gap-1 text-sm font-medium text-brand-700">
                          Voir les produits
                          <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Services */}
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-slate-900">
                  <Wrench className="h-6 w-6 text-brand-700" />
                  Services à {city.name}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-900">Vente et installation</h3>
                    <p className="text-sm text-slate-600">
                      Livraison et mise en service à {city.name} par nos techniciens.
                      Installation incluse pour les fauteuils, autoclaves et équipements de radiologie.
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-900">Formation</h3>
                    <p className="text-sm text-slate-600">
                      Formation à l'utilisation incluse à chaque achat (2h à 1 journée selon l'équipement).
                      Bénéficiaires : praticien et assistant.
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-900">Maintenance</h3>
                    <p className="text-sm text-slate-600">
                      {isDirect
                        ? `Maintenance préventive et curative avec technicien sur place à ${city.name}. Intervention sous ${city.interventionDelay}.`
                        : `Maintenance par nos techniciens lors de déplacements programmés à ${city.name}. Délai : ${city.interventionDelay}.`}
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-900">Garantie</h3>
                    <p className="text-sm text-slate-600">
                      2 ans pièces et main-d'œuvre sur fauteuils, autoclaves, radiologie.
                      1 an sur scanners. Extension via contrat de maintenance.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — sidebar (1/3) */}
          <aside className="space-y-6">
            {/* CTA devis */}
            <Card className="border-brand-200 bg-brand-50/50">
              <CardContent className="pt-6">
                <h3 className="mb-3 text-lg font-bold text-slate-900">
                  Devis personnalisé à {city.name}
                </h3>
                <p className="mb-4 text-sm text-slate-600">
                  Recevez un devis sous 24h ouvrées pour l'équipement de votre cabinet dentaire à {city.name}.
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
                <h3 className="mb-4 text-lg font-bold text-slate-900">
                  Contact {isDirect ? "direct" : "ODG"}
                </h3>
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

            {/* Autres villes */}
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <h3 className="mb-4 text-lg font-bold text-slate-900">
                  Autres villes desservies
                </h3>
                <p className="mb-4 text-sm text-slate-600">
                  ODG dessert toutes les wilayas d'Algérie. Découvrez votre ville.
                </p>
                <Button variant="ghost" onClick={() => navigate("villes")} className="w-full">
                  Toutes les villes
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>

        {/* sr-only block for AI crawlers */}
        <section
          className="sr-only"
          aria-label={"Description du service à " + city.name}
        >
          <h2>Matériel dentaire à {city.name} — OUADAH DENTAL GROUPE</h2>
          <p>
            OUADAH DENTAL GROUPE distribue du matériel dentaire à {city.name} (wilaya de {city.wilaya}, code {city.wilayaCode}).
            {isDirect
              ? " " + city.name + " est en zone d'intervention directe depuis Oran."
              : " " + city.name + " est en zone de livraison avec déplacement de techniciens."}
            Délai d'intervention : {city.interventionDelay}. Délai de livraison : {city.deliveryDelay}.
          </p>
          <p>
            Produits distribués à {city.name} : fauteuils dentaires Silver Fox (basique, classique, Pro 8000C, Implant),
            autoclaves ICANCLAVE classe B (18L et 45L, norme EN 13060),
            radiologie OWANDY (radio mural, capteur intra-oral, panoramique 3D),
            scanners intra-oraux Launca (empreinte numérique, précision 20 microns).
          </p>
          <p>
            Services à {city.name} : vente, installation, formation du praticien et de son assistant,
            maintenance préventive et curative, garantie 2 ans pièces et main-d'œuvre.
            Financement échelonné disponible. Devis personnalisé sous 24h ouvrées.
          </p>
          <p>
            Contact : {COMPANY.name}, téléphone {COMPANY.phone}, email {COMPANY.email},
            adresse {COMPANY.address.fr}, {COMPANY.city}, {COMPANY.country}.
          </p>
        </section>
      </div>
    </div>
  );
}
