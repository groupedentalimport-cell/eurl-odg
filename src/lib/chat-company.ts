// Server-side helper: fetch the live company contact info from the
// site_settings table (the same source the admin Contact tab edits).
// Falls back to the hardcoded COMPANY constant only if Supabase is
// unreachable or the rows are missing.

import { getServerClient } from "./supabase";
import { COMPANY } from "./types";

export interface LiveCompanyInfo {
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

// 5-minute cache so we don't hit Supabase on every chat message
let _cache: { data: LiveCompanyInfo; ts: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

function fallback(): LiveCompanyInfo {
  return {
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
  };
}

// Read a value_fr or value_ar from a flat site_settings row map
function pick(
  map: Record<string, { value_fr: string | null; value_ar: string | null } | undefined>,
  key: string,
  lang: "fr" | "ar",
  fallback: string
): string {
  const row = map[key];
  if (!row) return fallback;
  const v = lang === "ar" ? (row.value_ar ?? row.value_fr) : (row.value_fr ?? row.value_ar);
  return v || fallback;
}

export async function getLiveCompanyInfo(): Promise<LiveCompanyInfo> {
  // Return cached if fresh
  if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) {
    return _cache.data;
  }

  let client: ReturnType<typeof getServerClient> | null = null;
  try {
    client = getServerClient();
  } catch {
    // service role not configured (dev without env)
    return fallback();
  }
  if (!client) return fallback();

  try {
    // Fetch the contact.* + social.* rows in one query
    const { data, error } = await client
      .from("site_settings")
      .select("key, value_fr, value_ar")
      .in("category", ["contact", "social"]);

    if (error) return fallback();

    // Build a key → row map
    const map: Record<string, { value_fr: string | null; value_ar: string | null }> = {};
    for (const row of data || []) {
      if (row?.key) map[row.key] = { value_fr: row.value_fr, value_ar: row.value_ar };
    }

    const info: LiveCompanyInfo = {
      name: pick(map, "contact.company_name", "fr", COMPANY.name),
      nameAr: pick(map, "contact.company_name_ar", "ar", COMPANY.nameAr),
      phone: pick(map, "contact.phone", "fr", COMPANY.phone),
      phone2: pick(map, "contact.phone2", "fr", COMPANY.phone2),
      email: pick(map, "contact.email", "fr", COMPANY.email),
      address_fr: pick(map, "contact.address_fr", "fr", COMPANY.address.fr),
      address_ar: pick(map, "contact.address_ar", "ar", COMPANY.address.ar),
      city: pick(map, "contact.city", "fr", COMPANY.city),
      country: pick(map, "contact.country", "fr", COMPANY.country),
      hours_fr: pick(map, "contact.hours_fr", "fr", COMPANY.hours.fr),
      hours_ar: pick(map, "contact.hours_ar", "ar", COMPANY.hours.ar),
      facebook: pick(map, "social.facebook", "fr", COMPANY.facebook || ""),
      instagram: pick(map, "social.instagram", "fr", COMPANY.instagram || ""),
      linkedin: pick(map, "social.linkedin", "fr", COMPANY.linkedin || ""),
    };

    _cache = { data: info, ts: Date.now() };
    return info;
  } catch {
    return fallback();
  }
}
