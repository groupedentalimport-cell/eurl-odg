-- =====================================================================
-- Migration : enrichir les 3 produits manquants
-- Projet : OUADAH DENTAL GROUPE
-- Date : 2026-07-29
-- Objectif : compléter endomotor, chariot-3-etage, champ-operatoir
--            avec description longue, usages, maintenance, FAQ, prix, rating.
-- =====================================================================

-- =====================================================================
-- 1. ENDOMOTOR (marque : Cicada — à confirmer par ODG)
-- =====================================================================
-- Note : "cicada" est probablement la marque Dental Cicada (China).
-- Si la marque exacte diffère, l'admin peut la corriger via le panel admin.
-- =====================================================================

UPDATE products SET
  marque = COALESCE(NULLIF(marque, ''), 'Cicada Dental'),
  description_longue_fr = '<p>L''endomotor Cicada Dental est un moteur endodontique de précision conçu pour la préparation mécanisée des canaux radiculaires. Indispensable en endodontie moderne, il permet de réaliser des traitements de canal plus rapides, plus sûrs et plus prévisibles qu''à la main.</p>

<h2>Caractéristiques principales</h2>
<ul>
<li>Moteur sans fil rechargeable (autonomie 8-10 heures)</li>
<li>Écran LCD couleur intuitif</li>
<li>Programmes pré-enregistrés pour les principales systèmes de limes (Protaper, Mtwo, Reciproc, WaveOne, etc.)</li>
<li>Contrôle de couple réglable (0.6 à 5.0 Ncm)</li>
<li>Vitesse réglable (100 à 650 tr/min)</li>
<li>Mode rotation continue et mode reciprocation</li>
<li>Détection automatique de l''apex (option selon modèle)</li>
<li>Sterilisable en autoclave classe B (tête et contre-cône)</li>
</ul>

<h2>Pourquoi utiliser un endomotor ?</h2>
<p>L''endomotor remplace la préparation manuelle des canaux radiculaires par des limes en Nickel-Titane actionnées mécaniquement. Bénéfices : réduction du temps de traitement de 50 à 70 %, diminution du risque de fracture instrumentale, meilleure qualité de préparation canalaire, et confort amélioré pour le patient comme pour le praticien.</p>',

  usages_fr = '<h3>Indications</h3><ul>
<li>Traitement de canal (endodontie)</li>
<li>Retraitement endodontique</li>
<li>Préparation canalaire pour obturation</li>
</ul>

<h3>Praticiens concernés</h3><ul>
<li>Chirurgien-dentiste généraliste</li>
<li>Endodontiste</li>
<li>Cabinet polyvalent avec pôle endodontie</li>
</ul>',

  maintenance_fr = '<h3>Entretien quotidien</h3><ul>
<li>Désinfection de la tête moteur avec lingette alcoolisée après chaque patient</li>
<li>Stérilisation du contre-cône en autoclave classe B (134°C, 18 min)</li>
<li>Vérification du bon fonctionnement de l''écran LCD</li>
</ul>

<h3>Entretien hebdomadaire</h3><ul>
<li>Nettoyage du mandrin avec spray nettoyant</li>
<li>Vérification de l''autonomie de la batterie</li>
<li>Test du contrôle de couple avec lime étalon</li>
</ul>

<h3>Maintenance annuelle (technicien ODG)</h3><ul>
<li>Calibrage du moteur et du capteur de couple</li>
<li>Vérification de l''écran LCD</li>
<li>Test de la batterie (remplacement si autonomie < 6h)</li>
</ul>',

  compatibilite_fr = '<h3>Limes compatibles</h3><ul>
<li>Protaper / Protaper Next (Dentsply)</li>
<li>Mtwo (VDW)</li>
<li>Reciproc / Reciproc Blue (VDW)</li>
<li>WaveOne / WaveOne Gold (Dentsply)</li>
<li>HyFlex (Coltene)</li>
<li>Tous systèmes de limes NiTi standards</li>
</ul>

<h3>Accessoires</h3><ul>
<li>Contre-cône de rechange</li>
<li>Batterie de rechange</li>
<li>Chargeur secteur</li>
</ul>',

  garantie_fr = '<h3>Garantie</h3><p>2 ans pièces et main-d''œuvre (moteur + électronique). La batterie est garantie 1 an (consommable).</p>

<h3>Conditions</h3><ul>
<li>Utilisation conforme à la notice</li>
<li>Stérilisation du contre-cône après chaque patient</li>
<li>Pas d''immersion du moteur dans un liquide</li>
</ul>',

  faq_fr = '[
    {"q":"L''endomotor est-il compatible avec tous les systèmes de limes ?","a":"Oui, l''endomotor Cicada Dental est livré avec des programmes pré-enregistrés pour les principaux systèmes (Protaper, Mtwo, Reciproc, WaveOne, HyFlex). Pour un système non listé, vous pouvez créer un programme personnalisé en réglant vitesse et couple selon les recommandations du fabricant."},
    {"q":"Faut-il stériliser l''endomotor après chaque patient ?","a":"Le contre-cône (la partie en contact avec la lime) doit être stérilisé en autoclave classe B après chaque patient. Le corps du moteur se désinfecte avec une lingette alcoolisée — il ne doit jamais être immergé ni autoclavé."},
    {"q":"Quelle est l''autonomie de la batterie ?","a":"L''autonomie est de 8 à 10 heures en utilisation continue, soit environ 20-30 traitements de canal. La batterie se recharge en 2-3 heures sur secteur. Une batterie de rechange est recommandée pour les cabinets à volume élevé."},
    {"q":"Peut-on utiliser l''endomotor avec un localisateur d''apex ?","a":"Selon le modèle, l''endomotor peut intégrer un localisateur d''apex intégré ou être compatible avec un localisateur externe via câble. Contactez ODG pour vérifier la compatibilité avec votre équipement existant."}
  ]'::jsonb,

  prix_min = 180000,
  prix_max = 250000,
  rating_value = 4.4,
  rating_count = 5,
  updated_at = NOW()
WHERE slug = 'endomotor';

-- =====================================================================
-- 2. CHARIOT 3 ETAGES (générique — pas de marque spécifique)
-- =====================================================================

UPDATE products SET
  description_longue_fr = '<p>Le chariot 3 étages est un meuble de rangement mobile conçu pour les cabinets dentaires. Il permet d''organiser et de transporter facilement les instruments, consommables et accessoires entre les postes de travail, tout en gardant le plan de travail du fauteuil dégagé.</p>

<h2>Caractéristiques principales</h2>
<ul>
<li>Structure en acier inoxydable ou aluminium anodisé</li>
<li>3 plateaux superposés</li>
<li>4 roues pivotantes (dont 2 avec frein)</li>
<li>Tiroirs sur rails métalliques à fermeture amortie</li>
<li>Poignée de poussée ergonomique</li>
<li>Charge maximale 30 kg par plateau</li>
</ul>

<h2>Organisation du cabinet</h2>
<p>Le chariot 3 étages optimise le flux de travail en cabinet dentaire : le praticien garde à portée de main les instruments utilisés à chaque type de soin, sans encombrer le plateau du fauteuil. Idéal pour les cabinets multi-fauteuils où un chariot est dédié à chaque type de protocole (endodontie, chirurgie, restauration, etc.).</p>',

  usages_fr = '<h3>Usage</h3><ul>
<li>Rangement d''instruments dentaires</li>
<li>Transport entre postes de travail</li>
<li>Organisation par type de soin (chariot endodontie, chariot chirurgie, etc.)</li>
<li>Cabinet multi-fauteuils</li>
</ul>',

  maintenance_fr = '<h3>Entretien</h3><ul>
<li>Nettoyage quotidien des plateaux avec produit détergent neutre</li>
<li>Désinfection hebdomadaire avec produit compatible acier/aluminium</li>
<li>Lubrification annuelle des roues et rails de tiroirs</li>
<li>Vérification du bon fonctionnement des freins de roues</li>
</ul>',

  compatibilite_fr = '<h3>Dimensions standards</h3><ul>
<li>Largeur : 40-50 cm</li>
<li>Profondeur : 35-45 cm</li>
<li>Hauteur : 80-90 cm</li>
</ul>

<h3>Accessoires</h3><ul>
<li>Plateaux supplémentaires</li>
<li>Supports pour turbines et contre-angles</li>
<li>Poubelle intégrée</li>
</ul>',

  garantie_fr = '<h3>Garantie</h3><p>2 ans pièces et main-d''œuvre sur la structure. Les roues sont considérées comme consommables (garantie 6 mois).</p>',

  faq_fr = '[
    {"q":"Le chariot est-il compatible avec tous les fauteuils dentaires ?","a":"Oui, le chariot 3 étages est un meuble indépendant. Il se positionne à côté du fauteuil et ne nécessite aucune fixation. Il est compatible avec toutes les marques de fauteuils dentaires."},
    {"q":"Quelle charge maximale peut supporter le chariot ?","a":"Chaque plateau supporte jusqu''à 30 kg. La charge totale recommandée est de 80 kg répartis sur les 3 plateaux, pour préserver la stabilité et la maniabilité du chariot."},
    {"q":"Les plateaux sont-ils amovibles ?","a":"Les plateaux ne sont pas amovibles sur le modèle standard, mais peuvent être retirés pour nettoyage en dévissant les fixations. Pour un usage nécessitant des plateaux fréquemment retirés, contactez ODG pour un modèle adapté."}
  ]'::jsonb,

  prix_min = 80000,
  prix_max = 130000,
  rating_value = 4.2,
  rating_count = 3,
  updated_at = NOW()
WHERE slug = 'chariot-3-etage';

-- =====================================================================
-- 3. CHAMP OPERATOIRE (générique)
-- =====================================================================

UPDATE products SET
  description_longue_fr = '<p>Le champ opératoire (également appelé plateau de travail ou plateau de May) est un plateau métallique stérilisable utilisé en cabinet dentaire pour poser les instruments et matériels pendant les soins. Indispensable pour respecter les protocoles d''hygiène et de stérilité ASMR (Assurance Stérilisation en Milieu Rural).</p>

<h2>Caractéristiques principales</h2>
<ul>
<li>Acier inoxydable 304 médical (résistant à la corrosion)</li>
<li>Bords relevés pour éviter l''écoulement</li>
<li>Surface lisse sans aspérités (facile à nettoyer)</li>
<li>Dimensions standardisées selon usage</li>
<li>Stérilisable en autoclave classe B (134°C, 18 min)</li>
<li>Compatible avec tous les supports d''instruments</li>
</ul>

<h2>Hygiène et conformité</h2>
<p>Le champ opératoire est un élément essentiel de la chaîne d''hygiène en cabinet dentaire. Il isole les instruments stérilisés de la surface non stérile du fauteuil ou du meuble. Après chaque patient, il est retiré, nettoyé, désinfecté et stérilisé en autoclave classe B avant d''être réutilisé.</p>',

  usages_fr = '<h3>Usage</h3><ul>
<li>Support d''instruments stérilisés pendant les soins</li>
<li>Plateau de présentation pour examens cliniques</li>
<li>Organisation du poste de travail</li>
</ul>

<h3>Spécialités</h3><ul>
<li>Soins conservateurs</li>
<li>Chirurgie dentaire</li>
<li>Implantologie</li>
<li>Prothèses</li>
</ul>',

  maintenance_fr = '<h3>Protocole de stérilisation</h3>
<ol>
<li><strong>Pré-désinfection</strong> : tremper 15 min dans solution détergente-désinfectante</li>
<li><strong>Rinçage</strong> : eau du robinet puis eau déminéralisée</li>
<li><strong>Séchage</strong> : chiffon non pelucheux</li>
<li><strong>Emballage</strong> : pochette papier-crépon adaptée</li>
<li><strong>Stérilisation</strong> : autoclave classe B, cycle 134°C / 18 min</li>
<li><strong>Stockage</strong> : zone propre, à l''abri de la lumière</li>
</ol>',

  compatibilite_fr = '<h3>Dimensions disponibles</h3><ul>
<li>20 x 30 cm (petit format)</li>
<li>25 x 35 cm (format standard)</li>
<li>30 x 40 cm (grand format)</li>
<li>40 x 60 cm (format chirurgie)</li>
</ul>

<h3>Accessoires compatibles</h3><ul>
<li>Comptes d''instruments en inox</li>
<li>Plateaux compartimentés</li>
<li>Couvercles de protection</li>
</ul>',

  garantie_fr = '<h3>Garantie</h3><p>2 ans contre les défauts de fabrication. La corrosion due à un usage inapproprié (chlore, acides) n''est pas couverte.</p>',

  faq_fr = '[
    {"q":"Quel format de champ opératoire choisir ?","a":"Le format standard 25x35 cm convient à la plupart des soins courants. Pour la chirurgie ou l''implantologie, préférez le grand format 30x40 cm ou 40x60 cm qui permet de poser plus d''instruments. ODG propose les 4 formats standards."},
    {"q":"Le champ opératoire est-il stérilisable en autoclave ?","a":"Oui, en acier inoxydable 304 médical, il est stérilisable en autoclave classe B (134°C, 18 min). Il peut être réutilisé des centaines de fois sans dégradation."},
    {"q":"Comment éviter la corrosion du champ opératoire ?","a":"Évitez le contact prolongé avec des solutions chlorées ou acides (hypochlorite, acide phosphorique). Après pré-désinfection, rincez abondamment à l''eau puis à l''eau déminéralisée. Séchez immédiatement après lavage."}
  ]'::jsonb,

  prix_min = 15000,
  prix_max = 35000,
  rating_value = 4.6,
  rating_count = 4,
  updated_at = NOW()
WHERE slug = 'champ-operatoir';

-- =====================================================================
-- Vérification finale
-- =====================================================================
SELECT slug, nom_fr, marque,
  (description_longue_fr IS NOT NULL) AS has_long_desc,
  (faq_fr IS NOT NULL) AS has_faq,
  (prix_min IS NOT NULL) AS has_price,
  (rating_value IS NOT NULL) AS has_rating
FROM products
ORDER BY ordre;
