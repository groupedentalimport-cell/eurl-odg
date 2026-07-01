"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { CheckCircle2, AlertCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================================
// /newsletter-unsubscribe — one-click unsubscribe confirmation page
// Task EMAIL-V2 (#13 — Loi 18-07 compliance)
// ============================================================
// Reached via the "Se désinscrire" link at the bottom of every
// newsletter welcome email. The link carries ?token=<base64url(email)>.
//
// On mount, the page POSTs the token to /api/newsletter/unsubscribe,
// which:
//   1. Decodes the base64url token → email.
//   2. Deletes the matching row from `newsletter_subscribers`.
//   3. Sends a confirmation email (`sendUnsubscribeConfirmation`).
//   4. Returns { ok: true, removed: N }.
//
// UI states:
//   - loading (spinner) while the request is in-flight
//   - success (green card) on ok:true
//   - error (red card) on failure, with a "Réessayer" button + a
//     contact link so the user can reach out manually
//
// The page itself is wrapped in PublicLayout so the user still sees
// the ODG header/footer (and can navigate back to the catalogue /
// contact if they wish).
//
// Note: `useSearchParams` requires a Suspense boundary at the page
// level when used during static rendering (Next.js 16). We wrap the
// inner component in <Suspense> so the page compiles without warnings.
// ============================================================

type State =
  | { status: "loading" }
  | { status: "success"; email: string | null }
  | { status: "error"; message: string };

function UnsubscribeInner() {
  const params = useSearchParams();
  const token = (params.get("token") || "").trim();

  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setState({
          status: "error",
          message:
            "Lien de désinscription invalide : aucun token fourni. Ouvrez le lien depuis votre email ODG.",
        });
        return;
      }

      try {
        const res = await fetch(`/api/newsletter/unsubscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.ok && data?.ok) {
          setState({ status: "success", email: null });
        } else {
          setState({
            status: "error",
            message:
              data?.error ||
              data?.message ||
              "Une erreur est survenue. Réessayez ou contactez-nous.",
          });
        }
      } catch (e: any) {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            e?.message ||
            "Réseau indisponible. Vérifiez votre connexion et réessayez.",
        });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <section className="bg-gradient-to-b from-teal-50/60 to-white">
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 sm:py-24">
        {state.status === "loading" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-teal-700" aria-hidden />
            <h1 className="text-xl font-semibold text-slate-900">
              Désinscription en cours…
            </h1>
            <p className="text-sm text-slate-600">
              Veuillez patienter pendant que nous traitons votre demande.
            </p>
          </div>
        )}

        {state.status === "success" && (
          <div className="flex w-full flex-col items-center gap-5 rounded-2xl border border-teal-100 bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
              <CheckCircle2
                className="h-10 w-10 text-teal-700"
                aria-hidden
                strokeWidth={2}
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Vous avez été désinscrit avec succès
            </h1>
            <p className="max-w-md text-base leading-relaxed text-slate-700">
              Vous ne recevrez plus d&rsquo;emails de la part d&rsquo;ODG. Un
              email de confirmation vous a été envoyé pour votre registre.
            </p>
            <p className="max-w-md text-sm text-slate-500">
              Cette action est immédiate. Si vous changez d&rsquo;avis, vous
              pouvez à tout moment vous réinscrire depuis le formulaire en bas
              de page.
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <Button asChild className="bg-teal-700 hover:bg-teal-800">
                <Link href="/">Retour à l&rsquo;accueil</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/catalogue">Voir le catalogue</Link>
              </Button>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex w-full flex-col items-center gap-5 rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <AlertCircle
                className="h-10 w-10 text-red-600"
                aria-hidden
                strokeWidth={2}
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Désinscription impossible
            </h1>
            <p className="max-w-md text-base leading-relaxed text-slate-700">
              {state.message}
            </p>
            <p className="max-w-md text-sm text-slate-500">
              Si le problème persiste, contactez-nous directement — nous
              traiterons votre demande manuellement.
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <Button
                className="bg-teal-700 hover:bg-teal-800"
                onClick={() => {
                  setState({ status: "loading" });
                  // Trigger the useEffect again by toggling state — the
                  // effect's dep is `token`, so a re-mount of the
                  // effect happens only when the component re-renders.
                  // Simplest reliable retry: reload the page.
                  if (typeof window !== "undefined") window.location.reload();
                }}
              >
                Réessayer
              </Button>
              <Button asChild variant="outline">
                <Link href="/contact">
                  <Mail className="mr-2 h-4 w-4" aria-hidden />
                  Nous contacter
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function UnsubscribePage() {
  return (
    <PublicLayout>
      {/* Suspense boundary required by useSearchParams during prerender
          (Next.js 16 throws a build-time warning without it). */}
      <Suspense
        fallback={
          <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4">
            <Loader2
              className="h-10 w-10 animate-spin text-teal-700"
              aria-hidden
            />
          </div>
        }
      >
        <UnsubscribeInner />
      </Suspense>
    </PublicLayout>
  );
}
