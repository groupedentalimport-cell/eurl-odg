import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Conseils, guides d'achat et actualités sur le matériel dentaire en Algérie : fauteuils, autoclaves, radiologie, maintenance. Par les experts ODG.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog — OUADAH DENTAL GROUPE",
    description:
      "Conseils, guides et actualités sur le matériel dentaire en Algérie.",
    url: "/blog",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
