"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Headphones,
  X,
  Send,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n";
import { toast } from "@/components/ui/sonner";

// ============================================================
// LiveChatWidget — REAL-TIME chat with a human ODG agent
// (Task BONUS-2)
//
// Position: floating button bottom-right, ABOVE the ChatbotWidget
// launcher (bottom-24 right-5 / sm:bottom-28 sm:right-6) so it
// doesn't overlap.
//
// Flow:
//   1. On open → GET /api/chat-live to fetch the server-side
//      business-hours status (cached 30s at the edge).
//   2. ONLINE  → small form (name + email + optional phone) →
//      POST /api/chat-live { action: "start" } → get conversationId.
//      Then a real chat UI: send messages + poll every 3s for
//      agent replies. conversationId is persisted in sessionStorage
//      so a page refresh keeps the thread.
//   3. OFFLINE → offline message form (name + email + message) →
//      POST /api/chat-live { action: "offline" } → stored in the
//      `messages` table + emailed to ODG staff. The visitor gets
//      a reply by email when business resumes.
//
// Polling:
//   - 3s interval via setInterval.
//   - Stops when the panel is closed (cleared on unmount too).
//   - Each poll asks for agent messages newer than the newest one
//     we've already seen (so we don't re-render the whole thread).
// ============================================================

interface SessionInfo {
  online: boolean;
  now: string;
}

interface AgentMessage {
  id: string;
  sender: "agent";
  content: string;
  createdAt: string;
}

interface LocalBubble {
  id: string;       // client-side id (for optimistic rendering)
  sender: "client" | "agent";
  content: string;
  ts: number;
}

const SESSIONSTORAGE_KEY = "odg-livechat-conv";
const POLL_INTERVAL_MS = 3000;

function timeLabel(iso: string | number): string {
  try {
    const d = typeof iso === "number" ? new Date(iso) : new Date(iso);
    return d.toLocaleTimeString("fr-DZ", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Algiers",
    });
  } catch {
    return "";
  }
}

export function LiveChatWidget() {
  const { t, lang } = useTranslation();

  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Start form
  const [startForm, setStartForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [starting, setStarting] = useState(false);

  // Conversation state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalBubble[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Offline form
  const [offlineForm, setOfflineForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [offlineSending, setOfflineSending] = useState(false);
  const [offlineSent, setOfflineSent] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPollRef = useRef<string | null>(null); // ISO of newest agent msg seen

  // ---- Restore conversationId from sessionStorage (survives refresh) ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = sessionStorage.getItem(SESSIONSTORAGE_KEY);
      if (saved) {
        // Basic UUID shape check before trusting it.
        if (/^[0-9a-f-]{36}$/i.test(saved)) {
          setConversationId(saved);
        }
      }
    } catch {
      /* sessionStorage may be unavailable (private mode) */
    }
  }, []);

  // ---- Fetch business-hours status whenever the panel opens ----
  const refreshSession = useCallback(async () => {
    setSessionLoading(true);
    try {
      const res = await fetch("/api/chat-live", { cache: "no-store" });
      const data = await res.json();
      setSession({
        online: Boolean(data?.online),
        now: data?.now || new Date().toISOString(),
      });
    } catch {
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

  // ---- Focus first field when the start form is shown ----
  useEffect(() => {
    if (open && !conversationId) {
      const id = setTimeout(() => nameRef.current?.focus(), 250);
      return () => clearTimeout(id);
    }
  }, [open, conversationId]);

  // ---- Auto-scroll to bottom on new messages ----
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // ---- Polling for agent replies ----
  const pollOnce = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await fetch("/api/chat-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "poll",
          conversationId,
          since: lastPollRef.current,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const incoming: AgentMessage[] = Array.isArray(data?.messages)
        ? data.messages
        : [];
      if (incoming.length > 0) {
        setMessages((prev) => [
          ...prev,
          ...incoming.map((m) => ({
            id: m.id,
            sender: "agent" as const,
            content: m.content,
            ts: new Date(m.createdAt).getTime(),
          })),
        ]);
        // Update the high-water mark so the next poll only asks for
        // newer messages.
        const newest = incoming[incoming.length - 1].createdAt;
        lastPollRef.current = newest;
      }
    } catch {
      /* network blip — keep polling */
    }
  }, [conversationId]);

  // Start / stop the poller whenever the panel opens and we have a conv.
  useEffect(() => {
    if (open && conversationId) {
      // Immediate poll, then interval.
      pollOnce();
      pollTimerRef.current = setInterval(pollOnce, POLL_INTERVAL_MS);
      return () => {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };
    }
    // Always make sure we clean up.
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [open, conversationId, pollOnce]);

  const online = Boolean(session?.online);

  // ---- Handlers ----
  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (starting) return;
    if (!startForm.name.trim() || !startForm.email.trim()) {
      toast.error(t("liveChatRTRequired"));
      return;
    }
    setStarting(true);
    try {
      const res = await fetch("/api/chat-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          name: startForm.name.trim(),
          email: startForm.email.trim(),
          phone: startForm.phone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erreur");
      }
      const id = data.conversationId;
      setConversationId(id);
      try {
        sessionStorage.setItem(SESSIONSTORAGE_KEY, id);
      } catch {
        /* ignore */
      }
      // Seed with a small welcome bubble so the visitor sees the
      // thread is alive even before the agent replies.
      setMessages([
        {
          id: "welcome",
          sender: "agent",
          content:
            lang === "ar"
              ? "مرحبا 👋 أنا مستشار ODG. كيف يمكنني مساعدتك اليوم؟"
              : "Bonjour 👋 Je suis un conseiller ODG. Comment puis-je vous aider aujourd'hui ?",
          ts: Date.now(),
        },
      ]);
      lastPollRef.current = new Date().toISOString();
    } catch (err: any) {
      toast.error(err?.message || t("liveChatRTError"));
    } finally {
      setStarting(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending || !conversationId) return;
    // Optimistic: render the bubble immediately with a temp id.
    const tempId = "tmp-" + Date.now();
    setMessages((prev) => [
      ...prev,
      { id: tempId, sender: "client", content, ts: Date.now() },
    ]);
    setDraft("");
    setSending(true);
    try {
      const res = await fetch("/api/chat-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          conversationId,
          content,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur");
      // Replace temp id with real one (keeps the order stable).
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: data.id || tempId, ts: Date.now() }
            : m
        )
      );
    } catch (err: any) {
      // Mark the optimistic bubble as failed (red tint) — but keep
      // it so the user can copy + retry.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, id: "failed-" + tempId } : m
        )
      );
      toast.error(err?.message || t("liveChatRTError"));
    } finally {
      setSending(false);
    }
  };

  const handleOffline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (offlineSending) return;
    if (
      !offlineForm.name.trim() ||
      !offlineForm.email.trim() ||
      !offlineForm.message.trim()
    ) {
      toast.error(t("liveChatRTRequired"));
      return;
    }
    setOfflineSending(true);
    try {
      const res = await fetch("/api/chat-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "offline",
          name: offlineForm.name.trim(),
          email: offlineForm.email.trim(),
          message: offlineForm.message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur");
      setOfflineSent(true);
      toast.success(t("liveChatRTOfflineSent"));
    } catch (err: any) {
      toast.error(err?.message || t("liveChatRTOfflineFailed"));
    } finally {
      setOfflineSending(false);
    }
  };

  const closePanel = () => {
    // Keep the conversation alive in sessionStorage — visitor can
    // reopen and continue. We just stop polling.
    setOpen(false);
  };

  const resetConversation = () => {
    // Used by the "Nouvelle conversation" button after the agent
    // closes the thread.
    setConversationId(null);
    setMessages([]);
    setDraft("");
    lastPollRef.current = null;
    try {
      sessionStorage.removeItem(SESSIONSTORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  // ---- Render helpers ----
  const showStartForm = online && !conversationId;
  const showChat = online && Boolean(conversationId);
  const showOffline = !online;

  return (
    <>
      {/* Floating launcher */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="livechat-rt-launcher"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => setOpen(true)}
            aria-label={t("liveChatRTOpen")}
            title={t("liveChatRTOpen")}
            className="fixed bottom-24 left-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-700 shadow-lg shadow-slate-900/15 ring-1 ring-slate-200 transition-colors hover:bg-brand-50 hover:text-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-200 sm:bottom-24 sm:left-6 sm:h-14 sm:w-14"
          >
            <Headphones className="h-5 w-5 sm:h-6 sm:w-6" />
            {/* Online/offline dot */}
            <span
              className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-white ${
                online ? "bg-emerald-500" : "bg-slate-400"
              }`}
              aria-hidden
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="livechat-rt-panel"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 bottom-0 z-50 sm:inset-x-auto sm:left-6 sm:bottom-24"
          >
            <div className="mx-auto flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:w-[400px] sm:rounded-2xl">
              {/* Mobile drag handle */}
              <div className="flex justify-center bg-brand-700 pt-2 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-white/40" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between gap-2 bg-brand-700 px-4 py-3 text-white">
                <div className="flex min-w-0 items-center gap-2.5">
                  {/* Back to "start form" if we're in chat mode */}
                  {showChat && (
                    <button
                      type="button"
                      onClick={resetConversation}
                      aria-label={t("liveChatRTClose")}
                      className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <Headphones className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-semibold">
                      {t("liveChatRTTitle")}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {sessionLoading ? (
                        <span className="text-[11px] text-brand-100">
                          {lang === "ar" ? "…" : "Chargement…"}
                        </span>
                      ) : online ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                          </span>
                          <span className="text-[11px] text-brand-100">
                            {t("liveChatRTOnline")}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex h-2 w-2 rounded-full bg-slate-300" />
                          <span className="text-[11px] text-brand-100">
                            {t("liveChatRTOffline")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-white hover:bg-white/15"
                  onClick={closePanel}
                  aria-label={t("liveChatRTClose")}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Body */}
              {showOffline ? (
                <OfflineBody
                  form={offlineForm}
                  setForm={setOfflineForm}
                  sending={offlineSending}
                  sent={offlineSent}
                  onSubmit={handleOffline}
                  t={t}
                  lang={lang}
                />
              ) : showStartForm ? (
                <StartBody
                  form={startForm}
                  setForm={setStartForm}
                  starting={starting}
                  onSubmit={handleStart}
                  nameRef={nameRef}
                  t={t}
                />
              ) : showChat ? (
                <ChatBody
                  messages={messages}
                  draft={draft}
                  setDraft={setDraft}
                  sending={sending}
                  onSubmit={handleSend}
                  messagesEndRef={messagesEndRef}
                  t={t}
                  lang={lang}
                />
              ) : (
                // sessionLoading + no session yet: small placeholder
                <div className="flex items-center justify-center bg-slate-50 px-4 py-12 text-sm text-slate-500">
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {lang === "ar" ? "…" : "Chargement…"}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================
// Sub-components (kept in the same file to keep the diff small).
// ============================================================

function StartBody({
  form,
  setForm,
  starting,
  onSubmit,
  nameRef,
  t,
}: {
  form: { name: string; email: string; phone: string };
  setForm: React.Dispatch<
    React.SetStateAction<{ name: string; email: string; phone: string }>
  >;
  starting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  nameRef: React.RefObject<HTMLInputElement | null>;
  t: (k: any) => string;
}) {
  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4">
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-800">
              {t("liveChatRTOnline")}
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-emerald-700">
              {t("liveChatRTOnlineDesc")}
            </p>
          </div>
        </div>
      </div>
      <p className="mb-3 text-sm text-slate-600">{t("liveChatRTIntro")}</p>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <Label
            htmlFor="lcrt-name"
            className="mb-1 block text-xs font-medium text-slate-700"
          >
            {t("liveChatRTName")} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="lcrt-name"
            ref={nameRef}
            value={form.name}
            onChange={set("name")}
            placeholder={t("liveChatRTName")}
            required
            maxLength={120}
            disabled={starting}
          />
        </div>
        <div>
          <Label
            htmlFor="lcrt-email"
            className="mb-1 block text-xs font-medium text-slate-700"
          >
            {t("liveChatRTEmail")} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="lcrt-email"
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder={t("liveChatRTEmail")}
            required
            maxLength={160}
            disabled={starting}
          />
        </div>
        <div>
          <Label
            htmlFor="lcrt-phone"
            className="mb-1 block text-xs font-medium text-slate-700"
          >
            {t("liveChatRTPhone")}
          </Label>
          <Input
            id="lcrt-phone"
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            placeholder={t("liveChatRTPhone")}
            maxLength={40}
            disabled={starting}
          />
        </div>
        <Button
          type="submit"
          disabled={starting}
          className="w-full bg-brand-700 hover:bg-brand-800"
        >
          {starting ? (
            <>
              <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
              {t("liveChatRTStarting")}
            </>
          ) : (
            <>
              <MessageSquare className="me-1.5 h-4 w-4" />
              {t("liveChatRTStart")}
            </>
          )}
        </Button>
      </form>
      <HoursNote />
    </div>
  );
}

function ChatBody({
  messages,
  draft,
  setDraft,
  sending,
  onSubmit,
  messagesEndRef,
  t,
  lang,
}: {
  messages: LocalBubble[];
  draft: string;
  setDraft: React.Dispatch<React.SetStateAction<string>>;
  sending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  t: (k: any) => string;
  lang: "fr" | "ar";
}) {
  return (
    <div className="flex h-[60vh] min-h-[380px] flex-col bg-slate-50 sm:h-[460px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-2.5">
          {messages.map((m) => {
            const isClient = m.sender === "client";
            const failed = m.id.startsWith("failed-");
            return (
              <div
                key={m.id}
                className={`flex ${isClient ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                    isClient
                      ? failed
                        ? "bg-red-100 text-red-900"
                        : "bg-brand-700 text-white"
                      : "bg-white text-slate-800 ring-1 ring-slate-200"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isClient
                        ? failed
                          ? "text-red-600"
                          : "text-brand-100"
                        : "text-slate-400"
                    }`}
                  >
                    {failed
                      ? lang === "ar"
                        ? "فشل الإرسال"
                        : "Échec"
                      : timeLabel(m.ts)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Composer */}
      <form
        onSubmit={onSubmit}
        className="flex items-end gap-2 border-t border-slate-200 bg-white px-3 py-2.5"
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("liveChatRTPlaceholder")}
          rows={1}
          maxLength={4000}
          disabled={sending}
          className="min-h-[40px] max-h-32 flex-1 resize-none text-sm"
          onKeyDown={(e) => {
            // Enter to send, Shift+Enter for newline.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e as unknown as React.FormEvent);
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={sending || !draft.trim()}
          className="h-9 w-9 shrink-0 bg-brand-700 hover:bg-brand-800"
          aria-label={t("liveChatRTSend")}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}

function OfflineBody({
  form,
  setForm,
  sending,
  sent,
  onSubmit,
  t,
  lang,
}: {
  form: { name: string; email: string; message: string };
  setForm: React.Dispatch<
    React.SetStateAction<{ name: string; email: string; message: string }>
  >;
  sending: boolean;
  sent: boolean;
  onSubmit: (e: React.FormEvent) => void;
  t: (k: any) => string;
  lang: "fr" | "ar";
}) {
  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4">
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-800">
              {t("liveChatRTOffline")}
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-amber-700">
              {t("liveChatRTOfflineDesc")}
            </p>
          </div>
        </div>
      </div>

      {sent ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
          <p className="text-sm font-semibold text-emerald-800">
            {t("liveChatRTOfflineSent")}
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label
              htmlFor="lcrt-off-name"
              className="mb-1 block text-xs font-medium text-slate-700"
            >
              {t("liveChatRTName")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lcrt-off-name"
              value={form.name}
              onChange={set("name")}
              placeholder={t("liveChatRTName")}
              required
              maxLength={120}
              disabled={sending}
            />
          </div>
          <div>
            <Label
              htmlFor="lcrt-off-email"
              className="mb-1 block text-xs font-medium text-slate-700"
            >
              {t("liveChatRTEmail")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lcrt-off-email"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder={t("liveChatRTEmail")}
              required
              maxLength={160}
              disabled={sending}
            />
          </div>
          <div>
            <Label
              htmlFor="lcrt-off-msg"
              className="mb-1 block text-xs font-medium text-slate-700"
            >
              {t("liveChatRTMessageLabel")} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="lcrt-off-msg"
              value={form.message}
              onChange={set("message")}
              placeholder={t("liveChatRTMessageLabel")}
              required
              maxLength={2000}
              className="min-h-[100px]"
              disabled={sending}
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
                {t("liveChatRTSending")}
              </>
            ) : (
              <>
                <Send className="me-1.5 h-4 w-4" />
                {t("liveChatRTSend")}
              </>
            )}
          </Button>
        </form>
      )}
      <HoursNote />
    </div>
  );
}

function HoursNote() {
  return (
    <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
      <Clock className="h-3 w-3" />
      <span>Dim–Jeu · 8h00–16h30 (Algérie)</span>
    </div>
  );
}

export default LiveChatWidget;
