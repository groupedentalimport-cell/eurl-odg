import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales",
  description:
    "Mentions légales du site OUADAH DENTAL GROUPE — éditeur, hébergeur, propriété intellectuelle, responsabilité.",
  alternates: {
    canonical: "/mentions-legales",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MentionsLegalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
