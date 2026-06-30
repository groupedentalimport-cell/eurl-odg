import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez OUADAH DENTAL GROUPE à Oran pour vos demandes de matériel dentaire, devis, service après-vente ou formation. Téléphone, email et formulaire en ligne.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact — OUADAH DENTAL GROUPE",
    description:
      "Joignez ODG à Oran pour du matériel dentaire Silver Fox, ICANCLAVE et OWANDY. Devis, SAV, formation.",
    url: "/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
