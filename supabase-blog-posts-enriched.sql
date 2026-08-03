-- =====================================================================
-- Migration : enrichir la table blog_posts avec champs SEO/IA
-- Projet : OUADAH DENTAL GROUPE
-- Date : 2026-07-29
-- Objectif : permettre l'édition de contenu riche pour les articles de blog
--            (extrait, méta-description, FAQ explicite, catégorie, tags)
-- =====================================================================
--
-- CHAMPS AJOUTÉS :
--   excerpt_fr / excerpt_ar      : résumé court (TL;DR) affiché en haut de
--                                  l'article + dans les cartes du blog index.
--                                  Si vide, fallback auto-extrait du contenu.
--   meta_description_fr / _ar    : meta description pour Google (< 155 chars).
--                                  Si vide, fallback sur excerpt ou generic.
--   faq_fr / faq_ar              : JSONB array [{q, a}] pour FAQPage JSON-LD.
--                                  Si vide, fallback auto-extrait des <h2>?
--                                  dans le contenu.
--   category                     : catégorie de l'article (ex: "Fauteuil dentaire",
--                                  "Stérilisation", "Radiologie", "Implantologie").
--   tags                         : array de mots-clés pour SEO et filtrage.
--
-- TOUS LES CHAMPS SONT NULLABLE — les articles existants continuent de
-- fonctionner sans ces champs. L'admin pourra les remplir progressivement.
-- =====================================================================

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS excerpt_fr TEXT,
  ADD COLUMN IF NOT EXISTS excerpt_ar TEXT,
  ADD COLUMN IF NOT EXISTS meta_description_fr TEXT,
  ADD COLUMN IF NOT EXISTS meta_description_ar TEXT,
  ADD COLUMN IF NOT EXISTS faq_fr JSONB,
  ADD COLUMN IF NOT EXISTS faq_ar JSONB,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Commentaires pour faciliter l'admin
COMMENT ON COLUMN blog_posts.excerpt_fr IS 'Résumé court (TL;DR) affiché en haut de l''article dans le bloc "En bref". Si vide, auto-extrait du contenu (200 premiers chars sans HTML).';
COMMENT ON COLUMN blog_posts.meta_description_fr IS 'Meta description pour Google (< 155 chars). Si vide, fallback sur excerpt_fr ou description générique.';
COMMENT ON COLUMN blog_posts.faq_fr IS 'JSON array de {q: string, a: string}. Génère le schema FAQPage JSON-LD. Si vide, fallback auto-extrait des <h2>question ?</h2> du contenu.';
COMMENT ON COLUMN blog_posts.category IS 'Catégorie de l''article : Fauteuil dentaire, Stérilisation, Radiologie, Implantologie, Maintenance, etc.';
COMMENT ON COLUMN blog_posts.tags IS 'Array de mots-clés pour SEO et filtrage. Ex: ["fauteuil dentaire", "Silver Fox", "choix", "guide"].';

-- =====================================================================
-- Pré-remplir excerpt_fr et meta_description_fr pour les articles existants
-- en extrayant les 200 premiers caractères du contenu (sans HTML).
-- =====================================================================

UPDATE blog_posts
SET excerpt_fr = LEFT(
  REGEXP_REPLACE(contenu_fr, '<[^>]+>', ' ', 'g'),
  200
)
WHERE excerpt_fr IS NULL
  AND contenu_fr IS NOT NULL
  AND LENGTH(contenu_fr) > 0;

UPDATE blog_posts
SET meta_description_fr = LEFT(
  REGEXP_REPLACE(contenu_fr, '<[^>]+>', ' ', 'g'),
  155
)
WHERE meta_description_fr IS NULL
  AND contenu_fr IS NOT NULL
  AND LENGTH(contenu_fr) > 0;

-- =====================================================================
-- Assigner des catégories aux articles existants basées sur le slug/titre
-- =====================================================================

UPDATE blog_posts SET category = 'Fauteuil dentaire'
WHERE category IS NULL
  AND (slug ILIKE '%fauteuil%' OR titre_fr ILIKE '%fauteuil%');

UPDATE blog_posts SET category = 'Stérilisation'
WHERE category IS NULL
  AND (slug ILIKE '%sterilisation%' OR slug ILIKE '%autoclave%'
       OR titre_fr ILIKE '%sterilisation%' OR titre_fr ILIKE '%autoclave%');

UPDATE blog_posts SET category = 'Radiologie'
WHERE category IS NULL
  AND (slug ILIKE '%radiologie%' OR slug ILIKE '%radio%'
       OR titre_fr ILIKE '%radiologie%' OR titre_fr ILIKE '%radio%');

UPDATE blog_posts SET category = 'Implantologie'
WHERE category IS NULL
  AND (slug ILIKE '%implant%' OR titre_fr ILIKE '%implant%');

UPDATE blog_posts SET category = 'Conseils pratiques'
WHERE category IS NULL;

-- =====================================================================
-- Assigner des tags de base
-- =====================================================================

UPDATE blog_posts
SET tags = ARRAY['matériel dentaire', 'Algérie', 'ODG']
WHERE tags IS NULL;

-- Tags spécifiques par catégorie
UPDATE blog_posts
SET tags = tags || ARRAY['fauteuil dentaire', 'Silver Fox']
WHERE category = 'Fauteuil dentaire';

UPDATE blog_posts
SET tags = tags || ARRAY['autoclave', 'ICANCLAVE', 'stérilisation']
WHERE category = 'Stérilisation';

UPDATE blog_posts
SET tags = tags || ARRAY['radiologie', 'OWANDY', 'imagerie dentaire']
WHERE category = 'Radiologie';

UPDATE blog_posts
SET tags = tags || ARRAY['implantologie', 'scanner intra-oral']
WHERE category = 'Implantologie';

-- =====================================================================
-- Vérification
-- =====================================================================
SELECT slug, titre_fr, category,
  (excerpt_fr IS NOT NULL) AS has_excerpt,
  (meta_description_fr IS NOT NULL) AS has_meta,
  (faq_fr IS NOT NULL) AS has_faq,
  (tags IS NOT NULL AND array_length(tags, 1) > 0) AS has_tags
FROM blog_posts
ORDER BY created_at DESC;
