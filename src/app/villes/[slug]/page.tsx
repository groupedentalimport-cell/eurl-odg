import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { CityPage } from "@/components/dental/city/CityPage";
import { CITIES, getCityBySlug } from "@/lib/cities-data";
import { buildCityJsonLd } from "@/lib/city-jsonld";

// ---------------------------------------------------------------------------
// /villes/<slug> — server-rendered city page (SEO local).
// ---------------------------------------------------------------------------
//
// Each city page is fully server-rendered (SSG via generateStaticParams) with:
//   - City identity (zone, delay, coverage, services).
//   - JSON-LD LocalBusiness + BreadcrumbList + Service schemas.
//   - sr-only block for AI crawlers (ChatGPT, Claude, Perplexity).
//
// Per-city <title>, meta description, OG tags, canonical URL are emitted
// by generateMetadata below.

type Params = { params: Promise<{ slug: string }> };

// Pre-render all city pages at build time (SSG).
export function generateStaticParams() {
  return Object.keys(CITIES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) {
    return {
      title: "Ville introuvable",
      description: "Cette ville n'est pas desservie par OUADAH DENTAL GROUPE.",
    };
  }
  const { buildCityMetadata } = await import("@/lib/cities-data");
  return buildCityMetadata(slug);
}

export default async function VilleSlugRoute({ params }: Params) {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return notFound();

  const jsonLd = buildCityJsonLd(city);

  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CityPage city={city} />
    </PublicLayout>
  );
}
