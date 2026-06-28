import type { Metadata } from "next";

/**
 * Metadata for the /admin route.
 *
 * The admin panel must NEVER be indexed by search engines — it is private
 * (auth-gated) and contains customer data. `robots: { index: false, follow:
 * false }` emits the `X-Robots-Tag: noindex, nofollow` header + matching
 * <meta name="robots"> tag so Google + Bing drop it from results.
 *
 * The title uses an `absolute` value (rather than letting the root template
 * append " — OUADAH DENTAL GROUPE") so the admin tab title stays short.
 */
export const metadata: Metadata = {
  title: {
    absolute: "Administration — ODG",
  },
  description: "Espace d'administration OUADAH DENTAL GROUPE (accès réservé).",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No PublicLayout wrapper — the admin panel renders its own chrome.
  return children;
}
