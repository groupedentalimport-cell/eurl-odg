"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertTriangle,
  ShieldCheck,
  FileText,
  ShoppingCart,
  Wrench,
  CalendarClock,
  Mail,
  Package,
  FileSpreadsheet,
  TrendingUp,
  CheckCircle2,
  Truck,
  Users,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { useAdminSession } from "@/hooks/useAdminSession";

// ============================================================
// DashboardPanel — CRM-D (the landing panel for the admin)
//
// Role-aware stats grid (4 cards):
//   - manager / super_admin : Devis en attente, Commandes en cours,
//                              Interventions cette semaine,
//                              Maintenances à planifier.
//   - commercial            : Mes devis, Mes clients, Mes commandes.
//   - technician            : Mes interventions cette semaine,
//                              Maintenances assignées,
//                              Interventions terminées.
//   - editor                : Messages non lus, Produits, Articles.
//   - accountant            : Devis acceptés, CA total, Commandes livrées.
//
// Two extra sections under the cards:
//   - Activité récente: last 5 devis + last 5 interventions (combined,
//                       sorted by date desc). Role-aware.
//   - Alertes: garanties expirant sous 30 jours + maintenances en retard.
//
// Counts are computed client-side from the arrays returned by the existing
// APIs (small lists). Each fetch is wrapped in try/catch so a 403 for one
// role just hides that card rather than crashing the whole panel.
// ============================================================

interface DevisRow {
  id: string;
  numero: string | null;
  client_id: string | null;
  statut: string | null;
  montant_total: number | null;
  date_emission?: string | null;
  created_at?: string;
  commercial_id?: string | null;
}

interface CommandeRow {
  id: string;
  numero: string | null;
  client_id: string | null;
  statut: string | null;
  date_commande: string | null;
  commercial_id?: string | null;
  created_at?: string;
}

interface InterventionRow {
  id: string;
  type: string | null;
  client_id: string | null;
  statut: string | null;
  date_prevue: string | null;
  technicien_id: string | null;
}

interface MaintenanceRow {
  id: string;
  garantie_id: string | null;
  client_id: string | null;
  type: string | null;
  date_prevue: string | null;
  statut: string | null;
  technicien_id: string | null;
}

interface GarantieRow {
  id: string;
  client_id: string | null;
  produit_nom: string | null;
  date_fin: string | null;
  actif: boolean | null;
}

interface ClientRow {
  id: string;
  nom: string | null;
  commercial_id?: string | null;
}

interface MessageRow {
  id: string;
  read: boolean | null;
  created_at?: string;
}

interface ProductRow { id: string; }
interface PostRow { id: string; }

interface StatCard {
  key: string;
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: "teal" | "amber" | "blue" | "green" | "red" | "violet";
  hint?: string;
}

const COLOR_MAP: Record<StatCard["color"], { bg: string; text: string }> = {
  teal: { bg: "bg-teal-50", text: "text-teal-700" },
  amber: { bg: "bg-amber-50", text: "text-amber-700" },
  blue: { bg: "bg-blue-50", text: "text-blue-700" },
  green: { bg: "bg-emerald-50", text: "text-emerald-700" },
  red: { bg: "bg-red-50", text: "text-red-700" },
  violet: { bg: "bg-violet-50", text: "text-violet-700" },
};

// ---- Date helpers ----
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = (day + 6) % 7; // Monday=0
  x.setDate(x.getDate() - diff);
  return x;
}
function endOfWeek(d: Date): Date {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  x.setHours(23, 59, 59, 999);
  return x;
}
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const s = String(iso).slice(0, 10);
  const d = new Date(`${s}T00:00:00Z`);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - today.getTime()) / 86400000);
}
function formatDateTime(iso: string | null | undefined, lang: "fr" | "ar"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const locale = lang === "ar" ? "ar-DZ" : "fr-DZ";
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function formatDate(iso: string | null | undefined, lang: "fr" | "ar"): string {
  if (!iso) return "—";
  const s = String(iso).slice(0, 10);
  const d = new Date(`${s}T00:00:00Z`);
  if (isNaN(d.getTime())) return s;
  const locale = lang === "ar" ? "ar-DZ" : "fr-DZ";
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Safe fetch helper — returns null on any error (incl. 403) so the
// dashboard degrades gracefully when a role can't access an endpoint.
async function safeFetch<T = any>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function DashboardPanel() {
  const { t, lang } = useTranslation();
  const { user } = useAdminSession();
  const role = user?.role;

  const [loading, setLoading] = useState(true);
  const [devis, setDevis] = useState<DevisRow[]>([]);
  const [commandes, setCommandes] = useState<CommandeRow[]>([]);
  const [interventions, setInterventions] = useState<InterventionRow[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceRow[]>([]);
  const [garanties, setGaranties] = useState<GarantieRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [partialError, setPartialError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPartialError(false);

      // Build the list of fetches based on the user's role so we don't
      // spam endpoints that will return 403 (which would be wasted requests
      // and noise in dev.log).
      const fetches: Promise<unknown>[] = [];

      // Devis — manager / commercial / accountant.
      if (role === "super_admin" || role === "manager" || role === "commercial" || role === "accountant") {
        fetches.push(
          safeFetch<{ devis: DevisRow[] }>("/api/admin/devis").then((d) => {
            if (!cancelled && d?.devis) setDevis(d.devis);
            else if (!cancelled) setPartialError(true);
          })
        );
      }
      // Commandes — manager / commercial / accountant.
      if (role === "super_admin" || role === "manager" || role === "commercial" || role === "accountant") {
        fetches.push(
          safeFetch<{ commandes: CommandeRow[] }>("/api/admin/commandes").then((d) => {
            if (!cancelled && d?.commandes) setCommandes(d.commandes);
            else if (!cancelled) setPartialError(true);
          })
        );
      }
      // Interventions — manager / technician.
      if (role === "super_admin" || role === "manager" || role === "technician") {
        fetches.push(
          safeFetch<{ interventions: InterventionRow[] }>("/api/admin/interventions").then((d) => {
            if (!cancelled && d?.interventions) setInterventions(d.interventions);
            else if (!cancelled) setPartialError(true);
          })
        );
      }
      // Maintenances — manager / technician.
      if (role === "super_admin" || role === "manager" || role === "technician") {
        fetches.push(
          safeFetch<{ maintenances: MaintenanceRow[] }>("/api/admin/maintenances").then((d) => {
            if (!cancelled && d?.maintenances) setMaintenances(d.maintenances);
            else if (!cancelled) setPartialError(true);
          })
        );
      }
      // Garanties — manager / technician / accountant.
      if (role === "super_admin" || role === "manager" || role === "technician" || role === "accountant") {
        fetches.push(
          safeFetch<{ garanties: GarantieRow[] }>("/api/admin/garanties").then((d) => {
            if (!cancelled && d?.garanties) setGaranties(d.garanties);
            else if (!cancelled) setPartialError(true);
          })
        );
      }
      // Clients — manager / commercial.
      if (role === "super_admin" || role === "manager" || role === "commercial") {
        fetches.push(
          safeFetch<{ clients: ClientRow[] }>("/api/admin/clients").then((d) => {
            if (!cancelled && d?.clients) setClients(d.clients);
          })
        );
      }
      // Messages — any authed admin.
      fetches.push(
        safeFetch<{ messages: MessageRow[] }>("/api/admin/messages").then((d) => {
          if (!cancelled && d?.messages) setMessages(d.messages);
        })
      );
      // Products — any authed admin.
      fetches.push(
        safeFetch<{ products: ProductRow[] }>("/api/admin/products").then((d) => {
          if (!cancelled && d?.products) setProducts(d.products);
        })
      );
      // Posts — any authed admin.
      fetches.push(
        safeFetch<{ posts: PostRow[] }>("/api/admin/posts").then((d) => {
          if (!cancelled && d?.posts) setPosts(d.posts);
        })
      );

      await Promise.all(fetches);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  // ---- Compute stats per role ----
  const stats = useMemo<StatCard[]>(() => {
    if (!role) return [];
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    const wsIso = toISODate(weekStart);
    const weIso = toISODate(weekEnd);

    const inThisWeek = (iso: string | null | undefined): boolean => {
      if (!iso) return false;
      const d = new Date(iso);
      if (isNaN(d.getTime())) return false;
      const ds = toISODate(d);
      return ds >= wsIso && ds <= weIso;
    };

    if (role === "manager" || role === "super_admin") {
      const devisAttente = devis.filter((d) => d.statut === "envoye").length;
      const cmdEnCours = commandes.filter(
        (c) => c.statut === "en_attente" || c.statut === "en_preparation"
      ).length;
      const interventionsThisWeek = interventions.filter((iv) =>
        inThisWeek(iv.date_prevue)
      ).length;
      const maintenancesAPlanifier = maintenances.filter(
        (m) => m.statut === "planifie" || m.statut === "en_retard"
      ).length;
      return [
        { key: "devisAttente", label: t("dashDevisAttente"), value: devisAttente, icon: FileText, color: "amber" },
        { key: "cmdEnCours", label: t("dashCommandesEnCours"), value: cmdEnCours, icon: ShoppingCart, color: "blue" },
        { key: "intWeek", label: t("dashInterventionsSemaine"), value: interventionsThisWeek, icon: CalendarClock, color: "teal" },
        { key: "maintPlan", label: t("dashMaintenancesAPlanifier"), value: maintenancesAPlanifier, icon: Wrench, color: "violet" },
      ];
    }

    if (role === "commercial") {
      const mesDevis = devis.filter((d) => d.commercial_id === user?.id).length;
      const mesClients = clients.filter((c) => c.commercial_id === user?.id).length;
      const mesCommandes = commandes.filter((c) => c.commercial_id === user?.id).length;
      return [
        { key: "mesDevis", label: t("dashMesDevis"), value: mesDevis, icon: FileText, color: "amber" },
        { key: "mesClients", label: t("dashMesClients"), value: mesClients, icon: Users, color: "teal" },
        { key: "mesCommandes", label: t("dashMesCommandes"), value: mesCommandes, icon: ShoppingCart, color: "blue" },
      ];
    }

    if (role === "technician") {
      const myTechInterventions = interventions; // API already scoped to tech's own.
      const interventionsThisWeek = myTechInterventions.filter((iv) =>
        inThisWeek(iv.date_prevue)
      ).length;
      const myMaintenances = maintenances; // API already scoped.
      const maintAssignees = myMaintenances.filter(
        (m) => m.statut === "planifie" || m.statut === "en_cours" || m.statut === "en_retard"
      ).length;
      const interventionsTerminees = myTechInterventions.filter(
        (iv) => iv.statut === "termine"
      ).length;
      return [
        { key: "intWeek", label: t("dashMesInterventions"), value: interventionsThisWeek, icon: CalendarClock, color: "teal" },
        { key: "maintAssign", label: t("dashMaintenancesAssignees"), value: maintAssignees, icon: Wrench, color: "amber" },
        { key: "intTerm", label: t("dashInterventionsTerminees"), value: interventionsTerminees, icon: CheckCircle2, color: "green" },
      ];
    }

    if (role === "editor") {
      const unread = messages.filter((m) => m.read === false).length;
      return [
        { key: "msgUnread", label: t("dashMessagesNonLus"), value: unread, icon: Mail, color: "amber" },
        { key: "produits", label: t("dashProduits"), value: products.length, icon: Package, color: "teal" },
        { key: "articles", label: t("dashArticles"), value: posts.length, icon: FileSpreadsheet, color: "blue" },
      ];
    }

    if (role === "accountant") {
      const acceptedDevis = devis.filter((d) => d.statut === "accepte");
      const ca = acceptedDevis.reduce((sum, d) => sum + (Number(d.montant_total) || 0), 0);
      const cmdLivrees = commandes.filter((c) => c.statut === "livree").length;
      return [
        { key: "devisAcceptes", label: t("dashDevisAcceptes"), value: acceptedDevis.length, icon: FileText, color: "amber" },
        {
          key: "caTotal",
          label: t("dashCATotal"),
          value: new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 }).format(ca),
          icon: TrendingUp,
          color: "green",
        },
        { key: "cmdLivrees", label: t("dashCommandesLivrees"), value: cmdLivrees, icon: Truck, color: "blue" },
      ];
    }

    return [];
  }, [role, user, devis, commandes, interventions, maintenances, clients, messages, products, posts, t]);

  // ---- Activité récente: last 5 devis + last 5 interventions (combined) ----
  const recentActivity = useMemo(() => {
    type Activity = {
      id: string;
      kind: "devis" | "intervention";
      title: string;
      subtitle: string;
      date: string | null;
    };

    const out: Activity[] = [];

    // Last 5 devis — sort by created_at desc, take 5.
    const sortedDevis = [...devis]
      .sort((a, b) => {
        const ta = new Date(a.created_at || a.date_emission || "").getTime();
        const tb = new Date(b.created_at || b.date_emission || "").getTime();
        return tb - ta;
      })
      .slice(0, 5);
    for (const d of sortedDevis) {
      out.push({
        id: `devis-${d.id}`,
        kind: "devis",
        title: `${t("dashDevis")} ${d.numero || d.id.slice(0, 8)}`,
        subtitle:
          d.statut === "accepte"
            ? t("devisStatutAccepte")
            : d.statut === "envoye"
            ? t("devisStatutEnvoye")
            : d.statut === "refuse"
            ? t("devisStatutRefuse")
            : d.statut === "expire"
            ? t("devisStatutExpire")
            : t("devisStatutBrouillon"),
        date: d.created_at || d.date_emission || null,
      });
    }

    // Last 5 interventions — sort by date_prevue desc, take 5.
    const sortedInterventions = [...interventions]
      .sort((a, b) => {
        const ta = new Date(a.date_prevue || "").getTime();
        const tb = new Date(b.date_prevue || "").getTime();
        return tb - ta;
      })
      .slice(0, 5);
    for (const iv of sortedInterventions) {
      out.push({
        id: `int-${iv.id}`,
        kind: "intervention",
        title:
          iv.type === "livraison"
            ? t("typeLivraison")
            : iv.type === "installation"
            ? t("typeInstallation")
            : iv.type === "formation"
            ? t("typeFormation")
            : iv.type === "maintenance_preventive"
            ? t("typeMaintenancePreventive")
            : iv.type === "maintenance_curative"
            ? t("typeMaintenanceCurative")
            : t("dashIntervention"),
        subtitle:
          iv.statut === "planifie"
            ? t("statutPlanifie")
            : iv.statut === "en_cours"
            ? t("statutEnCours")
            : iv.statut === "termine"
            ? t("statutTermine")
            : iv.statut === "annule"
            ? t("statutAnnule")
            : "—",
        date: iv.date_prevue,
      });
    }

    // Merge + sort by date desc, take 5.
    return out
      .sort((a, b) => {
        const ta = new Date(a.date || "").getTime();
        const tb = new Date(b.date || "").getTime();
        return tb - ta;
      })
      .slice(0, 5);
  }, [devis, interventions, t]);

  // ---- Alertes ----
  const garantiesExpiringSoon = useMemo(() => {
    return garanties
      .filter((g) => {
        if (g.actif === false) return false;
        const days = daysUntil(g.date_fin);
        if (days === null) return false;
        return days >= 0 && days <= 30;
      })
      .slice(0, 10);
  }, [garanties]);

  const maintenancesEnRetard = useMemo(() => {
    return maintenances
      .filter((m) => {
        if (m.statut === "termine" || m.statut === "annule") return false;
        if (m.statut === "en_retard") return true;
        // Planifie/en_cours with past date_prevue → en retard.
        if (m.date_prevue) {
          const d = new Date(`${String(m.date_prevue).slice(0, 10)}T00:00:00Z`).getTime();
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);
          return d < today.getTime();
        }
        return false;
      })
      .slice(0, 10);
  }, [maintenances]);

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex animate-pulse items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 rounded bg-slate-100" />
                    <div className="h-5 w-12 rounded bg-slate-200" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t("dashChargementStats")}</span>
        </div>
      </div>
    );
  }

  // Welcome banner
  const welcomeName = user?.full_name || user?.email || "Admin";

  // Determine whether to show the activity / alerts sections.
  const showActivity = recentActivity.length > 0;
  const showAlertes =
    (role === "super_admin" || role === "manager" || role === "technician" || role === "accountant");
  const hasAlertes = garantiesExpiringSoon.length > 0 || maintenancesEnRetard.length > 0;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ShieldCheck className="h-5 w-5 text-brand-700" />
            {t("dashWelcome")}, {welcomeName}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{t("dashRoleHint")}</p>
        </div>
        {partialError && (
          <Badge className="border-transparent bg-amber-100 text-amber-800">
            {t("dashErreurChargement")}
          </Badge>
        )}
      </div>

      {/* Stats grid */}
      {stats.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <AlertTriangle className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">{t("dashErreurChargement")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            const colors = COLOR_MAP[s.color];
            return (
              <Card
                key={s.key}
                className="border-slate-200 transition-shadow hover:shadow-md"
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}>
                    <Icon className={`h-5 w-5 ${colors.text}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      {s.label}
                    </p>
                    <p className="mt-0.5 text-2xl font-bold leading-tight text-slate-900">
                      {s.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Two-column section: activité récente + alertes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Activité récente */}
        {showActivity && (
          <Card className="border-slate-200">
            <CardContent className="p-4 sm:p-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Clock className="h-4 w-4 text-brand-700" />
                {t("dashActiviteRecente")}
              </h3>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500">{t("dashVideActivite")}</p>
              ) : (
                <ul className="space-y-2">
                  {recentActivity.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50/60 p-2.5"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                          a.kind === "devis"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-teal-50 text-teal-700"
                        }`}
                      >
                        {a.kind === "devis" ? (
                          <FileText className="h-4 w-4" />
                        ) : (
                          <CalendarClock className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {a.title}
                        </p>
                        <p className="truncate text-xs text-slate-500">{a.subtitle}</p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-500">
                        {a.kind === "devis"
                          ? formatDateTime(a.date, lang)
                          : formatDateTime(a.date, lang)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Alertes */}
        {showAlertes && (
          <Card className="border-slate-200">
            <CardContent className="p-4 sm:p-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                {t("dashAlertes")}
              </h3>
              {!hasAlertes ? (
                <p className="text-sm text-slate-500">{t("dashAucuneAlerte")}</p>
              ) : (
                <div className="space-y-4">
                  {/* Garanties expirant sous 30 jours */}
                  {garantiesExpiringSoon.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {t("dashGarantiesExpirant")}
                      </p>
                      <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                        {garantiesExpiringSoon.map((g) => {
                          const days = daysUntil(g.date_fin);
                          return (
                            <li
                              key={g.id}
                              className="flex items-center gap-2 rounded-md bg-amber-50/60 p-2 text-sm"
                            >
                              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                              <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                                {g.produit_nom || "—"}
                              </span>
                              <span className="shrink-0 text-xs text-amber-700">
                                {days} {t("garDaysLeft")}
                              </span>
                              <span className="shrink-0 text-xs text-slate-500">
                                {formatDate(g.date_fin, lang)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Maintenances en retard — visible only to manager/technician/super_admin */}
                  {(role === "super_admin" || role === "manager" || role === "technician") &&
                    maintenancesEnRetard.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {t("dashMaintenancesRetard")}
                        </p>
                        <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                          {maintenancesEnRetard.map((m) => (
                            <li
                              key={m.id}
                              className="flex items-center gap-2 rounded-md bg-red-50/60 p-2 text-sm"
                            >
                              <Wrench className="h-3.5 w-3.5 shrink-0 text-red-600" />
                              <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                                {m.type === "preventive"
                                  ? t("typePreventive")
                                  : m.type === "curative"
                                  ? t("typeCurative")
                                  : "—"}
                              </span>
                              <span className="shrink-0 text-xs text-red-700">
                                {formatDate(m.date_prevue, lang)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default DashboardPanel;
