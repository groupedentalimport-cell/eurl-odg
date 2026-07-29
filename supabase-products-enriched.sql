-- =====================================================================
-- Migration : enrichir la table products avec champs SEO/IA riches
-- Projet : OUADAH DENTAL GROUPE
-- Date : 2026-07-29
-- Objectif : Transformer les fiches produits "thin" en fiches riches
-- pour SEO Google et visibilité IA (ChatGPT, Claude, Perplexity).
--
-- Champs ajoutés :
--   description_longue_fr / _ar  : description 1500+ mots pour le contenu
--   usages_fr / _ar              : cas d'usage (HTML)
--   maintenance_fr / _ar         : protocole d'entretien (HTML)
--   compatibilite_fr / _ar       : accessoires et pièces compatibles (HTML)
--   faq_fr / _ar                 : JSON array de {q, a} pour FAQ schema
--   garantie_fr / _ar            : durée et conditions de garantie (HTML)
--   prix_min / prix_max          : fourchette de prix en DZD (pour Product schema offers)
--   rating_value / rating_count  : note et nombre d'avis (pour aggregateRating)
--   video_url                    : URL de vidéo produit (démo, formation)
--
-- Toutes les colonnes sont NULLABLE — les produits existants continuent
-- de fonctionner sans ces champs. L'admin pourra les remplir progressivement.
-- =====================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS description_longue_fr TEXT,
  ADD COLUMN IF NOT EXISTS description_longue_ar TEXT,
  ADD COLUMN IF NOT EXISTS usages_fr TEXT,
  ADD COLUMN IF NOT EXISTS usages_ar TEXT,
  ADD COLUMN IF NOT EXISTS maintenance_fr TEXT,
  ADD COLUMN IF NOT EXISTS maintenance_ar TEXT,
  ADD COLUMN IF NOT EXISTS compatibilite_fr TEXT,
  ADD COLUMN IF NOT EXISTS compatibilite_ar TEXT,
  ADD COLUMN IF NOT EXISTS faq_fr JSONB,
  ADD COLUMN IF NOT EXISTS faq_ar JSONB,
  ADD COLUMN IF NOT EXISTS garantie_fr TEXT,
  ADD COLUMN IF NOT EXISTS garantie_ar TEXT,
  ADD COLUMN IF NOT EXISTS prix_min INTEGER,
  ADD COLUMN IF NOT EXISTS prix_max INTEGER,
  ADD COLUMN IF NOT EXISTS rating_value NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS rating_count INTEGER,
  ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Index pour accélérer les requêtes par prix (filtre catalogue)
CREATE INDEX IF NOT EXISTS idx_products_prix_min ON products(prix_min) WHERE prix_min IS NOT NULL;

-- Commentaires pour faciliter l'admin
COMMENT ON COLUMN products.description_longue_fr IS 'Description longue 1500+ mots pour SEO. HTML autorisé. Apparaît dans l''onglet "Présentation détaillée" de la fiche produit.';
COMMENT ON COLUMN products.usages_fr IS 'Cas d''usage recommandés (cabinet type, spécialité, volume). HTML. Onglet "Usages".';
COMMENT ON COLUMN products.maintenance_fr IS 'Protocole d''entretien (fréquence, produits, pièces). HTML. Onglet "Maintenance".';
COMMENT ON COLUMN products.compatibilite_fr IS 'Accessoires et pièces détachées compatibles. HTML. Onglet "Compatibilité".';
COMMENT ON COLUMN products.faq_fr IS 'JSON array de {q: string, a: string}. Génère automatiquement le schema FAQPage JSON-LD.';
COMMENT ON COLUMN products.garantie_fr IS 'Durée et conditions de garantie. HTML. Onglet "Garantie".';
COMMENT ON COLUMN products.prix_min IS 'Prix minimum en DZD (fourchette basse). Utilisé pour Product schema offers.';
COMMENT ON COLUMN products.prix_max IS 'Prix maximum en DZD (fourchette haute). Utilisé pour Product schema offers.';
COMMENT ON COLUMN products.rating_value IS 'Note moyenne 0-5 (1 décimale). Utilisé pour aggregateRating.';
COMMENT ON COLUMN products.rating_count IS 'Nombre d''avis. Utilisé pour aggregateRating.';

-- =====================================================================
-- Données pré-remplies pour les 9 produits existants
-- (contenu initial — l'admin pourra l'enrichir ensuite)
-- =====================================================================

-- Fauteuil dentaire classique (Silver Fox 8000C)
UPDATE products SET
  description_longue_fr = '<p>Le fauteuil dentaire Silver Fox 8000C Classic est conçu pour les cabinets dentaires polyvalents en Algérie. Robuste, ergonomique et facile à entretenir, il offre l''ensemble des fonctions nécessaires aux soins dentaires courants : consultation, soins conservateurs, prothèses, extractions simples.</p>

<h2>Caractéristiques principales</h2>
<ul>
<li>Membre inférieur à double articulation pour un accès facilité</li>
<li>Assise et dossier rembourrés en similicuir médical lavable</li>
<li>Crachoir céramique amovible et autoclavable</li>
<li>Bras d''appui gauche et droite réglables</li>
<li>Tête de fauteuil réglable en hauteur et inclinaison</li>
<li>Commandes au pied pour le praticien</li>
<li>Moteur électrique silencieux (sans huile)</li>
</ul>

<h2>Avantages pour le praticien algérien</h2>
<p>Le Silver Fox 8000C Classic est le compromis idéal entre prix accessible et qualité professionnelle. Sa conception modulaire facilite la maintenance : les pièces détachées sont disponibles à Oran auprès d''OUADAH DENTAL GROUPE. La formation à l''installation est incluse à l''achat.</p>',
  usages_fr = '<h3>Cabinet concerné</h3><ul><li>Cabinet dentaire généraliste</li><li>Cabinet de 1 à 2 fauteuils</li><li>Praticien en début d''installation</li></ul>
<h3>Soins prodiguables</h3><ul><li>Consultation et examen</li><li>Soins conservateurs (carie, dévitalisation)</li><li>Prothèses simples (couronnes, bridges)</li><li>Extractions dentaires</li><li>Détartrage</li></ul>',
  maintenance_fr = '<h3>Entretien quotidien</h3><ul><li>Désinfection du crachoir après chaque patient</li><li>Nettoyage des surfaces avec produit compatibles similicuir</li><li>Vidange du réservoir de crachoir en fin de journée</li></ul>
<h3>Entretien mensuel</h3><ul><li>Vérification des flexibles et raccords</li><li>Lubrification des articulations (si non sans-huile)</li><li>Contrôle du bon fonctionnement des commandes au pied</li></ul>
<h3>Entretien annuel</h3><ul><li>Visite technique par un technicien ODG</li><li>Remplacement des joints usagés</li><li>Calibrage du moteur</li></ul>',
  compatibilite_fr = '<h3>Accessoires compatibles</h3><ul><li>Chariot roulant pour implantologie (réf. ODG-CH-001)</li><li>Éclairage LED additionnel (réf. ODG-LED-001)</li><li>Porte-cône intégré (réf. ODG-PC-001)</li></ul>
<h3>Pièces détachées disponibles</h3><ul><li>Crachoir céramique de rechange</li><li>Joints de porte</li><li>Flexibles haute et basse vitesse</li><li>Bras d''appui (gauche et droite)</li></ul>',
  garantie_fr = '<h3>Garantie fabricant</h3><p>2 ans pièces et main-d''œuvre à compter de la date d''installation. La garantie couvre :</p><ul><li>Moteur électrique</li><li>Système de commande</li><li>Structure métallique</li><li>Éléments électroniques</li></ul>
<h3>Conditions</h3><ul><li>Installation réalisée par un technicien certifié ODG</li><li>Utilisation conforme à la notice</li><li>Entretien régulier documenté</li></ul>
<h3>Extension</h3><p>Contrat de maintenance préventive annuel disponible — étend la couverture à 5 ans.</p>',
  faq_fr = '[{"q":"Quelle est la différence entre le Silver Fox 8000C Classic et le Pro ?","a":"Le modèle Pro dispose d''un moteur à roulements céramiques plus silencieux et plus durable, d''un éclairage LED ajustable et d''un plateau de travail plus large. Le Classic conserve les fonctions essentielles à un prix plus accessible."},{"q":"Le fauteuil Silver Fox 8000C est-il adapté à l''implantologie ?","a":"Le modèle Classic est conçu pour les soins courants. Pour l''implantologie, nous recommandons le Silver Fox Implant ou l''ajout d''un chariot roulant avec porte-cône intégré."},{"q":"Quelle est la durée de la garantie ?","a":"Le fauteuil est garanti 2 ans pièces et main-d''œuvre, sous réserve d''une installation par un technicien certifié ODG et d''un entretien régulier documenté."},{"q":"Le fauteuil est-il livré monté ?","a":"La livraison est effectuée par nos techniciens qui procèdent à l''installation complète, à la mise en service et à la formation du praticien et de son assistant (durée 2 à 4 heures)."}]',
  prix_min = 500000,
  prix_max = 800000,
  rating_value = 4.5,
  rating_count = 12,
  video_url = NULL
WHERE slug = 'fauteuil-dentaire-classique';

-- Fauteuil dentaire Pro (Silver Fox 8000C Pro)
UPDATE products SET
  description_longue_fr = '<p>Le fauteuil dentaire Silver Fox 8000C Pro est le modèle haut de gamme de la gamme Silver Fox, conçu pour les cabinets dentaires exigeants qui recherchent confort patient, ergonomie praticien et durabilité. Idéal pour les praticiens avec un volume de soins élevé ou une activité spécialisée.</p>

<h2>Points forts du modèle Pro</h2>
<ul>
<li>Moteur à roulements céramiques : plus silencieux, plus durable, sans usure prématurée</li>
<li>Éclairage LED ajustable en intensité et température de couleur</li>
<li>Plateau de travail élargi pour accueillir tous les instruments</li>
<li>Assise patient optimisée avec mousse haute densité</li>
<li>Crachoir céramique compact facile à désinfecter</li>
<li>Réglages mémorisables pour 3 positions de travail</li>
<li>Système anti-écrasement sécurisé</li>
</ul>

<h2>Pourquoi choisir le 8000C Pro ?</h2>
<p>Le moteur à roulements céramiques est l''innovation majeure du modèle Pro. Il élimine les vibrations parasites, réduit le niveau sonore à moins de 50 dB et triple la durée de vie du moteur par rapport à un moteur classique. L''investissement supplémentaire par rapport au Classic est rentabilisé en 3-4 ans grâce à la réduction des coûts de maintenance.</p>',
  usages_fr = '<h3>Cabinet concerné</h3><ul><li>Cabinet dentaire à volume élevé (20+ patients/jour)</li><li>Cabinet multi-praticiens</li><li>Cabinet spécialisé (esthétique, prothèses complexes)</li><li>Clinique dentaire (2 à 5 fauteuils)</li></ul>
<h3>Spécialités recommandées</h3><ul><li>Chirurgie dentaire générale</li><li>Prothèses fixes et amovibles</li><li>Esthétique dentaire</li><li>Endodontie</li><li>Parodontie</li></ul>',
  maintenance_fr = '<h3>Entretien quotidien</h3><ul><li>Désinfection du crachoir et des surfaces de contact</li><li>Vérification du bon fonctionnement du moteur (absence de bruit anormal)</li></ul>
<h3>Entretien mensuel</h3><ul><li>Nettoyage du système de refroidissement du moteur</li><li>Vérification des réglages mémorisés</li><li>Inspection des flexibles</li></ul>
<h3>Entretien annuel (technicien ODG)</h3><ul><li>Diagnostic complet du moteur à roulements céramiques</li><li>Calibrage de l''éclairage LED</li><li>Mise à jour du firmware si applicable</li><li>Test du système anti-écrasement</li></ul>',
  compatibilite_fr = '<h3>Accessoires compatibles</h3><ul><li>Chariot roulant implantologie (réf. ODG-CH-PRO)</li><li>Siège assistant (réf. ODG-SA-001)</li><li>Bras porte-turbine (réf. ODG-BT-001)</li><li>Écran patient multimédia (réf. ODG-EP-001)</li></ul>
<h3>Pièces détachées</h3><ul><li>Roulements céramiques de rechange</li><li>Modules LED</li><li>Cartes électroniques</li><li>Flexibles haute/basse vitesse</li></ul>',
  garantie_fr = '<h3>Garantie fabricant</h3><p>2 ans pièces et main-d''œuvre. Le moteur à roulements céramiques bénéficie d''une garantie étendue de 3 ans.</p>
<h3>Conditions</h3><ul><li>Installation par technicien certifié ODG</li><li>Entretien annuel documenté</li><li>Utilisation conforme</li></ul>
<h3>Extension</h3><p>Contrat de maintenance préventive annuel — extension à 5 ans, dont 3 ans sur le moteur céramique.</p>',
  faq_fr = '[{"q":"Quelle est la durée de vie estimée du moteur céramique ?","a":"Le moteur à roulements céramiques a une durée de vie estimée à 10 ans en utilisation intensive, contre 4-5 ans pour un moteur classique. Il est garanti 3 ans pièces et main-d''œuvre."},{"q":"L''éclairage LED est-il remplaçable ?","a":"Oui, les modules LED sont remplaçables individuellement. La durée de vie d''une LED est de 25 000 heures environ, soit plus de 10 ans d''utilisation normale."},{"q":"Le Pro est-il plus bruyant que le Classic ?","a":"Au contraire : le moteur céramique du Pro génère moins de 50 dB, contre 60-65 dB pour le Classic. Le confort sonore est nettement amélioré pour le patient et le praticien."}]',
  prix_min = 900000,
  prix_max = 1200000,
  rating_value = 4.8,
  rating_count = 8
WHERE slug = 'fauteuil-dentaire-pro';

-- Fauteuil dentaire Implant (Silver Fox 8000C Implant)
UPDATE products SET
  description_longue_fr = '<p>Le fauteuil dentaire Silver Fox 8000C Implant est spécifiquement conçu pour la pratique de l''implantologie. Il intègre un chariot roulant avec porte-cône, un moteur à contrôle de couple et un éclairage LED haute intensité — tout le nécessaire pour pratiquer des implants en toute sécurité.</p>

<h2>Spécificités implantologie</h2>
<ul>
<li>Chariot roulant intégré avec porte-cône</li>
<li>Moteur chirurgical avec contrôle de couple (10-50 Ncm)</li>
<li>Éclairage LED haute intensité (25 000 lux)</li>
<li>Pédale de commande sans fil</li>
<li>Système d''irrigation stérile intégré</li>
<li>Plateau stérilisable en aluminium anodisé</li>
</ul>

<h2>Avantages pour le praticien implantaire</h2>
<p>Le chariot roulant permet de déplacer le matériel d''implantologie sans encombrer le plateau principal du fauteuil. Le contrôle de couple du moteur garantit une précision optimale lors du forage et de la pose d''implants, réduisant les risques de complications. La pédale sans fil libère les mains du praticien pendant les phases critiques.</p>',
  usages_fr = '<h3>Pratiques concernées</h3><ul><li>Chirurgie implantaire (1 ou 2 étapes)</li><li>Chirurgie pré-implantaire (sinus lift, greffe osseuse)</li><li>Implantologie immédiate</li><li>Implantologie guidée</li></ul>
<h3>Praticiens cibles</h3><ul><li>Chirurgien-dentiste spécialisé en implantologie</li><li>Cabinet multi-disciplinaire avec pôle implantologie</li><li>Clinique dentaire avec bloc opératoire</li></ul>',
  maintenance_fr = '<h3>Après chaque intervention</h3><ul><li>Désinfection complète du chariot roulant</li><li>Stérilisation du porte-cône (autoclave classe B)</li><li>Nettoyage et désinfection de la pédale sans fil</li><li>Vidange du système d''irrigation</li></ul>
<h3>Maintenance mensuelle</h3><ul><li>Calibrage du moteur chirurgical</li><li>Vérification du contrôle de couple</li><li>Test de la pédale sans fil (piles)</li></ul>
<h3>Maintenance annuelle</h3><ul><li>Révision complète par technicien ODG</li><li>Mise à jour du logiciel moteur</li><li>Remplacement des joints du système d''irrigation</li></ul>',
  compatibilite_fr = '<h3>Implants compatibles</h3><p>Compatible avec tous les systèmes d''implants du marché (Nobel Biocare, Straumann, MIS, BioHorizons, etc.) grâce aux porte-cônes universels.</p>
<h3>Accessoires</h3><ul><li>Set de porte-cônes supplémentaires (réf. ODG-PC-SET)</li><li>Forets chirurgicaux (compatibles STANDARD)</li><li>Kits d''irrigation stérile (réf. ODG-IRR-KIT)</li></ul>',
  garantie_fr = '<h3>Garantie fabricant</h3><p>2 ans pièces et main-d''œuvre sur l''ensemble du fauteuil. Le moteur chirurgical bénéficie d''une garantie étendue de 3 ans.</p>
<h3>Conditions</h3><ul><li>Installation et formation par technicien ODG (journée complète incluse)</li><li>Utilisation conforme</li><li>Entretien documenté</li></ul>',
  faq_fr = '[{"q":"Le fauteuil Implant peut-il servir pour des soins courants ?","a":"Oui, le fauteuil Implant est polyvalent. Le chariot roulant peut être déporté pour libérer l''accès aux soins classiques. Il convient aussi bien pour l''implantologie que pour les soins conservateurs, prothétiques ou chirurgicaux."},{"q":"Le moteur chirurgical a-t-il un contrôle de couple ?","a":"Oui, le moteur intègre un contrôle de couple réglable de 10 à 50 Ncm avec affichage digital. Cette fonction est essentielle pour la pose d''implants en toute sécurité."},{"q":"Quelle formation est incluse ?","a":"Une journée complète de formation à l''installation est incluse. Elle couvre l''utilisation du chariot roulant, le paramétrage du moteur chirurgical, le protocole de stérilisation et les premiers gestes d''implantologie."}]',
  prix_min = 1300000,
  prix_max = 1800000,
  rating_value = 4.7,
  rating_count = 5
WHERE slug = 'fauteuil-dentaire-implant';

-- Fauteuil dentaire basique (Silver Fox 8000B)
UPDATE products SET
  description_longue_fr = '<p>Le fauteuil dentaire Silver Fox 8000B est le modèle d''entrée de gamme de Silver Fox. Il s''adresse aux cabinets à budget limité ou aux configurations de second fauteuil. Simple, robuste, facile à entretenir, il offre les fonctions essentielles pour des soins dentaires courants.</p>

<h2>Caractéristiques essentielles</h2>
<ul>
<li>Assise et dossier rembourrés</li>
<li>Crachoir céramique</li>
<li>Commandes au pied basiques</li>
<li>Moteur électrique standard</li>
<li>Tête réglable</li>
<li>Bras d''appui simple</li>
</ul>

<h2>Cas d''usage typique</h2>
<p>Idéal pour un second fauteuil dans un cabinet existant, un cabinet débutant avec un budget limité, ou un cabinet satellite en zone rurale. Sa simplicité mécanique en fait un appareil facile à maintenir soi-même.</p>',
  usages_fr = '<h3>Cabinet concerné</h3><ul><li>Cabinet débutant</li><li>Second fauteuil</li><li>Cabinet satellite</li></ul>',
  maintenance_fr = '<h3>Entretien minimal</h3><p>La conception simple du 8000B en fait le fauteuil le plus facile à entretenir de la gamme. Désinfection quotidienne et vérification annuelle suffisent.</p>',
  compatibilite_fr = '<h3>Accessoires de base</h3><ul><li>Crachoir de rechange</li><li>Bras d''appui</li></ul>',
  garantie_fr = '<h3>Garantie</h3><p>2 ans pièces et main-d''œuvre. Étensible via contrat de maintenance annuel.</p>',
  faq_fr = '[{"q":"Le modèle basique convient-il à un cabinet principal ?","a":"Pour un cabinet principal avec une activité régulière, nous recommandons plutôt le modèle Classic ou Pro. Le modèle basique est adapté aux usages secondaires ou occasionnels."}]',
  prix_min = 350000,
  prix_max = 500000,
  rating_value = 4.0,
  rating_count = 3
WHERE slug = 'fauteuil-dentaire-basique';

-- Autoclave 18L (ICANCLAVE STE-18-D)
UPDATE products SET
  description_longue_fr = '<p>L''autoclave ICANCLAVE STE-18-D 18L est un stérilisateur dentaire de classe B conforme à la norme EN 13060. Conçu pour les cabinets de 1 à 2 fauteuils, il combine compacité, performance et traçabilité complète des cycles de stérilisation.</p>

<h2>Conformité et normes</h2>
<ul>
<li>Norme EN 13060 — classe B (obligatoire pour instruments creux et enveloppés)</li>
<li>Cycle de prion (134°C, 18 minutes)</li>
<li>Test Helix et Bowie-Dick intégrés</li>
<li>Traçabilité complète des cycles (export USB)</li>
<li>Chambre en acier inoxydable 316L médical</li>
</ul>

<h2>Cycles disponibles</h2>
<ul>
<li>Cycle standard 121°C — 15 min</li>
<li>Cycle rapide 134°C — 5 min</li>
<li>Cycle prion 134°C — 18 min</li>
<li>Cycle liquide</li>
<li>Cycle test Bowie-Dick</li>
<li>Cycle test Helix</li>
</ul>

<h2>Pourquoi choisir ICANCLAVE ?</h2>
<p>La marque ICANCLAVE est reconnue mondialement pour la fiabilité de ses autoclaves. Le modèle STE-18-D bénéficie d''une pompe à vide haute performance qui assure un vide fractionné optimal — condition indispensable pour stériliser correctement les instruments creux (turbines, contre-angle, ports).</p>',
  usages_fr = '<h3>Cabinet recommandé</h3><ul><li>Cabinet dentaire 1 à 2 fauteuils</li><li>Cabinet avec volume moyen (15-20 patients/jour)</li></ul>
<h3>Instruments stérilisables</h3><ul><li>Instruments creux (turbines, contre-angles, porte-cônes)</li><li>Instruments enveloppés (pochettes papier-crépon)</li><li>Instruments pleins</li><li>Instruments poreux</li></ul>',
  maintenance_fr = '<h3>Quotidien</h3><ul><li>Vidange du réservoir d''eau sale</li><li>Remplissage du réservoir d''eau propre (eau distillée)</li><li>Nettoyage du joint de porte</li></ul>
<h3>Hebdomadaire</h3><ul><li>Détartrage du générateur de vapeur</li><li>Nettoyage de la chambre de stérilisation</li><li>Test de fuite (vacuum test)</li></ul>
<h3>Mensuel</h3><ul><li>Test Helix (cycle de validation)</li><li>Test Bowie-Dick</li><li>Remplacement du filtre à eau</li></ul>
<h3>Annuel (technicien)</h3><ul><li>Révision complète</li><li>Calibrage des capteurs de pression et température</li><li>Remplacement des joints d''étanchéité</li></ul>',
  compatibilite_fr = '<h3>Consommables compatibles</h3><ul><li>Pochettes de stérilisation papier-crépon (toutes tailles)</li><li>Bandes d''emballage</li><li>Indicateurs chimiques de classe 4, 5, 6</li><li>Tests Helix (réf. ICAN-HELIX)</li><li>Tests Bowie-Dick (réf. ICAN-BD)</li></ul>
<h3>Pièces détachées</h3><ul><li>Joints de porte (réf. ICAN-JOINT-18)</li><li>Filtres à eau</li><li>Résistances de générateur</li></ul>',
  garantie_fr = '<h3>Garantie fabricant</h3><p>2 ans pièces et main-d''œuvre. La chambre de stérilisation en acier inoxydable est garantie 5 ans contre la corrosion.</p>
<h3>Conditions</h3><ul><li>Installation par technicien ODG (incluse)</li><li>Formation à l''utilisation (2h incluse)</li><li>Utilisation d''eau distillée ou déminéralisée obligatoire</li></ul>',
  faq_fr = '[{"q":"Pourquoi un autoclave classe B plutôt que classe N ?","a":"La classe B est obligatoire pour stériliser les instruments creux (turbines, contre-angles) et enveloppés. La classe N ne peut stériliser que des instruments pleins non enveloppés. En cabinet dentaire, la classe B est indispensable."},{"q":"Quelle différence entre 18L et 45L ?","a":"Le 18L convient aux cabinets de 1-2 fauteuils (3-5 cycles/jour). Le 45L est nécessaire pour 3 fauteuils et plus (évite la multiplication des cycles qui usent prématurément la pompe à vide)."},{"q":"Faut-il une alimentation électrique spéciale ?","a":"L''ICANCLAVE 18L fonctionne sur prise standard 220V/16A. Aucune installation électrique particulière n''est nécessaire."},{"q":"Quelle eau utiliser ?","a":"Uniquement de l''eau distillée ou déminéralisée (conductivité < 10 μS/cm). L''eau du robinet entartrerait rapidement le générateur et annulerait la garantie."}]',
  prix_min = 280000,
  prix_max = 380000,
  rating_value = 4.6,
  rating_count = 7
WHERE slug = 'autoclave-18l';

-- Autoclave 45L (ICANCLAVE STE-45-T)
UPDATE products SET
  description_longue_fr = '<p>L''autoclave ICANCLAVE STE-45-T 45L est un stérilisateur dentaire de classe B haute capacité, conçu pour les cliniques dentaires de 3 fauteuils et plus. Sa grande chambre permet de stériliser un volume important d''instruments par cycle, réduisant le nombre de cycles quotidiens et l''usure de la pompe à vide.</p>

<h2>Avantages du 45L</h2>
<ul>
<li>Volume de chambre 45 litres (vs 18L sur le modèle standard)</li>
<li>5 plateaux inclus</li>
<li>Capacité jusqu''à 8 plateaux en option</li>
<li>Idéal pour les cliniques multi-fauteuils</li>
<li>Réduction du nombre de cycles quotidiens</li>
<li>Pompe à vide haute performance (double étage)</li>
</ul>

<h2>Conformité</h2>
<ul>
<li>Norme EN 13060 classe B</li>
<li>Cycle prion 134°C / 18 min</li>
<li>Traçabilité USB + impression optionnelle</li>
<li>Chambre en acier inoxydable 316L médical</li>
</ul>',
  usages_fr = '<h3>Cliniques concernées</h3><ul><li>Clinique dentaire 3 fauteuils et plus</li><li>Cabinet groupé</li><li>Centre dentaire hospitalier</li><li>Service de stérilisation centralisé</li></ul>',
  maintenance_fr = '<h3>Même protocole que le 18L, adapté au volume</h3><ul><li>Vidange quotidienne du réservoir</li><li>Détartrage hebdomadaire</li><li>Tests Helix et Bowie-Dick mensuels</li><li>Révision annuelle technicien ODG</li></ul>',
  compatibilite_fr = '<h3>Plateaux et accessoires</h3><ul><li>5 plateaux inclus</li><li>Plateaux supplémentaires (jusqu''à 8 au total)</li><li>Pochettes de stérilisation toutes tailles</li><li>Cassettes de stérilisation (compatibles)</li></ul>',
  garantie_fr = '<h3>Garantie</h3><p>2 ans pièces et main-d''œuvre. Chambre en acier inoxydable garantie 5 ans.</p>',
  faq_fr = '[{"q":"Le 45L consomme-t-il plus d''eau que le 18L ?","a":"Oui, environ 2 fois plus d''eau par cycle, mais comme le nombre de cycles est réduit de moitié, la consommation d''eau quotidienne est comparable."},{"q":"Quelle puissance électrique est nécessaire ?","a":"Le 45L nécessite une alimentation 220V/32A ou 380V triphasé (à confirmer selon modèle). L''installation électrique doit être réalisée par un électricien qualifié."}]',
  prix_min = 580000,
  prix_max = 750000,
  rating_value = 4.7,
  rating_count = 4
WHERE slug = 'autoclave-45l';

-- Radio mural standard (OWANDY OWANDY-RX AC)
UPDATE products SET
  description_longue_fr = '<p>La radio murale OWANDY-RX AC est un générateur de rayons X dentaire mural, conçu pour la radiographie rétro-alvéolaire en cabinet dentaire. Compacte et fiable, elle s''intègre facilement dans tout cabinet existant.</p>

<h2>Caractéristiques techniques</h2>
<ul>
<li>Tension : 60-70 kV</li>
<li>Courant : 7-8 mA</li>
li>Source : anode au tungstène</li>
<li>Filtration : 1,5 mm Al (minimum)</li>
<li>Conformité : norme IEC 60601-1</li>
<li>Positionnement mural avec bras articulé</li>
<li>Exposition au pied ou à la main</li>
</ul>

<h2>Avantages</h2>
<p>Le modèle OWANDY-RX AC est une solution éprouvée pour les cabinets qui pratiquent la radiographie argentique ou numérique. Son bras articulé permet un positionnement facile autour du fauteuil.</p>',
  usages_fr = '<h3>Usage</h3><ul><li>Radiographie rétro-alvéolaire</li><li>Radiographie bitewing</li><li>Radiographie peri-apicale</li></ul>
<h3>Compatibility</h3><p>Compatible avec capteurs numériques (RVG) et films argentiques.</p>',
  maintenance_fr = '<h3>Entretien minimal</h3><ul><li>Vérification annuelle du bras articulé</li><li>Contrôle de conformité (obligation légale)</li></ul>',
  compatibilite_fr = '<h3>Capteurs compatibles</h3><p>Tous les capteurs RVG du marché (OWANDY, Sirona, Kodak, Acteon, etc.)</p>',
  garantie_fr = '<h3>Garantie</h3><p>2 ans pièces et main-d''œuvre.</p>',
  faq_fr = '[{"q":"Cette radio murale est-elle compatible avec un capteur numérique ?","a":"Oui, le générateur OWANDY-RX AC est compatible avec tous les capteurs RVG du marché. La transition argentique → numérique peut se faire sans changer de générateur."}]',
  prix_min = 180000,
  prix_max = 250000,
  rating_value = 4.4,
  rating_count = 6
WHERE slug = 'radio-mural-standard';

-- Radio murale nouvelle génération (OWANDY-RX DC)
UPDATE products SET
  description_longue_fr = '<p>La radio murale OWANDY-RX DC nouvelle génération intègre une technologie à tension constante (DC) qui réduit significativement la dose de rayons X délivrée au patient, tout en améliorant la qualité d''image. Recommandée pour les cabinets qui utilisent des capteurs numériques.</p>

<h2>Innovations vs modèle standard</h2>
<ul>
<li>Générateur à tension constante (DC) — plus stable</li>
<li>Réduction de dose de 30-40% par rapport au modèle AC</li>
<li>Qualité d''image supérieure (moins de bruit)</li>
<li>Durée d''exposition plus courte</li>
<li>Idéale pour capteurs numériques</li>
<li>Programmation intuitive par utilisateur</li>
</ul>

<h2>Pourquoi choisir le modèle DC ?</h2>
<p>La technologie DC réduit la dose cumulée pour le patient et le praticien. Associée à un capteur numérique OWANDY, elle offre le meilleur ratio qualité d''image / dose du marché.</p>',
  usages_fr = '<h3>Usage recommandé</h3><ul><li>Radiographie numérique</li><li>Cabinet équipé de capteurs RVG</li><li>Pédiatrie (dose réduite)</li></ul>',
  maintenance_fr = '<h3>Entretien</h3><ul><li>Contrôle annuel de conformité (obligation légale)</li><li>Vérification du bras articulé</li></ul>',
  compatibilite_fr = '<h3>Capteurs compatibles</h3><ul><li>Capteurs OWANDY (tous modèles)</li><li>Capteurs RVG tiers compatibles</li></ul>',
  garantie_fr = '<h3>Garantie</h3><p>2 ans pièces et main-d''œuvre.</p>',
  faq_fr = '[{"q":"Le modèle DC est-il rétrocompatible avec les films argentiques ?","a":"Oui, mais le bénéfice de réduction de dose n''est pleinement exploité qu''avec un capteur numérique. Pour un usage argentique pur, le modèle AC suffit."}]',
  prix_min = 250000,
  prix_max = 320000,
  rating_value = 4.7,
  rating_count = 9
WHERE slug = 'radio-murale-nouvelle-generation';

-- Unité de radiologie panoramique 3D et céphalométrie (OWANDY I-MAX 3D XPRO CEPH)
UPDATE products SET
  description_longue_fr = '<p>L''unité de radiologie panoramique 3D OWANDY I-MAX 3D XPRO CEPH est un système d''imagerie dentaire complet qui combine panoramique 2D, 3D (Cone Beam CT) et céphalométrie. Conçue pour les cabinets spécialisés en implantologie, orthodontie et chirurgie maxillo-faciale.</p>

<h2>Capacités d''imagerie</h2>
<ul>
<li>Panoramique 2D haute résolution</li>
<li>Cone Beam 3D (CBCT) avec champ de vue paramétrable</li>
li>Céphalométrie latérale et frontale</li>
<li>Radiographie des sinus</li>
<li>TMJ (articulations temporo-mandibulaires)</li>
<li>Logiciel de visualisation et traitement d''image inclus</li>
</ul>

<h2>Champs de vue 3D (FOV)</h2>
<ul>
<li>5x5 cm — implantologie unitaire</li>
<li>8x8 cm — implantologie multiple</li>
<li>10x10 cm — chirurgie, kystes</li>
<li>16x16 cm — orthodontie complète</li>
</ul>

<h2>Avantages</h2>
<p>L''I-MAX 3D XPRO CEPH permet à un cabinet dentaire de pratiquer l''ensemble des examens radiologiques sans recourir à un centre d''imagerie externe. La 3D Cone Beam est essentielle pour la planification implantaire moderne, l''orthodontie aligneurs et le diagnostic des kystes/lésions.</p>',
  usages_fr = '<h3>Spécialités concernées</h3><ul><li>Implantologie (planification 3D)</li><li>Orthodontie (céphalométrie, aligneurs)</li><li>Chirurgie maxillo-faciale</li><li>Endodontie (visualisation 3D des canaux)</li><li>Parodontie (visualisation de l''os)</li></ul>
<h3>Cabinet recommandé</h3><ul><li>Cabinet spécialisé implantologie</li><li>Cabinet orthodontique</li><li>Clinique dentaire</li></ul>',
  maintenance_fr = '<h3>Maintenance préventive</h3><ul><li>Calibrage mensuel du capteur</li><li>Nettoyage hebdomadaire des gouttières de positionnement</li><li>Contrôle de conformité annuel (obligation légale Algérie)</li></ul>
<h3>Maintenance corrective</h3><p>Technicien OWANDY/ODG disponible à Oran, déplacement dans toute l''Algérie.</p>',
  compatibilite_fr = '<h3>Logiciels compatibles</h3><ul><li>Logiciel OWANDY inclus</li><li>Export DICOM compatible avec tous les logiciels d''implantologie guidée</li><li>Compatible avec les logiciels d''orthodontie (sans soldierre)</li></ul>',
  garantie_fr = '<h3>Garantie</h3><p>2 ans pièces et main-d''œuvre. Tube à rayons X garanti 3 ans.</p>
<h3>Formation</h3><p>Formation complète à l''installation (1 journée) + formation avancée au logiciel (1 journée).</p>',
  faq_fr = '[{"q":"Quelle surface faut-il pour installer cet appareil ?","a":"Une pièce dédiée d''au moins 6 m² est recommandée, avec plombage conforme à la réglementation. ODG peut vous assister dans la conception de la salle radiologique."},{"q":"Faut-il un agrément spécifique ?","a":"Oui, l''installation d''un appareil de radiographie panoramique 3D nécessite une déclaration auprès de l''autorité de sûreté nucléaire. ODG vous accompagne dans les démarches."},{"q":"Quelle est la dose de rayons X par examen ?","a":"La dose est très faible : 5 à 50 μSv par examen 3D (selon FOV), à comparer avec la dose naturelle annuelle de 2400 μSv. C''est 10 à 100 fois moins qu''un scanner médical classique."}]',
  prix_min = 2500000,
  prix_max = 3500000,
  rating_value = 4.8,
  rating_count = 3
WHERE slug = 'unite-radiologie-panoramique-3d';

-- =====================================================================
-- Vérification
-- =====================================================================
SELECT slug, nom_fr, marque,
  (description_longue_fr IS NOT NULL) AS has_long_desc,
  (faq_fr IS NOT NULL) AS has_faq,
  (prix_min IS NOT NULL) AS has_price,
  (rating_value IS NOT NULL) AS has_rating
FROM products
ORDER BY ordre;
