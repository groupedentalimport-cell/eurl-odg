"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { toast } from "@/components/ui/sonner";

// ============================================================
// ClientLoginPage — magic-link login form for the ODG client portal.
// (Task BONUS-3 — /portal route)
//
// Two view modes:
//
//   1. "form"   → email entry. On submit, POST /api/client-portal/login
//                 which sends a magic link by email. Then switch to
//                 "sent" mode (a "check your email" message).
//
//   2. "sent"   → "check your email" message + "resend link" +
//                 "back to form" buttons.
//
// Auto-verify: if the URL contains `?token=XXX` (i.e. the client
// clicked the magic link in the email), we IMMEDIATELY POST it to
// /api/client-portal/verify. On success the server sets the
// `odg_client` cookie and we call onLoggedIn() so the parent
// (ClientPortalPage) refreshes its session and swaps to the
// dashboard. On failure we switch to "verify_failed" mode with a
// "demandez un nouveau lien" button.
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = "form" | "sent" | "verifying" | "verify_failed";

interface Props {
  onLoggedIn: () => void;
}

export function ClientLoginPage({ onLoggedIn }: Props) {
  const { t, lang, dir } = useTranslation();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("form");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref guard: useSearchParams can re-fire in dev StrictMode, and we
  // don't want to POST /verify twice.
  const verifyStartedRef = useRef(false);

  // ---- Auto-verify when ?token=XXX is in the URL ----
  useEffect(() => {
    const token = searchParams?.get("token");
    if (!token) return;
    if (verifyStartedRef.current) return;
    verifyStartedRef.current = true;

    setMode("verifying");
    fetch("/api/client-portal/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data?.error || "verify failed");
        }
        // Cookie is now set. Tell the parent to refresh its session
        // and swap to the dashboard view.
        toast.success(
          lang === "ar" ? "تم تسجيل الدخول بنجاح" : "Connexion réussie"
        );
        // Clear the ?token from the URL so a refresh doesn't re-fire.
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", "/portal");
        }
        onLoggedIn();
      })
      .catch(() => {
        setMode("verify_failed");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ---- Submit the email form (request a magic link) ----
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) {
      setError(t("portalMagicWrongEmail"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/client-portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erreur");
      }
      // Whether the email was actually sent (sent=true) or skipped
      // (dev with no SMTP), we show the "check your email" message —
      // in dev the link is also logged server-side and returned as
      // devMagicLink for the developer to click manually.
      setMode("sent");
    } catch (e: any) {
      setError(e?.message || t("portalMagicVerifyFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ---- Verify-failed → user can request a fresh link ----
  const reset = () => {
    setMode("form");
    setError(null);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/portal");
    }
  };

  // ---- Verifying spinner view ----
  if (mode === "verifying") {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
        <Card className="border-slate-200 shadow-md">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-700" />
            <p className="text-sm font-medium text-slate-700">
              {t("portalMagicVerifyTitle")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Verify-failed view ----
  if (mode === "verify_failed") {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12" dir={dir}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-red-200 shadow-md">
            <CardHeader className="text-center">
              <img
                src="/logo-odg.png"
                alt="ODG"
                className="mx-auto mb-2 h-12 w-auto object-contain"
              />
              <CardTitle className="text-xl text-red-700">
                {t("portalMagicVerifyFailed")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <AlertCircle className="h-10 w-10 text-red-500" />
                <p className="text-sm text-slate-600">
                  {t("portalMagicVerifyFailed")}
                </p>
                <Button
                  onClick={reset}
                  className="mt-2 w-full bg-brand-700 hover:bg-brand-800"
                >
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                  {t("portalMagicBackToForm")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ---- "Check your email" view ----
  if (mode === "sent") {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12" dir={dir}>
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
              <CardTitle className="flex items-center justify-center gap-2 text-xl text-brand-800">
                <CheckCircle2 className="h-5 w-5 text-brand-600" />
                {t("portalMagicCheckEmail")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
                  <Mail className="h-7 w-7 text-brand-700" />
                </div>
                <p className="text-sm text-slate-600">
                  {t("portalMagicCheckEmailDesc")}
                </p>
                {email && (
                  <p className="rounded-md bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-500">
                    {email}
                  </p>
                )}
                <div className="mt-3 flex w-full flex-col gap-2">
                  <Button
                    onClick={() => setMode("form")}
                    variant="outline"
                    className="w-full border-slate-300"
                  >
                    <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    {t("portalMagicBackToForm")}
                  </Button>
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  {lang === "ar"
                    ? "هل لديك سؤال؟ "
                    : "Une question ? "}
                  <button
                    type="button"
                    onClick={() => navigate("contact")}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {t("portalContactUs")}
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ---- Email form view (default) ----
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12" dir={dir}>
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
            <CardTitle className="text-2xl">
              {t("portalMagicLoginTitle")}
            </CardTitle>
            <p className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("portalMagicLoginDesc")}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="portal-email" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  {t("portalEmail")}
                </Label>
                <Input
                  id="portal-email"
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
              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full bg-brand-700 hover:bg-brand-800"
                disabled={loading || !email}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("portalMagicSending")}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 rtl:rotate-180" />
                    {t("portalMagicSendLink")}
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
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default ClientLoginPage;
