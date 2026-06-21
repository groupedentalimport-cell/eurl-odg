"use client";
import { useState } from "react";
import { Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { toast } from "@/components/ui/sonner";

export function Newsletter() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success("Inscription confirmée !", { description: "Merci, vous recevrez nos nouveautés." });
      setEmail("");
    } catch (err: any) {
      toast.error("Inscription échouée", { description: err.message || "Réessayez plus tard." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white sm:p-8">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="h-5 w-5" />
        <h3 className="text-lg font-bold">{t("newsletterTitle")}</h3>
      </div>
      <p className="text-sm text-brand-100 mb-4">{t("newsletterDesc")}</p>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          className="bg-white/95 border-0 text-slate-900"
        />
        <Button type="submit" variant="secondary" disabled={loading} className="shrink-0">
          {loading ? "…" : t("subscribe")}
        </Button>
      </form>
    </div>
  );
}
