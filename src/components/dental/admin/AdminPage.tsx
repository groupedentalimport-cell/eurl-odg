"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Lock, LogOut, Mail, MailOpen, Trash2, Package, FileText, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from "@/lib/data-service";
import { useTranslation } from "@/lib/i18n";
import { toast } from "@/components/ui/sonner";

const ADMIN_PASSWORD = "odg-admin-2026";
const SESSION_KEY = "odg-admin-session";

interface AdminMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  body: string;
  read: boolean;
  created_at: string;
}

export function AdminPage() {
  const { lang, t } = useTranslation();
  const { products, blogPosts } = useData();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Restore session
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") setAuthed(true);
    } catch {}
  }, []);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
      setLoginError("");
    } else {
      setLoginError(lang === "ar" ? "كلمة مرور خاطئة" : "Mot de passe incorrect");
    }
  };

  const logout = () => {
    setAuthed(false);
    setPassword("");
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  };

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
                  />
                </div>
                {loginError && (
                  <p className="text-sm text-red-600">{loginError}</p>
                )}
                <Button type="submit" className="w-full bg-brand-700 hover:bg-brand-800">
                  {t("login")}
                </Button>
                <p className="text-center text-xs text-slate-400">
                  {lang === "ar" ? "عرض تجريبي — كلمة المرور: odg-admin-2026" : "Démo — mot de passe : odg-admin-2026"}
                </p>
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
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="messages">
            <Mail className="mr-1 h-4 w-4" />
            {t("messages")}
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="mr-1 h-4 w-4" />
            {t("products")}
          </TabsTrigger>
          <TabsTrigger value="posts">
            <FileText className="mr-1 h-4 w-4" />
            {t("posts")}
          </TabsTrigger>
        </TabsList>

        {/* Messages tab */}
        <TabsContent value="messages">
          <MessagesPanel />
        </TabsContent>

        {/* Products tab */}
        <TabsContent value="products">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-brand-700" />
                {t("products")} <span className="text-sm text-slate-400">({products.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">{t("description")}</th>
                      <th className="px-4 py-3">Brand</th>
                      <th className="px-4 py-3">Modèle</th>
                      <th className="px-4 py-3">Catégorie</th>
                      <th className="px-4 py-3">{t("featured")}</th>
                      <th className="px-4 py-3">{t("available")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{p.name[lang]}</td>
                        <td className="px-4 py-3 text-slate-600">{p.brand}</td>
                        <td className="px-4 py-3 text-slate-600">{p.model}</td>
                        <td className="px-4 py-3 text-slate-600">{p.categorySlug}</td>
                        <td className="px-4 py-3">
                          {p.featured ? <Badge className="bg-brand-50 text-brand-700">{t("featured")}</Badge> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {p.available ? <Badge variant="secondary" className="bg-green-50 text-green-700">{t("available")}</Badge> : <Badge variant="secondary" className="bg-red-50 text-red-700">—</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Posts tab */}
        <TabsContent value="posts">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-brand-700" />
                {t("posts")} <span className="text-sm text-slate-400">({blogPosts.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Titre</th>
                      <th className="px-4 py-3">Slug</th>
                      <th className="px-4 py-3">Auteur</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Publié</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {blogPosts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{p.title[lang]}</td>
                        <td className="px-4 py-3 text-slate-500">{p.slug}</td>
                        <td className="px-4 py-3 text-slate-600">{p.author}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(p.createdAt).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR")}</td>
                        <td className="px-4 py-3">
                          {p.published ? <Badge variant="secondary" className="bg-green-50 text-green-700">✓</Badge> : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MessagesPanel() {
  const { lang, t } = useTranslation();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTableMissing(false);
    try {
      const res = await fetch("/api/admin/messages");
      const data = await res.json();
      if (!res.ok) {
        if (data.tableMissing) setTableMissing(true);
        throw new Error(data.error || "Fetch failed");
      }
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err: any) {
      setError(err.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/messages?id=${encodeURIComponent(id)}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, read: true } : m)));
      toast.success(lang === "ar" ? "تم التحديث" : "Marqué comme lu");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const del = async (id: string) => {
    if (!confirm(lang === "ar" ? "تأكيد الحذف؟" : "Supprimer ce message ?")) return;
    try {
      const res = await fetch(`/api/admin/messages?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setMessages((ms) => ms.filter((m) => m.id !== id));
      toast.success(lang === "ar" ? "محذوف" : "Supprimé");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-FR", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

  if (loading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
        </CardContent>
      </Card>
    );
  }

  if (tableMissing) {
    return (
      <Card className="border-amber-200 bg-amber-50 shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <ShieldAlert className="h-10 w-10 text-amber-600" />
          <h3 className="text-lg font-semibold text-amber-900">
            {lang === "ar" ? "جدول الرسائل غير موجود" : "La table 'messages' n'existe pas"}
          </h3>
          <p className="max-w-xl text-sm text-amber-800">
            {lang === "ar"
              ? "قم بتنفيذ سكريبت SQL المقدّم في لوحة تحكم Supabase لإنشاء الجدول."
              : "Exécutez le script SQL fourni dans le tableau de bord Supabase pour créer la table."}
          </p>
          <Button variant="outline" onClick={load}>{lang === "ar" ? "إعادة المحاولة" : "Réessayer"}</Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <ShieldAlert className="h-10 w-10 text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
          <Button variant="outline" onClick={load}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Mail className="h-10 w-10 text-slate-300" />
          <p className="text-slate-500">{t("noMessages")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((m) => (
        <Card key={m.id} className={`border-slate-200 shadow-sm ${!m.read ? "border-l-4 border-l-brand-700" : ""}`}>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{m.name}</h3>
                  {!m.read && <Badge className="bg-brand-50 text-brand-700">{t("unread")}</Badge>}
                </div>
                <p className="text-sm text-slate-600">
                  <a href={`mailto:${m.email}`} className="hover:text-brand-700">{m.email}</a>
                  {m.phone ? <> · <a href={`tel:${m.phone}`} className="hover:text-brand-700">{m.phone}</a></> : null}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!m.read && (
                  <Button size="sm" variant="outline" onClick={() => markAsRead(m.id)}>
                    <MailOpen className="mr-1 h-4 w-4" />
                    {t("markAsRead")}
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => del(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("subject")}</p>
              <p className="font-medium text-slate-800">{m.subject}</p>
            </div>
            <div className="mt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("message")}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{m.body}</p>
            </div>
            <p className="mt-3 text-xs text-slate-400">{formatDate(m.created_at)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
