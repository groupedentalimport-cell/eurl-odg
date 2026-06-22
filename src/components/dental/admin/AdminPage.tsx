"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, LogOut, Mail, Package, FileText, Home, Info, Phone, ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/lib/i18n";

// Panels (each in its own file for maintainability)
import { MessagesPanel } from "./panels/MessagesPanel";
import { ProductsPanel } from "./panels/ProductsPanel";
import { ArticlesPanel } from "./panels/ArticlesPanel";
import { HomeSettingsPanel } from "./panels/HomeSettingsPanel";
import { AboutSettingsPanel } from "./panels/AboutSettingsPanel";
import { ContactSettingsPanel } from "./panels/ContactSettingsPanel";
import { QuotesPanel } from "./panels/QuotesPanel";

export function AdminPage() {
  const { lang, t } = useTranslation();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Check existing server session (cookie) on mount — survives refresh.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setAuthed(Boolean(d?.authed)); })
      .catch(() => { if (!cancelled) setAuthed(false); });
    return () => { cancelled = true; };
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loginLoading) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setAuthed(true);
        setPassword("");
      } else {
        setLoginError(data?.error || (lang === "ar" ? "كلمة مرور خاطئة" : "Mot de passe incorrect"));
      }
    } catch (err: any) {
      setLoginError(err?.message || "Erreur réseau");
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    try { await fetch("/api/admin/logout", { method: "POST" }); } catch {}
    setAuthed(false);
    setPassword("");
  };

  if (authed === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="border-slate-200 shadow-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Lock className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl">{t("adminLogin")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={login} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoFocus
                    disabled={loginLoading}
                  />
                </div>
                {loginError && (
                  <p className="text-sm text-red-600">{loginError}</p>
                )}
                <Button type="submit" className="w-full bg-brand-700 hover:bg-brand-800" disabled={loginLoading || !password}>
                  {loginLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("sending")}</> : t("login")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t("dashboard")}</h1>
          <p className="mt-1 text-sm text-slate-500">OUADAH DENTAL GROUPE — Admin</p>
        </div>
        <Button variant="outline" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          {t("logout")}
        </Button>
      </div>

      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7">
          <TabsTrigger value="messages">
            <Mail className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">{t("messages")}</span>
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">{t("products")}</span>
          </TabsTrigger>
          <TabsTrigger value="posts">
            <FileText className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">{t("posts")}</span>
          </TabsTrigger>
          <TabsTrigger value="home">
            <Home className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">{t("settingsHome")}</span>
          </TabsTrigger>
          <TabsTrigger value="about">
            <Info className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">{t("settingsAbout")}</span>
          </TabsTrigger>
          <TabsTrigger value="contact">
            <Phone className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">{t("settingsContact")}</span>
          </TabsTrigger>
          <TabsTrigger value="quotes">
            <ClipboardList className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">{t("quotes")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="mt-6">
          <MessagesPanel />
        </TabsContent>
        <TabsContent value="products" className="mt-6">
          <ProductsPanel />
        </TabsContent>
        <TabsContent value="posts" className="mt-6">
          <ArticlesPanel />
        </TabsContent>
        <TabsContent value="home" className="mt-6">
          <HomeSettingsPanel />
        </TabsContent>
        <TabsContent value="about" className="mt-6">
          <AboutSettingsPanel />
        </TabsContent>
        <TabsContent value="contact" className="mt-6">
          <ContactSettingsPanel />
        </TabsContent>
        <TabsContent value="quotes" className="mt-6">
          <QuotesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
