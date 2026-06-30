"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Headphones,
  X,
  Send,
  Phone,
  Bot,
  Loader2,
  MessageSquare,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import { useCompanyInfo } from "@/lib/settings-service";
import { toast } from "@/components/ui/sonner";

// ============================================================
// LiveChatWidget — "talk to a REAL human at ODG" floating widget.
// (Task BONUS-2-3)
//
// Sits ABOVE the ChatbotWidget (bottom-right, but at bottom-24 so it
// doesn't overlap the chatbot launcher at bottom-5).
//
// Behavior:
//  1. On open, fetches /api/livechat/session (server-side business
//     hours check, cached 60s) → shows green "En ligne" or grey
//     "Hors ligne" badge.
//  2. ONLINE  → shows a quick message form (saves to messages table
//     with subject="Live Chat" via /api/livechat/messages) + a
//     "Call now" CTA.
//  3. OFFLINE → same quick message form (still saves, ODG replies by
//     email/phone next business day) + a "Get an instant answer
//     with the IA" button that opens the existing ChatbotWidget.
//
// Why polling isn't needed: this version is "chat-shaped contact
// form". Visitor messages are stored; ODG replies by email/phone.
// No real-time admin reply is implemented in v1 (out of scope).
// ============================================================

interface SessionInfo {
  online: boolean;
  now: string;
  businessHours?: { start?: string; end?: string; timezone?: string };
}

// Open the existing ChatbotWidget. We try 2 strategies:
//  1. dispatch a global CustomEvent (forward-compat: a future
//     ChatbotWidget could subscribe to it without us needing to
//     reach into its DOM).
//  2. query the launcher button by aria-label and click it (works
//     today — the launcher has aria-label={t("openChat")} which
//     resolves to "Ouvrir le chat" / "افتح المحادثة").
function openChatbot() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("odg:open-chatbot"));
  // Fallback: click the chatbot launcher.
  const candidates = [
    'button[aria-label="Ouvrir le chat"]',
    'button[aria-label="افتح المحادثة"]',
    'button[aria-label="Open chat"]',
  ];
  for (const sel of candidates) {
    const el = document.querySelector<HTMLButtonElement>(sel);
    if (el) {
      el.click();
      return;
    }
  }
}

export function LiveChatWidget() {
  const { t, lang } = useTranslation();
  const company = useCompanyInfo();

  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  // Phone link (tel:) built from the admin-configured company phone.
  const telHref = useMemo(() => {
    const raw = (company?.phone ?? "").trim();
    if (!raw) return "";
    return `tel:${raw.replace(/\s+/g, "")}`;
  }, [company?.phone]);

  const displayPhone = useMemo(() => {
    return (company?.phone ?? "").trim() || "";
  }, [company?.phone]);

  // Fetch the server-side business-hours status whenever the panel opens.
  // Cheap (cached 60s at the CDN) and avoids trusting the visitor's clock.
  const refreshSession = useCallback(async () => {
    setSessionLoading(true);
    try {
      const res = await fetch("/api/livechat/session", { cache: "no-store" });
      const data = await res.json();
      setSession({
        online: Boolean(data?.online),
        now: data?.now || new Date().toISOString(),
        businessHours: data?.businessHours,
      });
    } catch {
      // Network/server failure → fall back to offline (don't block the form).
      setSession({ online: false, now: new Date().toISOString() });
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !session && !sessionLoading) {
      refreshSession();
    }
  }, [open, session, sessionLoading, refreshSession]);

  // Focus the first field when the panel opens (after the open animation).
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => nameRef.current?.focus(), 250);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Auto-hide the floating launcher after the panel opens (the panel has
  // its own close button). Re-show when closed.
  const online = Boolean(session?.online);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error(t("liveChatRequired"));
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/livechat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          message: form.message,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur");
      setSent(true);
      toast.success(t("liveChatSent"));
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      toast.error(t("liveChatFailed"));
    } finally {
      setSending(false);
    }
  };

  const closeAndReset = () => {
    setOpen(false);
    // Keep `sent` true so the user sees the confirmation if they reopen
    // within the same session — but reset after 3s so a fresh visit
    // starts clean.
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <>
      {/* Floating launcher button — sits above the ChatbotWidget */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="livechat-launcher"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => setOpen(true)}
            aria-label={t("liveChatOpen")}
            title={t("liveChatOpen")}
            className="fixed bottom-24 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-700 shadow-lg shadow-slate-900/15 ring-1 ring-slate-200 transition-colors hover:bg-brand-50 hover:text-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-200 sm:bottom-28 sm:right-6 sm:h-14 sm:w-14"
          >
            <Headphones className="h-5 w-5 sm:h-6 sm:w-6" />
            {/* Online / offline dot */}
            <span
              className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-white ${
                online ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="livechat-panel"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 bottom-0 z-50 sm:inset-x-auto sm:right-6 sm:bottom-24"
          >
            <div className="mx-auto flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:w-[400px] sm:rounded-2xl">
              {/* Mobile drag handle */}
              <div className="flex justify-center bg-brand-700 pt-2 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-white/40" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between gap-2 bg-brand-700 px-4 py-3 text-white">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <Headphones className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-semibold">{t("liveChatTitle")}</p>
                    <div className="flex items-center gap-1.5">
                      {sessionLoading ? (
                        <span className="text-[11px] text-brand-100">{t("loading")}</span>
                      ) : online ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                          </span>
                          <span className="text-[11px] text-brand-100">{t("liveChatOnline")}</span>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex h-2 w-2 rounded-full bg-slate-300" />
                          <span className="text-[11px] text-brand-100">{t("liveChatOffline")}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-white hover:bg-white/15"
                  onClick={closeAndReset}
                  aria-label={t("liveChatClose")}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Body — scrollable */}
              <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4">
                {/* Status banner */}
                <div
                  className={`mb-4 rounded-xl border p-3 ${
                    online
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {online ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold ${
                          online ? "text-emerald-800" : "text-amber-800"
                        }`}
                      >
                        {online ? t("liveChatOnline") : t("liveChatOffline")}
                      </p>
                      <p
                        className={`mt-0.5 text-[12px] leading-relaxed ${
                          online ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        {online ? t("liveChatOnlineDesc") : t("liveChatOfflineDesc")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick CTAs (online: call ; offline: IA chatbot) */}
                <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                  {online && telHref && (
                    <a
                      href={telHref}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {t("liveChatCallNow")}
                      {displayPhone && (
                        <span className="font-mono text-[11px] text-brand-600">
                          {displayPhone}
                        </span>
                      )}
                    </a>
                  )}
                  {!online && (
                    <button
                      type="button"
                      onClick={() => {
                        closeAndReset();
                        // Defer so our panel close doesn't race with the
                        // chatbot open.
                        setTimeout(openChatbot, 250);
                      }}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      {t("liveChatUseBot")}
                    </button>
                  )}
                </div>

                {/* Quick message form (saves to messages table) */}
                {sent ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                    <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-800">
                      {t("liveChatSent")}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setSent(false)}
                    >
                      <MessageSquare className="me-1.5 h-3.5 w-3.5" />
                      {lang === "ar" ? "رسالة أخرى" : "Autre message"}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-3">
                    <div>
                      <Label htmlFor="lc-name" className="mb-1 block text-xs font-medium text-slate-700">
                        {t("liveChatName")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="lc-name"
                        ref={nameRef}
                        value={form.name}
                        onChange={set("name")}
                        placeholder={t("liveChatName")}
                        required
                        maxLength={120}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lc-email" className="mb-1 block text-xs font-medium text-slate-700">
                        {t("liveChatEmail")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="lc-email"
                        type="email"
                        value={form.email}
                        onChange={set("email")}
                        placeholder={t("liveChatEmail")}
                        required
                        maxLength={160}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lc-phone" className="mb-1 block text-xs font-medium text-slate-700">
                        {t("liveChatPhone")}
                      </Label>
                      <Input
                        id="lc-phone"
                        type="tel"
                        value={form.phone}
                        onChange={set("phone")}
                        placeholder={t("liveChatPhone")}
                        maxLength={40}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lc-msg" className="mb-1 block text-xs font-medium text-slate-700">
                        {t("liveChatMessage")} <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="lc-msg"
                        value={form.message}
                        onChange={set("message")}
                        placeholder={t("liveChatMessage")}
                        required
                        maxLength={2000}
                        className="min-h-[100px]"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={sending}
                      className="w-full bg-brand-700 hover:bg-brand-800"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                          {t("liveChatSending")}
                        </>
                      ) : (
                        <>
                          <Send className="me-1.5 h-4 w-4" />
                          {t("liveChatSend")}
                        </>
                      )}
                    </Button>
                  </form>
                )}

                {/* Tiny footer hint */}
                <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <Clock className="h-3 w-3" />
                  <span>
                    {lang === "ar"
                      ? "الأحد–الخميس · 8:00–16:30 (الجزائر)"
                      : "Dim–Jeu · 8h00–16h30 (Algérie)"}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default LiveChatWidget;
