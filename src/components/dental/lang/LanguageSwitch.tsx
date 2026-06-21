"use client";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

export function LanguageSwitch() {
  const { lang, toggle } = useTranslation();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className="gap-2 font-semibold"
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4" />
      {lang === "fr" ? "العربية" : "FR"}
    </Button>
  );
}
