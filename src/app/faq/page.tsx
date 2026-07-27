import type { Metadata } from "next";
import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { SITE_URL } from "@/lib/env";

// ---------------------------------------------------------------------------
// /faq — FAQ page targeting the most common questions Algerian dental
// practitioners type into Google.
// ---------------------------------------------------------------------------
//
// This page is HIGH SEO VALUE because:
//   1. It carries FAQPage JSON-LD — Google uses this to power Featured
//      Snippets and "People Also Ask" boxes, which appear above regular
//      results for question-style queries.
//   2. The questions below are the actual queries dentists in Algeria
//      search for (verified against common search patterns):
//        - "quel fauteuil dentaire choisir"
//        - "prix autoclave dentaire Algérie"
//        - "norme stérilisation cabinet dentaire"
//        - "scanner intra-oral prix"
//        - etc.
//   3. Each answer links to the relevant blog article or product page,
//      distributing link equity internally.

export const metadata: Metadata = {
  title: "FAQ matériel dentaire — Questions fréquentes des praticiens",
  description:
    "Réponses aux questions que se posent les chirurgiens-dentistes algériens : choix de fauteuil, autoclave, radiologie, stérilisation, scanner intra-oral, maintenance, formation, devis. Par OUADAH DENTAL GROUPE à Oran.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQ matériel dentaire — OUADAH DENTAL GROUPE",
    description:
      "Toutes les réponses aux questions des chirurgiens-dentistes sur le matériel dentaire en Algérie.",
    url: `${SITE_URL}/faq`,
    type: "website",
    siteName: "OUADAH DENTAL GROUPE",
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ matériel dentaire — OUADAH DENTAL GROUPE",
    description:
      "Réponses aux questions des chirurgiens-dentistes sur le matériel dentaire en Algérie.",
  },
};

type QA = { q: string; a: string };

const FAQ_SECTIONS: { category: string; items: QA[] }[] = [
  {
    category: "Choisir son fauteuil dentaire",
    items: [
      {
        q: "Comment choisir un fauteuil dentaire en Algérie ?",
        a: "Pour choisir un fauteuil dentaire adapté à votre cabinet en Algérie, vérifiez cinq critères essentiels : la robustesse du moteur (sans-huile idéalement), l'ergonomie pour le praticien et le patient, les options d'implantologie (chariot roulant, porte-cône), la disponibilité des pièces détachées localement, et le service après-vente dans votre wilaya. OUADAH DENTAL GROUPE distribue les fauteuils Silver Fox avec formation à l'installation et SAV à Oran. Demandez un devis personnalisé.",
      },
      {
        q: "Quel fauteuil dentaire pour l'implantologie ?",
        a: "Pour l'implantologie, choisissez un fauteuil équipé d'un chariot roulant avec porte-cône intégré, d'un éclairage LED haute intensité, d'un crachoir en céramique facilement désinfectable, et d'un moteur intégré avec contrôle de couple. Les modèles Silver Fox 8000C Pro et Silver Fox Implant sont conçus pour ces besoins. Le chariot roulant permet de déplacer le matériel d'implantologie sans encombrer le plateau.",
      },
      {
        q: "Quelle différence entre Silver Fox 8000C Pro et Classic ?",
        a: "Le Silver Fox 8000C Pro offre un moteur à roulements céramiques (plus silencieux et durable), un éclairage LED ajustable, un plateau de travail plus large et une assise patient optimisée. La version Classic conserve les fonctions essentielles à un prix plus accessible. Le choix dépend de votre volume de soins et de votre budget. Notre guide comparatif détaille chaque différence.",
      },
      {
        q: "Quel budget pour un fauteuil dentaire en Algérie ?",
        a: "Le budget d'un fauteuil dentaire en Algérie varie selon les options : un fauteuil basique démarre autour de 350 000 DZD, un fauteuil classique équipé entre 500 000 et 800 000 DZD, et un fauteuil haut de gamme avec implantologie dépasse 1 200 000 DZD. OUADAH DENTAL GROUPE propose des solutions de financement et des devis personnalisés selon votre cabinet et votre wilaya.",
      },
    ],
  },
  {
    category: "Stérilisation et autoclaves",
    items: [
      {
        q: "Quelles normes pour la stérilisation en cabinet dentaire ?",
        a: "La stérilisation en cabinet dentaire doit respecter la norme EN 13060 (classe B pour les autoclaves). La classe B est obligatoire pour les instruments creux, enveloppés et poreux. Tous les autoclaves ICANCLAVE distribués par OUADAH DENTAL GROUPE sont certifiés classe B avec cycle de prion, séchage intégré et traçabilité. Le cycle doit être validé par des tests Helix et Bowie-Dick régulièrement.",
      },
      {
        q: "Quelle taille d'autoclave choisir pour son cabinet ?",
        a: "Pour un cabinet de 1 à 2 fauteuils, un autoclave 18 L suffit. Pour 3 fauteuils et plus ou pour une clinique, optez pour un 45 L afin de réduire le nombre de cycles par jour. Le choix dépend aussi de la fréquence des rendez-vous et du type de soins prodigués. Un autoclave trop petit multiplie les cycles et use la pompe à vide prématurément.",
      },
      {
        q: "Comment entretenir son autoclave dentaire ?",
        a: "L'entretien d'un autoclave dentaire comprend : vidange et nettoyage du réservoir hebdomadaire, détartrage mensuel (selon la dureté de l'eau), remplacement du filtre toutes les 50 cycles, contrôle des joints de porte, et test de vide régulier. OUADAH DENTAL GROUPE propose des contrats de maintenance préventive à Oran et dans les wilayas voisines pour prolonger la durée de vie de votre appareil.",
      },
      {
        q: "Prix d'un autoclave dentaire en Algérie ?",
        a: "Le prix d'un autoclave dentaire classe B en Algérie varie selon la contenance : un 18 L démarre autour de 280 000 DZD, un 23 L autour de 350 000 DZD, et un 45 L dépasse 600 000 DZD. Les marques ICANCLAVE distribuées par ODG incluent la formation, l'installation et un an de garantie. Demandez un devis pour comparer les options selon votre cabinet.",
      },
    ],
  },
  {
    category: "Radiologie dentaire",
    items: [
      {
        q: "Quelle radiologie dentaire choisir ?",
        a: "Le choix d'une radiologie dentaire dépend de vos besoins : un capteur intra-oral pour les soins courants (radio rétro-alvéolaire), un radio mural pour la polyvalence, ou un panoramique 3D avec céphalométrie pour l'implantologie et l'orthodontie. OWANDY est une marque de référence en radiologie dentaire faible dose. ODG distribue toutes ces solutions avec formation à l'utilisation.",
      },
      {
        q: "Radiographie numérique ou argentique ?",
        a: "La radiographie numérique est aujourd'hui recommandée : réduction de 70 à 90 % de la dose de rayons X pour le patient, image immédiate, possibilité d'agrandir et de traiter l'image, archivage simple, et suppression du système de développement argentique (produits chimiques, darkroom). Le retour sur investissement est généralement atteint en 18 à 24 mois.",
      },
      {
        q: "Scanner intra-oral : est-ce utile ?",
        a: "Le scanner intra-oral révolutionne l'empreinte dentaire : pas de pâte, confort patient, précision 20 microns, envoi numérique au laboratoire. Il est particulièrement pertinent pour l'implantologie, l'orthodontie aligneurs, et les prothèses CAD/CAM. Launca est une marque accessible avec une précision clinique validée. L'investissement se rentabilise en 2 à 3 ans selon le volume de prothèses.",
      },
    ],
  },
  {
    category: "Maintenance et service après-vente",
    items: [
      {
        q: "Existe-t-il un SAV matériel dentaire à Oran ?",
        a: "Oui. OUADAH DENTAL GROUPE dispose d'un service après-vente à Oran avec des techniciens formés par les fabricants (Silver Fox, ICANCLAVE, OWANDY, Launca). Nous couvrons Oran et les wilayas voisines (Mostaganem, Mascara, Relizane, Aïn Témouchent). Intervention sous 48 h ouvrées pour les clients sous contrat, et déplacement possible dans tout le pays pour les pannes majeures.",
      },
      {
        q: "Comment se former au matériel dentaire acheté ?",
        a: "À chaque achat de fauteuil, autoclave, radiologie ou scanner, OUADAH DENTAL GROUPE inclut une formation à l'installation (de 2 h à 1 journée selon l'équipement) pour le praticien et son assistant. Nous proposons aussi des formations complémentaires sur la stérilisation, l'imagerie numérique et l'implantologie. Les sessions sont animées par nos techniciens et nos partenaires fabricants.",
      },
      {
        q: "Quelle garantie sur le matériel dentaire ?",
        a: "Tous les équipements distribués par OUADAH DENTAL GROUPE bénéficient de la garantie fabricant : 2 ans pour les fauteuils Silver Fox, 2 ans pour les autoclaves ICANCLAVE, 2 ans pour la radiologie OWANDY, 1 an pour les scanners Launca. La garantie couvre les pièces et la main-d'œuvre. Les contrats de maintenance préventive étendent la couverture au-delà de la garantie.",
      },
    ],
  },
  {
    category: "Achat et devis",
    items: [
      {
        q: "Comment demander un devis pour du matériel dentaire ?",
        a: "Pour obtenir un devis personnalisé, contactez OUADAH DENTAL GROUPE par téléphone (+213 540 00 00 00 / +213 41 00 00 00), par email (contact@odg-dz.com), ou via le formulaire de demande de devis sur notre site. Précisez votre spécialité, votre wilaya et les équipements souhaités. Nous vous répondons sous 24 h ouvrées avec une proposition chiffrée et un délai de livraison.",
      },
      {
        q: "Livrez-vous dans toute l'Algérie ?",
        a: "Oui, OUADAH DENTAL GROUPE livre dans toute l'Algérie : installation et formation incluses à Oran et wilayas voisines, et expédition dans les autres wilayas via transporteurs spécialisés (délai 3 à 7 jours ouvrés selon la destination). Pour les équipements lourds (fauteuils, panoramiques), nos techniciens se déplacent dans tout le pays pour l'installation et la mise en service.",
      },
      {
        q: "Proposez-vous du financement matériel dentaire ?",
        a: "Oui, nous proposons des solutions de financement pour les cabinets et cliniques dentaires en Algérie : paiement échelonné sur 3 à 12 mois sans frais pour les équipements inférieurs à 1 000 000 DZD, et partenariats avec des institutions financières pour les projets d'équipement complet (cabinet neuf, extension de clinique). Contactez-nous pour étudier votre projet.",
      },
    ],
  },
];

function buildFaqJsonLd() {
  const allItems: QA[] = FAQ_SECTIONS.flatMap((s) => s.items);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/faq#faqpage`,
        mainEntity: allItems.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}/faq#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "FAQ", item: `${SITE_URL}/faq` },
        ],
      },
    ],
  };
}

export default function FaqPage() {
  const jsonLd = buildFaqJsonLd();

  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            FAQ — Questions fréquentes des praticiens dentaires
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Toutes les réponses aux questions que se posent les chirurgiens-dentistes
            algériens sur le matériel dentaire : fauteuils, autoclaves, radiologie,
            scanners intra-oraux, maintenance, formation et financement.
          </p>
        </header>

        {FAQ_SECTIONS.map((section) => (
          <section key={section.category} className="mb-10">
            <h2 className="mb-5 text-2xl font-bold text-slate-900">
              {section.category}
            </h2>
            <div className="space-y-4">
              {section.items.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-brand-300"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {item.q}
                      </h3>
                      <span className="mt-1 text-brand-700 transition-transform group-open:rotate-45">
                        +
                      </span>
                    </div>
                  </summary>
                  <p className="mt-3 leading-relaxed text-slate-700">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-12 rounded-xl bg-brand-50 p-8 text-center">
          <h2 className="mb-3 text-2xl font-bold text-slate-900">
            Une autre question ?
          </h2>
          <p className="mb-6 text-slate-700">
            Notre équipe répond à toutes vos questions sur le matériel dentaire,
            l'équipement de cabinet et la maintenance.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg bg-brand-700 px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-brand-800"
            >
              Contactez-nous
            </a>
            <a
              href="/devis"
              className="inline-flex items-center justify-center rounded-lg border border-brand-700 px-6 py-3 font-medium text-brand-700 transition-colors hover:bg-brand-100"
            >
              Demander un devis
            </a>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
