"use client";
import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

/**
 * Global Error Boundary — catches client-side React errors and shows
 * a friendly error page instead of the generic "Application error"
 * message. The error is logged to the console + displayed so the user
 * can report it.
 *
 * Wrap the app in <ErrorBoundary> in the root layout.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console for debugging
    console.error("[ErrorBoundary]", error, errorInfo.componentStack);
    this.setState({ errorInfo: errorInfo.componentStack || "" });
  }

  handleReload = () => {
    // Hard reload (clears any bad state)
    window.location.href = window.location.pathname;
  };

  handleClearCache = () => {
    // Clear localStorage + sessionStorage (common fix for corrupted state)
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      const stack = err?.stack || this.state.errorInfo || "";

      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  Une erreur est survenue
                </h1>
                <p className="text-sm text-slate-500">
                  ODG — OUADAH DENTAL GROUPE
                </p>
              </div>
            </div>

            <p className="mb-4 text-sm text-slate-600">
              Une erreur inattendue s'est produite. Vous pouvez essayer de
              recharger la page ou vider le cache. Si l'erreur persiste,
              contactez-nous au <strong>+213 540 00 00 00</strong>.
            </p>

            {err && (
              <details className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-xs font-medium text-slate-600">
                  Détails techniques (pour le support)
                </summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-red-600">
                  {err.message}
                </pre>
                {stack && (
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[10px] text-slate-500">
                    {stack.slice(0, 1500)}
                  </pre>
                )}
              </details>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={this.handleReload} className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Recharger la page
              </Button>
              <Button onClick={this.handleClearCache} variant="outline" className="flex-1">
                Vider le cache et recharger
              </Button>
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">
              Si le problème persiste, écrivez à{" "}
              <a href="mailto:contact@odg-dz.com" className="text-brand-700 underline">
                contact@odg-dz.com
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
