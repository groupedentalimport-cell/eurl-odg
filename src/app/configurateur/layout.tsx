import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configurateur de cabinet — ODG",
  description:
    "Composez votre équipement dentaire et obtenez un devis estimatif : fauteuil Silver Fox, autoclave ICANCLAVE et radiologie OWANDY. Estimation immédiate en DZD.",
  alternates: {
    canonical: "/configurateur",
  },
  openGraph: {
    title: "Configurateur de cabinet — ODG",
    description:
      "Composez votre équipement dentaire et obtenez un devis estimatif.",
    url: "/configurateur",
  },
};

export default function ConfigurateurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
