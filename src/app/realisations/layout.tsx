import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nos réalisations — Cabinets équipés",
  description:
    "Découvrez les cabinets dentaires équipés par OUADAH DENTAL GROUPE à Oran et en Algérie.",
  alternates: {
    canonical: "/realisations",
  },
  openGraph: {
    title: "Nos réalisations — OUADAH DENTAL GROUPE",
    description:
      "Galerie de cabinets dentaires équipés par ODG à Oran, Alger et Sénia.",
    url: "/realisations",
  },
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
