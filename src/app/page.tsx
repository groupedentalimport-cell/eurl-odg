"use client";
import { useEffect } from "react";
import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { HomePage } from "@/components/dental/home/HomePage";

// Home page — also handles legacy hash-URL redirects.
// If someone visits /#/catalogue (old hash router), redirect to /catalogue.
export default function Home() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      // Strip the leading "#"
      const path = hash.slice(1).replace(/^\/+/, "");
      if (path) {
        // Redirect to the native route
        window.location.replace("/" + path);
      }
    }
  }, []);

  return (
    <PublicLayout>
      <HomePage />
    </PublicLayout>
  );
}
