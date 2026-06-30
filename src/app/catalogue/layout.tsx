import type { Metadata } from "next";

/**
 * SEO metadata for /catalogue.
 *
 * Title is rendered through the root template ("%s — OUADAH DENTAL GROUPE")
 * so the final <title> is "Catalogue — OUADAH DENTAL GROUPE".
 */
export const metadata: Metadata = {
  title: "Catalogue",
  description:
    "Découvrez notre catalogue de fauteuils dentaires Silver Fox, autoclaves ICANCLAVE et solutions de radiologie OWANDY. Matériel dentaire professionnel livré en Algérie.",
  alternates: {
    canonical: "/catalogue",
  },
  openGraph: {
    title: "Catalogue — Matériel dentaire ODG",
    description:
      "Fauteuils dentaires Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Importateur officiel en Algérie.",
    url: "/catalogue",
  },
};

export default function CatalogueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
