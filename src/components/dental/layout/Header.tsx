"use client";
import { useState, useRef, useEffect } from "react";
import {
  Menu,
  X,
  ShoppingCart,
  GitCompare,
  Phone,
  Search,
  Package,
  FileText,
  ArrowRight,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCompanyInfo } from "@/lib/settings-service";
import { useTranslation } from "@/lib/i18n";
import { useData } from "@/lib/data-service";
import { useQuoteCart } from "@/hooks/useQuoteCart";
import { useCompare } from "@/hooks/useCompare";
import { navigate, useHashRoute } from "@/lib/router";
import { LanguageSwitch } from "@/components/dental/lang/LanguageSwitch";
import { ChevronDown, Layers } from "lucide-react";

// ============================================================
// Global header search (Task SEARCH-1)
// Client-side search over products + blog posts loaded via useData().
// - Debounced 200ms (setTimeout + clearTimeout).
// - Max 5 products + 3 articles in the dropdown.
// - Matches product.name.{fr,ar}, brand, model, slug AND
//   blogPost.title.{fr,ar}, slug.
// - Desktop (lg+): inline input that expands on focus.
// - Mobile (<lg): icon button toggling a full-width search overlay.
// - Closes on: click outside, Escape, or selecting a result.
// - Keyboard: ArrowUp/Down to move highlight, Enter to open the
//   highlighted result (or first result / catalogue if none).
// ============================================================

interface SearchResult {
  type: "product" | "post";
  id: string;
  label: string;
  sub: string;
  path: string;
}

function HeaderSearch() {
  const { t, lang, dir } = useTranslation();
  const { products, blogPosts } = useData();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Debounce the query by 200ms before running the search.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(id);
  }, [query]);

  // Reset the active (highlighted) item whenever the debounced query changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [debounced]);

  // Close on click outside + Escape.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Autofocus the mobile input when the overlay opens.
  useEffect(() => {
    if (mobileOpen) {
      const id = setTimeout(() => mobileInputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [mobileOpen]);

  const q = debounced.toLowerCase();

  const matchedProducts = q
    ? products
        .filter(
          (p) =>
            p.name.fr.toLowerCase().includes(q) ||
            p.name.ar.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.model.toLowerCase().includes(q) ||
            p.slug.toLowerCase().includes(q)
        )
        .slice(0, 5)
    : [];

  const matchedPosts = q
    ? blogPosts
        .filter(
          (b) =>
            b.title.fr.toLowerCase().includes(q) ||
            b.title.ar.toLowerCase().includes(q) ||
            b.slug.toLowerCase().includes(q)
        )
        .slice(0, 3)
    : [];

  const productResults: SearchResult[] = matchedProducts.map((p) => ({
    type: "product",
    id: p.id,
    label: lang === "ar" ? p.name.ar : p.name.fr,
    sub: [p.brand, p.model].filter(Boolean).join(" · "),
    path: "produit/" + p.slug,
  }));
  const postResults: SearchResult[] = matchedPosts.map((b) => ({
    type: "post",
    id: b.id,
    label: lang === "ar" ? b.title.ar : b.title.fr,
    sub: b.author,
    path: "blog/" + b.slug,
  }));
  const results: SearchResult[] = [...productResults, ...postResults];
  const hasResults = results.length > 0;
  const showDropdown = open && q.length > 0;
  // "View all results" is the last selectable item when there are results.
  const viewAllIndex = hasResults ? results.length : -1;
  const totalItems = hasResults ? results.length + 1 : 0;

  function pick(path: string) {
    navigate(path);
    setQuery("");
    setOpen(false);
    setMobileOpen(false);
  }

  function submit() {
    if (results[0]) {
      pick(results[0].path);
    } else {
      pick("catalogue");
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        pick(results[activeIndex].path);
      } else if (activeIndex === viewAllIndex && viewAllIndex >= 0) {
        pick("catalogue");
      } else {
        submit();
      }
      return;
    }
    if (e.key === "ArrowDown" && q.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (totalItems > 0 ? Math.min(i + 1, totalItems - 1) : -1));
    } else if (e.key === "ArrowUp" && q.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
  }

  const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {
    type: "text",
    value: query,
    placeholder: t("searchPlaceholder"),
    "aria-label": t("search"),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setOpen(true);
    },
    onFocus: () => setOpen(true),
    onKeyDown: onInputKeyDown,
    role: "combobox",
    "aria-expanded": showDropdown,
    "aria-controls": "odg-search-listbox",
    "aria-autocomplete": "list",
  };

  function renderDropdown() {
    return (
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            id="odg-search-listbox"
            role="listbox"
            aria-label={t("search")}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute start-0 top-full z-50 mt-2 max-h-96 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            dir={dir}
          >
            {!hasResults ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                {t("searchNoResults")}
              </div>
            ) : (
              <>
                {productResults.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {t("searchProducts")}
                    </div>
                    {productResults.map((r, idx) => (
                      <button
                        key={"p-" + r.id}
                        type="button"
                        role="option"
                        aria-selected={activeIndex === idx}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => pick(r.path)}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-start transition-colors ${
                          activeIndex === idx ? "bg-brand-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <Package className="h-4 w-4 shrink-0 text-brand-600" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {r.label}
                          </span>
                          {r.sub && (
                            <span className="block truncate text-xs text-slate-500">{r.sub}</span>
                          )}
                        </span>
                        <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                          {t("searchProducts")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {postResults.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {t("searchArticles")}
                    </div>
                    {postResults.map((r, idx) => {
                      const realIdx = productResults.length + idx;
                      return (
                        <button
                          key={"b-" + r.id}
                          type="button"
                          role="option"
                          aria-selected={activeIndex === realIdx}
                          onMouseEnter={() => setActiveIndex(realIdx)}
                          onClick={() => pick(r.path)}
                          className={`flex w-full items-center gap-3 px-3 py-2 text-start transition-colors ${
                            activeIndex === realIdx ? "bg-amber-50" : "hover:bg-amber-50/60"
                          }`}
                        >
                          <FileText className="h-4 w-4 shrink-0 text-amber-600" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-900">
                              {r.label}
                            </span>
                            {r.sub && (
                              <span className="block truncate text-xs text-slate-500">{r.sub}</span>
                            )}
                          </span>
                          <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            {t("searchArticles")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="mt-1 border-t border-slate-100">
                  <button
                    type="button"
                    role="option"
                    aria-selected={activeIndex === viewAllIndex}
                    onMouseEnter={() => setActiveIndex(viewAllIndex)}
                    onClick={() => pick("catalogue")}
                    className={`flex w-full items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-brand-700 transition-colors ${
                      activeIndex === viewAllIndex ? "bg-brand-50" : "hover:bg-brand-50"
                    }`}
                  >
                    {t("searchViewAll")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Desktop inline search — visible on lg+ to avoid crowding the md nav row. */}
      <div className="relative hidden lg:block">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          {...inputProps}
          className="w-52 rounded-md border border-slate-200 bg-slate-50 py-1.5 ps-8 pe-3 text-sm text-slate-900 transition-all focus:w-64 focus:bg-white focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
        {renderDropdown()}
      </div>

      {/* Mobile / tablet search icon button — toggles a full-width overlay. */}
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        className="rounded-md p-2 text-slate-700 hover:bg-slate-100 hover:text-brand-700 lg:hidden"
        aria-label={t("search")}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
      </button>

      {/* Mobile full-width search overlay — fixed below the sticky header (h-16). */}
      {mobileOpen && (
        <div className="fixed inset-x-0 top-16 z-50 border-b border-slate-200 bg-white px-4 py-3 shadow-lg lg:hidden">
          <div className="relative mx-auto max-w-3xl">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={mobileInputRef}
              {...inputProps}
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 ps-8 pe-9 text-sm text-slate-900 focus:bg-white focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
            {renderDropdown()}
          </div>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { t, lang } = useTranslation();
  const COMPANY = useCompanyInfo();
  const route = useHashRoute();
  const { categories } = useData();
  const [open, setOpen] = useState(false);
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const quoteCount = useQuoteCart((s) => s.totalItems);
  const compareCount = useCompare((s) => s.ids.length);

  const isActive = (path: string) => {
    const r = route.replace(/^\/+/, "");
    return r.startsWith(path) || (path === "" && (r === "" || r === "/"));
  };

  // "Catalogue" link replaced with a dropdown that lists all categories.
  // Each category links to /categorie/<slug> (real SSR route) instead of the
  // hash-catalogue query — this improves internal linking for SEO and lets
  // Google discover every category page from the header on every page.
  const links: {
    path: string;
    key: "home" | "marques" | "configuratorNav" | "financing" | "blog" | "faq" | "about" | "contact";
  }[] = [
    { path: "", key: "home" },
    { path: "marques", key: "marques" },
    { path: "configurateur", key: "configuratorNav" },
    { path: "financement", key: "financing" },
    { path: "blog", key: "blog" },
    { path: "faq", key: "faq" },
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
          <img
            src="/logo-odg.png"
            alt="OUADAH DENTAL GROUPE"
            className="h-10 w-auto object-contain"
          />
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

          {/* Catalogue dropdown — links to /catalogue + each /categorie/<slug> */}
          <div
            className="relative"
            onMouseEnter={() => setCatMenuOpen(true)}
            onMouseLeave={() => setCatMenuOpen(false)}
          >
            <button
              onClick={() => go("catalogue")}
              className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-700 hover:bg-slate-50"
              aria-expanded={catMenuOpen}
              aria-haspopup="true"
            >
              <Layers className="h-4 w-4" />
              {t("catalogue")}
              <ChevronDown className={`h-3 w-3 transition-transform ${catMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {catMenuOpen && categories.length > 0 && (
              <div
                className="absolute end-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                role="menu"
              >
                <button
                  onClick={() => go("catalogue")}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  role="menuitem"
                >
                  {t("catalogue")}
                  <span className="text-[10px] text-slate-400">Tous les produits</span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => go("categorie/" + c.slug)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                    role="menuitem"
                  >
                    {c.name[lang]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <HeaderSearch />

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

          {/* Espace client — magic-link portal (Task BONUS-3) */}
          <button
            onClick={() => go("portal")}
            className="rounded-md p-2 text-slate-700 hover:bg-slate-100 hover:text-brand-700"
            aria-label={t("portalMagicNavClient")}
            title={t("portalMagicNavClient")}
          >
            <User className="h-5 w-5" />
          </button>

          <LanguageSwitch />

          {/* Configurateur — prominent CTA (Task BONUS-1) */}
          <Button
            variant="outline"
            size="sm"
            className="hidden border-brand-300 text-brand-700 hover:bg-brand-50 hover:text-brand-800 md:inline-flex"
            onClick={() => go("configurateur")}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t("configuratorNav")}
          </Button>

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
            {/* Mobile: link to /catalogue + each /categorie/<slug> */}
            <button
              onClick={() => go("catalogue")}
              className="rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              {t("catalogue")} — tous les produits
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => go("categorie/" + c.slug)}
                className="rounded-md px-3 py-2 pl-6 text-left text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700"
              >
                {c.name[lang]}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="mt-2 border-brand-300 text-brand-700 hover:bg-brand-50 hover:text-brand-800"
              onClick={() => go("configurateur")}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t("configuratorNav")}
            </Button>
            {/* Espace client (mobile) — magic-link portal (Task BONUS-3) */}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => go("portal")}
            >
              <User className="h-4 w-4" />
              {t("portalMagicNavClient")}
            </Button>
            <Button size="sm" className="mt-2" onClick={() => go("contact")}>
              {t("requestQuote")}
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
