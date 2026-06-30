"use client";
import { Phone, Mail, MapPin, Clock, Facebook, Instagram, Linkedin } from "lucide-react";
import { useCompanyInfo } from "@/lib/settings-service";
import { useTranslation } from "@/lib/i18n";
import { useData } from "@/lib/data-service";
import { navigate } from "@/lib/router";

export function Footer() {
  const { t, lang } = useTranslation();
  const COMPANY = useCompanyInfo();
  const { categories } = useData();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img
                src="/logo-odg.png"
                alt="OUADAH DENTAL GROUPE"
                className="h-10 w-auto object-contain brightness-0 invert"
              />
              <span className="text-sm font-bold text-white">
                {lang === "ar" ? COMPANY.nameAr : COMPANY.name}
              </span>
            </div>
            <p className="text-xs text-slate-400">{COMPANY.tagline[lang]}</p>
            <div className="flex gap-3 pt-1">
              {COMPANY.facebook && <a href={COMPANY.facebook} aria-label="Facebook" className="text-slate-400 hover:text-white"><Facebook className="h-5 w-5" /></a>}
              {COMPANY.instagram && <a href={COMPANY.instagram} aria-label="Instagram" className="text-slate-400 hover:text-white"><Instagram className="h-5 w-5" /></a>}
              {COMPANY.linkedin && <a href={COMPANY.linkedin} aria-label="LinkedIn" className="text-slate-400 hover:text-white"><Linkedin className="h-5 w-5" /></a>}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">{t("quickLinks")}</h3>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => navigate("catalogue")} className="hover:text-brand-400">{t("catalogue")}</button></li>
              <li><button onClick={() => navigate("blog")} className="hover:text-brand-400">{t("blog")}</button></li>
              <li><button onClick={() => navigate("apropos")} className="hover:text-brand-400">{t("about")}</button></li>
              <li><button onClick={() => navigate("realisations")} className="hover:text-brand-400">{t("realisationsTitle")}</button></li>
              <li><button onClick={() => navigate("contact")} className="hover:text-brand-400">{t("contact")}</button></li>
              <li><button onClick={() => navigate("comparer")} className="hover:text-brand-400">{t("compare")}</button></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">{t("categoriesTitle")}</h3>
            <ul className="space-y-2 text-sm">
              {categories.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <button onClick={() => navigate(`catalogue/${c.slug}`)} className="hover:text-brand-400">
                    {c.name[lang]}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">{t("contactUs")}</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <span>{COMPANY.address[lang]}, {COMPANY.city}, {COMPANY.country}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-brand-400" />
                <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} className="hover:text-brand-400">{COMPANY.phone}</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-brand-400" />
                <a href={`mailto:${COMPANY.email}`} className="hover:text-brand-400">{COMPANY.email}</a>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <span>{COMPANY.hours[lang]}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-slate-700 pt-6 text-xs text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} {COMPANY.name}. {t("rights")}</p>
          <p>Oran, {COMPANY.country} — {COMPANY.tagline[lang]}</p>
        </div>

        {/* Legal links (Task LEGAL-1) */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <button
            onClick={() => navigate("mentions-legales")}
            className="hover:text-brand-400 hover:underline"
          >
            {t("legalNotices")}
          </button>
          <span aria-hidden className="text-slate-600">•</span>
          <button
            onClick={() => navigate("confidentialite")}
            className="hover:text-brand-400 hover:underline"
          >
            {t("privacyPolicy")}
          </button>
        </div>
      </div>
    </footer>
  );
}
