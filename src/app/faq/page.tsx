import type { Metadata } from "next";
import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { SITE_URL } from "@/lib/env";
import { FAQ_SECTIONS, type QA } from "@/lib/faq-data";

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
