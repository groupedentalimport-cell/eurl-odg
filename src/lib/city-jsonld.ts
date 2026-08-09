import { SITE_URL } from "@/lib/env";
import { COMPANY } from "@/lib/types";
import type { CityData } from "@/lib/cities-data";

// ---------------------------------------------------------------------------
// JSON-LD structured data for a city page.
// ---------------------------------------------------------------------------
//
// Emits THREE schemas in a single @graph:
//   - LocalBusiness: ODG as a LocalBusiness serving this specific city.
//     Includes geo coordinates, address, opening hours, areaServed.
//   - BreadcrumbList: Home > Villes > City.
//   - Service: the type of service offered (sale, installation, maintenance,
//     training) with provider=ODG and areaServed=city.

export function buildCityJsonLd(city: CityData) {
  const cityUrl = SITE_URL + "/villes/" + city.slug;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": cityUrl + "#localbusiness",
        name: COMPANY.name + " — " + city.name,
        alternateName: COMPANY.nameAr ? COMPANY.nameAr + " — " + city.nameAr : undefined,
        description:
          "Distributeur de matériel dentaire à " +
          city.name +
          " (" +
          city.wilaya +
          ", wilaya " +
          city.wilayaCode +
          "). " +
          city.seoDescription,
        url: cityUrl,
        image: SITE_URL + "/logo-odg.png",
        logo: {
          "@type": "ImageObject",
          url: SITE_URL + "/logo-odg.png",
          caption: COMPANY.name + " — distributeur à " + city.name,
        },
        telephone: COMPANY.phone,
        email: COMPANY.email,
        priceRange: "$$",
        // Address — ODG's official address (Oran), not the city's. The
        // service is delivered TO the city, but the legal address is Oran.
        address: {
          "@type": "PostalAddress",
          streetAddress: COMPANY.address.fr,
          addressLocality: COMPANY.city,
          addressRegion: "Oran",
          postalCode: "31000",
          addressCountry: "DZ",
        },
        // Area served — this is the city-specific part that Google uses
        // to match local searches like "matériel dentaire Alger".
        areaServed: {
          "@type": "City",
          name: city.name,
          alternateName: city.nameAr,
        },
        // Geo — city coordinates (not ODG's coordinates).
        geo: city.latitude && city.longitude ? {
          "@type": "GeoCoordinates",
          latitude: city.latitude,
          longitude: city.longitude,
        } : undefined,
        // Opening hours (ODG's standard hours).
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
            opens: "08:00",
            closes: "17:00",
          },
        ],
        // Same organization as the global Organization schema.
        parentOrganization: { "@id": SITE_URL + "/#organization" },
        // Services offered.
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Matériel dentaire à " + city.name,
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Product",
                name: "Fauteuil dentaire Silver Fox",
                category: "Fauteuil dentaire",
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Product",
                name: "Autoclave ICANCLAVE classe B",
                category: "Stérilisation",
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Product",
                name: "Radiologie OWANDY",
                category: "Radiologie",
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Product",
                name: "Scanner intra-oral Launca",
                category: "Empreinte numérique",
              },
            },
          ],
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": cityUrl + "#breadcrumb",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Villes desservies",
            item: SITE_URL + "/villes",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: city.name,
            item: cityUrl,
          },
        ],
      },
      {
        "@type": "Service",
        "@id": cityUrl + "#service",
        serviceType:
          city.zone === "directe"
            ? "Vente, installation, formation et maintenance directe de matériel dentaire"
            : "Vente, livraison, installation et formation de matériel dentaire",
        provider: { "@id": SITE_URL + "/#organization" },
        areaServed: {
          "@type": "City",
          name: city.name,
          alternateName: city.nameAr,
        },
        description:
          "Distribution de matériel dentaire à " +
          city.name +
          " : fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY, scanners Launca. Délai d'intervention : " +
          city.interventionDelay +
          ". Délai de livraison : " +
          city.deliveryDelay +
          ".",
      },
    ],
  };
}
