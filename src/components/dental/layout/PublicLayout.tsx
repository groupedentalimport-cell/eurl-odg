"use client";
import dynamic from "next/dynamic";
import { Header } from "@/components/dental/layout/Header";
import { Footer } from "@/components/dental/layout/Footer";
import { InstallPrompt } from "@/components/dental/pwa/InstallPrompt";
import { useTranslation } from "@/lib/i18n";

// Lazy-load the floating widgets (they're client-only, heavy-ish)
const ChatbotWidget = dynamic(() => import("@/components/dental/chatbot/ChatbotWidget").then(m => m.ChatbotWidget), { ssr: false });
const WhatsAppWidget = dynamic(() => import("@/components/dental/chatbot/WhatsAppWidget").then(m => m.WhatsAppWidget), { ssr: false });
// Live chat with a human (BONUS-2) — separate from the AI chatbot.
// Sits ABOVE the ChatbotWidget launcher (bottom-24) so they don't overlap.
const LiveChatWidget = dynamic(() => import("@/components/dental/chatbot/LiveChatWidget").then(m => m.LiveChatWidget), { ssr: false });

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
      <LiveChatWidget />
      <InstallPrompt />
    </div>
  );
}
