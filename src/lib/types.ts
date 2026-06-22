// ODG — Core type definitions
export type Language = "fr" | "ar";

export interface LocalizedText {
  fr: string;
  ar: string;
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

export interface Product {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
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
  facebook: "#",
  instagram: "#",
  linkedin: "#",
};

export const STATS = [
  { value: "15+", fr: "Années d'expérience", ar: "سنوات الخبرة" },
  { value: "500+", fr: "Clients satisfaits", ar: "عميل راضٍ" },
  { value: "9", fr: "Produits référencés", ar: "منتج معتمد" },
  { value: "5", fr: "Catégories", ar: "فئات" },
];
