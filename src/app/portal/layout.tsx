import type { Metadata } from "next";

// ============================================================
// /portal — client portal (magic link auth — Task BONUS-3)
// ============================================================
//
// noindex: the portal is auth-gated and contains customer data
// (devis, commandes, garanties, interventions). It must NEVER be
// indexed by Google/Bing. `follow: true` is OK — the portal itself
// has no internal links worth crawling, but links FROM the portal
// (back to /, /contact) should still be followed.
//
// The title is `absolute` (not "<title> — OUADAH DENTAL GROUPE") so
// the browser tab stays short and the client can read it at a glance.
export const metadata: Metadata = {
  title: {
    absolute: "Espace client — ODG",
  },
  description:
    "Connectez-vous à votre espace client OUADAH DENTAL GROUPE pour consulter vos devis, commandes, garanties et interventions.",
  alternates: {
    canonical: "/portal",
  },
  openGraph: {
    title: "Espace client — OUADAH DENTAL GROUPE",
    description:
      "Accédez à vos devis, commandes, garanties et interventions en quelques clics.",
    url: "/portal",
  },
  robots: {
    index: false,
    follow: true,
    nocache: true,
    googleBot: {
      index: false,
      follow: true,
      noimageindex: true,
    },
  },
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
