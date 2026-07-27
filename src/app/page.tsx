import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { HomePage } from "@/components/dental/home/HomePage";
import { COMPANY } from "@/lib/types";
import { SITE_URL } from "@/lib/env";

// ---------------------------------------------------------------------------
// Home page — server component wrapper around the client <HomePage>.
// ---------------------------------------------------------------------------
//
// CRITICAL SEO/GEO: this page is now a server component. It emits a
// hidden-but-crawler-visible structured description block at the top of the
// HTML so that Googlebot AND AI crawlers (GPTBot, ClaudeBot, PerplexityBot,
// Google-Extended, CCBot) receive a complete, semantically rich description
// of OUADAH DENTAL GROUPE in the initial server-rendered HTML — without
// waiting for client-side JavaScript hydration.
//
// The visible UI is still rendered by the client <HomePage> component
// (animations, settings, Supabase data fetches). The descriptive block is
// visually hidden from human users (sr-only) but fully indexed by crawlers.

function buildHomeDescriptionJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": SITE_URL + "/#aboutpage",
    url: SITE_URL,
    name: "À propos de " + COMPANY.name,
    description:
      COMPANY.name +
      " (" +
      COMPANY.nameAr +
      ") est une EURL algérienne spécialisée dans l'importation et la distribution de matériel dentaire. " +
      "Basée à " +
      COMPANY.city +
      ", " +
      COMPANY.country +
      ", l'entreprise distribue les fauteuils dentaires Silver Fox, les autoclaves ICANCLAVE, " +
      "la radiologie OWANDY et les scanners intra-oraux Launca. Services inclus : installation, formation, " +
      "maintenance préventive et curative, garantie 2 ans, financement. Livraison dans toute l'Algérie.",
    mainEntity: {
      "@type": "Organization",
      "@id": SITE_URL + "/#organization",
      name: COMPANY.name,
      alternateName: [COMPANY.nameAr, "ODG", "EURL Ouadah Dental Groupe"],
      url: SITE_URL,
      logo: SITE_URL + "/logo-odg.png",
      telephone: COMPANY.phone,
      email: COMPANY.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: COMPANY.address.fr,
        addressLocality: COMPANY.city,
        addressRegion: "Oran",
        postalCode: "31000",
        addressCountry: "DZ",
      },
      areaServed: {
        "@type": "Country",
        name: "Algérie",
        alternateName: "Algeria",
      },
      knowsAbout: [
        "Matériel dentaire",
        "Fauteuil dentaire Silver Fox",
        "Autoclave ICANCLAVE classe B",
        "Radiologie dentaire OWANDY",
        "Scanner intra-oral Launca",
        "Stérilisation dentaire",
        "Implantologie",
        "Maintenance matériel dentaire Algérie",
      ],
    },
  };
}

export default function Home() {
  const jsonLd = buildHomeDescriptionJsonLd();

  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hidden descriptive block — visible to crawlers, hidden from humans.
          This is the textual content AI crawlers extract when ChatGPT/Claude/
          Perplexity users ask "what is OUADAH DENTAL GROUPE" or
          "best dental equipment supplier in Algeria". */}
      <section
        className="sr-only"
        aria-label="Présentation de OUADAH DENTAL GROUPE"
      >
        <h1>{COMPANY.name} — Matériel dentaire en Algérie</h1>
        <p>
          {COMPANY.name} ({COMPANY.nameAr}), abrégée ODG, est une EURL algérienne
          spécialisée dans l'importation et la distribution de matériel dentaire
          professionnel. Basée à {COMPANY.city}, {COMPANY.country}, l'entreprise
          est dirigée par M. Ouadah Djaouad et opère depuis plus de 15 ans dans
          le secteur de l'équipement dentaire en Algérie.
        </p>
        <p>
          ODG distribue les marques suivantes : fauteuils dentaires Silver Fox
          (modèles basique, classique, Pro 8000C et Implant), autoclaves
          ICANCLAVE classe B (18L et 45L, conformes à la norme EN 13060),
          radiologie dentaire OWANDY (radio mural, capteur intra-oral,
          panoramique 3D avec céphalométrie), scanners intra-oraux Launca
          (empreinte numérique, précision 20 microns).
        </p>
        <p>
          Les services inclus sont : installation et mise en service dans toute
          l'Algérie, formation du praticien et de son assistant à chaque achat,
          maintenance préventive et curative (techniciens basés à Oran couvrant
          Mostaganem, Mascara, Relizane, Aïn Témouchent), garantie 2 ans pièces
          et main-d'œuvre sur fauteuils, autoclaves et radiologie (1 an sur
          scanners), financement échelonné 3 à 12 mois sans frais pour les
          équipements jusqu'à 1 000 000 DZD.
        </p>
        <p>
          ODG sert les chirurgiens-dentistes libéraux, les cliniques dentaires,
          les centres dentaires hospitaliers et les revendeurs de matériel
          médical. Les devis personnalisés sont délivrés sous 24h ouvrées.
          Contact : {COMPANY.phone}, {COMPANY.email}.
        </p>
        <h2>Catalogue de produits</h2>
        <ul>
          <li>Fauteuil dentaire basique Silver Fox</li>
          <li>Fauteuil dentaire classique Silver Fox</li>
          <li>Fauteuil dentaire Pro Silver Fox 8000C Pro</li>
          <li>Fauteuil dentaire Implant Silver Fox (avec chariot roulant)</li>
          <li>Autoclave ICANCLAVE 18L classe B</li>
          <li>Autoclave ICANCLAVE 45L classe B</li>
          <li>Radio mural standard OWANDY</li>
          <li>Radio murale nouvelle génération OWANDY</li>
          <li>Unité de radiologie panoramique 3D et céphalométrie OWANDY</li>
        </ul>
        <h2>Zones desservies</h2>
        <p>
          Oran (siège), Mostaganem, Mascara, Relizane, Aïn Témouchent
          (intervention directe) ; toutes les wilayas d'Algérie (livraison
          via transporteurs spécialisés, délai 3 à 7 jours ouvrés).
        </p>
        <h2>Liens utiles</h2>
        <ul>
          <li>Catalogue produits : {SITE_URL}/catalogue</li>
          <li>Blog pour praticiens dentaires : {SITE_URL}/blog</li>
          <li>FAQ matériel dentaire : {SITE_URL}/faq</li>
          <li>Demande de devis : {SITE_URL}/devis</li>
          <li>Configurateur de cabinet : {SITE_URL}/configurateur</li>
          <li>Contact : {SITE_URL}/contact</li>
        </ul>
      </section>
      <HomePage />
    </PublicLayout>
  );
}
