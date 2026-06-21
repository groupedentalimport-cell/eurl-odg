"use client";
import { useState } from "react";
import { Menu, X, ShoppingCart, GitCompare, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanyInfo } from "@/lib/settings-service";
import { useTranslation } from "@/lib/i18n";
import { useQuoteCart } from "@/hooks/useQuoteCart";
import { useCompare } from "@/hooks/useCompare";
import { navigate, useHashRoute } from "@/lib/router";
import { LanguageSwitch } from "@/components/dental/lang/LanguageSwitch";

export function Header() {
  const { t, lang } = useTranslation();
  const COMPANY = useCompanyInfo();
  const route = useHashRoute();
  const [open, setOpen] = useState(false);
  const quoteCount = useQuoteCart((s) => s.totalItems);
  const compareCount = useCompare((s) => s.ids.length);

  const isActive = (path: string) => {
    const r = route.replace(/^\/+/, "");
    return r.startsWith(path) || (path === "" && (r === "" || r === "/"));
  };

  const links: { path: string; key: "home" | "catalogue" | "blog" | "about" | "contact" }[] = [
    { path: "", key: "home" },
    { path: "catalogue", key: "catalogue" },
    { path: "blog", key: "blog" },
    { path: "apropos", key: "about" },
    { path: "contact", key: "contact" },
  ];

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <button onClick={() => go("")} className="flex items-center gap-2" aria-label="ODG home">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-700 text-white font-bold text-lg shadow-sm">
            ODG
          </div>
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="text-sm font-bold text-slate-900">{lang === "ar" ? COMPANY.nameAr : COMPANY.name}</span>
            <span className="text-[10px] text-slate-500">{COMPANY.city}, {COMPANY.country}</span>
          </div>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <button
              key={l.key}
              onClick={() => go(l.path)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(l.path) ? "text-brand-700 bg-brand-50" : "text-slate-700 hover:text-brand-700 hover:bg-slate-50"
              }`}
            >
              {t(l.key)}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <a
            href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}
            className="hidden items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:text-brand-700 lg:flex"
          >
            <Phone className="h-4 w-4" />
            {COMPANY.phone}
          </a>

          <button
            onClick={() => go("comparer")}
            className="relative rounded-md p-2 text-slate-700 hover:bg-slate-100 hover:text-brand-700"
            aria-label={t("compare")}
          >
            <GitCompare className="h-5 w-5" />
            {compareCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-white">
                {compareCount}
              </span>
            )}
          </button>

          <button
            onClick={() => go("devis")}
            className="relative rounded-md p-2 text-slate-700 hover:bg-slate-100 hover:text-brand-700"
            aria-label={t("quote")}
          >
            <ShoppingCart className="h-5 w-5" />
            {quoteCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-white">
                {quoteCount}
              </span>
            )}
          </button>

          <LanguageSwitch />

          <Button size="sm" className="hidden md:inline-flex" onClick={() => go("contact")}>
            {t("requestQuote")}
          </Button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-md p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <button
                key={l.key}
                onClick={() => go(l.path)}
                className={`rounded-md px-3 py-2 text-left text-sm font-medium ${
                  isActive(l.path) ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {t(l.key)}
              </button>
            ))}
            <Button size="sm" className="mt-2" onClick={() => go("contact")}>
              {t("requestQuote")}
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
