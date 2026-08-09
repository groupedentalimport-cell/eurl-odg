import type { Metadata } from "next";

// ---------------------------------------------------------------------------
// City data for /villes/[slug] pages.
// ---------------------------------------------------------------------------
//
// All city content is centralized here (not in Supabase) because:
//   1. The number of cities is stable (15 major Algerian cities + 5 wilayas
//      of direct intervention).
//   2. The content is editorial (zone, delay, contact) — better versioned
//      in git than edited via an admin panel.
//   3. It keeps the city pages fully server-rendered and cacheable.
//
// To add a new city: add an entry to CITIES below + a /villes/<slug> page
// will be generated automatically.

export type InterventionZone = "directe" | "livraison";

export interface CityData {
  slug: string;
  name: string;
  nameAr?: string;
  wilaya: string;
  wilayaCode: number;
  population: string;
  // SEO
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  // Zone
  zone: InterventionZone;
  // directe = Oran + wilayas voisines (techniciens sur place)
  // livraison = autres wilayas (livraison par transporteur)
  interventionDelay: string;
  deliveryDelay: string;
  // Content sections (HTML allowed)
  presentation: string;
  zoneCouverture: string;
  // Optional contact info specific to the city
  commercialContact?: string;
  // Geographic coordinates for the LocalBusiness schema
  latitude?: number;
  longitude?: number;
}

export const CITIES: Record<string, CityData> = {
  oran: {
    slug: "oran",
    name: "Oran",
    nameAr: "وهران",
    wilaya: "Oran",
    wilayaCode: 31,
    population: "1 500 000+",
    seoTitle: "Matériel dentaire à Oran — OUADAH DENTAL GROUPE (siège, SAV, formation)",
    seoDescription:
      "OUADAH DENTAL GROUPE, siège à Oran : distributeur de matériel dentaire Silver Fox, ICANCLAVE, OWANDY, Launca. Showroom, SAV direct, formation, devis personnalisé. Livraison dans toute la wilaya d'Oran.",
    seoKeywords: [
      "matériel dentaire Oran",
      "fauteuil dentaire Oran",
      "autoclave Oran",
      "SAV matériel dentaire Oran",
      "distributeur matériel dentaire Oran",
      "Silver Fox Oran",
      "ICANCLAVE Oran",
      "OWANDY Oran",
    ],
    zone: "directe",
    interventionDelay: "24-48h ouvrées",
    deliveryDelay: "Livraison et installation le jour même dans Oran ville",
    presentation:
      "<p>Oran est le siège social d'OUADAH DENTAL GROUPE. Notre showroom et notre atelier de maintenance sont situés dans la cité 1000 Logements, Bt 4, à Oran. Les chirurgiens-dentistes oranais bénéficient d'un service direct : installation le jour même, intervention SAV sous 24-48h ouvrées, et formation sur place.</p><p>Nous accompagnons les cabinets dentaires d'Oran depuis plus de 15 ans : fauteuils Silver Fox, autoclaves ICANCLAVE classe B, radiologie OWANDY faible dose, scanners intra-oraux Launca. Plus de 500 cabinets algériens nous font confiance.</p>",
    zoneCouverture:
      "<h3>Zone d'intervention directe</h3><ul><li>Oran ville et agglomération</li><li>Es Senia, Bir El Djir, Arzew, Bethioua</li><li>Oran ouest, est, sud</li><li>Toutes les communes de la wilaya d'Oran</li></ul><h3>Wilayas voisines couvertes</h3><ul><li>Mostaganem (à 80 km)</li><li>Mascara (à 90 km)</li><li>Relizane (à 110 km)</li><li>Aïn Témouchent (à 70 km)</li></ul>",
    commercialContact: "Téléphone direct : +213 540 00 00 00 / +213 41 00 00 00",
    latitude: 35.6976,
    longitude: -0.6337,
  },

  alger: {
    slug: "alger",
    name: "Alger",
    nameAr: "الجزائر",
    wilaya: "Alger",
    wilayaCode: 16,
    population: "3 500 000+",
    seoTitle: "Matériel dentaire à Alger — OUADAH DENTAL GROUPE (livraison, installation)",
    seoDescription:
      "Matériel dentaire à Alger distribué par OUADAH DENTAL GROUPE : fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY, scanners Launca. Livraison 3-5 jours, installation par techniciens ODG. Devis personnalisé.",
    seoKeywords: [
      "matériel dentaire Alger",
      "fauteuil dentaire Alger",
      "autoclave Alger",
      "distributeur matériel dentaire Alger",
      "Silver Fox Alger",
      "ICANCLAVE Alger",
      "OWANDY Alger",
      "équipement cabinet dentaire Alger",
    ],
    zone: "livraison",
    interventionDelay: "72h à 5 jours ouvrés (déplacement technicien)",
    deliveryDelay: "3 à 5 jours ouvrés",
    presentation:
      "<p>OUADAH DENTAL GROUPE livre et installe du matériel dentaire à Alger et dans toute la wilaya depuis son siège d'Oran. Notre équipe de techniciens se déplace à Alger pour l'installation des fauteuils dentaires Silver Fox, des autoclaves ICANCLAVE et des unités de radiologie OWANDY.</p><p>Les chirurgiens-dentistes algérois bénéficient de la même garantie, formation et service après-vente que nos clients d'Oran. Le délai de livraison standard est de 3 à 5 jours ouvrés via transporteurs spécialisés.</p>",
    zoneCouverture:
      "<h3>Communes desservies</h3><ul><li>Alger Centre, Bab El Oued, Hussein Dey</li><li>Bab Ezzouar, Dar El Beïda, Hydra</li><li>Kouba, Bir Mourad Raïs, El Biar</li><li>Cheraga, Draria, Staoueli</li><li>Toutes les communes de la wilaya d'Alger</li></ul><h3>Wilayas limitrophes</h3><ul><li>Blida, Boumerdès, Tipaza</li></ul>",
    latitude: 36.7538,
    longitude: 3.0588,
  },

  constantine: {
    slug: "constantine",
    name: "Constantine",
    nameAr: "قسنطينة",
    wilaya: "Constantine",
    wilayaCode: 25,
    population: "450 000+",
    seoTitle: "Matériel dentaire à Constantine — OUADAH DENTAL GROUPE",
    seoDescription:
      "Matériel dentaire à Constantine : fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Livraison 4-6 jours, installation et formation par techniciens ODG. Devis personnalisé sous 24h.",
    seoKeywords: [
      "matériel dentaire Constantine",
      "fauteuil dentaire Constantine",
      "autoclave Constantine",
      "distributeur matériel dentaire Constantine",
      "équipement cabinet dentaire Constantine",
    ],
    zone: "livraison",
    interventionDelay: "5-7 jours ouvrés",
    deliveryDelay: "4 à 6 jours ouvrés",
    presentation:
      "<p>OUADAH DENTAL GROUPE livre du matériel dentaire à Constantine et dans tout l'est algérien. Notre équipe se déplace pour l'installation des fauteuils, autoclaves et équipements de radiologie, avec formation complète incluse.</p>",
    zoneCouverture:
      "<h3>Zone desservie</h3><ul><li>Constantine ville et agglomération</li><li>Wilaya de Constantine (El Khroub, Hamma Bouziane, Didouche Mourad)</li><li>Wilayas limitrophes : Mila, Skikda, Jijel</li></ul>",
    latitude: 36.365,
    longitude: 6.6147,
  },

  annaba: {
    slug: "annaba",
    name: "Annaba",
    nameAr: "عنابة",
    wilaya: "Annaba",
    wilayaCode: 23,
    population: "350 000+",
    seoTitle: "Matériel dentaire à Annaba — OUADAH DENTAL GROUPE",
    seoDescription:
      "Matériel dentaire à Annaba : fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Livraison 4-6 jours, installation et formation par techniciens ODG. Devis sous 24h.",
    seoKeywords: [
      "matériel dentaire Annaba",
      "fauteuil dentaire Annaba",
      "autoclave Annaba",
      "équipement cabinet dentaire Annaba",
    ],
    zone: "livraison",
    interventionDelay: "5-7 jours ouvrés",
    deliveryDelay: "4 à 6 jours ouvrés",
    presentation:
      "<p>OUADAH DENTAL GROUPE livre du matériel dentaire à Annaba et dans tout le nord-est algérien. Fauteuils Silver Fox, autoclaves ICANCLAVE classe B, radiologie OWANDY et scanners Launca disponibles avec installation et formation.</p>",
    zoneCouverture:
      "<h3>Zone desservie</h3><ul><li>Annaba ville et agglomération (El Bouni, Sidi Amar, Berrahal)</li><li>Wilaya d'Annaba</li><li>Wilayas limitrophes : El Tarf, Guelma, Souk Ahras</li></ul>",
    latitude: 36.9,
    longitude: 7.7667,
  },

  setif: {
    slug: "setif",
    name: "Sétif",
    nameAr: "سطيف",
    wilaya: "Sétif",
    wilayaCode: 19,
    population: "300 000+",
    seoTitle: "Matériel dentaire à Sétif — OUADAH DENTAL GROUPE",
    seoDescription:
      "Matériel dentaire à Sétif : fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Livraison 4-6 jours, installation et formation. Devis personnalisé sous 24h.",
    seoKeywords: [
      "matériel dentaire Sétif",
      "fauteuil dentaire Sétif",
      "autoclave Sétif",
      "équipement cabinet dentaire Sétif",
    ],
    zone: "livraison",
    interventionDelay: "5-7 jours ouvrés",
    deliveryDelay: "4 à 6 jours ouvrés",
    presentation:
      "<p>OUADAH DENTAL GROUPE livre du matériel dentaire à Sétif et dans les hauts plateaux. Notre équipe installe et forme les praticiens aux fauteuils Silver Fox, autoclaves ICANCLAVE et équipements OWANDY.</p>",
    zoneCouverture:
      "<h3>Zone desservie</h3><ul><li>Sétif ville et agglomération</li><li>Wilaya de Sétif (El Eulma, Ain Oulmène, Bougaa)</li><li>Wilayas limitrophes : Bordj Bou Arréridj, M'Sila, Batna</li></ul>",
    latitude: 36.1898,
    longitude: 5.4108,
  },

  mostaganem: {
    slug: "mostaganem",
    name: "Mostaganem",
    nameAr: "مستغانم",
    wilaya: "Mostaganem",
    wilayaCode: 27,
    population: "250 000+",
    seoTitle: "Matériel dentaire à Mostaganem — OUADAH DENTAL GROUPE (intervention directe)",
    seoDescription:
      "Matériel dentaire à Mostaganem distribué par OUADAH DENTAL GROUPE : intervention directe depuis Oran (80 km). Fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. SAV 48h, devis sous 24h.",
    seoKeywords: [
      "matériel dentaire Mostaganem",
      "fauteuil dentaire Mostaganem",
      "autoclave Mostaganem",
      "SAV matériel dentaire Mostaganem",
    ],
    zone: "directe",
    interventionDelay: "48h ouvrées (intervention directe depuis Oran)",
    deliveryDelay: "2 à 3 jours ouvrés",
    presentation:
      "<p>Mostaganem est située à 80 km d'Oran, dans la zone d'intervention directe d'OUADAH DENTAL GROUPE. Nos techniciens se déplacent rapidement pour l'installation et la maintenance du matériel dentaire.</p>",
    zoneCouverture:
      "<h3>Zone d'intervention directe</h3><ul><li>Mostaganem ville et agglomération</li><li>Aïn Tedles, Sidi Ali, Bouguirat</li><li>Toute la wilaya de Mostaganem</li></ul>",
    latitude: 35.9311,
    longitude: 0.0892,
  },

  mascara: {
    slug: "mascara",
    name: "Mascara",
    nameAr: "معسكر",
    wilaya: "Mascara",
    wilayaCode: 29,
    population: "150 000+",
    seoTitle: "Matériel dentaire à Mascara — OUADAH DENTAL GROUPE (intervention directe)",
    seoDescription:
      "Matériel dentaire à Mascara distribué par OUADAH DENTAL GROUPE : intervention directe depuis Oran (90 km). Fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Devis sous 24h.",
    seoKeywords: [
      "matériel dentaire Mascara",
      "fauteuil dentaire Mascara",
      "autoclave Mascara",
    ],
    zone: "directe",
    interventionDelay: "48h ouvrées (intervention directe depuis Oran)",
    deliveryDelay: "2 à 3 jours ouvrés",
    presentation:
      "<p>Mascara est située à 90 km d'Oran, dans la zone d'intervention directe d'OUADAH DENTAL GROUPE. Nos techniciens interviennent rapidement pour l'installation et la maintenance.</p>",
    zoneCouverture:
      "<h3>Zone d'intervention directe</h3><ul><li>Mascara ville et agglomération</li><li>Sig, Mohammadia, Tizi</li><li>Toute la wilaya de Mascara</li></ul>",
    latitude: 35.3966,
    longitude: 0.1403,
  },

  relizane: {
    slug: "relizane",
    name: "Relizane",
    nameAr: "غليزان",
    wilaya: "Relizane",
    wilayaCode: 48,
    population: "130 000+",
    seoTitle: "Matériel dentaire à Relizane — OUADAH DENTAL GROUPE (intervention directe)",
    seoDescription:
      "Matériel dentaire à Relizane distribué par OUADAH DENTAL GROUPE : intervention directe depuis Oran (110 km). Fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Devis sous 24h.",
    seoKeywords: [
      "matériel dentaire Relizane",
      "fauteuil dentaire Relizane",
      "autoclave Relizane",
    ],
    zone: "directe",
    interventionDelay: "48-72h ouvrées (intervention directe depuis Oran)",
    deliveryDelay: "3 à 4 jours ouvrés",
    presentation:
      "<p>Relizane est située à 110 km d'Oran, dans la zone d'intervention directe d'OUADAH DENTAL GROUPE. Nos techniciens se déplacent pour l'installation et la maintenance du matériel dentaire.</p>",
    zoneCouverture:
      "<h3>Zone d'intervention directe</h3><ul><li>Relizane ville et agglomération</li><li>Oued Rhiou, Mazouna, Yellel</li><li>Toute la wilaya de Relizane</li></ul>",
    latitude: 35.7443,
    longitude: 0.556,
  },

  "ain-temouchent": {
    slug: "ain-temouchent",
    name: "Aïn Témouchent",
    nameAr: "عين تموشنت",
    wilaya: "Aïn Témouchent",
    wilayaCode: 46,
    population: "80 000+",
    seoTitle: "Matériel dentaire à Aïn Témouchent — OUADAH DENTAL GROUPE (intervention directe)",
    seoDescription:
      "Matériel dentaire à Aïn Témouchent distribué par OUADAH DENTAL GROUPE : intervention directe depuis Oran (70 km). Fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Devis sous 24h.",
    seoKeywords: [
      "matériel dentaire Aïn Témouchent",
      "fauteuil dentaire Aïn Témouchent",
      "autoclave Aïn Témouchent",
    ],
    zone: "directe",
    interventionDelay: "48h ouvrées (intervention directe depuis Oran)",
    deliveryDelay: "2 à 3 jours ouvrés",
    presentation:
      "<p>Aïn Témouchent est située à 70 km d'Oran, dans la zone d'intervention directe d'OUADAH DENTAL GROUPE. Nos techniciens interviennent rapidement pour l'installation et la maintenance.</p>",
    zoneCouverture:
      "<h3>Zone d'intervention directe</h3><ul><li>Aïn Témouchent ville et agglomération</li><li>Hammam Bou Hadjar, El Amria, Beni Saf</li><li>Toute la wilaya d'Aïn Témouchent</li></ul>",
    latitude: 35.2969,
    longitude: -1.1414,
  },

  blida: {
    slug: "blida",
    name: "Blida",
    nameAr: "البليدة",
    wilaya: "Blida",
    wilayaCode: 9,
    population: "300 000+",
    seoTitle: "Matériel dentaire à Blida — OUADAH DENTAL GROUPE",
    seoDescription:
      "Matériel dentaire à Blida : fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Livraison 3-5 jours, installation et formation. Devis sous 24h.",
    seoKeywords: [
      "matériel dentaire Blida",
      "fauteuil dentaire Blida",
      "autoclave Blida",
    ],
    zone: "livraison",
    interventionDelay: "4-6 jours ouvrés",
    deliveryDelay: "3 à 5 jours ouvrés",
    presentation:
      "<p>OUADAH DENTAL GROUPE livre du matériel dentaire à Blida et dans toute la Mitidja. Fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY avec installation et formation.</p>",
    zoneCouverture:
      "<h3>Zone desservie</h3><ul><li>Blida ville et agglomération (Boufarik, Bougara, Larbaâ)</li><li>Wilaya de Blida</li><li>Wilayas limitrophes : Alger, Tipaza, Aïn Defla, Bouira</li></ul>",
    latitude: 36.4707,
    longitude: 2.8279,
  },

  tlemcen: {
    slug: "tlemcen",
    name: "Tlemcen",
    nameAr: "تلمسان",
    wilaya: "Tlemcen",
    wilayaCode: 13,
    population: "180 000+",
    seoTitle: "Matériel dentaire à Tlemcen — OUADAH DENTAL GROUPE",
    seoDescription:
      "Matériel dentaire à Tlemcen : fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Livraison 3-5 jours (proximité Oran), installation et formation. Devis sous 24h.",
    seoKeywords: [
      "matériel dentaire Tlemcen",
      "fauteuil dentaire Tlemcen",
      "autoclave Tlemcen",
    ],
    zone: "livraison",
    interventionDelay: "4-6 jours ouvrés",
    deliveryDelay: "3 à 5 jours ouvrés",
    presentation:
      "<p>OUADAH DENTAL GROUPE livre du matériel dentaire à Tlemcen et dans tout l'ouest algérien. Proximité d'Oran (140 km) permettant des délais raccourcis.</p>",
    zoneCouverture:
      "<h3>Zone desservie</h3><ul><li>Tlemcen ville et agglomération (Maghnia, Nedroma, Ghazaouet)</li><li>Wilaya de Tlemcen</li><li>Wilaya limitrophe : Aïn Témouchent (intervention directe ODG)</li></ul>",
    latitude: 34.8783,
    longitude: -1.315,
  },

  batna: {
    slug: "batna",
    name: "Batna",
    nameAr: "باتنة",
    wilaya: "Batna",
    wilayaCode: 5,
    population: "300 000+",
    seoTitle: "Matériel dentaire à Batna — OUADAH DENTAL GROUPE",
    seoDescription:
      "Matériel dentaire à Batna : fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Livraison 4-6 jours, installation et formation. Devis sous 24h.",
    seoKeywords: [
      "matériel dentaire Batna",
      "fauteuil dentaire Batna",
      "autoclave Batna",
    ],
    zone: "livraison",
    interventionDelay: "5-7 jours ouvrés",
    deliveryDelay: "4 à 6 jours ouvrés",
    presentation:
      "<p>OUADAH DENTAL GROUPE livre du matériel dentaire à Batna et dans les Aurès. Fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY avec installation par nos techniciens.</p>",
    zoneCouverture:
      "<h3>Zone desservie</h3><ul><li>Batna ville et agglomération</li><li>Wilaya de Batna (Barika, Arris, N'Gaous)</li><li>Wilayas limitrophes : Sétif, Biskra, Khenchela, Oum El Bouaghi</li></ul>",
    latitude: 35.5559,
    longitude: 6.1741,
  },

  bejaia: {
    slug: "bejaia",
    name: "Béjaïa",
    nameAr: "بجاية",
    wilaya: "Béjaïa",
    wilayaCode: 6,
    population: "200 000+",
    seoTitle: "Matériel dentaire à Béjaïa — OUADAH DENTAL GROUPE",
    seoDescription:
      "Matériel dentaire à Béjaïa : fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Livraison 4-6 jours, installation et formation. Devis sous 24h.",
    seoKeywords: [
      "matériel dentaire Béjaïa",
      "fauteuil dentaire Béjaïa",
      "autoclave Béjaïa",
    ],
    zone: "livraison",
    interventionDelay: "5-7 jours ouvrés",
    deliveryDelay: "4 à 6 jours ouvrés",
    presentation:
      "<p>OUADAH DENTAL GROUPE livre du matériel dentaire à Béjaïa et en Petite Kabylie. Fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY avec installation et formation.</p>",
    zoneCouverture:
      "<h3>Zone desservie</h3><ul><li>Béjaïa ville et agglomération (Akbou, Kherrata, Sidi Aïch)</li><li>Wilaya de Béjaïa</li><li>Wilayas limitrophes : Tizi Ouzou, Bouira, Jijel</li></ul>",
    latitude: 36.7558,
    longitude: 5.0843,
  },

  "tizi-ouzou": {
    slug: "tizi-ouzou",
    name: "Tizi Ouzou",
    nameAr: "تيزي وزو",
    wilaya: "Tizi Ouzou",
    wilayaCode: 15,
    population: "150 000+",
    seoTitle: "Matériel dentaire à Tizi Ouzou — OUADAH DENTAL GROUPE",
    seoDescription:
      "Matériel dentaire à Tizi Ouzou : fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Livraison 4-6 jours, installation et formation. Devis sous 24h.",
    seoKeywords: [
      "matériel dentaire Tizi Ouzou",
      "fauteuil dentaire Tizi Ouzou",
      "autoclave Tizi Ouzou",
    ],
    zone: "livraison",
    interventionDelay: "5-7 jours ouvrés",
    deliveryDelay: "4 à 6 jours ouvrés",
    presentation:
      "<p>OUADAH DENTAL GROUPE livre du matériel dentaire à Tizi Ouzou et en Grande Kabylie. Fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY avec installation.</p>",
    zoneCouverture:
      "<h3>Zone desservie</h3><ul><li>Tizi Ouzou ville et agglomération (Azazga, Draâ Ben Khedda, Boghni)</li><li>Wilaya de Tizi Ouzou</li><li>Wilayas limitrophes : Béjaïa, Bouira, Alger</li></ul>",
    latitude: 36.7167,
    longitude: 4.05,
  },

  ouargla: {
    slug: "ouargla",
    name: "Ouargla",
    nameAr: "ورقلة",
    wilaya: "Ouargla",
    wilayaCode: 30,
    population: "200 000+",
    seoTitle: "Matériel dentaire à Ouargla — OUADAH DENTAL GROUPE",
    seoDescription:
      "Matériel dentaire à Ouargla et dans le Sahara : fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY. Livraison 5-7 jours, installation et formation. Devis sous 24h.",
    seoKeywords: [
      "matériel dentaire Ouargla",
      "fauteuil dentaire Ouargla",
      "autoclave Ouargla",
      "matériel dentaire Sahara",
    ],
    zone: "livraison",
    interventionDelay: "7-10 jours ouvrés",
    deliveryDelay: "5 à 7 jours ouvrés",
    presentation:
      "<p>OUADAH DENTAL GROUPE livre du matériel dentaire à Ouargla et dans le Sahara algérien. Fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY avec installation par techniciens spécialisés pour la région saharienne.</p>",
    zoneCouverture:
      "<h3>Zone desservie</h3><ul><li>Ouargla ville et agglomération (Hassi Messaoud, Touggourt)</li><li>Wilaya de Ouargla</li><li>Wilayas sahariennes : Ouargla, Ghardaïa, El Oued</li></ul>",
    latitude: 31.954,
    longitude: 5.3328,
  },
};

export function getCityBySlug(slug: string): CityData | null {
  return CITIES[slug] || null;
}

export function getAllCitySlugs(): string[] {
  return Object.keys(CITIES);
}

// Build SEO metadata for a city page.
export function buildCityMetadata(slug: string): Metadata {
  const city = getCityBySlug(slug);
  if (!city) {
    return {
      title: "Ville introuvable",
      description: "Cette ville n'est pas desservie par OUADAH DENTAL GROUPE.",
    };
  }
  const cityUrl = "https://ouadah-dental-groupe.netlify.app/villes/" + slug;
  return {
    title: city.seoTitle,
    description: city.seoDescription,
    alternates: { canonical: "/villes/" + slug },
    keywords: city.seoKeywords,
    openGraph: {
      type: "website",
      title: city.seoTitle,
      description: city.seoDescription,
      url: cityUrl,
      siteName: "OUADAH DENTAL GROUPE",
      images: [
        {
          url: "https://ouadah-dental-groupe.netlify.app/og.jpg",
          width: 1024,
          height: 1024,
          alt: "Matériel dentaire à " + city.name + " — OUADAH DENTAL GROUPE",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: city.seoTitle,
      description: city.seoDescription,
    },
    other: {
      "og:url": cityUrl,
    },
  };
}
