"use client";
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { COMPANY, STATS, type CompanyInfo } from "./types";

// Default settings (used when Supabase is not configured or table missing)
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
    story_ar: "مجموعة وادح لطب الأسنان هي شركة متخصصة في استيراد معدات طب الأسنان، مقرها وهران. منذ أكثر من 15 سنة، نجهز عيادات وعيادات الأسنان والمستشفيات في الجزائر بمعدات ذات جودة دولية.",
  },
  stats: STATS,
};

interface SettingsContextValue {
  settings: AllSettings;
  loading: boolean;
  tableMissing: boolean;
  refresh: () => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loading: false,
  tableMissing: false,
  refresh: () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
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
          .select("key, value")
          .in("key", ["company", "home", "about", "stats"]);

        if (cancelled) return;
        if (error) {
          // Table likely missing — keep defaults
          const msg = (error.message || "").toLowerCase();
          if (msg.includes("could not find") || msg.includes("does not exist") || msg.includes("404")) {
            setTableMissing(true);
          }
          setLoading(false);
          return;
        }

        const merged: AllSettings = { ...DEFAULT_SETTINGS };
        for (const row of data || []) {
          if (!row?.key || !row?.value) continue;
          try {
            const val = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
            if (row.key === "stats" && Array.isArray(val)) {
              merged.stats = val;
            } else if (row.key in merged) {
              (merged as unknown as Record<string, unknown>)[row.key] = {
                ...(merged as unknown as Record<string, unknown>)[row.key] as object,
                ...val,
              };
            }
          } catch {}
        }
        if (!cancelled) setSettings(merged);
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
    <SettingsContext.Provider value={{ settings, loading, tableMissing, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

// Helper: get company info in the CompanyInfo shape (for components expecting that type)
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
