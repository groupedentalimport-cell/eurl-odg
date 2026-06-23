"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Phone,
  Mail,
  FileText,
  ShoppingCart,
  Globe,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { T, useTranslation, type TKey } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { useData, getProductImageUrl } from "@/lib/data-service";
import { useCompanyInfo } from "@/lib/settings-service";
import { placeholderImage } from "@/lib/supabase";
import type { Language, Product } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ts?: number;
}

const STORAGE_KEY = "odg-chat-history";
const OPENED_KEY = "odg-chat-opened";

// --- Action button detection ----------------------------------------------
type ActionType = "quote" | "call" | "whatsapp" | "catalogue" | "contact";

const ACTION_KEYWORDS: { type: ActionType; re: RegExp }[] = [
  { type: "quote", re: /devis|prix|tarif|co[uû]t|quote|price|عرض سعر|سعر/i },
  { type: "call", re: /t[eé]l[eé]phone|phone|appeler|call|اتصل|هاتف/i },
  { type: "whatsapp", re: /whatsapp|واتساب/i },
  { type: "catalogue", re: /catalogue|produit|product|كتالوج|منتج/i },
  { type: "contact", re: /contact|email|e-mail|اتصل بنا|بريد/i },
];

function detectActions(reply: string): ActionType[] {
  const found: ActionType[] = [];
  for (const { type, re } of ACTION_KEYWORDS) {
    if (re.test(reply)) found.push(type);
    if (found.length >= 3) break;
  }
  return found;
}

// --- Product detection -----------------------------------------------------
function detectProducts(reply: string, products: Product[]): Product[] {
  const lower = reply.toLowerCase();
  const found: Product[] = [];
  for (const p of products) {
    const nameFr = (p.name.fr || "").toLowerCase();
    const nameAr = p.name.ar || "";
    const slug = (p.slug || "").toLowerCase();
    const model = (p.model || "").toLowerCase();
    const brand = (p.brand || "").toLowerCase();
    const matchByNameFr = nameFr.length > 3 && lower.includes(nameFr);
    const matchByNameAr = nameAr.length > 3 && reply.includes(nameAr);
    const matchBySlug = slug.length > 3 && lower.includes(slug);
    const matchByBrandModel =
      brand.length > 1 && model.length > 1 && lower.includes(`${brand} ${model}`);
    if (matchByNameFr || matchByNameAr || matchBySlug || matchByBrandModel) {
      found.push(p);
      if (found.length >= 2) break;
    }
  }
  return found;
}

// --- Contextual suggestions ------------------------------------------------
function getSuggestions(reply: string, t: (k: TKey) => string): string[] {
  const lower = reply.toLowerCase();
  if (/fauteuil|كرسي|silver fox/.test(lower)) {
    return [t("chatSuggestionAutoclaves"), t("chatSuggestionComparer"), t("chatActionQuote")];
  }
  if (/devis|prix|tarif|عرض سعر|سعر/.test(lower)) {
    return [t("chatSuggestionForm"), t("chatSuggestionCall"), t("chatSuggestionWhatsapp")];
  }
  if (/autoclave|st[eé]rilis|icanclave|تعقيم/.test(lower)) {
    return [t("chatSuggestionComparer"), t("chatActionQuote"), t("chatSuggestionFauteuils")];
  }
  if (/radiolog|owandy|أشعة/.test(lower)) {
    return [t("chatSuggestionFauteuils"), t("chatSuggestionAutoclaves"), t("chatActionQuote")];
  }
  // Default
  return [t("suggestion1"), t("suggestion2"), t("suggestion3")];
}

// --- Helpers ---------------------------------------------------------------
function formatTime(ts: number, lang: Language): string {
  try {
    return new Date(ts).toLocaleTimeString(lang === "ar" ? "ar-DZ" : "fr-DZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

const WELCOME_FR = T.chatRichWelcome.fr;
const WELCOME_AR = T.chatRichWelcome.ar;

function makeWelcome(t: (k: TKey) => string): ChatMessage[] {
  return [{ role: "assistant", content: t("chatRichWelcome"), ts: Date.now() }];
}

export function ChatbotWidget() {
  const { t, lang, setLang, toggle } = useTranslation();
  const { products } = useData();
  const company = useCompanyInfo();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => makeWelcome(t));

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Phone links (tel: + wa.me)
  const telHref = useMemo(() => {
    const raw = (company?.phone ?? "").trim();
    if (!raw) return "";
    return `tel:${raw.replace(/\s+/g, "")}`;
  }, [company?.phone]);

  const waHref = useMemo(() => {
    const raw = (company?.phone ?? "").trim();
    if (!raw) return "";
    const digits = raw.replace(/[^\d]/g, "");
    if (!digits) return "";
    return `https://wa.me/${digits}`;
  }, [company?.phone]);

  // --- Mount: load persisted history + first-open flag ---
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
      if (localStorage.getItem(OPENED_KEY) === "1") {
        setHasOpened(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // --- Persist history ---
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages, mounted]);

  // --- Re-translate the welcome when language changes (only if it's still the welcome) ---
  useEffect(() => {
    setMessages((prev) => {
      if (
        prev.length === 1 &&
        prev[0].role === "assistant" &&
        (prev[0].content === WELCOME_FR || prev[0].content === WELCOME_AR)
      ) {
        return [{ ...prev[0], content: t("chatRichWelcome") }];
      }
      return prev;
    });
  }, [t]);

  // --- Auto-scroll ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing, open]);

  // --- Focus input when opened ---
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const openChat = useCallback(() => {
    setOpen(true);
    setHasOpened(true);
    try {
      localStorage.setItem(OPENED_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const resetConversation = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setMessages(makeWelcome(t));
    setTyping(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [t]);

  const send = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || typing) return;

      // Language auto-detection on the first user message
      let currentLang: Language = lang;
      if (messages.length <= 1 && /[\u0600-\u06FF]/.test(content)) {
        currentLang = "ar";
        setLang("ar");
      }

      const userMsg: ChatMessage = { role: "user", content, ts: Date.now() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setTyping(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            history: newMessages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
            lang: currentLang,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur");
        const reply: string = data.reply || "Désolé, je n'ai pas pu répondre.";
        setMessages((m) => [...m, { role: "assistant", content: reply, ts: Date.now() }]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "réessayez plus tard.";
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "Erreur: " + msg, ts: Date.now() },
        ]);
      } finally {
        setTyping(false);
      }
    },
    [input, typing, messages, lang, setLang]
  );

  // --- Render an action button (link or button) ---
  const renderActionButton = (a: ActionType) => {
    const baseCls =
      "inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 sm:w-auto";
    switch (a) {
      case "quote":
        return (
          <button
            key={a}
            onClick={() => {
              navigate("devis");
              setOpen(false);
            }}
            className={baseCls}
          >
            <FileText className="h-3.5 w-3.5" />
            {t("chatActionQuote")}
          </button>
        );
      case "call":
        return telHref ? (
          <a key={a} href={telHref} className={baseCls}>
            <Phone className="h-3.5 w-3.5" />
            {t("chatActionCall")}
          </a>
        ) : null;
      case "whatsapp":
        return waHref ? (
          <a
            key={a}
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={baseCls}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {t("chatActionWhatsapp")}
          </a>
        ) : null;
      case "catalogue":
        return (
          <button
            key={a}
            onClick={() => {
              navigate("catalogue");
              setOpen(false);
            }}
            className={baseCls}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {t("chatActionCatalogue")}
          </button>
        );
      case "contact":
        return (
          <button
            key={a}
            onClick={() => {
              navigate("contact");
              setOpen(false);
            }}
            className={baseCls}
          >
            <Mail className="h-3.5 w-3.5" />
            {t("chatActionContact")}
          </button>
        );
    }
  };

  // --- Render a mini product card ---
  const renderProductCard = (p: Product) => {
    const url = getProductImageUrl(p.images[0]);
    const imgSrc = url || placeholderImage(p.name[lang] || p.name.fr, 80, 80);
    return (
      <button
        key={p.id}
        onClick={() => {
          navigate(`produit/${p.slug}`);
          setOpen(false);
        }}
        className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-left transition-colors hover:border-brand-300 hover:bg-brand-50"
      >
        <img
          src={imgSrc}
          alt={p.name[lang] || p.name.fr}
          loading="lazy"
          className="h-10 w-10 shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-800">
            {p.name[lang] || p.name.fr}
          </p>
          <p className="truncate text-[11px] text-slate-500">
            {p.brand}
            {p.model ? ` • ${p.model}` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
          {t("view")}
        </span>
      </button>
    );
  };

  // Suggestions: show after the latest assistant reply (when not typing)
  const showSuggestions =
    !typing &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant";
  const suggestions = showSuggestions
    ? getSuggestions(messages[messages.length - 1].content, t)
    : [];

  return (
    <>
      {/* Floating launcher button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launcher"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={openChat}
            aria-label={t("openChat")}
            className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg shadow-brand-700/30 transition-colors hover:bg-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-200 sm:bottom-6 sm:right-6"
          >
            <MessageCircle className="h-6 w-6" />
            {/* Pulsing attention ring */}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-300 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-400" />
            </span>
            {/* First-open "1" badge to invite engagement */}
            {mounted && !hasOpened && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                1
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 bottom-0 z-50 sm:inset-x-auto sm:right-6 sm:bottom-6"
          >
            <div className="mx-auto flex h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-[600px] sm:w-[380px] sm:rounded-2xl">
              {/* Mobile drag handle */}
              <div className="flex justify-center bg-brand-700 pt-2 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-white/40" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between gap-2 bg-brand-700 px-4 py-3 text-white">
                <div className="flex min-w-0 items-center gap-2">
                  <img
                    src="/logo-odg.png"
                    alt="ODG"
                    className="h-7 w-auto shrink-0 rounded-sm bg-white/95 p-0.5"
                  />
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-semibold">{t("chatTitle")}</p>
                    <div className="flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                      </span>
                      <span className="text-[11px] text-brand-100">{t("chatOnline")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {/* Language toggle */}
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="Toggle language"
                    title={lang === "fr" ? "العربية" : "Français"}
                    className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-bold uppercase transition-colors hover:bg-white/15"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {lang === "fr" ? "AR" : "FR"}
                  </button>
                  {/* New conversation */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:bg-white/15"
                    onClick={resetConversation}
                    aria-label={t("chatNewConversation")}
                    title={t("chatNewConversation")}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  {/* Close */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:bg-white/15"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4"
              >
                {messages.map((m, i) => {
                  const isUser = m.role === "user";
                  const actions = !isUser ? detectActions(m.content) : [];
                  const mentioned = !isUser ? detectProducts(m.content, products) : [];
                  return (
                    <div
                      key={i}
                      className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                      <div
                        className={`flex max-w-[78%] flex-col ${isUser ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm ${
                            isUser
                              ? "rounded-br-sm bg-brand-700 text-white"
                              : "rounded-bl-sm bg-white text-slate-800"
                          }`}
                        >
                          {m.content}
                        </div>

                        {/* Action buttons (assistant only) */}
                        {!isUser && actions.length > 0 && (
                          <div className="mt-1.5 flex w-full flex-col gap-1.5 sm:flex-row sm:flex-wrap">
                            {actions.map((a) => renderActionButton(a))}
                          </div>
                        )}

                        {/* Product cards (assistant only) */}
                        {!isUser && mentioned.length > 0 && (
                          <div className="mt-2 w-full space-y-1.5">
                            {mentioned.map((p) => renderProductCard(p))}
                          </div>
                        )}

                        {/* Timestamp */}
                        {m.ts && (
                          <p
                            className={`mt-0.5 px-1 text-[10px] text-slate-400 ${
                              isUser ? "text-right" : "text-left"
                            }`}
                          >
                            {formatTime(m.ts, lang)}
                          </p>
                        )}
                      </div>
                      {isUser && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {typing && (
                  <div className="flex items-end gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-slate-300"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-slate-300"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-slate-300"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-400">{t("chatTypingODG")}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Contextual quick replies */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-3 py-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => send(s)}
                      className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-center gap-2 border-t border-slate-100 bg-white p-3"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("chatPlaceholder")}
                  disabled={typing}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={typing || !input.trim()}
                  className="h-10 w-10 shrink-0 bg-brand-700 hover:bg-brand-800"
                  aria-label={t("chatSend")}
                >
                  {typing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatbotWidget;
