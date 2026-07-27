import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ matériel dentaire",
  description:
    "Questions fréquentes des chirurgiens-dentistes algériens sur le matériel dentaire.",
  alternates: { canonical: "/faq" },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
