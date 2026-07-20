"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Quote, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface TRow { id: string; nom: string; etablissement: string | null; wilaya: string | null; note: number; texte_fr: string; texte_ar: string | null; photo_url: string | null; }

const FALLBACK: TRow[] = [
  { id: "f1", nom: "Dr. Benali", etablissement: "Cabinet dentaire", wilaya: "Oran", note: 5, texte_fr: "Le fauteuil Silver Fox 8000C est excellent, service après-vente réactif.", texte_ar: "كرسي Silver Fox 8000C ممتاز، خدمة ما بعد البيع سريعة.", photo_url: null },
  { id: "f2", nom: "Dr. Haddad", etablissement: "Clinique", wilaya: "Alger", note: 5, texte_fr: "Autoclave ICANCLAVE conforme aux normes, formation complète.", texte_ar: "جهاز التعقيم ICANCLAVE مطابق للمعايير، تكوين شامل.", photo_url: null },
  { id: "f3", nom: "Dr. Cherif", etablissement: "Cabinet dentaire", wilaya: "Oran", note: 5, texte_fr: "Installation rapide de notre radio OWANDY, technicien compétent.", texte_ar: "تركيب سريع لجهاز الأشعة OWANDY، فني كفؤ.", photo_url: null },
  { id: "f4", nom: "Dr. Mansouri", etablissement: "Centre dentaire", wilaya: "Sénia", note: 5, texte_fr: "Matériel de qualité, devis clair. ODG est notre fournisseur de confiance.", texte_ar: "معدات عالية الجودة، عرض سعر واضح. ODG مورّدنا الموثوق.", photo_url: null },
];

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
function initials(name: string) { const t = name.replace(/^Dr\.?\s*/i, "").trim().split(/\s+/); return t.length <= 1 ? t[0]?.charAt(0).toUpperCase() : (t[0].charAt(0) + t[1].charAt(0)).toUpperCase(); }

export function TestimonialsSection() {
  const { t, lang } = useTranslation();
  const [testimonials, setTestimonials] = useState<TRow[]>(FALLBACK);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    supabase.from("testimonials").select("id,nom,etablissement,wilaya,note,texte_fr,texte_ar,photo_url").eq("actif", true).order("ordre", { ascending: true }).limit(6).then(({ data, error }) => {
      if (!error && data && data.length > 0) setTestimonials(data);
    });
  }, []);

  return (
    <section className="bg-white py-16 lg:py-20" aria-labelledby="testimonials-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} transition={{ duration: 0.5 }} className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center justify-center rounded-full bg-brand-100 p-2 text-brand-700"><Quote className="h-5 w-5" /></div>
          <h2 id="testimonials-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl">{t("testimonialsTitle")}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">{t("testimonialsSubtitle")}</p>
        </motion.div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.slice(0, 6).map((tw, i) => (
            <motion.div key={tw.id} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.08 }} className="h-full">
              <Card className="relative h-full overflow-hidden border-slate-200 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg">
                <CardContent className="flex h-full flex-col p-6">
                  <Quote className="absolute -top-2 end-4 h-16 w-16 text-brand-50" aria-hidden />
                  <div className="relative mb-3 flex items-center gap-0.5" aria-label={`${tw.note}/5`}>
                    {Array.from({ length: 5 }).map((_, idx) => <Star key={idx} className={idx < tw.note ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4 fill-slate-200 text-slate-200"} />)}
                  </div>
                  <p className="relative flex-1 text-sm leading-relaxed text-slate-700 sm:text-base"><span className="me-1 font-bold text-brand-700">"</span>{lang === "ar" && tw.texte_ar ? tw.texte_ar : tw.texte_fr}<span className="ms-1 font-bold text-brand-700">"</span></p>
                  <div className="my-4 h-px w-full bg-slate-100" />
                  <div className="relative flex items-center gap-3">
                    {tw.photo_url ? <img src={tw.photo_url} alt={tw.nom} className="h-11 w-11 shrink-0 rounded-full object-cover" loading="lazy" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-sm font-bold text-white" aria-hidden>{initials(tw.nom)}</div>}
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{tw.nom}</p><p className="truncate text-xs text-slate-500">{tw.etablissement}</p></div>
                    {tw.wilaya && <div className="flex shrink-0 items-center gap-1 text-xs text-slate-400"><MapPin className="h-3.5 w-3.5 text-brand-500" /><span>{tw.wilaya}</span></div>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default TestimonialsSection;
