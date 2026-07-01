"use client";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  LogOut,
  FileText,
  ShoppingCart,
  ShieldCheck,
  AlertCircle,
  CalendarClock,
  User,
  Wrench,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "@/lib/i18n";
import { useClientSession } from "@/hooks/useClientSession";
import { ClientLoginPage } from "./ClientLoginPage";
import { navigate } from "@/lib/router";
import { toast } from "@/components/ui/sonner";

// ============================================================
// ClientPortalPage — magic-link client portal dashboard.
// (Task BONUS-3 — /portal route)
//
// Two modes:
//   - !authed  → <ClientLoginPage onLoggedIn={refresh} />
//                 (wrapped in <Suspense> because ClientLoginPage uses
//                 useSearchParams — Next.js 16 requires it)
//   -  authed  → welcome header + 4 tabs (Devis / Commandes /
//                Garanties / Interventions). All four lists are
//                fetched in ONE call to /api/client-portal/data
//                (hard-filtered by client_id server-side).
//
// Security note: data shown here comes from /api/client-portal/data,
// which verifies the `odg_client` cookie and hard-filters every
// Supabase query by client_id = session.clientId. Even if a logged-in
// client tampered with the URL, they could not see another client's
// rows.
//
// Read-only: clients can view their devis/commandes/garanties/
// interventions but cannot edit anything. The portal is a "window"
// into the CRM, not a write surface.
// ============================================================

// ---- Row types (mirror the columns selected by /api/client-portal/data) ----
interface DevisRow {
  id: string;
  numero: string;
  statut: string;
  date_emission: string | null;
  date_validite: string | null;
  montant_total: number | null;
  created_at?: string;
}
interface CommandeRow {
  id: string;
  numero: string;
  statut: string;
  date_commande: string | null;
  date_livraison_prevue: string | null;
  date_livraison_reelle: string | null;
  created_at?: string;
}
interface GarantieRow {
  id: string;
  produit_nom: string | null;
  date_debut: string | null;
  date_fin: string | null;
  duree_mois: number | null;
  actif: boolean | null;
  conditions: string | null;
  created_at?: string;
}
interface InterventionRow {
  id: string;
  type: string;
  date_prevue: string | null;
  date_realisee: string | null;
  technicien_id: string | null;
  statut: string;
  rapport: string | null;
  produit_nom: string | null;
  created_at?: string;
}
interface PortalData {
  client: {
    id: string;
    nom: string;
    email: string | null;
    telephone: string | null;
    wilaya: string | null;
    type_client: string | null;
  } | null;
  devis: DevisRow[];
  commandes: CommandeRow[];
  garanties: GarantieRow[];
  interventions: InterventionRow[];
  tableMissing?: boolean;
  missingTables?: string[];
}

// ---- Shared formatting helpers ----
const DZD = new Intl.NumberFormat("fr-DZ", {
  style: "currency",
  currency: "DZD",
  maximumFractionDigits: 2,
});
function formatDZD(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  try {
    return DZD.format(n);
  } catch {
    return `${n} DZD`;
  }
}
function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-DZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-DZ", {
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

function isGarantieActive(g: GarantieRow): boolean {
  if (g.actif === false) return false;
  if (!g.date_fin) return true;
  const fin = new Date(`${g.date_fin}T23:59:59Z`).getTime();
  if (isNaN(fin)) return true;
  return fin >= Date.now();
}

// ============================================================
// Main component
// ============================================================
export function ClientPortalPage() {
  const { t, lang, dir } = useTranslation();
  const { loading, authed, client, refresh, logout } = useClientSession();
  const [tab, setTab] = useState("devis");

  const handleLogout = async () => {
    await logout();
    toast.success(
      lang === "ar" ? "تم تسجيل الخروج" : "Déconnexion réussie"
    );
    // Stay on /portal — the page re-renders the login form.
    refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
      </div>
    );
  }

  if (!authed) {
    // ClientLoginPage uses useSearchParams → must be inside <Suspense>
    // in Next.js 16 (otherwise the whole page deopts to client-side
    // rendering and Next throws a build-time warning).
    return (
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
          </div>
        }
      >
        <ClientLoginPage onLoggedIn={refresh} />
      </Suspense>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8" dir={dir}>
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                <User className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-brand-100">
                  {t("portalMagicNavClient")}
                </p>
                <h1 className="text-xl font-bold sm:text-2xl">
                  {t("portalWelcome")}, {client?.nom || "Client"}
                </h1>
                {client?.email && (
                  <p className="text-xs text-brand-100">{client.email}</p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <LogOut className="h-4 w-4 rtl:rotate-180" />
              {t("portalLogout")}
            </Button>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-brand-100">
            {t("portalDashboardSummary")}
          </p>
        </div>
      </motion.div>

      {/* Tabs + data (one fetch for all four lists) */}
      <DashboardData tab={tab} onTabChange={setTab} />

      {/* Footer help */}
      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
        <p>
          {lang === "ar"
            ? "هل لديك سؤال حول ملفك؟ "
            : "Une question sur votre dossier ? "}
          <button
            type="button"
            onClick={() => navigate("contact")}
            className="font-semibold text-brand-700 hover:underline"
          >
            {t("portalContactUs")}
          </button>
        </p>
      </div>
    </div>
  );
}

// ============================================================
// DashboardData — single fetch, render 4 tabs from the result.
// ============================================================
function DashboardData({
  tab,
  onTabChange,
}: {
  tab: string;
  onTabChange: (t: string) => void;
}) {
  const { t } = useTranslation();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch("/api/client-portal/data", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: PortalData) => {
        if (cancelled) return;
        setData(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    return load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-brand-700" />
        </CardContent>
      </Card>
    );
  }
  if (error || !data) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-3 py-8 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{t("portalDataError")}</p>
          <Button
            size="sm"
            variant="outline"
            className="ms-auto border-red-300 text-red-700 hover:bg-red-100"
            onClick={load}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("portalMagicResend")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {data.tableMissing && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("portalDataError")}{" "}
          <span className="font-mono text-xs">
            ({(data.missingTables || []).join(", ")})
          </span>
        </div>
      )}
      <Tabs value={tab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="devis" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>{t("portalTabDevis")}</span>
          </TabsTrigger>
          <TabsTrigger value="commandes" className="gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>{t("portalTabCommandes")}</span>
          </TabsTrigger>
          <TabsTrigger value="garanties" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{t("portalTabGaranties")}</span>
          </TabsTrigger>
          <TabsTrigger value="interventions" className="gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            <span>{t("portalTabInterventions")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devis">
          <DevisList rows={data.devis} />
        </TabsContent>
        <TabsContent value="commandes">
          <CommandesList rows={data.commandes} />
        </TabsContent>
        <TabsContent value="garanties">
          <GarantiesList rows={data.garanties} />
        </TabsContent>
        <TabsContent value="interventions">
          <InterventionsList rows={data.interventions} />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ============================================================
// Devis list
// ============================================================
function DevisList({ rows }: { rows: DevisRow[] }) {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return <EmptyBox icon={FileText} message={t("portalNoDevis")} />;
  }
  return (
    <Card className="border-slate-200">
      <CardContent className="p-0">
        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">{t("portalColNumero")}</th>
                <th className="px-4 py-3 font-semibold">{t("portalColDate")}</th>
                <th className="px-4 py-3 font-semibold">{t("portalColMontant")}</th>
                <th className="px-4 py-3 font-semibold">{t("portalColStatut")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold text-brand-700">
                    {r.numero}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(r.date_emission || r.created_at)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {formatDZD(r.montant_total)}
                  </td>
                  <td className="px-4 py-3">
                    <DevisStatutBadge statut={r.statut} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <ul className="divide-y divide-slate-100 md:hidden">
          {rows.map((r) => (
            <li key={r.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono font-semibold text-brand-700">{r.numero}</p>
                <DevisStatutBadge statut={r.statut} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {formatDate(r.date_emission || r.created_at)}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatDZD(r.montant_total)}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Commandes list
// ============================================================
function CommandesList({ rows }: { rows: CommandeRow[] }) {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return <EmptyBox icon={ShoppingCart} message={t("portalNoCommandes")} />;
  }
  return (
    <Card className="border-slate-200">
      <CardContent className="p-0">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">{t("portalColNumero")}</th>
                <th className="px-4 py-3 font-semibold">{t("portalColDate")}</th>
                <th className="px-4 py-3 font-semibold">{t("portalColLivraison")}</th>
                <th className="px-4 py-3 font-semibold">{t("portalColStatut")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold text-brand-700">
                    {r.numero}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(r.date_commande || r.created_at)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(r.date_livraison_reelle || r.date_livraison_prevue)}
                  </td>
                  <td className="px-4 py-3">
                    <CommandeStatutBadge statut={r.statut} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="divide-y divide-slate-100 md:hidden">
          {rows.map((r) => (
            <li key={r.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono font-semibold text-brand-700">{r.numero}</p>
                <CommandeStatutBadge statut={r.statut} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {formatDate(r.date_commande || r.created_at)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {t("portalColLivraison")}:{" "}
                {formatDate(r.date_livraison_reelle || r.date_livraison_prevue)}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Garanties list
// ============================================================
function GarantiesList({ rows }: { rows: GarantieRow[] }) {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return <EmptyBox icon={ShieldCheck} message={t("portalNoGaranties")} />;
  }
  return (
    <Card className="border-slate-200">
      <CardContent className="p-0">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">{t("portalColProduit")}</th>
                <th className="px-4 py-3 font-semibold">{t("portalColDateDebut")}</th>
                <th className="px-4 py-3 font-semibold">{t("portalColDateFin")}</th>
                <th className="px-4 py-3 font-semibold">{t("portalColStatut")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const active = isGarantieActive(r);
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {r.produit_nom || "—"}
                      {r.duree_mois ? (
                        <span className="ms-2 text-xs text-slate-400">
                          ({r.duree_mois} mois)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(r.date_debut)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(r.date_fin)}</td>
                    <td className="px-4 py-3">
                      {active ? (
                        <Badge variant="success">{t("portalStatutActive")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("portalStatutExpired")}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ul className="divide-y divide-slate-100 md:hidden">
          {rows.map((r) => {
            const active = isGarantieActive(r);
            return (
              <li key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-800">
                    {r.produit_nom || "—"}
                  </p>
                  {active ? (
                    <Badge variant="success">{t("portalStatutActive")}</Badge>
                  ) : (
                    <Badge variant="secondary">{t("portalStatutExpired")}</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(r.date_debut)} → {formatDate(r.date_fin)}
                  {r.duree_mois ? ` · ${r.duree_mois} mois` : ""}
                </p>
                {r.conditions && (
                  <p className="mt-1 text-xs text-slate-500">{r.conditions}</p>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Interventions list (NEW — 4th tab, magic-link portal only)
// ============================================================
function InterventionsList({ rows }: { rows: InterventionRow[] }) {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return <EmptyBox icon={Wrench} message={t("portalNoInterventions")} />;
  }
  return (
    <Card className="border-slate-200">
      <CardContent className="p-0">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">{t("portalColType")}</th>
                <th className="px-4 py-3 font-semibold">{t("portalColDatePrevue")}</th>
                <th className="px-4 py-3 font-semibold">{t("portalColProduit")}</th>
                <th className="px-4 py-3 font-semibold">{t("portalColStatut")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <InterventionTypeBadge type={r.type} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(r.date_realisee || r.date_prevue)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.produit_nom || "—"}
                    {r.rapport && (
                      <span className="mt-1 block max-w-xs text-xs text-slate-400">
                        {r.rapport}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <InterventionStatutBadge statut={r.statut} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="divide-y divide-slate-100 md:hidden">
          {rows.map((r) => (
            <li key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <InterventionTypeBadge type={r.type} />
                <InterventionStatutBadge statut={r.statut} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {formatDateTime(r.date_realisee || r.date_prevue)}
              </p>
              {r.produit_nom && (
                <p className="mt-0.5 text-sm font-medium text-slate-800">
                  {r.produit_nom}
                </p>
              )}
              {r.rapport && (
                <p className="mt-1 text-xs text-slate-500">{r.rapport}</p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Status badges
// ============================================================
function DevisStatutBadge({ statut }: { statut: string }) {
  const { t } = useTranslation();
  switch (statut) {
    case "brouillon":
      return <Badge variant="secondary">{t("portalStatutBrouillon")}</Badge>;
    case "envoye":
      return <Badge variant="default">{t("portalStatutEnvoye")}</Badge>;
    case "accepte":
      return <Badge variant="success">{t("portalStatutAccepte")}</Badge>;
    case "refuse":
      return <Badge variant="warning">{t("portalStatutRefuse")}</Badge>;
    case "expire":
      return <Badge variant="secondary">{t("portalStatutExpire")}</Badge>;
    default:
      return <Badge variant="outline">{statut}</Badge>;
  }
}
function CommandeStatutBadge({ statut }: { statut: string }) {
  const { t } = useTranslation();
  switch (statut) {
    case "en_attente":
      return <Badge variant="secondary">{t("portalStatutEnAttente")}</Badge>;
    case "en_preparation":
      return <Badge variant="default">{t("portalStatutEnPrep")}</Badge>;
    case "livree":
      return <Badge variant="success">{t("portalStatutLivree")}</Badge>;
    case "annulee":
      return <Badge variant="warning">{t("portalStatutAnnulee")}</Badge>;
    default:
      return <Badge variant="outline">{statut}</Badge>;
  }
}
function InterventionStatutBadge({ statut }: { statut: string }) {
  const { t } = useTranslation();
  switch (statut) {
    case "planifie":
      return <Badge variant="secondary">{t("portalStatutPlanifie")}</Badge>;
    case "en_cours":
      return <Badge variant="default">{t("portalStatutEnCours")}</Badge>;
    case "termine":
      return <Badge variant="success">{t("portalStatutTermine")}</Badge>;
    case "annule":
      return <Badge variant="warning">{t("portalStatutAnnule")}</Badge>;
    default:
      return <Badge variant="outline">{statut}</Badge>;
  }
}
function InterventionTypeBadge({ type }: { type: string }) {
  const { t } = useTranslation();
  switch (type) {
    case "livraison":
      return <Badge variant="outline">{t("portalTypeLivraison")}</Badge>;
    case "installation":
      return <Badge variant="outline">{t("portalTypeInstallation")}</Badge>;
    case "formation":
      return <Badge variant="outline">{t("portalTypeFormation")}</Badge>;
    case "maintenance_preventive":
      return <Badge variant="outline">{t("portalTypeMaintenancePreventive")}</Badge>;
    case "maintenance_curative":
      return <Badge variant="outline">{t("portalTypeMaintenanceCurative")}</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

// ============================================================
// Tiny shared presentational helpers
// ============================================================
function EmptyBox({
  icon: Icon,
  message,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <Card className="border-dashed border-slate-300 bg-slate-50">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500">
          <Icon className="h-6 w-6" />
        </div>
        <p className="text-sm text-slate-500">{message}</p>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <CalendarClock className="h-3 w-3" />
          <span>Vos documents apparaîtront ici dès qu'ils seront créés.</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default ClientPortalPage;
