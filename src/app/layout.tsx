import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "OUADAH DENTAL GROUPE — Matériel dentaire | Oran, Algérie",
  description:
    "Importateur de matériel dentaire à Oran : fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Devis, service après-vente et formation.",
  keywords: ["matériel dentaire", "fauteuil dentaire", "autoclave", "radiologie dentaire", "Oran", "Algérie", "Silver Fox", "ICANCLAVE", "OWANDY"],
  icons: {
    icon: [
      { url: "/favicon.jpg", type: "image/jpeg", sizes: "any" },
      { url: "/logo-odg.png", type: "image/png", sizes: "2835x1418" },
    ],
    apple: [{ url: "/logo.jpg", sizes: "180x180" }],
    shortcut: ["/favicon.jpg"],
  },
  appleWebApp: {
    title: "ODG",
    capable: true,
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.jpg" type="image/jpeg" sizes="any" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
        <link rel="shortcut icon" href="/favicon.jpg" />
      </head>
      <body className="min-h-screen bg-white font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
