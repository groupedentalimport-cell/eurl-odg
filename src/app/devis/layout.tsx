import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demande de devis",
  description:
    "Demandez un devis personnalisé pour votre matériel dentaire : fauteuils, autoclaves, radios, consommables. Réponse rapide de l'équipe ODG en Algérie.",
  alternates: {
    canonical: "/devis",
  },
  openGraph: {
    title: "Demande de devis — ODG",
    description:
      "Devis personnalisé pour fauteuils dentaires, autoclaves et radiologie OWANDY en Algérie.",
    url: "/devis",
  },
};

export default function DevisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
