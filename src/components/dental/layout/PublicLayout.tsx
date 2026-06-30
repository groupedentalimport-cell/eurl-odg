"use client";
import dynamic from "next/dynamic";
import { Header } from "@/components/dental/layout/Header";
import { Footer } from "@/components/dental/layout/Footer";
import { useTranslation } from "@/lib/i18n";

// Lazy-load the floating widgets (they're client-only, heavy-ish)
const ChatbotWidget = dynamic(() => import("@/components/dental/chatbot/ChatbotWidget").then(m => m.ChatbotWidget), { ssr: false });
const WhatsAppWidget = dynamic(() => import("@/components/dental/chatbot/WhatsAppWidget").then(m => m.WhatsAppWidget), { ssr: false });

// Public layout shell — wraps Header + main content + Footer + floating widgets.
// Used by all public-facing pages (home, catalogue, product, blog, contact, etc.).
// The admin section does NOT use this shell (it has its own layout).
export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { lang } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col" dir={lang === "ar" ? "rtl" : "ltr"} key={lang}>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatbotWidget />
      <WhatsAppWidget />
    </div>
  );
}
