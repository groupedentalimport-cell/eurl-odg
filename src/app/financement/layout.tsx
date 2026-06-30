import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calculateur de financement — ODG",
  description:
    "Simulez votre crédit-bail, crédit classique ou location longue durée pour votre matériel dentaire.",
  alternates: {
    canonical: "/financement",
  },
  openGraph: {
    title: "Calculateur de financement — OUADAH DENTAL GROUPE",
    description:
      "Estimez vos mensualités pour l'achat de matériel dentaire ODG : crédit-bail, crédit classique ou LLD.",
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
