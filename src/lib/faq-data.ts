// ---------------------------------------------------------------------------
// FAQ content shared by the /faq page (SEO / FAQPage JSON-LD) and the chatbot
// system prompt (see src/lib/chat-faq.ts). Kept in one place so both stay in
// sync: a question edited here flows to both Google and the assistant.
// ---------------------------------------------------------------------------

export type QA = { q: string; a: string };

export interface FaqSection {
  category: string;
  items: QA[];
}

export const FAQ_SECTIONS: FaqSection[] = [
  {
    category: "Choisir son fauteuil dentaire",
    items: [
      {
        q: "Comment choisir un fauteuil dentaire en Algérie ?",
        a: "Pour choisir un fauteuil dentaire adapté à votre cabinet en Algérie, vérifiez cinq critères essentiels : la robustesse du moteur (sans-huile idéalement), l'ergonomie pour le praticien et le patient, les options d'implantologie (chariot roulant, porte-cône), la disponibilité des pièces détachées localement, et le service après-vente dans votre wilaya. OUADAH DENTAL GROUPE distribue les fauteuils Silver Fox avec formation à l'installation et SAV à Oran. Demandez un devis personnalisé.",
      },
      {
        q: "Quel fauteuil dentaire pour l'implantologie ?",
        a: "Pour l'implantologie, choisissez un fauteuil équipé d'un chariot roulant avec porte-cône intégré, d'un éclairage LED haute intensité, d'un crachoir en céramique facilement désinfectable, et d'un moteur intégré avec contrôle de couple. Les modèles Silver Fox 8000C Pro et Silver Fox Implant sont conçus pour ces besoins. Le chariot roulant permet de déplacer le matériel d'implantologie sans encombrer le plateau.",
      },
      {
        q: "Quelle différence entre Silver Fox 8000C Pro et Classic ?",
        a: "Le Silver Fox 8000C Pro offre un moteur à roulements céramiques (plus silencieux et durable), un éclairage LED ajustable, un plateau de travail plus large et une assise patient optimisée. La version Classic conserve les fonctions essentielles à un prix plus accessible. Le choix dépend de votre volume de soins et de votre budget. Notre guide comparatif détaille chaque différence.",
      },
      {
        q: "Quel budget pour un fauteuil dentaire en Algérie ?",
        a: "Le budget d'un fauteuil dentaire en Algérie varie fortement selon la configuration : modèle basique, fauteuil classique équipé, ou version haut de gamme dédiée à l'implantologie. OUADAH DENTAL GROUPE ne pratique pas de prix affichés : chaque équipement est proposé sur devis, avec des solutions de financement et une proposition personnalisée selon votre cabinet et votre wilaya.",
      },
    ],
  },
  {
    category: "Stérilisation et autoclaves",
    items: [
      {
        q: "Quelles normes pour la stérilisation en cabinet dentaire ?",
        a: "La stérilisation en cabinet dentaire doit respecter la norme EN 13060 (classe B pour les autoclaves). La classe B est obligatoire pour les instruments creux, enveloppés et poreux. Tous les autoclaves ICANCLAVE distribués par OUADAH DENTAL GROUPE sont certifiés classe B avec cycle de prion, séchage intégré et traçabilité. Le cycle doit être validé par des tests Helix et Bowie-Dick régulièrement.",
      },
      {
        q: "Quelle taille d'autoclave choisir pour son cabinet ?",
        a: "Pour un cabinet de 1 à 2 fauteuils, un autoclave 18 L suffit. Pour 3 fauteuils et plus ou pour une clinique, optez pour un 45 L afin de réduire le nombre de cycles par jour. Le choix dépend aussi de la fréquence des rendez-vous et du type de soins prodigués. Un autoclave trop petit multiplie les cycles et use la pompe à vide prématurément.",
      },
      {
        q: "Comment entretenir son autoclave dentaire ?",
        a: "L'entretien d'un autoclave dentaire comprend : vidange et nettoyage du réservoir hebdomadaire, détartrage mensuel (selon la dureté de l'eau), remplacement du filtre toutes les 50 cycles, contrôle des joints de porte, et test de vide régulier. OUADAH DENTAL GROUPE propose des contrats de maintenance préventive à Oran et dans les wilayas voisines pour prolonger la durée de vie de votre appareil.",
      },
      {
        q: "Prix d'un autoclave dentaire en Algérie ?",
        a: "Le prix d'un autoclave dentaire classe B en Algérie varie selon la contenance (18 L, 23 L, 45 L) et les options de cycles. Aucun prix n'est affiché en ligne : les autoclaves ICANCLAVE distribués par ODG sont proposés sur devis, avec la formation, l'installation et un an de garantie inclus. Demandez votre devis pour comparer les options selon votre cabinet.",
      },
    ],
  },
  {
    category: "Radiologie dentaire",
    items: [
      {
        q: "Quelle radiologie dentaire choisir ?",
        a: "Le choix d'une radiologie dentaire dépend de vos besoins : un capteur intra-oral pour les soins courants (radio rétro-alvéolaire), un radio mural pour la polyvalence, ou un panoramique 3D avec céphalométrie pour l'implantologie et l'orthodontie. OWANDY est une marque de référence en radiologie dentaire faible dose. ODG distribue toutes ces solutions avec formation à l'utilisation.",
      },
      {
        q: "Radiographie numérique ou argentique ?",
        a: "La radiographie numérique est aujourd'hui recommandée : réduction de 70 à 90 % de la dose de rayons X pour le patient, image immédiate, possibilité d'agrandir et de traiter l'image, archivage simple, et suppression du système de développement argentique (produits chimiques, darkroom). Le retour sur investissement est généralement atteint en 18 à 24 mois.",
      },
      {
        q: "Scanner intra-oral : est-ce utile ?",
        a: "Le scanner intra-oral révolutionne l'empreinte dentaire : pas de pâte, confort patient, précision 20 microns, envoi numérique au laboratoire. Il est particulièrement pertinent pour l'implantologie, l'orthodontie aligneurs, et les prothèses CAD/CAM. Launca est une marque accessible avec une précision clinique validée. L'investissement se rentabilise en 2 à 3 ans selon le volume de prothèses.",
      },
    ],
  },
  {
    category: "Maintenance et service après-vente",
    items: [
      {
        q: "Existe-t-il un SAV matériel dentaire à Oran ?",
        a: "Oui. OUADAH DENTAL GROUPE dispose d'un service après-vente à Oran avec des techniciens formés par les fabricants (Silver Fox, ICANCLAVE, OWANDY, Launca). Nous couvrons Oran et les wilayas voisines (Mostaganem, Mascara, Relizane, Aïn Témouchent). Intervention sous 48 h ouvrées pour les clients sous contrat, et déplacement possible dans tout le pays pour les pannes majeures.",
      },
      {
        q: "Comment se former au matériel dentaire acheté ?",
        a: "À chaque achat de fauteuil, autoclave, radiologie ou scanner, OUADAH DENTAL GROUPE inclut une formation à l'installation (de 2 h à 1 journée selon l'équipement) pour le praticien et son assistant. Nous proposons aussi des formations complémentaires sur la stérilisation, l'imagerie numérique et l'implantologie. Les sessions sont animées par nos techniciens et nos partenaires fabricants.",
      },
      {
        q: "Quelle garantie sur le matériel dentaire ?",
        a: "Tous les équipements distribués par OUADAH DENTAL GROUPE bénéficient de la garantie fabricant, couvrant les pièces et la main-d'œuvre. La durée varie selon le modèle ; elle est précisée sur votre devis. Les contrats de maintenance préventive étendent la couverture au-delà de la garantie.",
      },
    ],
  },
  {
    category: "Achat et devis",
    items: [
      {
        q: "Comment demander un devis pour du matériel dentaire ?",
        a: "Pour obtenir un devis personnalisé, contactez OUADAH DENTAL GROUPE par téléphone (+213 540 00 00 00 / +213 41 00 00 00), par email (contact@odg-dz.com), ou via le formulaire de demande de devis sur notre site. Précisez votre spécialité, votre wilaya et les équipements souhaités. Nous vous répondons sous 24 h ouvrées avec une proposition chiffrée et un délai de livraison.",
      },
      {
        q: "Livrez-vous dans toute l'Algérie ?",
        a: "Oui, OUADAH DENTAL GROUPE livre dans toute l'Algérie : installation et formation incluses à Oran et wilayas voisines, et expédition dans les autres wilayas via transporteurs spécialisés (délai 3 à 7 jours ouvrés selon la destination). Pour les équipements lourds (fauteuils, panoramiques), nos techniciens se déplacent dans tout le pays pour l'installation et la mise en service.",
      },
      {
        q: "Proposez-vous du financement matériel dentaire ?",
        a: "Oui, nous proposons des solutions de financement pour les cabinets et cliniques dentaires en Algérie : paiement échelonné sur 3 à 12 mois sans frais pour les équipements éligibles, et partenariats avec des institutions financières pour les projets d'équipement complet (cabinet neuf, extension de clinique). Contactez-nous pour étudier votre projet.",
      },
    ],
  },
];
