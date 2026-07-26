-- ============================================================
-- supabase-cleanup-products.sql
-- ============================================================
-- Nettoyage de la table products :
--   1. Supprime la colonne morte `categorie_id` (doublon de `category_id`)
--   2. Ajoute `category_slug` (manquant mais lu par le code)
--   3. Remplit `category_slug` via jointure avec `categories`
--   4. Ajoute un trigger pour maintenir `category_slug` à jour
--
-- Idempotent : sûr à relancer.
-- ============================================================

-- 1. Supprimer la colonne morte categorie_id (et sa FK)
DO $$ BEGIN
  ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_categorie_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.products DROP COLUMN IF EXISTS categorie_id;
  RAISE NOTICE 'Dropped column categorie_id';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped dropping categorie_id: %', SQLERRM;
END $$;

-- 2. Supprimer l'index orphelin sur categorie_id
DROP INDEX IF EXISTS public.products_categorie_id_idx;

-- 3. Ajouter category_slug si absent
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_slug text;

-- 4. Remplir category_slug depuis la table categories
UPDATE public.products p
   SET category_slug = c.slug
  FROM public.categories c
 WHERE p.category_id = c.id
   AND (p.category_slug IS NULL OR p.category_slug = '');

-- 5. Index sur category_slug
CREATE INDEX IF NOT EXISTS products_category_slug_idx ON public.products (category_slug);

-- 6. Trigger pour maintenir category_slug synchronisé
CREATE OR REPLACE FUNCTION public.sync_product_category_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    SELECT slug INTO NEW.category_slug
      FROM public.categories
     WHERE id = NEW.category_id;
  ELSE
    NEW.category_slug := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_product_category_slug ON public.products;
CREATE TRIGGER trg_sync_product_category_slug
  BEFORE INSERT OR UPDATE OF category_id ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_category_slug();

-- 7. Vérification
DO $$
DECLARE
  n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.products WHERE category_slug IS NOT NULL AND category_slug != '';
  RAISE NOTICE '===========================================================';
  RAISE NOTICE 'supabase-cleanup-products.sql — APPLY SUCCESS';
  RAISE NOTICE '  products with category_slug: %', n;
  RAISE NOTICE '===========================================================';
END $$;
