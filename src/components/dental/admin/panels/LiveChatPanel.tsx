"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Headphones,
  Send,
  Loader2,
  RefreshCw,
  XCircle,
  Mail,
  Phone,
  Clock,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { useAdminSession } from "@/hooks/useAdminSession";

// ============================================================
// LiveChatPanel — admin inbox for real-time visitor chats
// (Task BONUS-2)
//
// Layout:
//   ┌───────────────┬────────────────────────────────────┐
//   │ Conversation  │ Active conversation                │
//   │ list (left)   │  - visitor info                    │
//   │               │  - message thread                  │
//   │               │  - reply composer                  │
//   │               │  - "Close" button                  │
//   └───────────────┴────────────────────────────────────┘
//
// Polling:
//   - List: GET /api/admin/chat-live every 5s (cheap).
//   - Active thread: POST /api/admin/chat-live { action: "poll" }
//     every 3s (faster so the agent sees new client messages
//     promptly).
//   - Both stop when the panel unmounts.
//
// Role gate (defense in depth — AdminPage already filters the nav
// item, but we double-check here):
//   super_admin | manager | commercial.
// ============================================================

interface Conversation {
  id: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  status: "waiting" | "active" | "closed";
  assigned_to: string | null;
  last_msg_at: string | null;
  created_at: string;
  updated_at: string;
  last_message: {
    sender: string;
    content: string;
    created_at: string;
  } | null;
}

interface AdminMessage {
  id: string;
  sender: "client" | "agent";
  content: string;
  created_at: string;
}

const LIST_POLL_MS = 5000;
const THREAD_POLL_MS = 3000;

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `il y a ${days} j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function statusBadge(status: Conversation["status"]) {
  if (status === "waiting") {
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
        En attente
      </Badge>
    );
  }
  if (status === "active") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
        Active
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-200">
      Clôturée
    </Badge>
  );
}

export function LiveChatPanel() {
  const { user } = useAdminSession();
  const role = user?.role;

  const allowed =
    role === "super_admin" || role === "manager" || role === "commercial";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const threadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeIdRef = useRef<string | null>(null);

  // ---- Fetch conversation list ----
  const refreshList = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/chat-live?status=active,waiting,closed&limit=50", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.tableMissing) setTableMissing(true);
        setListError(data?.error || `HTTP ${res.status}`);
        setConversations([]);
        return;
      }
      setTableMissing(false);
      setListError(null);
      setConversations(Array.isArray(data?.conversations) ? data.conversations : []);
    } catch (e: any) {
      setListError(e?.message || "Erreur réseau");
    } finally {
      setListLoading(false);
    }
  }, []);

  // ---- Fetch thread for selected conversation ----
  const refreshThread = useCallback(async () => {
    const id = activeIdRef.current;
    if (!id) return;
    try {
      const res = await fetch("/api/admin/chat-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id, action: "poll" }),
      });
      const data = await res.json();
      if (!res.ok) return;
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      setConv(data?.conversation || null);
    } catch {
      /* keep last known state */
    } finally {
      setThreadLoading(false);
    }
  }, []);

  // ---- Initial list load ----
  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // ---- List poller (every 5s) ----
  useEffect(() => {
    listTimerRef.current = setInterval(refreshList, LIST_POLL_MS);
    return () => {
      if (listTimerRef.current) {
        clearInterval(listTimerRef.current);
        listTimerRef.current = null;
      }
    };
  }, [refreshList]);

  // ---- Thread poller (every 3s) when a conversation is selected ----
  useEffect(() => {
    activeIdRef.current = selectedId;
    if (!selectedId) {
      setMessages([]);
      setConv(null);
      return;
    }
    setThreadLoading(true);
    refreshThread();
    threadTimerRef.current = setInterval(refreshThread, THREAD_POLL_MS);
    return () => {
      if (threadTimerRef.current) {
        clearInterval(threadTimerRef.current);
        threadTimerRef.current = null;
      }
    };
  }, [selectedId, refreshThread]);

  // ---- Auto-scroll to newest message ----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- Reply handler ----
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    const content = draft.trim();
    if (!content || sending) return;
    // Optimistic: insert immediately with a temp id.
    const tempId = "tmp-" + Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender: "agent",
        content,
        created_at: new Date().toISOString(),
      },
    ]);
    setDraft("");
    setSending(true);
    try {
      const res = await fetch("/api/admin/chat-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur");
      toast.success("Réponse envoyée");
      // Refresh thread immediately so the temp bubble is replaced
      // with the real one (with the server-issued id + timestamp).
      refreshThread();
      // Also refresh the list so last_msg_at / preview update.
      refreshList();
    } catch (err: any) {
      toast.error(err?.message || "Échec de l'envoi");
      // Remove the optimistic bubble on failure.
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!selectedId || closing) return;
    const ok = window.confirm("Clôturer cette conversation ?");
    if (!ok) return;
    setClosing(true);
    try {
      const res = await fetch("/api/admin/chat-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, action: "close" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur");
      toast.success("Conversation clôturée");
      refreshThread();
      refreshList();
    } catch (err: any) {
      toast.error(err?.message || "Échec");
    } finally {
      setClosing(false);
    }
  };

  // ---- Access denied (defense in depth) ----
  if (!allowed) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-600" />
          <h3 className="text-lg font-semibold text-red-900">Accès refusé</h3>
          <p className="max-w-md text-sm text-red-700">
            Seuls les rôles <strong>manager</strong>, <strong>commercial</strong>{" "}
            et <strong>super_admin</strong> peuvent accéder au chat en direct.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Headphones className="h-5 w-5 text-brand-700" />
            Chat en direct
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Répondez en temps réel aux visiteurs du site (polling 3s).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshList}
          disabled={listLoading}
        >
          {listLoading ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
          )}
          Actualiser
        </Button>
      </div>

      {tableMissing && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">
                Tables live_chat_conversations / live_chat_messages introuvables
              </p>
              <p className="mt-1">
                Exécutez le script <code>supabase-live-chat.sql</code> dans le
                Supabase Dashboard (SQL Editor) pour créer les tables + les RLS
                policies. La fonctionnalité restera vide tant que la table est
                absente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {listError && !tableMissing && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="text-sm text-red-800">
              <p className="font-semibold">Erreur de chargement</p>
              <p className="mt-0.5">{listError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main grid: list + thread */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <Card className="flex h-[70vh] min-h-[480px] flex-col">
          <CardContent className="flex flex-1 flex-col p-0">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <MessageSquare className="h-4 w-4 text-brand-700" />
                Conversations
                <span className="ms-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {conversations.length}
                </span>
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {listLoading && conversations.length === 0 ? (
                <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement…
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                  <MessageSquare className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-500">
                    Aucune conversation. Les nouvelles demandes
                    apparaîtront ici automatiquement.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {conversations.map((c) => {
                    const isSelected = c.id === selectedId;
                    const isClosed = c.status === "closed";
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(c.id)}
                          className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors ${
                            isSelected
                              ? "bg-brand-50"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                              {c.client_name || "Visiteur"}
                            </span>
                            {statusBadge(c.status)}
                          </div>
                          <p className="line-clamp-1 text-xs text-slate-500">
                            {c.last_message
                              ? c.last_message.content
                              : c.client_email || "—"}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatRelative(c.last_msg_at || c.updated_at)}
                            </span>
                            {c.assigned_to && (
                              <span className="ms-auto rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500">
                                {c.assigned_to === user?.id ? "Vous" : "Assignée"}
                              </span>
                            )}
                          </div>
                          {isClosed && (
                            <span className="mt-0.5 text-[11px] text-slate-400">
                              Conversation clôturée
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Thread */}
        <Card className="flex h-[70vh] min-h-[480px] flex-col">
          <CardContent className="flex flex-1 flex-col p-0">
            {!selectedId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <Headphones className="h-12 w-12 text-slate-300" />
                <p className="text-sm text-slate-500">
                  Sélectionnez une conversation pour répondre.
                </p>
              </div>
            ) : (
              <>
                {/* Thread header: visitor info */}
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {conv?.client_name || "Visiteur"}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        {conv?.client_email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{conv.client_email}</span>
                          </span>
                        )}
                        {conv?.client_phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{conv.client_phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {conv && statusBadge(conv.status)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClose}
                        disabled={
                          closing || !conv || conv.status === "closed"
                        }
                      >
                        {closing ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Clôturer
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Messages */}
                <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-3">
                  {threadLoading && messages.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement…
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                      <MessageSquare className="h-8 w-8 text-slate-300" />
                      <p className="text-sm text-slate-500">
                        Aucun message encore. Le visiteur n&apos;a peut-être
                        rien envoyé.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {messages.map((m) => {
                        const isAgent = m.sender === "agent";
                        return (
                          <div
                            key={m.id}
                            className={`flex ${
                              isAgent ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                                isAgent
                                  ? "bg-brand-700 text-white"
                                  : "bg-white text-slate-800 ring-1 ring-slate-200"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">
                                {m.content}
                              </p>
                              <p
                                className={`mt-1 text-[10px] ${
                                  isAgent ? "text-brand-100" : "text-slate-400"
                                }`}
                              >
                                {isAgent ? "Vous · " : ""}
                                {formatTime(m.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Composer */}
                <div className="border-t border-slate-200 bg-white px-3 py-2.5">
                  <form
                    onSubmit={handleSend}
                    className="flex items-end gap-2"
                  >
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Votre réponse…"
                      rows={1}
                      maxLength={4000}
                      disabled={
                        sending || conv?.status === "closed"
                      }
                      className="min-h-[40px] max-h-32 flex-1 resize-none text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e as unknown as React.FormEvent);
                        }
                      }}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={
                        sending ||
                        !draft.trim() ||
                        conv?.status === "closed"
                      }
                      className="h-9 w-9 shrink-0 bg-brand-700 hover:bg-brand-800"
                      aria-label="Répondre"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                  {conv?.status === "closed" && (
                    <p className="mt-1.5 text-center text-xs text-slate-400">
                      Conversation clôturée — rouvrez-la en répondant (non
                      disponible dans cette version).
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default LiveChatPanel;
