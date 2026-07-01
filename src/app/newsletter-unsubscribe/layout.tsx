import type { Metadata } from "next";

// noindex — the unsubscribe page is reached only via the email link.
// We don't want it indexed by search engines.
export const metadata: Metadata = {
  title: "Désinscription — ODG",
  description:
    "Désinscription de la newsletter OUADAH DENTAL GROUPE.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function UnsubscribeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
