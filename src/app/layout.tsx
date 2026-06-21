import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "OUADAH DENTAL GROUPE — Matériel dentaire | Oran, Algérie",
  description:
    "Importateur de matériel dentaire à Oran : fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Devis, service après-vente et formation.",
  keywords: ["matériel dentaire", "fauteuil dentaire", "autoclave", "radiologie dentaire", "Oran", "Algérie", "Silver Fox", "ICANCLAVE", "OWANDY"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-white font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
