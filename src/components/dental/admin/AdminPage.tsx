"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  LogOut, Loader2,
  LayoutDashboard, Mail, Package, FileText, Home, Info, Phone, Settings,
  Users, FileSpreadsheet, ShoppingCart, Wrench, Calendar, ShieldCheck, UserCog,
  Newspaper, Headphones, Camera, MessageSquareQuote,
  Building2, Sparkles, Globe, Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { useAdminSession, can } from "@/hooks/useAdminSession";

// REFACTOR (refactor/total — audit §5.2)
// All 19 admin panels are now lazy-loaded via `next/dynamic`. The
// previous static imports bundled every panel (~13 000 LOC of JSX)
// into the admin chunk even though only one panel is mounted at a
// time. Now Next.js code-splits each panel into its own chunk and
// fetches it on first activation.
const DashboardPanel = dynamic(() => import("./panels/DashboardPanel").then(m => ({ default: m.DashboardPanel })));
const MessagesPanel = dynamic(() => import("./panels/MessagesPanel").then(m => ({ default: m.MessagesPanel })));
const ProductsPanel = dynamic(() => import("./panels/ProductsPanel").then(m => ({ default: m.ProductsPanel })));
const ArticlesPanel = dynamic(() => import("./panels/ArticlesPanel").then(m => ({ default: m.ArticlesPanel })));
const CategoriesPanel = dynamic(() => import("./panels/CategoriesPanel").then(m => ({ default: m.CategoriesPanel })));
const HomeSettingsPanel = dynamic(() => import("./panels/HomeSettingsPanel").then(m => ({ default: m.HomeSettingsPanel })));
const HomePageSectionsPanel = dynamic(() => import("./panels/HomePageSectionsPanel").then(m => ({ default: m.HomePageSectionsPanel })));
const AboutSettingsPanel = dynamic(() => import("./panels/AboutSettingsPanel").then(m => ({ default: m.AboutSettingsPanel })));
const ContactSettingsPanel = dynamic(() => import("./panels/ContactSettingsPanel").then(m => ({ default: m.ContactSettingsPanel })));
const ClientsPanel = dynamic(() => import("./panels/ClientsPanel").then(m => ({ default: m.ClientsPanel })));
const DevisPanel = dynamic(() => import("./panels/DevisPanel").then(m => ({ default: m.DevisPanel })));
const CommandesPanel = dynamic(() => import("./panels/CommandesPanel").then(m => ({ default: m.CommandesPanel })));
const InterventionsPanel = dynamic(() => import("./panels/InterventionsPanel").then(m => ({ default: m.InterventionsPanel })));
const TechniciensPanel = dynamic(() => import("./panels/TechniciensPanel").then(m => ({ default: m.TechniciensPanel })));
const MaintenancesPanel = dynamic(() => import("./panels/MaintenancesPanel").then(m => ({ default: m.MaintenancesPanel })));
const GarantiesPanel = dynamic(() => import("./panels/GarantiesPanel").then(m => ({ default: m.GarantiesPanel })));
const AdminUsersPanel = dynamic(() => import("./panels/AdminUsersPanel").then(m => ({ default: m.AdminUsersPanel })));
const QuotesPanel = dynamic(() => import("./panels/QuotesPanel").then(m => ({ default: m.QuotesPanel })));
const NewsletterPanel = dynamic(() => import("./panels/NewsletterPanel").then(m => ({ default: m.NewsletterPanel })));
const LiveChatPanel = dynamic(() => import("./panels/LiveChatPanel").then(m => ({ default: m.LiveChatPanel })), { loading: () => <PanelLoader /> });
const RealisationsPanel = dynamic(() => import("./panels/RealisationsPanel").then(m => ({ default: m.RealisationsPanel })));
const TestimonialsPanel = dynamic(() => import("./panels/TestimonialsPanel").then(m => ({ default: m.TestimonialsPanel })));

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  perm: string;
  panel: React.ComponentType;
}

interface NavSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const NAV: NavSection[] = [
  // ─────────────────────────────────────────────────────────
  // 📊 PILOTAGE — visible par tous les rôles authentifiés
  // ─────────────────────────────────────────────────────────
  {
    title: "Pilotage",
    icon: LayoutDashboard,
    items: [
      { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, perm: "admin.dashboard", panel: DashboardPanel },
    ],
  },
  // ─────────────────────────────────────────────────────────
  // 📝 MARKETING & CONTENU — éditeur, manager
  // Gère tout le contenu du site public : pages, produits, articles
  // ─────────────────────────────────────────────────────────
  {
    title: "Marketing & Contenu",
    icon: Globe,
    items: [
      { id: "home", label: "Accueil (Hero)", icon: Home, perm: "content.home", panel: HomeSettingsPanel },
      { id: "home-sections", label: "Accueil (Sections)", icon: Sparkles, perm: "content.home", panel: HomePageSectionsPanel },
      { id: "about", label: "À propos", icon: Info, perm: "content.about", panel: AboutSettingsPanel },
      { id: "contact", label: "Contact & Coordonnées", icon: Phone, perm: "content.contact", panel: ContactSettingsPanel },
      { id: "products", label: "Produits", icon: Package, perm: "content.products", panel: ProductsPanel },
      { id: "categories", label: "Catégories", icon: Package, perm: "content.categories", panel: CategoriesPanel },
      { id: "posts", label: "Articles / Blog", icon: FileText, perm: "content.posts", panel: ArticlesPanel },
      { id: "realisations", label: "Réalisations", icon: Camera, perm: "content.realisations", panel: RealisationsPanel },
      { id: "testimonials", label: "Témoignages", icon: MessageSquareQuote, perm: "content.testimonials", panel: TestimonialsPanel },
    ],
  },
  // ─────────────────────────────────────────────────────────
  // 💬 COMMUNICATION — manager, éditeur
  // Messages entrants, newsletter, chat en direct
  // ─────────────────────────────────────────────────────────
  {
    title: "Communication",
    icon: Mail,
    items: [
      { id: "messages", label: "Messages", icon: Mail, perm: "content.messages", panel: MessagesPanel },
      { id: "quotes", label: "Demandes devis", icon: FileSpreadsheet, perm: "crm.quotes", panel: QuotesPanel },
      { id: "live-chat", label: "Chat en direct", icon: Headphones, perm: "content.livechat", panel: LiveChatPanel },
      { id: "newsletter", label: "Newsletter", icon: Newspaper, perm: "content.newsletter", panel: NewsletterPanel },
    ],
  },
  // ─────────────────────────────────────────────────────────
  // 💼 COMMERCIAL / CRM — commercial, manager
  // Clients, devis, commandes
  // ─────────────────────────────────────────────────────────
  {
    title: "Commercial",
    icon: Users,
    items: [
      { id: "clients", label: "Clients", icon: Users, perm: "crm.clients", panel: ClientsPanel },
      { id: "devis", label: "Devis", icon: FileSpreadsheet, perm: "crm.devis", panel: DevisPanel },
      { id: "commandes", label: "Commandes", icon: ShoppingCart, perm: "crm.commandes", panel: CommandesPanel },
    ],
  },
  // ─────────────────────────────────────────────────────────
  // 🔧 OPÉRATIONS — technicien, manager
  // Interventions, techniciens, maintenances, garanties
  // ─────────────────────────────────────────────────────────
  {
    title: "Opérations",
    icon: Wrench,
    items: [
      { id: "interventions", label: "Planning", icon: Calendar, perm: "ops.interventions", panel: InterventionsPanel },
      { id: "techniciens", label: "Techniciens", icon: Wrench, perm: "ops.techniciens", panel: TechniciensPanel },
      { id: "maintenances", label: "Maintenances", icon: Settings, perm: "ops.maintenances", panel: MaintenancesPanel },
      { id: "garanties", label: "Garanties", icon: ShieldCheck, perm: "ops.garanties", panel: GarantiesPanel },
    ],
  },
  // ─────────────────────────────────────────────────────────
  // ⚙️ ADMINISTRATION — super_admin, manager
  // Utilisateurs et configuration système
  // ─────────────────────────────────────────────────────────
  {
    title: "Administration",
    icon: UserCog,
    items: [
      { id: "admin-users", label: "Utilisateurs", icon: UserCog, perm: "admin.users", panel: AdminUsersPanel },
    ],
  },
];

function PanelLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-brand-700" />
    </div>
  );
}

export function AdminPage() {
  const { lang, t } = useTranslation();
  const { loading, authed, user, refresh } = useAdminSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeId, setActiveId] = useState("dashboard");

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loginLoading) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        refresh();
        setEmail("");
        setPassword("");
      } else {
        setLoginError(data?.error || "Identifiants incorrects");
      }
    } catch (err: any) {
      setLoginError(err?.message || "Erreur réseau");
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    try { await fetch("/api/admin/logout", { method: "POST" }); } catch {}
    refresh();
    setPassword("");
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
      </div>
    );
  }

  // ---- Login form ----
  if (!authed) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="border-slate-200 shadow-md">
            <CardHeader className="text-center">
              <img src="/logo-odg.png" alt="ODG" className="mx-auto mb-2 h-12 w-auto object-contain" />
              <CardTitle className="text-2xl">{t("adminLogin")}</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Connexion multi-rôles CRM</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={login} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@odg.dz"
                    autoFocus
                    disabled={loginLoading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loginLoading}
                  />
                </div>
                {loginError && <p className="text-sm text-red-600">{loginError}</p>}
                <Button type="submit" className="w-full bg-brand-700 hover:bg-brand-800" disabled={loginLoading || !password}>
                  {loginLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("sending")}</> : t("login")}
                </Button>
                {/* REFACTOR (refactor/total — audit §2.2): removed hardcoded default credentials.
                    Operators must create the first super-admin via the SQL migration
                    (supabase-base-schema.sql inserts a temporary super-admin with a
                    randomly-generated password printed to the SQL output). */}
                <p className="text-center text-xs text-slate-400">
                  Accès réservé aux administrateurs autorisés.
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ---- Filter nav by role (refactor/total — audit §1.6, §2.5) ----
  // REFACTOR: the inline permission overrides for newsletter & livechat
  // have been removed. The permission matrix is now the SINGLE source of
  // truth in `lib/auth/permissions.ts`, shared between server and client.
  const role = user?.role;
  const isVisible = (item: NavItem): boolean => can(role, item.perm);

  const visibleSections = NAV.map((section) => ({
    ...section,
    items: section.items.filter(isVisible),
  })).filter((section) => section.items.length > 0);

  // Ensure activeId is visible
  const allVisible = visibleSections.flatMap((s) => s.items);
  if (!allVisible.some((i) => i.id === activeId)) {
    setActiveId(allVisible[0]?.id || "dashboard");
  }

  const activeItem = allVisible.find((i) => i.id === activeId);
  const ActivePanel = activeItem?.panel || DashboardPanel;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo-odg.png" alt="ODG" className="h-10 w-auto object-contain" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{t("dashboard")}</h1>
            <p className="text-xs text-slate-500">
              {user?.full_name || user?.email || "Admin"} · <span className="font-medium text-brand-700">{role}</span>
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          {t("logout")}
        </Button>
      </div>

      {/* Layout: sidebar + main */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar */}
        <aside className="lg:w-64 lg:shrink-0">
          {/* Organisation badge */}
          <div className="mb-4 hidden items-center gap-2 rounded-lg border border-brand-100 bg-brand-50/50 px-3 py-2.5 lg:flex">
            <Building2 className="h-5 w-5 shrink-0 text-brand-700" />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-brand-800">OUADAH DENTAL GROUPE</p>
              <p className="text-[10px] text-brand-600">{user?.role}</p>
            </div>
          </div>

          <nav className="flex flex-row flex-wrap gap-1 lg:flex-col lg:gap-0.5">
            {visibleSections.map((section) => {
              const SectionIcon = section.icon;
              return (
              <div key={section.title} className="lg:mb-3">
                <p className="hidden items-center gap-1.5 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 lg:flex">
                  <SectionIcon className="h-3 w-3" />
                  {section.title}
                </p>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveId(item.id)}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-700 hover:bg-slate-100 hover:text-brand-700"
                      } lg:w-full`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline lg:inline">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <ActivePanel />
        </main>
      </div>
    </div>
  );
}
