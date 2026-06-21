-- ============================================
-- EURL ODG — site_settings table (idempotent)
-- Run in Supabase Dashboard → SQL Editor
-- Stores editable site content (home, about, company, stats)
-- ============================================

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
DO $$ BEGIN
  ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Public read (the site needs to load settings for all visitors)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Lecture publique site_settings" ON site_settings;
  CREATE POLICY "Lecture publique site_settings"
    ON site_settings FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Lecture publique site_settings auth" ON site_settings;
  CREATE POLICY "Lecture publique site_settings auth"
    ON site_settings FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- NOTE: writes are done via the service role key (server-side API routes),
-- which bypasses RLS. No INSERT/UPDATE/DELETE policy needed for anon.

CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings (key);

-- Seed default settings (only if table is empty)
INSERT INTO site_settings (key, value) VALUES
  ('company', '{"name":"OUADAH DENTAL GROUPE","nameAr":"مجموعة وادح لطب الأسنان","phone":"+213 540 00 00 00","phone2":"+213 41 00 00 00","email":"contact@odg-dz.com","address_fr":"Cité 1000 Logements, Bt 4, Oran","address_ar":"حي 1000 سكن، عمارة 4، وهران","city":"Oran","country":"Algérie","hours_fr":"Dim–Jeu : 8h00–17h00","hours_ar":"الأحد–الخميس: 8:00–17:00","facebook":"","instagram":"","linkedin":""}'),
  ('home', '{"heroTitle_fr":"Votre partenaire en matériel dentaire","heroTitle_ar":"شريكك في معدات طب الأسنان","heroSubtitle_fr":"Importateur exclusif de Silver Fox, ICANCLAVE et OWANDY en Algérie.","heroSubtitle_ar":"المستورد الحصري لـ Silver Fox وICANCLAVE وOWANDY في الجزائر.","ctaTitle_fr":"Un projet d équipement ?","ctaTitle_ar":"مشروع تجهيز؟","ctaSubtitle_fr":"Nos experts vous accompagnent de A à Z.","ctaSubtitle_ar":"خبراؤنا يرافقونك من الألف إلى الياء."}'),
  ('about', '{"story_fr":"EURL OUADAH DENTAL GROUPE est un importateur spécialisé en matériel dentaire, basé à Oran. Depuis plus de 15 ans, nous équipons les cabinets dentaires, cliniques et hôpitaux d Algérie avec du matériel de qualité internationale.","story_ar":"مجموعة وادح لطب الأسنان هي شركة متخصصة في استيراد معدات طب الأسنان، مقرها وهران. منذ أكثر من 15 سنة، نجهز عيادات وأ clíniques ومستشفيات الجزائر بمعدات ذات جودة دولية."}'),
  ('stats', '[{"value":"15+","fr":"Années d expérience","ar":"سنوات الخبرة"},{"value":"500+","fr":"Clients satisfaits","ar":"عميل راضٍ"},{"value":"9","fr":"Produits référencés","ar":"منتج معتمد"},{"value":"5","fr":"Catégories","ar":"فئات"}]')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- DONE
-- ============================================
