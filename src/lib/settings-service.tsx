"use client";
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { COMPANY, STATS, type CompanyInfo } from "./types";

// The Supabase site_settings table uses a FLAT key-value schema:
//   key (text PK) | value_fr (text) | value_ar (text) | value_json (jsonb) | category | label | type
// Each row is a single setting identified by a dotted key (e.g. "contact.phone",
// "stats.clinics", "social.facebook", "home.hero_title_fr").
//
// This service fetches ALL rows and exposes:
//   - flat: Record<key, SettingRow> for direct access
//   - nested helpers: company, home, about, stats (assembled from flat keys)
//   so the admin panels and public pages can consume a structured shape.

export interface SettingRow {
  key: string;
  value_fr: string | null;
  value_ar: string | null;
  value_json: unknown | null;
  category: string | null;
  label: string | null;
  type: string | null;
}

export interface HomeSettings {
  heroTitle_fr: string;
  heroTitle_ar: string;
  heroSubtitle_fr: string;
  heroSubtitle_ar: string;
  ctaTitle_fr: string;
  ctaTitle_ar: string;
  ctaSubtitle_fr: string;
  ctaSubtitle_ar: string;
}

export interface AboutSettings {
  story_fr: string;
  story_ar: string;
}

export interface StatItem {
  value: string;
  fr: string;
  ar: string;
}

export interface CompanySettings {
  name: string;
  nameAr: string;
  phone: string;
  phone2: string;
  email: string;
  address_fr: string;
  address_ar: string;
  city: string;
  country: string;
  hours_fr: string;
  hours_ar: string;
  facebook: string;
  instagram: string;
  linkedin: string;
}

interface AllSettings {
  company: CompanySettings;
  home: HomeSettings;
  about: AboutSettings;
  stats: StatItem[];
}

const DEFAULT_SETTINGS: AllSettings = {
  company: {
    name: COMPANY.name,
    nameAr: COMPANY.nameAr,
    phone: COMPANY.phone,
    phone2: COMPANY.phone2,
    email: COMPANY.email,
    address_fr: COMPANY.address.fr,
    address_ar: COMPANY.address.ar,
    city: COMPANY.city,
    country: COMPANY.country,
    hours_fr: COMPANY.hours.fr,
    hours_ar: COMPANY.hours.ar,
    facebook: COMPANY.facebook || "",
    instagram: COMPANY.instagram || "",
    linkedin: COMPANY.linkedin || "",
  },
  home: {
    heroTitle_fr: "Votre partenaire en matériel dentaire",
    heroTitle_ar: "شريكك في معدات طب الأسنان",
    heroSubtitle_fr: "Importateur exclusif de Silver Fox, ICANCLAVE et OWANDY en Algérie.",
    heroSubtitle_ar: "المستورد الحصري لـ Silver Fox وICANCLAVE وOWANDY في الجزائر.",
    ctaTitle_fr: "Un projet d'équipement ?",
    ctaTitle_ar: "مشروع تجهيز؟",
    ctaSubtitle_fr: "Nos experts vous accompagnent de A à Z.",
    ctaSubtitle_ar: "خبراؤنا يرافقونك من الألف إلى الياء.",
  },
  about: {
    story_fr: "EURL OUADAH DENTAL GROUPE est un importateur spécialisé en matériel dentaire, basé à Oran. Depuis plus de 15 ans, nous équipons les cabinets dentaires, cliniques et hôpitaux d'Algérie avec du matériel de qualité internationale.",
    story_ar: "مجموعة وادح لطب الأسنان هي شركة متخصصة في استيراد معدات طب الأسنان، مقرها وهران.",
  },
  stats: STATS,
};

interface SettingsContextValue {
  settings: AllSettings;
  flat: Record<string, SettingRow>;
  loading: boolean;
  tableMissing: boolean;
  refresh: () => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  flat: {},
  loading: false,
  tableMissing: false,
  refresh: () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

// Helper: get a row's text value for a given language
function val(row: SettingRow | undefined, lang: "fr" | "ar"): string | null {
  if (!row) return null;
  return lang === "ar" ? (row.value_ar ?? row.value_fr) : (row.value_fr ?? row.value_ar);
}

// Assemble the nested AllSettings from the flat key→row map
function assemble(flat: Record<string, SettingRow>): AllSettings {
  const g = (k: string): SettingRow | undefined => flat[k];
  const txt = (k: string, lang: "fr" | "ar", fallback: string): string => val(g(k), lang) ?? fallback;

  // Company info from contact.* + social.* keys
  const company: CompanySettings = {
    name: txt("contact.company_name", "fr", DEFAULT_SETTINGS.company.name),
    nameAr: txt("contact.company_name_ar", "ar", DEFAULT_SETTINGS.company.nameAr),
    phone: txt("contact.phone", "fr", DEFAULT_SETTINGS.company.phone),
    phone2: txt("contact.phone2", "fr", DEFAULT_SETTINGS.company.phone2),
    email: txt("contact.email", "fr", DEFAULT_SETTINGS.company.email),
    address_fr: txt("contact.address_fr", "fr", DEFAULT_SETTINGS.company.address_fr),
    address_ar: txt("contact.address_ar", "ar", DEFAULT_SETTINGS.company.address_ar),
    city: txt("contact.city", "fr", DEFAULT_SETTINGS.company.city),
    country: txt("contact.country", "fr", DEFAULT_SETTINGS.company.country),
    hours_fr: txt("contact.hours_fr", "fr", DEFAULT_SETTINGS.company.hours_fr),
    hours_ar: txt("contact.hours_ar", "ar", DEFAULT_SETTINGS.company.hours_ar),
    facebook: txt("social.facebook", "fr", DEFAULT_SETTINGS.company.facebook),
    instagram: txt("social.instagram", "fr", DEFAULT_SETTINGS.company.instagram),
    linkedin: txt("social.linkedin", "fr", DEFAULT_SETTINGS.company.linkedin),
  };

  // Home hero/CTA from home.* keys
  const home: HomeSettings = {
    heroTitle_fr: txt("home.hero_title_fr", "fr", DEFAULT_SETTINGS.home.heroTitle_fr),
    heroTitle_ar: txt("home.hero_title_ar", "ar", DEFAULT_SETTINGS.home.heroTitle_ar),
    heroSubtitle_fr: txt("home.hero_subtitle_fr", "fr", DEFAULT_SETTINGS.home.heroSubtitle_fr),
    heroSubtitle_ar: txt("home.hero_subtitle_ar", "ar", DEFAULT_SETTINGS.home.heroSubtitle_ar),
    ctaTitle_fr: txt("home.cta_title_fr", "fr", DEFAULT_SETTINGS.home.ctaTitle_fr),
    ctaTitle_ar: txt("home.cta_title_ar", "ar", DEFAULT_SETTINGS.home.ctaTitle_ar),
    ctaSubtitle_fr: txt("home.cta_subtitle_fr", "fr", DEFAULT_SETTINGS.home.ctaSubtitle_fr),
    ctaSubtitle_ar: txt("home.cta_subtitle_ar", "ar", DEFAULT_SETTINGS.home.ctaSubtitle_ar),
  };

  // About story from about.history.* keys
  const about: AboutSettings = {
    story_fr: [g("about.history.p1"), g("about.history.p2")]
      .map((r) => val(r, "fr"))
      .filter(Boolean)
      .join("\n\n") || DEFAULT_SETTINGS.about.story_fr,
    story_ar: [g("about.history.p1"), g("about.history.p2")]
      .map((r) => val(r, "ar"))
      .filter(Boolean)
      .join("\n\n") || DEFAULT_SETTINGS.about.story_ar,
  };

  // Stats from stats.* keys (build array from known stat rows)
  const statKeys = [
    { key: "stats.clinics", suffix: "stats.suffix.clinics", fr: "Cabinets équipés", ar: "عيادات مجهزة" },
    { key: "stats.brands", fr: "Marques partenaires", ar: "علامات شريكة" },
    { key: "stats.wilayas", fr: "Wilayas couvertes", ar: "ولايات مغطاة" },
    { key: "stats.sav_hours", suffix: "stats.suffix.sav", fr: "SAV réactif", ar: "خدمة سريعة" },
  ];
  const stats: StatItem[] = statKeys
    .map((s) => {
      const row = g(s.key);
      const v = val(row, "fr");
      if (!v) return null;
      const suffixRow = s.suffix ? g(s.suffix) : undefined;
      const suffix = suffixRow ? (val(suffixRow, "fr") ?? "") : "";
      return { value: v + suffix, fr: s.fr, ar: s.ar };
    })
    .filter((x): x is StatItem => x !== null);
  if (stats.length === 0) stats.push(...DEFAULT_SETTINGS.stats);

  return { company, home, about, stats };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [flat, setFlat] = useState<Record<string, SettingRow>>({});
  const [settings, setSettings] = useState<AllSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("key, value_fr, value_ar, value_json, category, label, type");

        if (cancelled) return;
        if (error) {
          const msg = (error.message || "").toLowerCase();
          if (msg.includes("could not find") || msg.includes("does not exist") || msg.includes("404")) {
            setTableMissing(true);
          }
          setLoading(false);
          return;
        }

        const map: Record<string, SettingRow> = {};
        for (const row of data || []) {
          if (row?.key) map[row.key] = row as SettingRow;
        }
        if (!cancelled) {
          setFlat(map);
          setSettings(assemble(map));
        }
      } catch {
        // keep defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <SettingsContext.Provider value={{ settings, flat, loading, tableMissing, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

// Helper: get company info in the CompanyInfo shape
export function useCompanyInfo(): CompanyInfo & { raw: CompanySettings } {
  const { settings } = useSettings();
  const c = settings.company;
  return {
    name: c.name,
    nameAr: c.nameAr,
    tagline: { fr: "Importateur de matériel dentaire", ar: "مستورد معدات طب الأسنان" },
    phone: c.phone,
    phone2: c.phone2,
    email: c.email,
    address: { fr: c.address_fr, ar: c.address_ar },
    city: c.city,
    country: c.country,
    hours: { fr: c.hours_fr, ar: c.hours_ar },
    facebook: c.facebook || undefined,
    instagram: c.instagram || undefined,
    linkedin: c.linkedin || undefined,
    raw: c,
  };
}
