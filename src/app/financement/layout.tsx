import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calculateur de financement — ODG",
  description:
    "Simulez votre crédit-bail ou prêt bancaire pour votre matériel dentaire.",
  alternates: {
    canonical: "/financement",
  },
  openGraph: {
    title: "Calculateur de financement — OUADAH DENTAL GROUPE",
    description:
      "Estimez vos mensualités pour l'achat de votre matériel dentaire ODG : crédit-bail ou prêt bancaire.",
    url: "/financement",
  },
};

export default function FinancementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
