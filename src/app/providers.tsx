"use client";
import { useEffect } from "react";
import { DataProvider } from "@/lib/data-service";
import { Toaster } from "@/components/ui/sonner";
import { useLanguageStore } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  const lang = useLanguageStore((s) => s.lang);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === "ar" ? "rtl" : "ltr";
    html.classList.toggle("rtl", lang === "ar");
  }, [lang]);

  return (
    <DataProvider>
      {children}
      <Toaster />
    </DataProvider>
  );
}
