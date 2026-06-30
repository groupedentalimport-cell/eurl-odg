"use client";
import { motion } from "framer-motion";
import { ChevronRight, ArrowLeft, FileText, Building2, User, Server, ShieldAlert, Link2, Gavel, Scale } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useCompanyInfo } from "@/lib/settings-service";
import { navigate } from "@/lib/router";
import { COMPANY } from "@/lib/types";

/**
 * Mentions légales — EURL OUADAH DENTAL GROUPE
 * Page statique conforme au droit algérien (identification éditeur / hébergeur).
 * Le texte corporel est en français (langue principale du site).
 * Les titres de sections passent par useTranslation() (FR / AR).
 */
export function MentionsLegales() {
  const { lang, t } = useTranslation();
  const company = useCompanyInfo();
  const lastUpdate = new Date().toLocaleDateString("fr-DZ", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const companyName = lang === "ar" ? company.nameAr : company.name;
  const address = company.address[lang] || COMPANY.address.fr;
  const phone = company.phone || COMPANY.phone;
  const email = company.email || COMPANY.email;
  const city = company.city || COMPANY.city;
  const country = company.country || COMPANY.country;

  const sections = [
    {
      id: "editeur",
      icon: Building2,
      title: t("mlSectionEditor"),
      body: (
        <div className="space-y-2">
          <p>
            Le présent site est édité par <strong>EURL {companyName}</strong>,
            société de droit algérien, spécialisée dans l'importation et la
            distribution de matériel et équipements dentaires.
          </p>
          <ul className="ml-1 space-y-1">
            <li>
              <span className="font-semibold">Dénomination sociale :</span> EURL {companyName}
            </li>
            <li>
              <span className="font-semibold">Forme juridique :</span> EURL
              (Entreprise Unipersonnelle à Responsabilité Limitée)
            </li>
            <li>
              <span className="font-semibold">Siège social :</span> {address}, {city}, {country}
            </li>
            <li>
              <span className="font-semibold">Téléphone :</span>{" "}
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="text-brand-700 underline-offset-2 hover:underline">
                {phone}
              </a>
            </li>
            <li>
              <span className="font-semibold">Email :</span>{" "}
              <a href={`mailto:${email}`} className="text-brand-700 underline-offset-2 hover:underline">
                {email}
              </a>
            </li>
            <li>
              <span className="font-semibold">N° d'immatriculation RCCM :</span>{" "}
              RCCM Oran — <em>[à compléter]</em>
            </li>
            <li>
              <span className="font-semibold">N° d'article fiscal (NIF) :</span>{" "}
              <em>[à compléter]</em>
            </li>
            <li>
              <span className="font-semibold">Capital social :</span>{" "}
              <em>[à compléter]</em>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "publication",
      icon: User,
      title: t("mlSectionPublication"),
      body: (
        <p>
          Le responsable de la publication est le gérant de l'EURL {companyName},
          à savoir <em>M. [Nom du gérant — à compléter]</em>. Il assume la
          pleine responsabilité du contenu publié sur ce site, conformément à
          la législation algérienne en vigueur.
        </p>
      ),
    },
    {
      id: "hebergement",
      icon: Server,
      title: t("mlSectionHost"),
      body: (
        <div className="space-y-2">
          <p>
            Le site est hébergé par la société <strong>Vercel Inc.</strong>,
            fournisseur d'infrastructure cloud assurant la distribution du
            contenu à l'échelle internationale.
          </p>
          <ul className="ml-1 space-y-1">
            <li>
              <span className="font-semibold">Hébergeur :</span> Vercel Inc.
            </li>
            <li>
              <span className="font-semibold">Adresse :</span> 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
            </li>
            <li>
              <span className="font-semibold">Site web :</span>{" "}
              <a
                href="https://vercel.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 underline-offset-2 hover:underline"
              >
                https://vercel.com
              </a>
            </li>
          </ul>
          <p className="text-sm text-slate-500">
            Les données techniques (logs, adresses IP) peuvent être traitées par
            l'hébergeur dans le cadre de ses obligations opérationnelles, dans
            le respect de sa propre politique de confidentialité.
          </p>
        </div>
      ),
    },
    {
      id: "propriete-intellectuelle",
      icon: FileText,
      title: t("mlSectionIP"),
      body: (
        <div className="space-y-2">
          <p>
            L'ensemble des contenus présents sur ce site — incluant, sans s'y
            limiter, les textes, graphismes, images, photographies, logos,
            icônes, sons, logiciels et éléments de mise en page — est la
            propriété exclusive d'<strong>EURL {companyName}</strong>, sauf
            mention contraire, et est protégé par la législation algérienne et
            internationale relative à la propriété intellectuelle (loi n° 03-44
            du 19 juillet 2003 relative à la propriété artistique et littéraire
            et loi n° 03-05 du 19 juillet 2003 relative aux marques).
          </p>
          <p>
            Toute reproduction, représentation, modification, publication,
            adaptation, totale ou partielle, des éléments du site, quel que
            soit le moyen ou le procédé utilisé, est interdite sans
            autorisation écrite préalable d'EURL {companyName}. Toute
            exploitation non autorisée du site ou de l'un quelconque de ses
            éléments sera considérée comme constitutive d'une contrefaçon et
            poursuivie conformément aux dispositions des articles 7 et suivants
            du code pénal algérien.
          </p>
          <p>
            Les marques <em>Silver Fox</em>, <em>ICANCLAVE</em> et <em>OWANDY</em>,
            ainsi que leurs logos respectifs, sont la propriété de leurs
            détenteurs légaux. Leur utilisation sur ce site est effectuée à
            titre informatif, dans le cadre du mandat d'importateur exclusif
            détenu par {companyName} pour le territoire algérien.
          </p>
        </div>
      ),
    },
    {
      id: "responsabilite",
      icon: ShieldAlert,
      title: t("mlSectionLiability"),
      body: (
        <div className="space-y-2">
          <p>
            Les informations diffusées sur ce site sont présentées à titre
            indicatif et général. Bien qu'EURL {companyName} s'efforce de
            fournir des informations exactes, complètes et à jour, elle ne
            saurait être tenue responsable des éventuelles erreurs, omissions
            ou imprécisions qui pourraient s'y trouver, ni d'un éventuel
            dysfonctionnement ou d'indisponibilité du site.
          </p>
          <p>
            {companyName} décline toute responsabilité quant aux dommages
            directs ou indirects, matériels ou immatériels, résultant de
            l'accès au site, de son utilisation ou de l'impossibilité d'y
            accéder, notamment en cas d'interruption pour maintenance ou
            défaillance technique. L'utilisateur reconnaît utiliser le site
            sous sa propre responsabilité.
          </p>
          <p>
            Les caractéristiques techniques, prix et disponibilités des
            produits présentés peuvent faire l'objet de modifications à tout
            moment sans préavis. Seuls les devis officiellement émis par
            {companyName} engagent contractuellement la société.
          </p>
        </div>
      ),
    },
    {
      id: "liens-hypertextes",
      icon: Link2,
      title: t("mlSectionLinks"),
      body: (
        <div className="space-y-2">
          <p>
            Le site peut contenir des liens hypertextes vers des sites tiers
            (réseaux sociaux, sites de marques partenaires, ressources externes).
            Ces liens sont fournis exclusivement pour la commodité de
            l'utilisateur.
          </p>
          <p>
            EURL {companyName} n'exerce aucun contrôle sur le contenu de ces
            sites externes et décline toute responsabilité quant à leur
            contenu, leur disponibilité, leur politique de confidentialité ou
            leurs pratiques. L'activation de ces liens se fait sous la seule
            responsabilité de l'utilisateur.
          </p>
          <p>
            La création de liens hypertextes pointant vers le présent site
            depuis un site tiers est autorisée sous réserve d'obtenir une
            autorisation préalable écrite d'EURL {companyName} et de ne pas
            porter atteinte à ses intérêts légitimes.
          </p>
        </div>
      ),
    },
    {
      id: "droit-applicable",
      icon: Scale,
      title: t("mlSectionLaw"),
      body: (
        <div className="space-y-2">
          <p>
            Les présentes mentions légales sont régies par le droit algérien.
          </p>
          <p>
            En cas de litige relatif à l'interprétation, l'exécution ou la
            violation des présentes, et à défaut de résolution amiable, les
            tribunaux algériens seront seuls compétents. Le tribunal
            territorialement compétent est celui du ressort d'
            <strong>Oran</strong>, lieu du siège social d'EURL {companyName}.
          </p>
          <p>
            La loi n° 18-07 du 10 juin 2018 relative à la protection des
            personnes physiques dans le traitement des données à caractère
            personnel est applicable au traitement des données effectuées via
            ce site ; les modalités en sont détaillées dans notre{" "}
            <button
              onClick={() => navigate("confidentialite")}
              className="text-brand-700 underline-offset-2 hover:underline"
            >
              Politique de confidentialité
            </button>
            .
          </p>
        </div>
      ),
    },
  ];

  return (
    <article className="bg-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 to-brand-950 text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Breadcrumb */}
            <nav
              aria-label="breadcrumb"
              className="mb-6 flex flex-wrap items-center gap-1 text-xs text-brand-100"
            >
              <button
                onClick={() => navigate("home")}
                className="hover:text-white hover:underline"
              >
                {t("legalBreadcrumbHome")}
              </button>
              <ChevronRight className="h-3 w-3 rtl:rotate-180" aria-hidden />
              <span className="font-semibold text-white">{t("mlTitle")}</span>
            </nav>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <Gavel className="h-6 w-6" aria-hidden />
              </div>
              <h1 className="text-3xl font-bold sm:text-4xl">{t("mlTitle")}</h1>
            </div>

            <p className="mt-4 max-w-2xl text-sm text-brand-100">
              {companyName} — {address}, {city}, {country}
            </p>
            <p className="mt-1 text-xs text-brand-200">
              {t("legalLastUpdate")} : {lastUpdate}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="prose prose-sm max-w-none rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10"
        >
          <p className="lead mb-8 text-slate-600">
            Conformément aux dispositions de la loi n° 18-07 du 10 juin 2018
            relative à la protection des données personnelles et du code de
            commerce algérien, les présentes mentions légales définissent les
            conditions d'utilisation du site internet d'EURL {companyName}.
          </p>

          <ol className="space-y-8">
            {sections.map((s, idx) => {
              const Icon = s.icon;
              return (
                <li key={s.id} id={s.id} className="scroll-mt-24">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {idx + 1}
                    </span>
                    <Icon className="h-5 w-5 text-brand-700" aria-hidden />
                    {s.title}
                  </h2>
                  <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
                    {s.body}
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Back to home */}
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
            <button
              onClick={() => navigate("home")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
              {t("legalBackHome")}
            </button>
            <button
              onClick={() => navigate("confidentialite")}
              className="text-sm font-medium text-slate-500 hover:text-brand-700 hover:underline"
            >
              {t("privacyPolicy")} →
            </button>
          </div>
        </motion.div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {companyName}. {t("rights")}
        </p>
      </section>
    </article>
  );
}

export default MentionsLegales;
