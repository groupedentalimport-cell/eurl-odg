"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Custom install prompt — captures the `beforeinstallprompt` event
 * (fired by Chrome/Edge when the site meets PWA criteria) and shows
 * a custom banner/button instead of relying on Chrome's automatic
 * prompt (which has become unreliable since 2021).
 *
 * The event is captured on first interaction, stored, and triggered
 * when the user clicks "Installer".
 *
 * On iOS Safari, beforeinstallprompt is NEVER fired — so we detect
 * iOS and show a manual "Add to Home Screen" instruction banner instead.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Check localStorage for dismissed state (30 days)
    const dismissedAt = localStorage.getItem("odg-install-dismissed");
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (days < 30) {
        setDismissed(true);
        return;
      }
    }

    // Detect iOS (Safari doesn't fire beforeinstallprompt)
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // On iOS, show the banner after a short delay (no event to wait for)
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android/Desktop: capture beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault(); // Prevent Chrome's automatic prompt
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    const installedHandler = () => {
      setInstalled(true);
      setShowBanner(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      } else {
        handleDismiss();
      }
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("odg-install-dismissed", Date.now().toString());
  };

  // Don't render if: already installed, dismissed recently, or banner not shown
  if (installed || dismissed || !showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4"
      >
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">
                Installer l'application ODG
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {isIOS ? (
                  <>Touchez <strong>Partager</strong> puis <strong>« Sur l'écran d'accueil »</strong></>
                ) : (
                  <>Accès rapide hors-ligne à notre catalogue et devis</>
                )}
              </p>
              {!isIOS && (
                <Button
                  size="sm"
                  className="mt-2 bg-brand-700 hover:bg-brand-800"
                  onClick={handleInstall}
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Installer
                </Button>
              )}
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
