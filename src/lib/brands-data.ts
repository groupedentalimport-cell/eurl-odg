import type { Metadata } from "next";

// ---------------------------------------------------------------------------
// Brand data for /marques/[slug] pages.
// ---------------------------------------------------------------------------
//
// All brand content is centralized here (not in Supabase) because:
//   1. The number of brands is small and stable (4 brands distributed by ODG).
//   2. The content is editorial (history, advantages) — better versioned in
//      git than edited via an admin panel.
//   3. It keeps the brand pages fully server-rendered and cacheable.
//
// To add a new brand: add an entry to BRANDS below + a /marques/<slug> page
// will be generated automatically.

export interface BrandProduct {
  slug: string;
  name: string;
  model?: string;
  categorySlug?: string;
  categoryName?: string;
  prixMin?: number | null;
  prixMax?: number | null;
}

export interface BrandData {
  slug: string;
  name: string;
  nameAr?: string;
  logoText?: string;
  tagline: string;
  country: string;
  yearFounded?: number;
  // SEO
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  // Content sections (HTML allowed)
  presentation: string;
  histoire: string;
  avantages: string;
  sav: string;
  // Categorized products (filled at runtime from Supabase)
  // We just declare categorySlugs here so the page can filter.
  categorySlugs: string[];
}

export const BRANDS: Record<string, BrandData> = {
  "silver-fox": {
    slug: "silver-fox",
    name: "Silver Fox",
    nameAr: "سيلفر فوكس",
    tagline: "Fauteuils dentaires professionnels — robustesse, ergonomie et précision",
    country: "Chine",
    yearFounded: 1998,
    seoTitle: "Silver Fox — Fauteuils dentaires distribués en Algérie par ODG",
    seoDescription:
      "Silver Fox est une marque de fauteuils dentaires distribuée en Algérie par OUADAH DENTAL GROUPE. Découvrez les modèles basique, classique, Pro 8000C et Implant. Installation, formation et SAV à Oran, livraison dans toute l'Algérie.",
    seoKeywords: [
      "Silver Fox",
      "fauteuil dentaire Silver Fox",
      "Silver Fox 8000C",
      "Silver Fox Algérie",
      "fauteuil dentaire Chine",
      "fauteuil dentaire implantologie",
      "Silver Fox Pro",
      "Silver Fox Classic",
    ],
    presentation:
      "<p>Silver Fox est une marque de fauteuils dentaires reconnue mondialement pour l'équilibre entre prix accessible et qualité professionnelle. Distribuée en Algérie par OUADAH DENTAL GROUPE depuis Oran, la gamme Silver Fox couvre tous les besoins : du fauteuil basique pour cabinet débutant au fauteuil haut de gamme avec moteur céramique et chariot roulant pour implantologie.</p><p>Les fauteuils Silver Fox sont conçus pour résister à un usage intensif en cabinet dentaire : structure métallique robuste, moteur électrique silencieux, similicuir médical lavable, et crachoir céramique autoclavable. Toutes les pièces détachées sont disponibles à Oran auprès d'ODG, avec un délai d'intervention sous 48h ouvrées pour les clients sous contrat.</p>",
    histoire:
      "<p>Fondée en 1998 en Chine, Silver Fox s'est imposée comme l'un des principaux fabricants de fauteuils dentaires à l'international, avec une présence dans plus de 80 pays. La marque s'est distinguée par sa stratégie d'innovation technologique à prix maîtrisé, devenant une référence pour les marchés émergents et les cabinets cherchant un excellent ratio qualité/prix.</p><p>En Algérie, Silver Fox est distribuée exclusivement par OUADAH DENTAL GROUPE depuis Oran. Le partenariat couvre l'importation, l'installation, la formation des praticiens et le service après-vente sur toute l'Algérie. Plus de 500 cabinets dentaires algériens sont équipés de fauteuils Silver Fox à ce jour.</p>",
    avantages:
      "<h3>Pourquoi choisir un fauteuil Silver Fox ?</h3><ul><li><strong>Robustesse</strong> : structure métallique garantie 2 ans, conçue pour un usage intensif (20+ patients/jour).</li><li><strong>Ergonomie</strong> : assise patient optimisée, commandes au pied, bras d'appui réglables.</li><li><strong>Modularité</strong> : chariot roulant optionnel pour implantologie, éclairage LED additionnel, porte-cône intégré.</li><li><strong>Pièces détachées disponibles localement</strong> : stock permanent à Oran, délai d'intervention sous 48h.</li><li><strong>Rapport qualité/prix</strong> : 30 à 50 % moins cher que les marques européennes équivalentes, sans compromis sur la qualité.</li><li><strong>Formation incluse</strong> : à chaque achat, formation du praticien et de son assistant (2 à 4 heures).</li></ul>",
    sav:
      "<h3>Service après-vente Silver Fox en Algérie</h3><p>OUADAH DENTAL GROUPE dispose d'un service après-vente dédié Silver Fox à Oran, avec des techniciens formés par le fabricant. Couverture : Oran, Mostaganem, Mascara, Relizane, Aïn Témouchent (intervention directe sous 48h ouvrées). Déplacement dans toute l'Algérie pour pannes majeures.</p><ul><li><strong>Garantie</strong> : 2 ans pièces et main-d'œuvre (moteur céramique 3 ans sur le modèle Pro).</li><li><strong>Contrats de maintenance préventive</strong> : annuels, étendent la couverture à 5 ans.</li><li><strong>Pièces détachées en stock</strong> : crachoirs céramiques, joints, flexibles, moteurs, modules LED, cartes électroniques.</li><li><strong>Téléphone SAV</strong> : +213 540 00 00 00 / +213 41 00 00 00.</li></ul>",
    categorySlugs: ["fauteuil-dentaire"],
  },

  "icanclave": {
    slug: "icanclave",
    name: "ICANCLAVE",
    nameAr: "إيكانكلاف",
    tagline: "Autoclaves dentaires classe B — conformité EN 13060 et traçabilité complète",
    country: "Chine",
    yearFounded: 2005,
    seoTitle: "ICANCLAVE — Autoclaves dentaires classe B distribués en Algérie par ODG",
    seoDescription:
      "ICANCLAVE est une marque d'autoclaves dentaires classe B (norme EN 13060) distribuée en Algérie par OUADAH DENTAL GROUPE. Modèles 18L et 45L avec cycle prion, traçabilité USB, formation et SAV à Oran. Livraison dans toute l'Algérie.",
    seoKeywords: [
      "ICANCLAVE",
      "autoclave ICANCLAVE",
      "autoclave dentaire classe B",
      "norme EN 13060",
      "autoclave Algérie",
      "ICANCLAVE 18L",
      "ICANCLAVE 45L",
      "stérilisation dentaire",
      "autoclave prion",
    ],
    presentation:
      "<p>ICANCLAVE est une marque spécialisée dans les autoclaves dentaires de classe B, conforme à la norme européenne EN 13060. Tous les modèles distribués par ODG offrent les cycles complets requis en cabinet dentaire : cycle standard, cycle rapide, cycle prion (134°C / 18 min), cycle liquide, ainsi que les tests de validation Helix et Bowie-Dick intégrés.</p><p>La chambre de stérilisation est en acier inoxydable 316L médical, garantie 5 ans contre la corrosion. La pompe à vide haute performance assure un vide fractionné optimal, condition indispensable pour stériliser correctement les instruments creux (turbines, contre-angles, porte-cônes).</p>",
    histoire:
      "<p>Fondée en 2005, ICANCLAVE s'est spécialisée dès l'origine dans la conception d'autoclaves dentaires de classe B. La marque a pris une place majeure sur le marché international grâce à une stratégie d'innovation continue sur la pompe à vide (cœur technologique d'un autoclave classe B) et la traçabilité des cycles.</p><p>En Algérie, ICANCLAVE est distribuée par OUADAH DENTAL GROUPE depuis Oran. Le partenariat couvre l'importation, l'installation, la formation à l'utilisation (2h incluse) et le service après-vente. Plus de 200 cabinets dentaires algériens sont équipés d'un autoclave ICANCLAVE.</p>",
    avantages:
      "<h3>Pourquoi choisir un autoclave ICANCLAVE ?</h3><ul><li><strong>Conformité EN 13060 classe B</strong> : obligatoire pour les instruments creux et enveloppés en cabinet dentaire.</li><li><strong>Cycle prion intégré</strong> : 134°C pendant 18 minutes, conforme aux recommandations OMS.</li><li><strong>Pompe à vide double étage</strong> : vide fractionné optimal pour instruments creux (turbines, contre-angles).</li><li><strong>Chambre en acier inoxydable 316L médical</strong> : garantie 5 ans contre la corrosion.</li><li><strong>Traçabilité USB intégrée</strong> : export des cycles pour conformité réglementaire.</li><li><strong>Tests Helix et Bowie-Dick intégrés</strong> : validation mensuelle simplifiée.</li><li><strong>Formation incluse</strong> : 2 heures à l'installation pour le praticien et l'assistant.</li></ul>",
    sav:
      "<h3>Service après-vente ICANCLAVE en Algérie</h3><p>OUADAH DENTAL GROUPE dispose d'un service après-vente dédié ICANCLAVE à Oran, avec techniciens formés par le fabricant. Couverture : Oran, Mostaganem, Mascara, Relizane, Aïn Témouchent. Déplacement dans toute l'Algérie pour pannes majeures.</p><ul><li><strong>Garantie</strong> : 2 ans pièces et main-d'œuvre. Chambre en acier inoxydable garantie 5 ans.</li><li><strong>Contrats de maintenance préventive</strong> : annuels, calibrage des capteurs, remplacement des joints.</li><li><strong>Pièces détachées en stock</strong> : joints de porte, filtres à eau, résistances, pompes à vide.</li><li><strong>Consommables</strong> : tests Helix, tests Bowie-Dick, pochettes de stérilisation.</li><li><strong>Téléphone SAV</strong> : +213 540 00 00 00 / +213 41 00 00 00.</li></ul>",
    categorySlugs: ["sterilisation"],
  },

  "owandy": {
    slug: "owandy",
    name: "OWANDY",
    nameAr: "أواندي",
    tagline: "Radiologie dentaire faible dose — capteurs intra-oraux, radio mural, panoramique 3D",
    country: "France",
    yearFounded: 1913,
    seoTitle: "OWANDY — Radiologie dentaire faible dose distribuée en Algérie par ODG",
    seoDescription:
      "OWANDY est une marque française de radiologie dentaire faible dose distribuée en Algérie par OUADAH DENTAL GROUPE. Radio mural standard et nouvelle génération DC, capteurs intra-oraux, unité panoramique 3D avec céphalométrie. Formation et SAV à Oran.",
    seoKeywords: [
      "OWANDY",
      "radiologie dentaire OWANDY",
      "radio mural OWANDY",
      "capteur intra-oral OWANDY",
      "panoramique 3D OWANDY",
      "radiologie faible dose",
      "radiologie dentaire France",
      "OWANDY Algérie",
      "céphalométrie",
    ],
    presentation:
      "<p>OWANDY est une marque française historique de radiologie dentaire, fondée en 1913. Spécialisée dans l'imagerie médicale dentaire à faible dose, OWANDY propose une gamme complète couvrant tous les besoins du cabinet dentaire moderne : générateurs de rayons X muraux, capteurs intra-oraux numériques (RVG), unités panoramiques 2D et systèmes 3D Cone Beam (CBCT) avec céphalométrie.</p><p>La technologie DC (tension constante) des modèles nouvelle génération réduit la dose de rayons X de 30 à 40 % par rapport aux générateurs AC classiques, tout en améliorant la qualité d'image. Associée à un capteur numérique, elle offre le meilleur ratio qualité d'image / dose du marché.</p>",
    histoire:
      "<p>Fondée en 1913 en France, OWANDY est l'un des plus anciens fabricants de matériel de radiologie dentaire au monde. La marque a accompagné toutes les évolutions technologiques du secteur : du générateur à tube à vide des années 1920 aux systèmes panoramiques 3D Cone Beam d'aujourd'hui.</p><p>OWANDY est reconnue pour son expertise en réduction de dose et en qualité d'image. La marque est présente dans plus de 60 pays, avec une forte notoriété en Europe, Afrique du Nord et Moyen-Orient. En Algérie, OUADAH DENTAL GROUPE est le distributeur officiel depuis Oran.</p>",
    avantages:
      "<h3>Pourquoi choisir la radiologie OWANDY ?</h3><ul><li><strong>Faible dose patient</strong> : technologie DC réduisant la dose de 30 à 40 % par rapport aux générateurs AC classiques.</li><li><strong>Qualité d'image supérieure</strong> : filtration optimisée, stabilité de la tension, moins de bruit numérique.</li><li><strong>Marque française historique</strong> : 110+ ans d'expertise en radiologie dentaire, présente dans 60+ pays.</li><li><strong>Compatibilité universelle</strong> : capteurs RVG compatibles avec tous les générateurs du marché.</li><li><strong>Logiciels inclus</strong> : visualisation, traitement d'image, export DICOM pour implantologie guidée.</li><li><strong>Formation complète</strong> : incluse à l'installation (1 journée pour les systèmes panoramiques 3D).</li></ul>",
    sav:
      "<h3>Service après-vente OWANDY en Algérie</h3><p>OUADAH DENTAL GROUPE dispose d'un service après-vente dédié OWANDY à Oran. Techniciens formés par OWANDY France. Couverture : Oran + wilayas voisines (intervention directe). Déplacement dans toute l'Algérie pour les systèmes panoramiques 3D.</p><ul><li><strong>Garantie</strong> : 2 ans pièces et main-d'œuvre. Tube à rayons X garanti 3 ans sur les panoramiques.</li><li><strong>Contrôle de conformité annuel</strong> : obligatoire réglementairement, ODG le propose en forfait.</li><li><strong>Pièces détachées en stock</strong> : tubes, capteurs, cartes électroniques, bras articulés.</li><li><strong>Calibrage</strong> : mensuel pour les systèmes 3D, annuel pour les générateurs muraux.</li><li><strong>Téléphone SAV</strong> : +213 540 00 00 00 / +213 41 00 00 00.</li></ul>",
    categorySlugs: ["radiologie"],
  },

  "launca": {
    slug: "launca",
    name: "Launca",
    nameAr: "لاونكا",
    tagline: "Scanners intra-oraux — empreinte numérique, précision 20 microns, sans pâte",
    country: "Chine",
    yearFounded: 2011,
    seoTitle: "Launca — Scanners intra-oraux distribués en Algérie par ODG",
    seoDescription:
      "Launca est une marque de scanners intra-oraux dentaires distribuée en Algérie par OUADAH DENTAL GROUPE. Empreinte numérique sans pâte, précision 20 microns, idéale pour implantologie, orthodontie aligneurs et prothèses CAD/CAM. Formation et SAV à Oran.",
    seoKeywords: [
      "Launca",
      "scanner intra-oral Launca",
      "scanner dentaire",
      "empreinte numérique",
      "scanner intra-oral Algérie",
      "Launca DL-200",
      "CAD/CAM dentaire",
      "aligneurs orthodontiques",
      "implantologie guidée",
    ],
    presentation:
      "<p>Launca est une marque spécialisée dans les scanners intra-oraux dentaires. Fondée en 2011, la marque s'est imposée comme une alternative accessible aux scanners européens et américains, avec une précision clinique validée à 20 microns — comparable aux leaders du marché.</p><p>Le scanner intra-oral remplace l'empreinte traditionnelle à la pâte : il capture une image 3D numérique de l'arcade dentaire du patient en quelques minutes, sans inconfort, et envoie le fichier directement au laboratoire de prothèse ou au logiciel d'implantologie guidée. La précision et la vitesse font du scanner un investissement rentable pour tout cabinet pratiquant l'implantologie, l'orthodontie aligneurs ou les prothèses CAD/CAM.</p>",
    histoire:
      "<p>Launca a été fondée en 2011 en Chine par une équipe d'ingénieurs spécialisés en optique et vision par ordinateur. La marque a rapidement percé sur le marché international grâce à une stratégie d'innovation technologique à prix accessible, devenant une référence pour les cabinets cherchant à passer au numérique sans investir 40 000 € dans un scanner européen.</p><p>En Algérie, Launca est distribuée par OUADAH DENTAL GROUPE depuis Oran. Le partenariat couvre l'importation, l'installation, la formation (1 journée complète incluse) et le service après-vente. ODG accompagne également les cabinets dans le choix du scanner selon leur activité (implantologie, orthodontie, prothèses).</p>",
    avantages:
      "<h3>Pourquoi choisir un scanner intra-oral Launca ?</h3><ul><li><strong>Précision clinique 20 microns</strong> : comparable aux leaders européens et américains.</li><li><strong>Confort patient</strong> : fini la pâte d'empreinte, fin les bâillements et les nausées.</li><li><strong>Vitesse</strong> : empreinte complète d'une arcade en 3 à 5 minutes.</li><li><strong>Envoi numérique au laboratoire</strong> : plus de moulage physique, délai de prothèse réduit.</li><li><strong>Compatibilité logicielle</strong> : export STL/PLY, compatible avec tous les logiciels CAD/CAM et d'implantologie guidée.</li><li><strong>Retour sur investissement</strong> : rentabilisé en 2 à 3 ans selon le volume de prothèses.</li><li><strong>Formation complète incluse</strong> : 1 journée à l'installation + accès à des ressources en ligne.</li></ul>",
    sav:
      "<h3>Service après-vente Launca en Algérie</h3><p>OUADAH DENTAL GROUPE dispose d'un service après-vente dédié Launca à Oran. Techniciens formés par le fabricant. Couverture : Oran + wilayas voisines. Déplacement dans toute l'Algérie pour pannes majeures.</p><ul><li><strong>Garantie</strong> : 1 an pièces et main-d'œuvre (extensible à 2 ans via contrat maintenance).</li><li><strong>Calibrage</strong> : annuel recommandé pour maintenir la précision 20 microns.</li><li><strong>Mises à jour logicielles</strong> : gratuites à vie, installées à distance par ODG.</li><li><strong>Pièces détachées en stock</strong> : embouts, câbles, stations d'accueil.</li><li><strong>Prêt de matériel</strong> : en cas de panne majeure, ODG peut prêter un scanner de substitution.</li><li><strong>Téléphone SAV</strong> : +213 540 00 00 00 / +213 41 00 00 00.</li></ul>",
    categorySlugs: ["radiologie", "consommables"],
  },
};

export function getBrandBySlug(slug: string): BrandData | null {
  return BRANDS[slug] || null;
}

export function getAllBrandSlugs(): string[] {
  return Object.keys(BRANDS);
}

// Build SEO metadata for a brand page.
export function buildBrandMetadata(slug: string): Metadata {
  const brand = getBrandBySlug(slug);
  if (!brand) {
    return {
      title: "Marque introuvable",
      description: "Cette marque n'est pas distribuée par OUADAH DENTAL GROUPE.",
    };
  }
  const brandUrl = "https://ouadah-dental-groupe.netlify.app/marques/" + slug;
  return {
    title: brand.seoTitle,
    description: brand.seoDescription,
    alternates: { canonical: "/marques/" + slug },
    keywords: brand.seoKeywords,
    openGraph: {
      type: "website",
      title: brand.seoTitle,
      description: brand.seoDescription,
      url: brandUrl,
      siteName: "OUADAH DENTAL GROUPE",
      images: [
        {
          url: "https://ouadah-dental-groupe.netlify.app/og.jpg",
          width: 1024,
          height: 1024,
          alt: brand.name + " — distribué par OUADAH DENTAL GROUPE",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: brand.seoTitle,
      description: brand.seoDescription,
    },
    other: {
      "og:url": brandUrl,
    },
  };
}
