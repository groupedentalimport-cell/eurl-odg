-- ============================================================
-- supabase-realisations-testimonials.sql
-- Tables pour les réalisations (galerie de chantiers) et
-- les témoignages clients. Idempotent.
-- ============================================================

-- 1. realisations
CREATE TABLE IF NOT EXISTS public.realisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE public.realisations ADD COLUMN IF NOT EXISTS nom text;
ALTER TABLE public.realisations ADD COLUMN IF NOT EXISTS nom_ar text;
ALTER TABLE public.realisations ADD COLUMN IF NOT EXISTS wilaya text;
ALTER TABLE public.realisations ADD COLUMN IF NOT EXISTS description_fr text;
ALTER TABLE public.realisations ADD COLUMN IF NOT EXISTS description_ar text;
ALTER TABLE public.realisations ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.realisations ADD COLUMN IF NOT EXISTS produits jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.realisations ADD COLUMN IF NOT EXISTS client_nom text;
ALTER TABLE public.realisations ADD COLUMN IF NOT EXISTS date_projet date;
ALTER TABLE public.realisations ADD COLUMN IF NOT EXISTS actif boolean NOT NULL DEFAULT true;
ALTER TABLE public.realisations ADD COLUMN IF NOT EXISTS ordre int NOT NULL DEFAULT 0;
ALTER TABLE public.realisations ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.realisations ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DO $$ BEGIN ALTER TABLE public.realisations ALTER COLUMN nom SET NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS realisations_actif_idx ON public.realisations (actif);
CREATE INDEX IF NOT EXISTS realisations_ordre_idx ON public.realisations (ordre);
ALTER TABLE public.realisations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "realisations_select_anon" ON public.realisations;
CREATE POLICY "realisations_select_anon" ON public.realisations FOR SELECT TO anon, authenticated USING (actif = true);

-- 2. testimonials
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS nom text;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS etablissement text;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS wilaya text;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS note int NOT NULL DEFAULT 5;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS texte_fr text;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS texte_ar text;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS actif boolean NOT NULL DEFAULT true;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS ordre int NOT NULL DEFAULT 0;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DO $$ BEGIN ALTER TABLE public.testimonials ALTER COLUMN nom SET NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.testimonials ADD CONSTRAINT testimonials_note_check CHECK (note >= 1 AND note <= 5); EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS testimonials_actif_idx ON public.testimonials (actif);
CREATE INDEX IF NOT EXISTS testimonials_ordre_idx ON public.testimonials (ordre);
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "testimonials_select_anon" ON public.testimonials;
CREATE POLICY "testimonials_select_anon" ON public.testimonials FOR SELECT TO anon, authenticated USING (actif = true);

-- 3. Triggers
DO $$ BEGIN DROP TRIGGER IF EXISTS trg_realisations_touch ON public.realisations;
  CREATE TRIGGER trg_realisations_touch BEFORE UPDATE ON public.realisations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP TRIGGER IF EXISTS trg_testimonials_touch ON public.testimonials;
  CREATE TRIGGER trg_testimonials_touch BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. Seed testimonials
INSERT INTO public.testimonials (nom, etablissement, wilaya, note, texte_fr, texte_ar, actif, ordre) VALUES
  ('Dr. Amine B.', 'Cabinet dentaire', 'Oran', 5, 'Excellent service ! L''installation du fauteuil Silver Fox s''est faite en une journée.', 'خدمة ممتازة! تم تركيب كرسي Silver Fox في يوم واحد.', true, 1),
  ('Dr. Fatima Z.', 'Clinique dentaire', 'Alger', 5, 'L''autoclave ICANCLAVE fonctionne parfaitement. Le SAV est réactif.', 'جهاز التعقيم ICANCLAVE يعمل بشكل ممتاز. خدمة ما بعد البيع سريعة.', true, 2),
  ('Dr. Karim M.', 'Centre dentaire', 'Constantine', 4, 'Très satisfait du matériel OWANDY. La formation a été complète.', 'راضٍ جداً عن معدات OWANDY. كان التدريب شاملاً.', true, 3),
  ('Dr. Sarah L.', 'Cabinet dentaire', 'Annaba', 5, 'Je recommande ODG pour la qualité de leur matériel et leur accompagnement.', 'أنصح بـ ODG لجودة معداتهم ومرافقتهم.', true, 4),
  ('Dr. Youcef K.', 'Clinique', 'Tlemcen', 5, 'Service après-vente exceptionnel. L''équipe est toujours disponible.', 'خدمة ما بعد البيع استثنائية. الفريق متاح دائماً.', true, 5)
ON CONFLICT DO NOTHING;
