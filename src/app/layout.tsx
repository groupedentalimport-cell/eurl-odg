import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { COMPANY } from "@/lib/types";
import { Analytics } from "@vercel/analytics/react";

const SITE_URL = "https://ouadah-dental-groupe.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "OUADAH DENTAL GROUPE — Matériel dentaire | Oran, Algérie",
    template: "%s — OUADAH DENTAL GROUPE",
  },
  description:
    "Importateur de matériel dentaire à Oran : fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Devis, service après-vente et formation.",
  applicationName: "OUADAH DENTAL GROUPE",
  keywords: [
    "matériel dentaire",
    "fauteuil dentaire",
    "autoclave",
    "radiologie dentaire",
    "Oran",
    "Algérie",
    "Silver Fox",
    "ICANCLAVE",
    "OWANDY",
    "importateur matériel dentaire Algérie",
    "équipement cabinet dentaire",
  ],
  authors: [{ name: "OUADAH DENTAL GROUPE" }],
  creator: "OUADAH DENTAL GROUPE",
  publisher: "OUADAH DENTAL GROUPE",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: ["ar_DZ"],
    url: SITE_URL,
    siteName: "OUADAH DENTAL GROUPE",
    title: "OUADAH DENTAL GROUPE — Matériel dentaire | Oran, Algérie",
    description:
      "Importateur de matériel dentaire à Oran : fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Devis, service après-vente et formation.",
    images: [
      {
        url: "/og.jpg",
        width: 1024,
        height: 1024,
        alt: "OUADAH DENTAL GROUPE — Importateur de matériel dentaire à Oran",
      },
      {
        url: "/logo-odg.png",
        width: 2835,
        height: 1418,
        alt: "OUADAH DENTAL GROUPE — logo officiel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OUADAH DENTAL GROUPE — Matériel dentaire | Oran, Algérie",
    description:
      "Importateur de matériel dentaire à Oran : Silver Fox, ICANCLAVE, OWANDY. Devis, SAV et formation.",
    images: ["/og.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.jpg", type: "image/jpeg", sizes: "any" },
      { url: "/logo-odg.png", type: "image/png", sizes: "2835x1418" },
    ],
    apple: [{ url: "/logo.jpg", sizes: "180x180" }],
    shortcut: ["/favicon.jpg"],
  },
  appleWebApp: {
    title: "ODG",
    capable: true,
    statusBarStyle: "default",
  },
  manifest: "/manifest.json",
  category: "business",
  formatDetection: {
    telephone: true,
    address: true,
    email: true,
  },
};

/**
 * JSON-LD structured data.
 *
 * Two graphs are emitted at the root so Google can build a rich Knowledge Graph
 * entry for ODG:
 *   - Organization: official name, logo, contact point (phone/email), postal
 *     address in Oran, Algeria, and any social profiles defined in COMPANY.
 *   - WebSite: site name + SearchAction (the search endpoint is a forward-
 *     looking placeholder so Google can wire it up if/when a search page ships).
 *
 * `sameAs` only includes real URLs — placeholder "#" values from the COMPANY
 * constant are filtered out so we don't feed Google a broken self-reference.
 */
function buildJsonLd() {
  const socialLinks = [COMPANY.facebook, COMPANY.instagram, COMPANY.linkedin]
    .filter((u): u is string => typeof u === "string" && u !== "#" && /^https?:\/\//i.test(u));

  const organization = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: COMPANY.name,
    alternateName: COMPANY.nameAr,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo-odg.png`,
      width: 2835,
      height: 1418,
      caption: `${COMPANY.name} — logo officiel`,
    },
    image: `${SITE_URL}/logo-odg.png`,
    description: `${COMPANY.tagline.fr} — ${COMPANY.address.fr}, ${COMPANY.city}, ${COMPANY.country}.`,
    email: COMPANY.email,
    telephone: COMPANY.phone,
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: COMPANY.phone,
        email: COMPANY.email,
        contactType: "sales",
        areaServed: "DZ",
        availableLanguage: ["fr", "ar"],
      },
      {
        "@type": "ContactPoint",
        telephone: COMPANY.phone2,
        contactType: "customer service",
        areaServed: "DZ",
        availableLanguage: ["fr", "ar"],
      },
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: COMPANY.address.fr,
      addressLocality: COMPANY.city,
      addressCountry: "DZ",
    },
    foundingLocation: {
      "@type": "Place",
      name: COMPANY.city,
      address: {
        "@type": "PostalAddress",
        addressLocality: COMPANY.city,
        addressCountry: "DZ",
      },
    },
    ...(socialLinks.length ? { sameAs: socialLinks } : {}),
  };

  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: COMPANY.name,
    alternateName: COMPANY.nameAr,
    description: COMPANY.tagline.fr,
    inLanguage: ["fr", "ar"],
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/catalogue?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return {
    "@context": "https://schema.org",
    "@graph": [organization, website],
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = buildJsonLd();

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.jpg" type="image/jpeg" sizes="any" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
        <link rel="shortcut icon" href="/favicon.jpg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f766e" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-white font-sans antialiased">
        <Providers>{children}</Providers>
        <Analytics />
        {/* Service worker registration for PWA offline support */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}`,
          }}
        />
      </body>
    </html>
  );
}
