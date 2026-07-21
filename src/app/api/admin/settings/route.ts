import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

function getClient() {
  try {
    return getServerClient();
  } catch {
    return null;
  }
}

// GET /api/admin/settings — returns all site_settings rows (admin only)
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Non autorisé. Session admin requise." }, { status: 401 });
  }
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré. Vérifiez SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }
  try {
    const { data, error } = await client
      .from("site_settings")
      .select("key, value_fr, value_ar, value_json, category, label, type, updated_at")
      .order("category")
      .order("key");
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("could not find") || msg.includes("does not exist") || msg.includes("404")) {
        return NextResponse.json(
          { error: "La table 'site_settings' n'existe pas.", tableMissing: true },
          { status: 501 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ settings: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// Mapping: when the panel saves {key: "home", value: {heroTitle_fr, ...}},
// we translate into multiple flat row upserts matching the existing schema.
interface FlatUpsert {
  key: string;
  value_fr: string | null;
  value_ar: string | null;
  category: string;
  label: string;
  type: string;
}

const HOME_FIELDS: Array<{ field: string; key: string; lang: "fr" | "ar"; label: string }> = [
  { field: "heroTitle_fr", key: "home.hero_title_fr", lang: "fr", label: "Titre principal (FR)" },
  { field: "heroTitle_ar", key: "home.hero_title_ar", lang: "ar", label: "Titre principal (AR)" },
  { field: "heroSubtitle_fr", key: "home.hero_subtitle_fr", lang: "fr", label: "Sous-titre (FR)" },
  { field: "heroSubtitle_ar", key: "home.hero_subtitle_ar", lang: "ar", label: "Sous-titre (AR)" },
  { field: "ctaTitle_fr", key: "home.cta_title_fr", lang: "fr", label: "Titre CTA (FR)" },
  { field: "ctaTitle_ar", key: "home.cta_title_ar", lang: "ar", label: "Titre CTA (AR)" },
  { field: "ctaSubtitle_fr", key: "home.cta_subtitle_fr", lang: "fr", label: "Sous-titre CTA (FR)" },
  { field: "ctaSubtitle_ar", key: "home.cta_subtitle_ar", lang: "ar", label: "Sous-titre CTA (AR)" },
];

const COMPANY_FIELDS: Array<{ field: string; key: string; lang: "fr" | "ar"; label: string; cat: string }> = [
  { field: "name", key: "contact.company_name", lang: "fr", label: "Nom entreprise", cat: "contact" },
  { field: "nameAr", key: "contact.company_name_ar", lang: "ar", label: "Nom entreprise (AR)", cat: "contact" },
  { field: "phone", key: "contact.phone", lang: "fr", label: "Téléphone", cat: "contact" },
  { field: "phone2", key: "contact.phone2", lang: "fr", label: "Téléphone 2", cat: "contact" },
  { field: "email", key: "contact.email", lang: "fr", label: "Email", cat: "contact" },
  { field: "address_fr", key: "contact.address_fr", lang: "fr", label: "Adresse (FR)", cat: "contact" },
  { field: "address_ar", key: "contact.address_ar", lang: "ar", label: "Adresse (AR)", cat: "contact" },
  { field: "city", key: "contact.city", lang: "fr", label: "Ville", cat: "contact" },
  { field: "country", key: "contact.country", lang: "fr", label: "Pays", cat: "contact" },
  { field: "hours_fr", key: "contact.hours_fr", lang: "fr", label: "Horaires (FR)", cat: "contact" },
  { field: "hours_ar", key: "contact.hours_ar", lang: "ar", label: "Horaires (AR)", cat: "contact" },
  { field: "facebook", key: "social.facebook", lang: "fr", label: "Facebook", cat: "social" },
  { field: "instagram", key: "social.instagram", lang: "fr", label: "Instagram", cat: "social" },
  { field: "linkedin", key: "social.linkedin", lang: "fr", label: "LinkedIn", cat: "social" },
];

function translateToFlat(key: string, value: Record<string, unknown>): FlatUpsert[] {
  const upserts: FlatUpsert[] = [];
  if (key === "home") {
    for (const f of HOME_FIELDS) {
      const v = (value as Record<string, string>)[f.field];
      if (v !== undefined) {
        upserts.push({
          key: f.key,
          value_fr: f.lang === "fr" ? v : null,
          value_ar: f.lang === "ar" ? v : null,
          category: "home",
          label: f.label,
          type: "text",
        });
      }
    }
  } else if (key === "company") {
    for (const f of COMPANY_FIELDS) {
      const v = (value as Record<string, string>)[f.field];
      if (v !== undefined) {
        upserts.push({
          key: f.key,
          value_fr: f.lang === "fr" ? v : null,
          value_ar: f.lang === "ar" ? v : null,
          category: f.cat,
          label: f.label,
          type: "text",
        });
      }
    }
  } else if (key === "about") {
    // story_fr → about.history.p1 (first paragraph), about.history.p2 (rest)
    const storyFr = (value as Record<string, string>).story_fr || "";
    const storyAr = (value as Record<string, string>).story_ar || "";
    const parasFr = storyFr.split(/\n\n+/);
    const parasAr = storyAr.split(/\n\n+/);
    upserts.push({
      key: "about.history.p1",
      value_fr: parasFr[0] || null,
      value_ar: parasAr[0] || null,
      category: "about",
      label: "Paragraphe 1 - Histoire",
      type: "text",
    });
    if (parasFr.length > 1 || parasAr.length > 1) {
      upserts.push({
        key: "about.history.p2",
        value_fr: parasFr.slice(1).join("\n\n") || null,
        value_ar: parasAr.slice(1).join("\n\n") || null,
        category: "about",
        label: "Paragraphe 2 - Histoire",
        type: "text",
      });
    }
  } else if (key === "stats") {
    // value is an array of {value, fr, ar}. We upsert known stat keys.
    const arr = Array.isArray(value) ? value : [];
    const mapping: Array<{ idx: number; key: string; suffixKey?: string; label: string }> = [
      { idx: 0, key: "stats.clinics", suffixKey: "stats.suffix.clinics", label: "Cabinets équipés" },
      { idx: 1, key: "stats.brands", label: "Marques partenaires" },
      { idx: 2, key: "stats.wilayas", label: "Wilayas couvertes" },
      { idx: 3, key: "stats.sav_hours", suffixKey: "stats.suffix.sav", label: "SAV Réactif (heures)" },
    ];
    for (const m of mapping) {
      const item = arr[m.idx] as { value?: string; fr?: string; ar?: string } | undefined;
      if (!item) continue;
      // Split numeric part and suffix (e.g. "500+" → value="500", suffix="+")
      const numMatch = (item.value || "").match(/^(\d+)(.*)$/);
      const num = numMatch ? numMatch[1] : (item.value || "");
      const suffix = numMatch ? numMatch[2] : "";
      upserts.push({
        key: m.key,
        value_fr: num,
        value_ar: num,
        category: "stats",
        label: m.label,
        type: "number",
      });
      if (m.suffixKey && suffix) {
        upserts.push({
          key: m.suffixKey,
          value_fr: suffix,
          value_ar: suffix,
          category: "stats",
          label: `Suffixe ${m.label}`,
          type: "text",
        });
      }
    }
  } else if (key === "map") {
    // GPS position for the contact page map. value = {lat, lng, zoom, label_fr, label_ar}
    const v = value as { lat?: string; lng?: string; zoom?: string; label_fr?: string; label_ar?: string };
    const fields: Array<{ k: string; val: string | null; lang: "fr" | "ar"; label: string }> = [
      { k: "contact.map.lat", val: v.lat ?? null, lang: "fr", label: "Latitude" },
      { k: "contact.map.lng", val: v.lng ?? null, lang: "fr", label: "Longitude" },
      { k: "contact.map.zoom", val: v.zoom ?? null, lang: "fr", label: "Zoom" },
      { k: "contact.map.address_fr", val: v.label_fr ?? null, lang: "fr", label: "Label carte (FR)" },
      { k: "contact.map.address_ar", val: v.label_ar ?? null, lang: "ar", label: "Label carte (AR)" },
    ];
    for (const f of fields) {
      upserts.push({
        key: f.k,
        value_fr: f.lang === "fr" ? f.val : null,
        value_ar: f.lang === "ar" ? f.val : null,
        category: "contact",
        label: f.label,
        type: "text",
      });
    }
  } else if (key === "home_sections") {
    // Homepage sections: Why Us cards + hero brands
    // Stored as JSON rows: home.why_cards, home.hero_brands, home.why_title_fr, home.why_title_ar
    const v = value as { whyTitle_fr?: string; whyTitle_ar?: string; whyCards?: unknown[]; heroBrands?: unknown[] };
    if (v.whyTitle_fr !== undefined) {
      upserts.push({ key: "home.why_title_fr", value_fr: v.whyTitle_fr || null, value_ar: null, category: "home", label: "Titre section 'Pourquoi nous' (FR)", type: "text" });
    }
    if (v.whyTitle_ar !== undefined) {
      upserts.push({ key: "home.why_title_ar", value_fr: null, value_ar: v.whyTitle_ar || null, category: "home", label: "Titre section 'Pourquoi nous' (AR)", type: "text" });
    }
    if (v.whyCards !== undefined) {
      upserts.push({ key: "home.why_cards", value_fr: null, value_ar: null, category: "home", label: "Cartes 'Pourquoi nous'", type: "json" });
      (upserts as any).__whyCardsArray = v.whyCards;
    }
    if (v.heroBrands !== undefined) {
      upserts.push({ key: "home.hero_brands", value_fr: null, value_ar: null, category: "home", label: "Marques hero", type: "json" });
      (upserts as any).__heroBrandsArray = v.heroBrands;
    }
  } else if (key === "brands") {
    // Exclusive brands array — stored as value_json in the about.brands row.
    // value is an array of {name, bg, text}.
    const arr = Array.isArray(value) ? value : [];
    // Upsert the single about.brands row with value_json = arr.
    // We handle this as a special case in the PUT below (value_json upsert).
    // For now, push a sentinel so we know to use value_json.
    upserts.push({
      key: "about.brands",
      value_fr: null,
      value_ar: null,
      category: "about",
      label: "Marques partenaires",
      type: "json",
    });
    // Stash the brands array on a side-channel property so the PUT handler can use it
    (upserts as any).__brandsArray = arr;
  }
  return upserts;
}

// PUT /api/admin/settings — accepts {key, value} (nested) and translates to flat upserts
export async function PUT(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Non autorisé. Session admin requise." }, { status: 401 });
  }
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré. Vérifiez SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }
  let body: { key?: string; value?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const key = body?.key;
  const value = body?.value;
  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "Champ 'key' requis" }, { status: 400 });
  }
  if (!value || typeof value !== "object") {
    return NextResponse.json({ error: "Champ 'value' requis (objet)" }, { status: 400 });
  }

  const upserts = translateToFlat(key, value);
  if (upserts.length === 0) {
    return NextResponse.json({ error: "Clé inconnue ou valeur vide" }, { status: 400 });
  }

  // Side-channel: for the "brands" key, the brands array is stashed on the upserts object.
  const brandsArray = (upserts as any).__brandsArray as unknown[] | undefined;
  const whyCardsArray = (upserts as any).__whyCardsArray as unknown[] | undefined;
  const heroBrandsArray = (upserts as any).__heroBrandsArray as unknown[] | undefined;

  try {
    // Build the upsert rows. For json-type rows, populate value_json with the brands array.
    const rows = upserts.map((u) => {
      let valueJson = u.type === "json" && brandsArray ? brandsArray : null;
      if (u.type === "json" && u.key === "home.why_cards" && whyCardsArray) valueJson = whyCardsArray;
      if (u.type === "json" && u.key === "home.hero_brands" && heroBrandsArray) valueJson = heroBrandsArray;
      return {
        key: u.key,
        value_fr: u.value_fr,
        value_ar: u.value_ar,
        value_json: valueJson,
        category: u.category,
        label: u.label,
        type: u.type,
        updated_at: new Date().toISOString(),
      };
    });
    const { error } = await client
      .from("site_settings")
      .upsert(rows, { onConflict: "key" });

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("could not find") || msg.includes("does not exist") || msg.includes("404")) {
        return NextResponse.json(
          { error: "La table 'site_settings' n'existe pas.", tableMissing: true },
          { status: 501 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, count: rows.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
