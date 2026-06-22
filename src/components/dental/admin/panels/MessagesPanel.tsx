"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Mail,
  Phone,
  PhoneCall,
  Copy,
  Trash2,
  Check,
  MailOpen,
  Loader2,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n";

interface MessageRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  subject: string | null;
  body: string | null;
  read: boolean | null;
  created_at?: string;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d[\d\s.-]{7,}\d)/g;

function sanitizePhone(p: string): string {
  return p.replace(/[\s.-]/g, "");
}

function formatDate(iso?: string, lang: "fr" | "ar" = "fr"): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(lang === "ar" ? "ar-DZ" : "fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// Build React nodes from a string, turning detected emails/phones into clickable links.
function renderTextWithLinks(text: string | null | undefined, keyPrefix: string) {
  if (!text) return null;
  type Match = { type: "email" | "phone"; value: string; start: number; end: number };
  const matches: Match[] = [];
  let m: RegExpExecArray | null;
  const emailRe = new RegExp(EMAIL_RE.source, "g");
  while ((m = emailRe.exec(text)) !== null) {
    matches.push({ type: "email", value: m[0], start: m.index, end: m.index + m[0].length });
  }
  const phoneRe = new RegExp(PHONE_RE.source, "g");
  while ((m = phoneRe.exec(text)) !== null) {
    matches.push({ type: "phone", value: m[0], start: m.index, end: m.index + m[0].length });
  }
  matches.sort((a, b) => a.start - b.start);
  // Remove overlaps (keep earliest)
  const filtered: Match[] = [];
  let lastEnd = -1;
  for (const mt of matches) {
    if (mt.start > lastEnd) {
      filtered.push(mt);
      lastEnd = mt.end;
    }
  }

  const nodes: React.ReactNode[] = [];
  let pos = 0;
  filtered.forEach((mt, i) => {
    if (pos < mt.start) {
      nodes.push(<span key={`${keyPrefix}-t${i}`}>{text.slice(pos, mt.start)}</span>);
    }
    if (mt.type === "email") {
      nodes.push(
        <a
          key={`${keyPrefix}-e${i}`}
          href={`mailto:${mt.value}`}
          className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
        >
          {mt.value}
        </a>
      );
    } else {
      nodes.push(
        <a
          key={`${keyPrefix}-p${i}`}
          href={`tel:${sanitizePhone(mt.value)}`}
          className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
        >
          {mt.value}
        </a>
      );
    }
    pos = mt.end;
  });
  if (pos < text.length) {
    nodes.push(<span key={`${keyPrefix}-end`}>{text.slice(pos)}</span>);
  }
  return nodes;
}

export function MessagesPanel() {
  const { lang, t } = useTranslation();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setTableMissing(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/messages", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        if (data?.tableMissing) setTableMissing(true);
        setError(data?.error || `HTTP ${res.status}`);
        setMessages([]);
      } else {
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markRead = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/messages?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, read: true } : m))
      );
    } catch (e: any) {
      toast.error(e?.message || "Erreur réseau");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/messages?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== id));
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e?.message || "Erreur réseau");
    } finally {
      setBusyId(null);
    }
  };

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success(t("copied"));
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement("textarea");
      ta.value = email;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        toast.success(t("copied"));
      } catch {
        toast.error("Copie impossible");
      }
      document.body.removeChild(ta);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex animate-pulse flex-col gap-2">
                <div className="h-4 w-1/3 rounded bg-slate-200" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
                <div className="h-3 w-full rounded bg-slate-100" />
                <div className="h-3 w-2/3 rounded bg-slate-100" />
              </div>
            </CardContent>
          </Card>
        ))}
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t("loading")}</span>
        </div>
      </div>
    );
  }

  if (tableMissing) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900">{t("tableMissingNotice")}</p>
            <Button size="sm" variant="outline" onClick={refresh} className="mt-2">
              {t("retry")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-red-900">{error}</p>
            <Button size="sm" variant="outline" onClick={refresh} className="mt-2">
              {t("retry")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <Inbox className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">{t("noMessages")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => {
        const isUnread = msg.read !== true;
        const email = (msg.email || "").trim();
        const phone = (msg.phone || "").trim();
        return (
          <Card
            key={msg.id}
            className={
              isUnread
                ? "border-brand-200 bg-brand-50/30 shadow-sm"
                : "border-slate-200 bg-white"
            }
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {msg.name || "—"}
                    </h3>
                    {isUnread ? (
                      <Badge variant="warning">{t("unread")}</Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" />
                        {t("markAsRead")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDate(msg.created_at, lang)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {isUnread && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markRead(msg.id)}
                      disabled={busyId === msg.id}
                    >
                      {busyId === msg.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MailOpen className="h-3.5 w-3.5" />
                      )}
                      {t("markAsRead")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(msg.id)}
                    disabled={busyId === msg.id}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("delete")}
                  </Button>
                </div>
              </div>

              {/* Contact rows */}
              {(email || phone) && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {email && (
                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                      <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                      <a
                        href={`mailto:${email}`}
                        className="min-w-0 truncate text-sm font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
                        title={email}
                      >
                        {email}
                      </a>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="ml-auto h-7 w-7"
                        onClick={() => copyEmail(email)}
                        aria-label={t("copyEmail")}
                        title={t("copyEmail")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  {phone && (
                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                      <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                      <a
                        href={`tel:${sanitizePhone(phone)}`}
                        className="min-w-0 truncate text-sm font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
                        title={phone}
                      >
                        {phone}
                      </a>
                      <a
                        href={`tel:${sanitizePhone(phone)}`}
                        className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-50"
                        aria-label={t("call")}
                        title={t("call")}
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {msg.subject && (
                <>
                  <Separator className="my-3" />
                  <div className="text-sm">
                    <span className="font-semibold text-slate-700">{t("subject")}: </span>
                    <span className="text-slate-800">
                      {renderTextWithLinks(msg.subject, `s-${msg.id}`)}
                    </span>
                  </div>
                </>
              )}

              {msg.body && (
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {renderTextWithLinks(msg.body, `b-${msg.id}`)}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default MessagesPanel;
