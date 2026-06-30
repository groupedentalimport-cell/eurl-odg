"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Newspaper,
  Send,
  Users,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Mail,
  MailOpen,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { useAdminSession } from "@/hooks/useAdminSession";

// ============================================================
// NewsletterPanel — Task EMAIL-V3 (#14)
// ============================================================
// Admin UI for bulk-sending a newsletter to ALL subscribers.
//
// Layout:
//   1. Stats card (subscriber count + warning if approaching the
//      500/day Gmail limit).
//   2. Compose form (subject + HTML content textarea + "Send to all"
//      button). Calls POST /api/admin/newsletter/send.
//   3. Recent email logs (fetched from GET /api/admin/newsletter/send)
//      so the admin can audit what was sent.
//
// Role gating:
//   The nav item appears for manager + editor + super_admin (handled
//   in AdminPage via an inline permission check). As a defense-in-depth
//   measure, this panel ALSO checks the role on mount and shows an
//   "access denied" card if the user lacks permission.
// ============================================================

interface EmailLogRow {
  id: string;
  to_email: string;
  subject: string | null;
  template: string | null;
  status: string;
  error: string | null;
  message_id: string | null;
  created_at: string;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", {
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

function statusBadge(status: string) {
  switch (status) {
    case "sent":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
          Envoyé
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Échec</Badge>
      );
    case "skipped":
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
          Ignoré
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "sent":
      return <MailOpen className="h-3.5 w-3.5 text-emerald-600" />;
    case "failed":
      return <XCircle className="h-3.5 w-3.5 text-red-600" />;
    case "skipped":
      return <Mail className="h-3.5 w-3.5 text-amber-600" />;
    default:
      return <Mail className="h-3.5 w-3.5 text-slate-400" />;
  }
}

// Default HTML template injected into the compose textarea when the
// panel mounts — gives the admin a starting point instead of a blank
// box. Uses the same teal-on-white visual identity as the rest of the
// transactional emails.
const DEFAULT_HTML_TEMPLATE = `<h2 style="color:#0f766e;margin:0 0 12px;font-size:19px;font-family:Arial,sans-serif;">Titre de votre newsletter 📢</h2>
<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1e293b;">Bonjour,</p>
<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1e293b;">Rédigez votre message ici. Vous pouvez utiliser des balises HTML (&lt;strong&gt;, &lt;a&gt;, &lt;ul&gt;, &lt;li&gt;...).</p>
<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1e293b;">À très vite !<br><strong>OUADAH DENTAL GROUPE</strong></p>`;

export function NewsletterPanel() {
  const { user } = useAdminSession();
  const role = user?.role;

  // ---- Inline role gate (defense in depth — AdminPage already
  // filters this nav item, but we double-check here) ----
  const allowed =
    role === "super_admin" || role === "manager" || role === "editor";

  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [logs, setLogs] = useState<EmailLogRow[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState(DEFAULT_HTML_TEMPLATE);
  const [sending, setSending] = useState(false);

  const refreshDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    setTableMissing(false);
    try {
      const res = await fetch("/api/admin/newsletter/send", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.tableMissing) setTableMissing(true);
        // Don't toast on every refresh — just log to console.
        console.warn("[newsletter] dashboard fetch error:", data?.error);
        setSubscriberCount(null);
        setLogs([]);
      } else {
        setSubscriberCount(Number(data?.subscriberCount) || 0);
        setTableMissing(Boolean(data?.tableMissing));
        setLogs(Array.isArray(data?.logs) ? data.logs : []);
      }
    } catch (e: any) {
      console.warn("[newsletter] dashboard fetch exception:", e?.message);
      setSubscriberCount(null);
      setLogs([]);
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    const trimmedSubject = subject.trim();
    const trimmedHtml = htmlContent.trim();
    if (!trimmedSubject) {
      toast.error("Sujet requis", {
        description: "Veuillez saisir un sujet pour la newsletter.",
      });
      return;
    }
    if (!trimmedHtml) {
      toast.error("Contenu requis", {
        description: "Veuillez saisir le contenu HTML de la newsletter.",
      });
      return;
    }

    // Double-confirm — bulk send is irreversible + uses the Gmail
    // daily quota.
    const count = subscriberCount ?? 0;
    const ok = window.confirm(
      `Envoyer cette newsletter à ${count} abonné(s) ?\n\n` +
        `Cette action est irréversible et consomme votre quota Gmail quotidien (~500 emails/jour).`
    );
    if (!ok) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: trimmedSubject,
          htmlContent: trimmedHtml,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Échec de l'envoi", {
          description: data?.error || `HTTP ${res.status}`,
        });
        return;
      }

      const sent = Number(data?.sent) || 0;
      const failed = Number(data?.failed) || 0;
      const total = Number(data?.total) || 0;

      if (failed === 0) {
        toast.success("Newsletter envoyée 🎉", {
          description: `${sent} email(s) envoyé(s) sur ${total} abonné(s).`,
        });
      } else {
        toast.warning("Envoi partiel", {
          description: `${sent} envoyé(s), ${failed} échec(s) sur ${total} abonné(s). Voir les logs pour le détail.`,
        });
      }

      if (data?.warning) {
        toast.warning("Limite Gmail atteinte", {
          description: data.warning,
          duration: 8000,
        });
      }

      // Reset subject (keep the HTML template for follow-up sends).
      setSubject("");
      // Refresh the dashboard so the new logs appear.
      refreshDashboard();
    } catch (e: any) {
      toast.error("Erreur réseau", {
        description: e?.message || "Échec de la requête.",
      });
    } finally {
      setSending(false);
    }
  };

  // ---- Access denied (defense in depth) ----
  if (!allowed) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-600" />
          <h3 className="text-lg font-semibold text-red-900">Accès refusé</h3>
          <p className="text-sm text-red-700 max-w-md">
            Seuls les rôles <strong>manager</strong>, <strong>editor</strong> et{" "}
            <strong>super_admin</strong> peuvent envoyer la newsletter.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ---- Loading skeleton ----
  if (loadingDashboard && subscriberCount === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Chargement…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Newspaper className="h-5 w-5 text-brand-700" />
            Newsletter
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Envoyez une newsletter à tous les abonnés enregistrés.
          </p>
        </div>
      </div>

      {/* ---- Stats + warning ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50">
              <Users className="h-6 w-6 text-brand-700" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Abonnés
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {tableMissing
                  ? "—"
                  : subscriberCount !== null
                  ? subscriberCount.toLocaleString("fr-FR")
                  : "…"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            subscriberCount !== null && subscriberCount > 400
              ? "border-amber-200 bg-amber-50"
              : ""
          }
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                subscriberCount !== null && subscriberCount > 400
                  ? "bg-amber-100"
                  : "bg-slate-100"
              }`}
            >
              {subscriberCount !== null && subscriberCount > 400 ? (
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              ) : (
                <Inbox className="h-6 w-6 text-slate-500" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Quota Gmail
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {tableMissing
                  ? "Table manquante"
                  : subscriberCount !== null && subscriberCount > 500
                  ? `${subscriberCount - 500} au-delà de la limite — envoi tronqué à 500`
                  : subscriberCount !== null && subscriberCount > 400
                  ? "Proche de la limite (500/jour)"
                  : "Sous la limite quotidienne (500/jour)"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---- Table missing warning ---- */}
      {tableMissing && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">Table newsletter_subscribers introuvable</p>
              <p className="mt-1">
                Exécutez le script SQL fourni dans le Supabase Dashboard pour
                créer la table. La fonctionnalité d&apos;envoi reste disponible
                mais n&apos;enverra à aucun abonné tant que la table est
                absente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Compose form ---- */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nl-subject">Sujet de l&apos;email</Label>
              <Input
                id="nl-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Nouveau catalogue 2026 — découvrez nos marques"
                disabled={sending}
                autoFocus
                maxLength={200}
              />
              <p className="text-xs text-slate-500">
                Affiché dans la boîte de réception de l&apos;abonné. Max 200
                caractères.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nl-html">Contenu HTML</Label>
              <Textarea
                id="nl-html"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                disabled={sending}
                rows={14}
                className="font-mono text-xs"
                placeholder="<h2>...</h2><p>...</p>"
              />
              <p className="text-xs text-slate-500">
                Vous pouvez utiliser des balises HTML (&lt;h2&gt;, &lt;p&gt;,
                &lt;strong&gt;, &lt;a&gt;, &lt;ul&gt;…). Un pied de page avec
                le lien de désinscription est automatiquement ajouté à chaque
                email (obligation légale — Loi 18-07).
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {subscriberCount !== null && !tableMissing && (
                  <>
                    Sera envoyé à{" "}
                    <strong className="text-slate-700">{subscriberCount}</strong>{" "}
                    abonné(s). Envoi séquentiel avec pause de 100 ms entre
                    chaque email.
                  </>
                )}
              </p>
              <Button
                type="submit"
                disabled={
                  sending ||
                  tableMissing ||
                  subscriberCount === 0 ||
                  !subject.trim() ||
                  !htmlContent.trim()
                }
                className="bg-brand-700 hover:bg-brand-800"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Envoyer à tous
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ---- Recent email logs ---- */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Mail className="h-4 w-4 text-slate-500" />
                Journal des emails récents
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                30 derniers envois enregistrés dans <code>email_log</code>.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshDashboard}
              disabled={loadingDashboard}
            >
              {loadingDashboard ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Actualiser
            </Button>
          </div>

          <Separator className="mb-3" />

          {logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Inbox className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                Aucun log. La table <code>email_log</code> n&apos;a peut-être
                pas encore été créée, ou aucun email n&apos;a été envoyé.
              </p>
              <p className="text-xs text-slate-400">
                Exécutez le script SQL dans le Supabase Dashboard (voir le
                commentaire en haut de <code>src/lib/email-log.ts</code>).
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto pr-1">
              <ul className="space-y-2">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start gap-3 rounded-md border border-slate-100 bg-slate-50/50 p-3 text-sm"
                  >
                    <div className="mt-0.5">{statusIcon(log.status)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-slate-900">
                          {log.subject || "(sans sujet)"}
                        </span>
                        {statusBadge(log.status)}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        <span className="truncate">→ {log.to_email}</span>
                        <span>·</span>
                        <span>{formatDate(log.created_at)}</span>
                        {log.template && (
                          <>
                            <span>·</span>
                            <code className="rounded bg-slate-200/60 px-1 py-0.5 text-[10px] text-slate-600">
                              {log.template}
                            </code>
                          </>
                        )}
                      </div>
                      {log.error && (
                        <p className="mt-1 text-xs text-red-600">
                          {log.error}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Success/info footnote ---- */}
      <div className="flex items-start gap-2 text-xs text-slate-500">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
        <p>
          Chaque envoi est journalisé dans la table{" "}
          <code>email_log</code> pour audit. Les échecs SMTP sont également
          enregistrés avec le message d&apos;erreur. La journalisation est
          non-bloquante : si la table n&apos;existe pas, l&apos;envoi
          continue normalement.
        </p>
      </div>
    </div>
  );
}

export default NewsletterPanel;
