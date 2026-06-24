"use client";
import { useEffect, useState, useCallback } from "react";

// Hash-based router — single / route, all navigation via location.hash
export function useHashRoute() {
  const [hash, setHash] = useState<string>("");

  useEffect(() => {
    const update = () => setHash(window.location.hash.slice(1) || "/");
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  return hash;
}

export function navigate(path: string) {
  if (typeof window === "undefined") return;
  window.location.hash = path;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export interface RouteMatch {
  page: string;
  params: Record<string, string>;
}

// Parse hash into page + params
export function parseRoute(hash: string): RouteMatch {
  const clean = hash.replace(/^\/+/, "").replace(/\/+$/, "");
  const parts = clean.split("/").filter(Boolean);

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
    case "mentions-legales":
      return { page: "mentions-legales", params: {} };
    case "confidentialite":
      return { page: "confidentialite", params: {} };
    case "admin":
      return { page: "admin", params: {} };
    default:
      return { page: "home", params: {} };
  }
}

export function useScrollToTopOnRouteChange() {
  const route = useHashRoute();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);
}

// A stable navigate callback
export function useNavigate() {
  return useCallback((path: string) => navigate(path), []);
}
