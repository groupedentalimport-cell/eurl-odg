import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "EURL OUADAH DENTAL GROUPE, importateur de matériel dentaire à Oran depuis plus de 15 ans. Silver Fox, ICANCLAVE, OWANDY — service après-vente, formation et installation.",
  alternates: {
    canonical: "/apropos",
  },
  openGraph: {
    title: "À propos — OUADAH DENTAL GROUPE",
    description:
      "Importateur de matériel dentaire à Oran depuis 15 ans. Service, formation et installation partout en Algérie.",
    url: "/apropos",
  },
};

export default function AproposLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
