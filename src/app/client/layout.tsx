import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Espace client — ODG",
  description:
    "Connectez-vous à votre espace client OUADAH DENTAL GROUPE pour consulter vos devis, commandes et garanties.",
  alternates: {
    canonical: "/client",
  },
  openGraph: {
    title: "Espace client — OUADAH DENTAL GROUPE",
    description:
      "Accédez à vos devis, commandes et garanties en quelques clics.",
    url: "/client",
  },
  robots: { index: false, follow: true },
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
