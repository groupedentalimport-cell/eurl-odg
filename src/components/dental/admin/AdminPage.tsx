"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Lock, LogOut, Loader2,
  LayoutDashboard, Mail, Package, FileText, Home, Info, Phone, Settings,
  Users, FileSpreadsheet, ShoppingCart, Wrench, Calendar, ShieldCheck, UserCog,
  Newspaper, Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { useAdminSession, can } from "@/hooks/useAdminSession";
import { toast } from "@/components/ui/sonner";

// Panels
import { DashboardPanel } from "./panels/DashboardPanel";
import { MessagesPanel } from "./panels/MessagesPanel";
import { ProductsPanel } from "./panels/ProductsPanel";
import { ArticlesPanel } from "./panels/ArticlesPanel";
import { CategoriesPanel } from "./panels/CategoriesPanel";
import { HomeSettingsPanel } from "./panels/HomeSettingsPanel";
import { AboutSettingsPanel } from "./panels/AboutSettingsPanel";
import { ContactSettingsPanel } from "./panels/ContactSettingsPanel";
import { ClientsPanel } from "./panels/ClientsPanel";
import { DevisPanel } from "./panels/DevisPanel";
import { CommandesPanel } from "./panels/CommandesPanel";
import { InterventionsPanel } from "./panels/InterventionsPanel";
import { TechniciensPanel } from "./panels/TechniciensPanel";
import { MaintenancesPanel } from "./panels/MaintenancesPanel";
import { GarantiesPanel } from "./panels/GarantiesPanel";
import { AdminUsersPanel } from "./panels/AdminUsersPanel";
import { QuotesPanel } from "./panels/QuotesPanel";
import { NewsletterPanel } from "./panels/NewsletterPanel";
import { LiveChatPanel } from "./panels/LiveChatPanel";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  perm: string;
  panel: React.ComponentType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    title: "Pilotage",
    items: [
      { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, perm: "admin.dashboard", panel: DashboardPanel },
    ],
  },
  {
    title: "Contenu",
    items: [
      { id: "messages", label: "Messages", icon: Mail, perm: "content.messages", panel: MessagesPanel },
      { id: "quotes", label: "Demandes devis", icon: FileSpreadsheet, perm: "crm.quotes", panel: QuotesPanel },
      { id: "products", label: "Produits", icon: Package, perm: "content.products", panel: ProductsPanel },
      { id: "posts", label: "Articles", icon: FileText, perm: "content.posts", panel: ArticlesPanel },
      { id: "home", label: "Accueil", icon: Home, perm: "content.home", panel: HomeSettingsPanel },
      { id: "about", label: "À propos", icon: Info, perm: "content.about", panel: AboutSettingsPanel },
      { id: "contact", label: "Contact", icon: Phone, perm: "content.contact", panel: ContactSettingsPanel },
    ],
  },
  {
    title: "Communication",
    items: [
      { id: "live-chat", label: "Chat en direct", icon: Headphones, perm: "content.livechat", panel: LiveChatPanel },
      { id: "newsletter", label: "Newsletter", icon: Newspaper, perm: "content.newsletter", panel: NewsletterPanel },
    ],
  },
  {
    title: "CRM",
    items: [
      { id: "clients", label: "Clients", icon: Users, perm: "crm.clients", panel: ClientsPanel },
      { id: "devis", label: "Devis", icon: FileSpreadsheet, perm: "crm.devis", panel: DevisPanel },
      { id: "commandes", label: "Commandes", icon: ShoppingCart, perm: "crm.commandes", panel: CommandesPanel },
    ],
  },
  {
    title: "Opérations",
    items: [
      { id: "interventions", label: "Planning", icon: Calendar, perm: "ops.interventions", panel: InterventionsPanel },
      { id: "techniciens", label: "Techniciens", icon: Wrench, perm: "ops.techniciens", panel: TechniciensPanel },
      { id: "maintenances", label: "Maintenances", icon: Settings, perm: "ops.maintenances", panel: MaintenancesPanel },
      { id: "garanties", label: "Garanties", icon: ShieldCheck, perm: "ops.garanties", panel: GarantiesPanel },
    ],
  },
  {
    title: "Administration",
    items: [
      { id: "admin-users", label: "Utilisateurs", icon: UserCog, perm: "admin.users", panel: AdminUsersPanel },
    ],
  },
];

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
                <p className="text-center text-xs text-slate-400">
                  Compte par défaut : admin@odg.dz / odg-admin-2026
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ---- Filter nav by role ----
  // The Newsletter item uses an INLINE permission check (it isn't in
  // the can() matrix in useAdminSession.ts since we can't modify that
  // file). Visible to: super_admin + manager + editor. This matches
  // the role gate enforced server-side in
  // /api/admin/newsletter/send (requireRole manager+editor).
  //
  // The Live Chat item is the same idea — not in the can() matrix.
  // Visible to: super_admin + manager + commercial (the two
  // customer-facing roles + admin bypass). Matches the requireRole()
  // gate in /api/admin/chat-live.
  const role = user?.role;
  const isVisible = (item: NavItem): boolean => {
    if (item.perm === "content.newsletter") {
      return role === "super_admin" || role === "manager" || role === "editor";
    }
    if (item.perm === "content.livechat") {
      return (
        role === "super_admin" || role === "manager" || role === "commercial"
      );
    }
    return can(role, item.perm);
  };

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
        <aside className="lg:w-56 lg:shrink-0">
          <nav className="flex flex-row flex-wrap gap-1 lg:flex-col lg:gap-0.5">
            {visibleSections.map((section) => (
              <div key={section.title} className="lg:mb-3">
                <p className="hidden px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 lg:block">
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
            ))}
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
