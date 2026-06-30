"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, LogIn, Mail, KeyRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { toast } from "@/components/ui/sonner";

// ============================================================
// ClientLoginPage — login form for the ODG client portal.
// (Task BONUS-2-3)
//
// Two fields:
//   - email  (the email ODG has on file for the client)
//   - phoneLast4 (last 4 digits of the phone on file — acts as a
//     lightweight code, no password to remember, no email sending)
//
// POSTs to /api/client/login. On success the server sets the
// `odg_client` httpOnly cookie, and we call onLoggedIn() so the
// parent (ClientPortalPage) can refresh its session state and swap
// to the dashboard view.
// ============================================================

interface Props {
  onLoggedIn: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ClientLoginPage({ onLoggedIn }: Props) {
  const { t, lang } = useTranslation();
  const [email, setEmail] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = phoneLast4.trim();

    if (!EMAIL_RE.test(cleanEmail)) {
      setError(t("portalLoginFailed"));
      return;
    }
    if (!/^\d{4}$/.test(cleanCode)) {
      setError(t("portalLoginFailed"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, phoneLast4: cleanCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erreur");
      }
      toast.success(
        lang === "ar" ? "تم تسجيل الدخول بنجاح" : "Connexion réussie"
      );
      onLoggedIn();
    } catch {
      setError(t("portalLoginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-slate-200 shadow-md">
          <CardHeader className="text-center">
            <img
              src="/logo-odg.png"
              alt="ODG"
              className="mx-auto mb-2 h-12 w-auto object-contain"
            />
            <CardTitle className="text-2xl">{t("portalLoginTitle")}</CardTitle>
            <p className="mt-1 text-xs text-slate-500">{t("portalLoginDesc")}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="client-email" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  {t("portalEmail")}
                </Label>
                <Input
                  id="client-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.dz"
                  autoFocus
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-code" className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                  {t("portalPhoneLast4")}
                </Label>
                <Input
                  id="client-code"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  autoComplete="off"
                  value={phoneLast4}
                  onChange={(e) =>
                    setPhoneLast4(e.target.value.replace(/\D+/g, "").slice(0, 4))
                  }
                  placeholder="••••"
                  disabled={loading}
                  required
                  className="font-mono tracking-[0.5em]"
                />
                <p className="text-[11px] text-slate-400">
                  {lang === "ar"
                    ? "مثال: إذا كان هاتفك 0540 12 34 56، أدخل 3456"
                    : "Ex. : si votre téléphone est 0540 12 34 56, saisissez 3456"}
                </p>
              </div>
              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full bg-brand-700 hover:bg-brand-800"
                disabled={loading || !email || phoneLast4.length !== 4}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("portalLoggingIn")}
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    {t("portalLogin")}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-4 text-center">
              <p className="text-xs text-slate-500">{t("portalNotClient")}</p>
              <button
                type="button"
                onClick={() => navigate("contact")}
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline"
              >
                {t("portalContactUs")}
                <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default ClientLoginPage;
