// ODG — Core type definitions
export type Language = "fr" | "ar";

// === CRM: Commandes / Interventions / Techniciens (Task CRM-C) ===
export type CommandeStatut =
  | "en_attente"
  | "en_preparation"
  | "livree"
  | "annulee";

export interface Commande {
  id: string;
  numero: string;
  devis_id: string | null;
  client_id: string | null;
  statut: CommandeStatut;
  date_commande: string | null;
  date_livraison_prevue: string | null;
  date_livraison_reelle: string | null;
  notes: string | null;
  commercial_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined / hydrated client-side:
  client_nom?: string | null;
  devis_numero?: string | null;
}

export type InterventionType =
  | "livraison"
  | "installation"
  | "formation"
  | "maintenance_preventive"
  | "maintenance_curative";

export type InterventionStatut =
  | "planifie"
  | "en_cours"
  | "termine"
  | "annule";

export interface Intervention {
  id: string;
  type: InterventionType;
  client_id: string | null;
  commande_id: string | null;
  produit_id: string | null;
  produit_nom: string | null;
  technicien_id: string | null;
  date_prevue: string | null;
  duree_estimee_min: number | null;
  date_realisee: string | null;
  adresse_intervention: string | null;
  statut: InterventionStatut;
  rapport: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined / hydrated client-side:
  client_nom?: string | null;
  technicien_nom?: string | null;
  commande_numero?: string | null;
}

export interface Technicien {
  id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  specialites: string[] | null;
  zones_couvertes: string[] | null;
  actif: boolean | null;
  user_id: string | null;
  created_at: string;
}

export interface LocalizedText {
  fr: string;
  ar: string;
}

// === Client testimonials (Task REVIEWS-1) ===
// Hardcoded for now — a future enhancement may add a `testimonials` table
// + admin panel. Each testimonial is a public review from an ODG client
// (dentist, clinic, dental center) showing their satisfaction.
export interface Testimonial {
  id: string;
  name: string;
  // "Cabinet dentaire" | "Clinique" | "Centre dentaire"
  establishment: string;
  wilaya: string;
  rating: number; // 1-5
  text: { fr: string; ar: string };
  photo?: string;
}

export interface Category {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  icon: string;
  order: number;
}

export interface ProductSpec {
  label: LocalizedText;
  value: string;
}

// FAQ entry used in the Product schema and FAQPage JSON-LD.
export interface ProductFaqItem {
  q: string;
  a: string;
}

export interface Product {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  // Rich content fields (added 2026-07-29 for SEO/AI). All optional — old
  // products without these fields keep working, the UI simply hides the
  // corresponding tabs/sections.
  descriptionLongue?: LocalizedText;
  usages?: LocalizedText;
  maintenance?: LocalizedText;
  compatibilite?: LocalizedText;
  garantie?: LocalizedText;
  faq?: { fr: ProductFaqItem[]; ar: ProductFaqItem[] };
  prixMin?: number | null;
  prixMax?: number | null;
  ratingValue?: number | null;
  ratingCount?: number | null;
  specs: ProductSpec[];
  images: string[];
  pdfUrl?: string;
  brochurePdf?: string;
  categoryId: string;
  categorySlug: string;
  brand: string;
  model: string;
  featured: boolean;
  available: boolean;
  order: number;
  audience: string[];
  videoUrl?: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: LocalizedText;
  excerpt: LocalizedText;
  content: LocalizedText;
  imageUrl: string;
  published: boolean;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteItem {
  productId: string;
  slug: string;
  name: { fr: string; ar: string };
  image: string;
  brand: string;
  model: string;
  quantity: number;
}

// Quote request persisted in the Supabase `quotes` table.
// Maps to columns: id, nom, email, telephone, wilaya, type_client,
// message, statut, created_at, produits_selectionnes (jsonb array).
export type QuoteStatus = "nouveau" | "en_cours" | "traite" | "archive";
export type ClientType = "dentiste" | "clinique" | "hopital" | "revendeur" | "autre";

export interface QuoteRequest {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  wilaya: string;
  type_client: string;
  message: string | null;
  statut: string;
  created_at: string;
  produits_selectionnes: QuoteItem[];
}

export interface CompanyInfo {
  name: string;
  nameAr: string;
  tagline: { fr: string; ar: string };
  phone: string;
  phone2: string;
  email: string;
  address: { fr: string; ar: string };
  city: string;
  country: string;
  hours: { fr: string; ar: string };
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  // Industry directory profiles — used for AI knowledge-graph entity
  // disambiguation (sameAs in Organization JSON-LD).
  kompass?: string;
  dentex?: string;
}

export const COMPANY: CompanyInfo = {
  name: "OUADAH DENTAL GROUPE",
  nameAr: "مجموعة وادح لطب الأسنان",
  tagline: {
    fr: "Importateur de matériel dentaire",
    ar: "مستورد معدات طب الأسنان",
  },
  phone: "+213 540 00 00 00",
  phone2: "+213 41 00 00 00",
  email: "contact@odg-dz.com",
  address: {
    fr: "Cité 1000 Logements, Bt 4, Oran",
    ar: "حي 1000 سكن، عمارة 4، وهران",
  },
  city: "Oran",
  country: "Algérie",
  hours: {
    fr: "Dim–Jeu : 8h00–17h00",
    ar: "الأحد–الخميس: 8:00–17:00",
  },
  facebook: "https://www.facebook.com/eurlouadahdnetalgroupe",
  instagram: "https://www.instagram.com/ouadahdental",
  linkedin: "https://dz.linkedin.com/in/ouadah-djaouad-85b03a225",
  // Industry directories — boost entity disambiguation for AI knowledge graphs.
  kompass: "https://dz.kompass.com/c/ouadah-dental-groupe-eurl/dz280325",
  dentex: "https://www.dentex.dz/fr/exhibitors/ouadah-dental-groupe-219490",
};

export const STATS = [
  { value: "15+", fr: "Années d'expérience", ar: "سنوات الخبرة" },
  { value: "500+", fr: "Clients satisfaits", ar: "عميل راضٍ" },
  { value: "9", fr: "Produits référencés", ar: "منتج معتمد" },
  { value: "5", fr: "Catégories", ar: "فئات" },
];

// ============================================================
// CRM — Devis (quotes generated by the admin team)
// ============================================================

export type DevisStatut =
  | "brouillon"
  | "envoye"
  | "accepte"
  | "refuse"
  | "expire";

export interface DevisLigne {
  product_id?: string | null;
  designation: string;
  qte: number;
  prix_unitaire: number;
  remise_pct?: number;
}

export interface DevisClientSnapshot {
  nom?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  wilaya?: string | null;
}

export interface Devis {
  id: string;
  numero: string;
  client_id?: string | null;
  client_snapshot?: DevisClientSnapshot | null;
  lignes: DevisLigne[];
  sous_total: number;
  remise_total: number;
  tva_taux: number;
  tva_montant: number;
  montant_total: number;
  statut: DevisStatut;
  date_emission?: string | null;
  date_validite?: string | null;
  notes?: string | null;
  commercial_id?: string | null;
  converted_to_commande_id?: string | null;
  created_at?: string;
  updated_at?: string;
  // Optional joined client (only when explicitly selected).
  client?: {
    id: string;
    nom: string;
    email?: string | null;
    telephone?: string | null;
    adresse?: string | null;
    wilaya?: string | null;
  } | null;
}
