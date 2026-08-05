-- =====================================================================
-- Migration CORRIGÉE : enrichir la table blog_posts avec champs SEO/IA
-- Projet : OUADAH DENTAL GROUPE
-- Date : 2026-07-29
--
-- CONTEXTE :
-- La première migration (supabase-blog-posts-enriched.sql) a partiellement
-- échoué parce que la colonne `tags` existait déjà en JSONB (pas TEXT[]).
-- L'instruction `ADD COLUMN IF NOT EXISTS tags TEXT[]` a été ignorée
-- (la colonne existait déjà), mais ensuite `UPDATE ... SET tags = ARRAY[...]`
-- a échoué parce que la colonne est JSONB, pas TEXT[].
--
-- ÉTAT ACTUEL (vérifié via API) :
--   ✓ excerpt_fr       : existe (NULL)
--   ✓ excerpt_ar       : existe (NULL)
--   ✓ tags             : existe en JSONB (vide [])
--   ✗ meta_description_fr : N'EXISTE PAS
--   ✗ meta_description_ar : N'EXISTE PAS
--   ✗ faq_fr             : N'EXISTE PAS
--   ✗ faq_ar             : N'EXISTE PAS
--   ✗ category           : N'EXISTE PAS
--
-- Cette migration corrige le problème en :
--   1. Ajoutant les 5 colonnes manquantes (avec IF NOT EXISTS).
--   2. Utilisant du JSONB pour `tags` (compatible avec la colonne existante).
--   3. Pré-remplissant excerpt_fr, meta_description_fr et category pour
--      les articles existants.
-- =====================================================================

-- Étape 1 : Ajouter les colonnes manquantes (toutes nullable)
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS meta_description_fr TEXT,
  ADD COLUMN IF NOT EXISTS meta_description_ar TEXT,
  ADD COLUMN IF NOT EXISTS faq_fr JSONB,
  ADD COLUMN IF NOT EXISTS faq_ar JSONB,
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Étape 2 : Commentaires pour faciliter l'admin
COMMENT ON COLUMN blog_posts.excerpt_fr IS 'Résumé court (TL;DR) affiché en haut de l''article dans le bloc "En bref". Si vide, auto-extrait du contenu (200 premiers chars sans HTML).';
COMMENT ON COLUMN blog_posts.meta_description_fr IS 'Meta description pour Google (< 155 chars). Si vide, fallback sur excerpt_fr ou description générique.';
COMMENT ON COLUMN blog_posts.faq_fr IS 'JSON array de {q: string, a: string}. Génère le schema FAQPage JSON-LD. Si vide, fallback auto-extrait des <h2>question ?</h2> du contenu.';
COMMENT ON COLUMN blog_posts.category IS 'Catégorie de l''article : Fauteuil dentaire, Stérilisation, Radiologie, Implantologie, Maintenance, etc.';
COMMENT ON COLUMN blog_posts.tags IS 'JSON array de mots-clés pour SEO et filtrage. Ex: ["fauteuil dentaire", "Silver Fox", "choix", "guide"].';

-- Étape 3 : Pré-remplir excerpt_fr pour les articles existants
-- (extrait les 200 premiers caractères du contenu sans HTML)
UPDATE blog_posts
SET excerpt_fr = LEFT(
  REGEXP_REPLACE(contenu_fr, '<[^>]+>', ' ', 'g'),
  200
)
WHERE excerpt_fr IS NULL
  AND contenu_fr IS NOT NULL
  AND LENGTH(contenu_fr) > 0;

UPDATE blog_posts
SET excerpt_ar = LEFT(
  REGEXP_REPLACE(contenu_ar, '<[^>]+>', ' ', 'g'),
  200
)
WHERE excerpt_ar IS NULL
  AND contenu_ar IS NOT NULL
  AND LENGTH(contenu_ar) > 0;

-- Étape 4 : Pré-remplir meta_description_fr (155 premiers caractères du contenu)
UPDATE blog_posts
SET meta_description_fr = LEFT(
  REGEXP_REPLACE(contenu_fr, '<[^>]+>', ' ', 'g'),
  155
)
WHERE meta_description_fr IS NULL
  AND contenu_fr IS NOT NULL
  AND LENGTH(contenu_fr) > 0;

UPDATE blog_posts
SET meta_description_ar = LEFT(
  REGEXP_REPLACE(contenu_ar, '<[^>]+>', ' ', 'g'),
  155
)
WHERE meta_description_ar IS NULL
  AND contenu_ar IS NOT NULL
  AND LENGTH(contenu_ar) > 0;

-- Étape 5 : Assigner des catégories aux articles existants basées sur le slug/titre
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

-- Étape 6 : Pré-remplir tags (JSONB — pas TEXT[])
-- IMPORTANT : tags est en JSONB, donc on utilise to_jsonb() sur un array text.
UPDATE blog_posts
SET tags = to_jsonb(ARRAY['matériel dentaire', 'Algérie', 'ODG'])
WHERE tags IS NULL
   OR tags = '[]'::jsonb;

-- Tags spécifiques par catégorie (on concatène en JSONB)
UPDATE blog_posts
SET tags = tags || to_jsonb(ARRAY['fauteuil dentaire', 'Silver Fox'])
WHERE category = 'Fauteuil dentaire'
  AND NOT tags @> '["fauteuil dentaire"]'::jsonb;

UPDATE blog_posts
SET tags = tags || to_jsonb(ARRAY['autoclave', 'ICANCLAVE', 'stérilisation'])
WHERE category = 'Stérilisation'
  AND NOT tags @> '["autoclave"]'::jsonb;

UPDATE blog_posts
SET tags = tags || to_jsonb(ARRAY['radiologie', 'OWANDY', 'imagerie dentaire'])
WHERE category = 'Radiologie'
  AND NOT tags @> '["radiologie"]'::jsonb;

UPDATE blog_posts
SET tags = tags || to_jsonb(ARRAY['implantologie', 'scanner intra-oral'])
WHERE category = 'Implantologie'
  AND NOT tags @> '["implantologie"]'::jsonb;

-- =====================================================================
-- Vérification finale
-- =====================================================================
SELECT slug, titre_fr, category,
  (excerpt_fr IS NOT NULL) AS has_excerpt,
  (meta_description_fr IS NOT NULL) AS has_meta,
  (faq_fr IS NOT NULL) AS has_faq,
  (tags IS NOT NULL AND jsonb_array_length(tags) > 0) AS has_tags
FROM blog_posts
ORDER BY created_at DESC;
