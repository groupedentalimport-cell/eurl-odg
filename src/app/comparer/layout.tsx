import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Comparer",
  description:
    "Comparez nos produits dentaires côte à côte : fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Caractéristiques techniques, prix et disponibilités.",
  alternates: {
    canonical: "/comparer",
  },
  openGraph: {
    title: "Comparer — ODG",
    description: "Comparez les produits dentaire ODG côte à côte.",
    url: "/comparer",
  },
};

export default function ComparerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
