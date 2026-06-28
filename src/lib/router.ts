"use client";
import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

// ============================================================
// Routing — now uses Next.js native App Router (not hash-based).
// navigate(path) does a client-side navigation to /<path>.
// useHashRoute() is kept for backward-compat (returns the pathname)
// but the real source of truth is now usePathname() from next/navigation.
// ============================================================

// Legacy compat: returns the current path WITHOUT the leading slash,
// mimicking the old hash-based route string (e.g. "catalogue", "produit/x").
export function useHashRoute(): string {
  const pathname = usePathname();
  return pathname ? pathname.replace(/^\/+/, "") : "";
}

// Navigate to a path. Accepts "catalogue", "/catalogue", "produit/x", etc.
// Uses window.location.assign for a full client navigation — simple and
// works everywhere (including from non-React contexts like event handlers
// in plain functions). Next.js handles the client-side transition.
export function navigate(path: string) {
  if (typeof window === "undefined") return;
  const clean = path.replace(/^\/+/, "");
  // Avoid full reload if we're already on the target — just scroll.
  const current = window.location.pathname.replace(/^\/+/, "");
  if (current === clean) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  window.location.assign("/" + clean);
}

export interface RouteMatch {
  page: string;
  params: Record<string, string>;
}

// Parse a path (without leading slash) into page + params.
// Used by components that need to know which "page" they're on.
export function parseRoute(path: string): RouteMatch {
  const clean = path.replace(/^\/+/, "").replace(/\/+$/, "");
  // Strip hash if present (legacy compat)
  const hashIdx = clean.indexOf("#");
  const noHash = hashIdx >= 0 ? clean.slice(0, hashIdx) : clean;
  const parts = noHash.split("/").filter(Boolean);

  if (parts.length === 0) return { page: "home", params: {} };
  const [first, second] = parts;

  switch (first) {
    case "catalogue":
      return { page: "catalogue", params: second ? { category: second } : {} };
    case "produit":
    case "product":
      return { page: "product", params: second ? { slug: second } : {} };
    case "blog":
      return { page: second ? "blog-post" : "blog", params: second ? { slug: second } : {} };
    case "apropos":
    case "about":
      return { page: "about", params: {} };
    case "contact":
      return { page: "contact", params: {} };
    case "comparer":
    case "compare":
      return { page: "compare", params: {} };
    case "devis":
    case "quote":
      return { page: "quote", params: {} };
    case "admin":
      return { page: "admin", params: {} };
    case "mentions-legales":
      return { page: "mentions-legales", params: {} };
    case "confidentialite":
      return { page: "confidentialite", params: {} };
    default:
      return { page: "home", params: {} };
  }
}

// Scroll to top on route change — hook for pages that want this behavior.
export function useScrollToTopOnRouteChange() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
}

// A stable navigate callback (wraps navigate for use in deps arrays).
export function useNavigate() {
  return useCallback((path: string) => navigate(path), []);
}
