"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageLightbox, type LightboxImage } from "@/components/dental/ui/ImageLightbox";
import { useTranslation } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface Realisation { id: string; nom: string; nom_ar: string | null; wilaya: string; description_fr: string; description_ar: string | null; image_url: string | null; produits: string[]; client_nom: string | null; }

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const COLORS = ["0f766e", "0e7490", "1d4ed8", "7c3aed", "be185d", "b45309"];
function placeholder(text: string, i: number) { return `https://placehold.co/600x400/${COLORS[i % COLORS.length]}/ffffff?text=${encodeURIComponent(text)}`; }

export function RealisationsPage() {
  const { t, lang } = useTranslation();
  const [items, setItems] = useState<Realisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [wilayaFilter, setWilayaFilter] = useState("all");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    supabase.from("realisations").select("*").eq("actif", true).order("ordre", { ascending: true }).then(({ data, error }) => {
      if (!error && data) setItems(data);
      setLoading(false);
    });
  }, []);

  const wilayas = useMemo(() => Array.from(new Set(items.map(r => r.wilaya))).sort(), [items]);
  const filtered = useMemo(() => wilayaFilter === "all" ? items : items.filter(r => r.wilaya === wilayaFilter), [items, wilayaFilter]);
  const lightboxImages: LightboxImage[] = useMemo(() => filtered.map((r, i) => ({ url: r.image_url || placeholder(r.nom, i), filename: r.nom, alt: `${r.nom} — ${r.wilaya}` })), [filtered]);

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="secondary" className="mb-4 bg-white/20 text-white">{t("realisationsTitle")}</Badge>
            <h1 className="text-4xl font-bold sm:text-5xl">{t("realisationsTitle")}</h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-brand-100">{t("realisationsSubtitle")}</p>
          </motion.div>
        </div>
      </section>

      <section className="bg-slate-50 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} transition={{ duration: 0.4 }} className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div><h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t("realisationsTitle")}</h2><p className="mt-1 text-sm text-slate-500">{filtered.length} {t("productsCount").toLowerCase()}</p></div>
            {wilayas.length > 1 && <div className="flex w-full items-center gap-2 sm:w-auto"><label className="shrink-0 text-sm font-medium text-slate-600">{t("wilaya")} :</label><Select value={wilayaFilter} onValueChange={setWilayaFilter}><SelectTrigger className="w-full bg-white sm:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("realisationsFilterAll")}</SelectItem>{wilayas.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent></Select></div>}
          </motion.div>

          {loading ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0,1,2].map(i => <Card key={i} className="overflow-hidden border-slate-200"><div className="aspect-[3/2] w-full animate-pulse bg-slate-100" /><div className="space-y-2 p-5"><div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" /><div className="h-3 w-full animate-pulse rounded bg-slate-100" /></div></Card>)}</div>
          : filtered.length === 0 ? <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center"><ImageIcon className="h-10 w-10 text-slate-300" /><p className="mt-3 text-sm text-slate-500">{t("noProducts")}</p></div>
          : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r, i) => (
                <motion.button key={r.id} type="button" onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={fadeUp} transition={{ duration: 0.4, delay: (i % 6) * 0.05 }} className="group h-full text-start">
                  <Card className="h-full overflow-hidden border-slate-200 transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg">
                    <div className="relative aspect-[3/2] w-full overflow-hidden bg-slate-100">
                      <img src={r.image_url || placeholder(r.nom, i)} alt={`${r.nom} — ${r.wilaya}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3"><div className="flex items-center gap-1.5 text-xs font-medium text-white"><MapPin className="h-3.5 w-3.5 text-brand-300" /><span>{r.wilaya}</span></div></div>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="text-base font-semibold text-slate-900 group-hover:text-brand-700">{lang === "ar" && r.nom_ar ? r.nom_ar : r.nom}</h3>
                      <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{lang === "ar" && r.description_ar ? r.description_ar : r.description_fr}</p>
                      {r.produits.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{r.produits.map(p => <Badge key={p} variant="secondary" className="bg-brand-50 text-xs font-normal text-brand-700">{p}</Badge>)}</div>}
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">{t("realisationsViewProject")}<ArrowRight className="h-3 w-3 rtl:rotate-180" /></span>
                    </CardContent>
                  </Card>
                </motion.button>
              ))}
            </div>}
        </div>
      </section>

      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} transition={{ duration: 0.5 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 to-brand-900 px-6 py-12 text-center sm:px-12 sm:py-16">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0, transparent 40%)" }} aria-hidden />
            <div className="relative">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">{t("equipYourCabinet")}</h2>
              <p className="mx-auto mt-2 max-w-xl text-brand-100">{t("ctaSubtitle")}</p>
              <Button size="lg" onClick={() => navigate("devis")} className="mt-6 bg-white text-brand-800 hover:bg-brand-50">{t("requestQuote")}<ArrowRight className="h-4 w-4 rtl:rotate-180" /></Button>
            </div>
          </motion.div>
        </div>
      </section>

      <ImageLightbox images={lightboxImages} initialIndex={lightboxIndex} open={lightboxOpen} onOpenChange={setLightboxOpen} />
    </div>
  );
}
export default RealisationsPage;
