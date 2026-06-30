"use client";

import { motion } from "framer-motion";
import { Star, Quote, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import type { Testimonial } from "@/lib/types";

// ============================================================
// TestimonialsSection (Task REVIEWS-1)
// ------------------------------------------------------------
// Hardcoded client testimonials for ODG (Oran, Algeria).
// These are sample reviews from real-looking ODG clients — a
// future enhancement may add a `testimonials` table + admin
// panel so the marketing team can edit them without a redeploy.
// ============================================================

const TESTIMONIALS: Testimonial[] = [
  {
    id: "t1",
    name: "Dr. Benali",
    establishment: "Cabinet dentaire",
    wilaya: "Oran",
    rating: 5,
    text: {
      fr: "Le fauteuil Silver Fox 8000C est excellent, service après-vente réactif. Je recommande ODG.",
      ar: "كرسي Silver Fox 8000C ممتاز، خدمة ما بعد البيع سريعة. أنصح بـ ODG.",
    },
  },
  {
    id: "t2",
    name: "Dr. Haddad",
    establishment: "Clinique",
    wilaya: "Alger",
    rating: 5,
    text: {
      fr: "Autoclave ICANCLAVE conforme aux normes, formation complète. Équipe professionnelle.",
      ar: "جهاز التعقيم ICANCLAVE مطابق للمعايير، تكوين شامل. فريق محترف.",
    },
  },
  {
    id: "t3",
    name: "Dr. Cherif",
    establishment: "Cabinet dentaire",
    wilaya: "Oran",
    rating: 5,
    text: {
      fr: "Installation rapide de notre radio OWANDY, technicien compétent. Très satisfaits.",
      ar: "تركيب سريع لجهاز الأشعة OWANDY، فني كفؤ. راضون جداً.",
    },
  },
  {
    id: "t4",
    name: "Dr. Mansouri",
    establishment: "Centre dentaire",
    wilaya: "Sénia",
    rating: 5,
    text: {
      fr: "Matériel de qualité, devis clair. ODG est notre fournisseur de confiance depuis 2 ans.",
      ar: "معدات عالية الجودة، عرض سعر واضح. ODG مورّدنا الموثوق منذ سنتين.",
    },
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Generate initials from a name like "Dr. Benali" → "B".
// For two-part names without "Dr." prefix we'd take the first letter of
// the first two tokens.
function initials(name: string): string {
  const tokens = name.replace(/^Dr\.?\s*/i, "").trim().split(/\s+/);
  if (tokens.length === 0) return "?";
  if (tokens.length === 1) return tokens[0].charAt(0).toUpperCase();
  return (tokens[0].charAt(0) + tokens[1].charAt(0)).toUpperCase();
}

export function TestimonialsSection() {
  const { t, lang } = useTranslation();

  return (
    <section className="bg-white py-16 lg:py-20" aria-labelledby="testimonials-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <div className="mb-3 inline-flex items-center justify-center rounded-full bg-brand-100 p-2 text-brand-700">
            <Quote className="h-5 w-5" />
          </div>
          <h2
            id="testimonials-heading"
            className="text-2xl font-bold text-slate-900 sm:text-3xl"
          >
            {t("testimonialsTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
            {t("testimonialsSubtitle")}
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.slice(0, 4).map((testimonial, i) => (
            <motion.div
              key={testimonial.id}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeUp}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="h-full"
            >
              <Card className="relative h-full overflow-hidden border-slate-200 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg">
                <CardContent className="flex h-full flex-col p-6">
                  {/* Decorative quote mark */}
                  <Quote
                    className="absolute -top-2 end-4 h-16 w-16 text-brand-50"
                    aria-hidden
                  />

                  {/* Star rating */}
                  <div
                    className="relative mb-3 flex items-center gap-0.5"
                    aria-label={`${testimonial.rating}/5`}
                  >
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={
                          idx < testimonial.rating
                            ? "h-4 w-4 fill-amber-400 text-amber-400"
                            : "h-4 w-4 fill-slate-200 text-slate-200"
                        }
                      />
                    ))}
                  </div>

                  {/* Testimonial text */}
                  <p className="relative flex-1 text-sm leading-relaxed text-slate-700 sm:text-base">
                    <span className="me-1 font-bold text-brand-700">“</span>
                    {testimonial.text[lang] || testimonial.text.fr}
                    <span className="ms-1 font-bold text-brand-700">”</span>
                  </p>

                  {/* Divider */}
                  <div className="my-4 h-px w-full bg-slate-100" />

                  {/* Author row */}
                  <div className="relative flex items-center gap-3">
                    {testimonial.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={testimonial.photo}
                        alt={testimonial.name}
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-sm font-bold text-white"
                        aria-hidden
                      >
                        {initials(testimonial.name)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {testimonial.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {testimonial.establishment}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-brand-500" />
                      <span>{testimonial.wilaya}</span>
                    </div>
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
