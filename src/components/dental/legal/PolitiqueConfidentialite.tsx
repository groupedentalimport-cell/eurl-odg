"use client";
import { motion } from "framer-motion";
import {
  ChevronRight,
  ArrowLeft,
  Building2,
  Database,
  Target,
  Scale,
  Clock,
  Users,
  Globe,
  ShieldCheck,
  UserCheck,
  Cookie,
  FileEdit,
  Lock,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useCompanyInfo } from "@/lib/settings-service";
import { navigate } from "@/lib/router";
import { COMPANY } from "@/lib/types";

/**
 * Politique de confidentialité — EURL OUADAH DENTAL GROUPE
 * Alignée sur la loi algérienne n° 18-07 du 10 juin 2018 relative à la
 * protection des personnes physiques dans le traitement des données à
 * caractère personnel. Le texte corporel est en français ; les titres de
 * sections passent par useTranslation() (FR / AR).
 */
export function PolitiqueConfidentialite() {
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
      id: "responsable",
      icon: Building2,
      title: t("pcSectionController"),
      body: (
        <div className="space-y-2">
          <p>
            Conformément à l'article 2 de la loi n° 18-07 du 10 juin 2018
            relative à la protection des personnes physiques dans le traitement
            des données à caractère personnel, le responsable du traitement des
            données collectées via ce site est :
          </p>
          <ul className="ml-1 space-y-1">
            <li><span className="font-semibold">Société :</span> EURL {companyName}</li>
            <li><span className="font-semibold">Adresse :</span> {address}, {city}, {country}</li>
            <li>
              <span className="font-semibold">Email :</span>{" "}
              <a href={`mailto:${email}`} className="text-brand-700 underline-offset-2 hover:underline">{email}</a>
            </li>
            <li>
              <span className="font-semibold">Téléphone :</span>{" "}
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="text-brand-700 underline-offset-2 hover:underline">{phone}</a>
            </li>
          </ul>
          <p>
            Pour toute question relative à la protection de vos données, vous
            pouvez nous contacter à l'adresse ci-dessus en indiquant
            « Protection des données » dans l'objet du message.
          </p>
        </div>
      ),
    },
    {
      id: "donnees",
      icon: Database,
      title: t("pcSectionData"),
      body: (
        <div className="space-y-3">
          <p>Le site collecte les catégories de données suivantes :</p>
          <ul className="ml-1 space-y-2">
            <li>
              <span className="font-semibold">Formulaire de contact :</span> nom,
              prénom, adresse e-mail, numéro de téléphone, message saisie par
              l'utilisateur.
            </li>
            <li>
              <span className="font-semibold">Demande de devis :</span> nom,
              e-mail, téléphone, wilaya, type de client (dentiste, clinique,
              hôpital, revendeur, autre) et produits sélectionnés.
            </li>
            <li>
              <span className="font-semibold">Inscription à la newsletter :</span>{" "}
              adresse e-mail uniquement.
            </li>
            <li>
              <span className="font-semibold">Données techniques / cookies :</span>{" "}
              cookie de session administrateur (httpOnly), préférence de langue
              (stockée en localStorage côté navigateur).
            </li>
          </ul>
          <p className="text-sm text-slate-500">
            Aucune donnée sensible (origine raciale, opinions politiques,
            croyances religieuses, santé, etc.) n'est collectée via ce site.
          </p>
        </div>
      ),
    },
    {
      id: "finalites",
      icon: Target,
      title: t("pcSectionPurpose"),
      body: (
        <div className="space-y-2">
          <p>Les données collectées sont traitées aux finalités suivantes :</p>
          <ul className="ml-1 space-y-1">
            <li>Répondre aux demandes d'information envoyées via le formulaire de contact ;</li>
            <li>Préparer et transmettre des devis pour les équipements dentaires ;</li>
            <li>Assurer le service après-vente (SAV), la maintenance et le suivi des garanties ;</li>
            <li>
              Envoyer la newsletter aux utilisateurs ayant expressément
              consenti à la recevoir ;
            </li>
            <li>
              Assurer la sécurité du site et la gestion de l'accès
              administrateur.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "base-legale",
      icon: Scale,
      title: t("pcSectionLegalBasis"),
      body: (
        <div className="space-y-2">
          <p>
            Conformément à l'article 7 de la loi n° 18-07, les traitements de
            données reposent sur les bases légales suivantes :
          </p>
          <ul className="ml-1 space-y-1">
            <li>
              <span className="font-semibold">Consentement :</span> pour le
              formulaire de contact, la demande de devis et l'inscription à la
              newsletter. L'utilisateur consent explicitement au traitement en
              soumettant le formulaire.
            </li>
            <li>
              <span className="font-semibold">Intérêt légitime :</span> pour
              les traitements liés à la relation client (suivi des devis,
              SAV, gestion des garanties) et à la sécurité du site.
            </li>
            <li>
              <span className="font-semibold">Obligation légale :</span>{" "}
              conservation des données comptables et commerciales conformément
              à la réglementation fiscale algérienne (loi 90-21 relative à la
              comptabilité).
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "conservation",
      icon: Clock,
      title: t("pcSectionRetention"),
      body: (
        <div className="space-y-2">
          <p>
            Les données sont conservées pendant les durées suivantes, à compter
            de leur collecte :
          </p>
          <ul className="ml-1 space-y-1">
            <li><span className="font-semibold">Messages de contact :</span> 3 ans ;</li>
            <li><span className="font-semibold">Devis non acceptés :</span> 5 ans ;</li>
            <li>
              <span className="font-semibold">Devis acceptés et données clients :</span>{" "}
              10 ans (obligation comptable, article 12 de la loi 90-21) ;
            </li>
            <li>
              <span className="font-semibold">Données newsletter :</span> jusqu'au
              désabonnement de l'utilisateur, ou 3 ans après le dernier échange
              engageant.
            </li>
            <li>
              <span className="font-semibold">Cookies de session / langue :</span> 13 mois
              maximum ou jusqu'à la fin de la session.
            </li>
          </ul>
          <p>
            À l'expiration de ces durées, les données sont supprimées ou
            anonymisées de manière irréversible.
          </p>
        </div>
      ),
    },
    {
      id: "destinataires",
      icon: Users,
      title: t("pcSectionRecipients"),
      body: (
        <div className="space-y-2">
          <p>
            Les données collectées sont destinées à un usage interne au sein
            d'EURL {companyName}. Peuvent y accéder :
          </p>
          <ul className="ml-1 space-y-1">
            <li>Le gérant et les collaborateurs du service commercial ;</li>
            <li>Les techniciens chargés du SAV et de la maintenance ;</li>
            <li>
              Le cabinet d'expertise comptable externe, exclusivement pour les
              devis acceptés et dans la limite de ses missions légales.
            </li>
          </ul>
          <p>
            <strong>{companyName} s'engage à ne jamais vendre, louer ou céder
            vos données à caractère personnel à des tiers à des fins
            commerciales.</strong>
          </p>
        </div>
      ),
    },
    {
      id: "transferts",
      icon: Globe,
      title: t("pcSectionTransfer"),
      body: (
        <div className="space-y-2">
          <p>
            Les données sont hébergées sur la plateforme{" "}
            <strong>Supabase</strong> (infrastructure cloud) ainsi que sur les
            serveurs de l'hébergeur du site (Vercel Inc., États-Unis). Ces
            infrastructures peuvent être situées hors du territoire algérien.
          </p>
          <p>
            {companyName} veille à ce que ces transferts soient encadrés par
            les garanties appropriées prévues par la loi n° 18-07 et, le cas
            échéant, par les clauses contractuelles types assurant un niveau
            de protection adéquat des données personnelles. Les prestataires
            concernés appliquent des mesures techniques et organisationnelles
            conformes aux standards internationaux en matière de sécurité.
          </p>
          <p className="text-sm text-slate-500">
            L'adresse IP de l'utilisateur peut être traitée transitoirement
            par ces prestataires à des fins techniques (routage, sécurité).
          </p>
        </div>
      ),
    },
    {
      id: "securite",
      icon: ShieldCheck,
      title: t("pcSectionSecurity"),
      body: (
        <div className="space-y-2">
          <p>
            {companyName} met en œuvre les mesures techniques et
            organisationnelles appropriées pour protéger vos données contre
            tout accès non autorisé, altération, divulgation ou destruction :
          </p>
          <ul className="ml-1 space-y-1">
            <li>
              <span className="font-semibold">Authentification :</span> les
              mots de passe administrateurs sont hashés (algorithme scrypt) ;
              aucune donnée en clair n'est stockée.
            </li>
            <li>
              <span className="font-semibold">Chiffrement :</span> l'ensemble
              des communications entre le navigateur et le site est chiffré en
              HTTPS (TLS).
            </li>
            <li>
              <span className="font-semibold">Row-Level Security (RLS) :</span>{" "}
              Supabase RLS garantit que chaque utilisateur n'accède qu'aux
              données auxquelles il est autorisé.
            </li>
            <li>
              <span className="font-semibold">Gestion des rôles :</span>{" "}
              l'accès à l'interface d'administration est strictement limité
              aux utilisateurs authentifiés disposant du rôle approprié.
            </li>
            <li>
              <span className="font-semibold">Sauvegardes :</span> les données
              font l'objet de sauvegardes régulières.
            </li>
          </ul>
          <p>
            En cas de violation de données susceptible d'engendrer un risque
            pour vos droits et libertés, {companyName} s'engage à le notifier à
            l'Autorité Nationale de Protection des Données Personnelles
            (ANPDP) dans les meilleurs délais, conformément à l'article 38 de
            la loi n° 18-07.
          </p>
        </div>
      ),
    },
    {
      id: "droits",
      icon: UserCheck,
      title: t("pcSectionRights"),
      body: (
        <div className="space-y-2">
          <p>
            Conformément aux articles 32 et suivants de la loi n° 18-07, vous
            disposez, sur les données à caractère personnel vous concernant,
            des droits suivants :
          </p>
          <ul className="ml-1 space-y-1">
            <li><span className="font-semibold">Droit d'accès :</span> obtenir confirmation et copie des données détenues ;</li>
            <li><span className="font-semibold">Droit de rectification :</span> corriger des données inexactes ou incomplètes ;</li>
            <li><span className="font-semibold">Droit d'effacement :</span> demander la suppression de vos données (« droit à l'oubli ») ;</li>
            <li><span className="font-semibold">Droit d'opposition :</span> vous opposer au traitement pour motifs légitimes ;</li>
            <li><span className="font-semibold">Droit à la portabilité :</span> recevoir vos données dans un format structuré ;</li>
            <li><span className="font-semibold">Droit à la limitation :</span> demander la suspension temporaire d'un traitement.</li>
          </ul>
          <p>
            Pour exercer ces droits, adressez votre demande par e-mail à{" "}
            <a href={`mailto:${email}`} className="text-brand-700 underline-offset-2 hover:underline">{email}</a>{" "}
            en joignant une copie d'une pièce d'identité. Vous pouvez également
            déposer une réclamation auprès de l'Autorité Nationale de
            Protection des Données Personnelles (ANPDP) si vous estimez que
            vos droits ne sont pas respectés.
          </p>
          <p>
            <span className="font-semibold">Délai de réponse :</span> {companyName} s'engage
            à répondre à votre demande dans un délai maximum de{" "}
            <strong>30 jours</strong> suivant la réception de votre demande.
          </p>
        </div>
      ),
    },
    {
      id: "cookies",
      icon: Cookie,
      title: t("pcSectionCookies"),
      body: (
        <div className="space-y-2">
          <p>
            Le site utilise exclusivement des cookies <strong>essentiels</strong>{" "}
            au bon fonctionnement, qui ne nécessitent pas de consentement
            conformément à l'article 8 de la loi n° 18-07 :
          </p>
          <ul className="ml-1 space-y-1">
            <li>
              <span className="font-semibold">Cookie de session administrateur :</span>{" "}
              httpOnly, sécurisé, permet l'authentification de l'espace admin ;
            </li>
            <li>
              <span className="font-semibold">Préférence de langue :</span>{" "}
              stockée en localStorage côté navigateur, mémorise la langue
              d'affichage (français / arabe).
            </li>
          </ul>
          <p>
            <strong>{companyName} n'utilise aucun cookie publicitaire, de
            tracking ou de mesure d'audience tierce.</strong> Vous pouvez à
            tout moment supprimer les cookies depuis les paramètres de votre
            navigateur ; cela n'affecte que la persistance de votre session et
            de vos préférences d'affichage.
          </p>
        </div>
      ),
    },
    {
      id: "modification",
      icon: FileEdit,
      title: t("pcSectionChanges"),
      body: (
        <div className="space-y-2">
          <p>
            EURL {companyName} se réserve le droit de modifier la présente
            politique de confidentialité à tout moment, notamment pour
            s'adapter aux évolutions législatives, réglementaires ou
            techniques. La version applicable est celle publiée sur le site à
            la date d'utilisation.
          </p>
          <p>
            Nous vous invitons à consulter régulièrement cette page. La date
            de dernière mise à jour est indiquée en haut du document.
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
              <span className="font-semibold text-white">{t("pcTitle")}</span>
            </nav>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <Lock className="h-6 w-6" aria-hidden />
              </div>
              <h1 className="text-3xl font-bold sm:text-4xl">{t("pcTitle")}</h1>
            </div>

            <p className="mt-4 max-w-2xl text-sm text-brand-100">
              {companyName} — Loi n° 18-07 du 10 juin 2018 relative à la
              protection des données personnelles.
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
            La présente politique de confidentialité décrit la manière dont
            EURL {companyName} collecte, utilise et protège les données à
            caractère personnel des utilisateurs de son site internet,
            conformément à la loi n° 18-07 du 10 juin 2018 relative à la
            protection des personnes physiques dans le traitement des données à
            caractère personnel.
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
              onClick={() => navigate("mentions-legales")}
              className="text-sm font-medium text-slate-500 hover:text-brand-700 hover:underline"
            >
              {t("legalNotices")} →
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

export default PolitiqueConfidentialite;
