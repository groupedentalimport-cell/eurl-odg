import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité et de protection des données personnelles — OUADAH DENTAL GROUPE.",
  alternates: {
    canonical: "/confidentialite",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ConfidentialiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
