-- ============================================
-- EURL ODG — CRM multi-rôles
-- Schéma complet: admin_users + clients + devis + commandes +
-- interventions + techniciens + garanties + maintenances
-- Idempotent — sûr à relancer
-- ============================================

-- ============================================
-- 1. admin_users (comptes admin avec rôles)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'editor'
    CHECK (role IN ('super_admin','manager','commercial','technician','editor','accountant')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
DO $$ BEGIN ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_users read authenticated" ON admin_users;
  CREATE POLICY "admin_users read authenticated" ON admin_users FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- NOTE: writes via service role only (bypasses RLS).

-- Seed le compte Super Admin par défaut.
-- Mot de passe: odg-admin-2026 (hash scrypt ci-dessous).
-- Le hash est calculé avec: scryptSync(password, salt, 64).toString('hex')
-- salt = "odg-salt-v1" (fixe). Pour rotation, changer le salt + re-hash.
DO $$ BEGIN
  INSERT INTO admin_users (email, password_hash, full_name, role)
  VALUES (
    'admin@odg.dz',
    -- scrypt hash of 'odg-admin-2026' with salt 'odg-salt-v1', N=16384, r=8, p=1, keylen=64
    '35aac822eabc2911d596a6bc2f9926a2e1ed4ff0990fccb61a26b9fdf5675fc2a57718ae3cff408d15f7d6a2b5c9481ba8c0f9ef65987fe3973b08679355186e',
    'Super Admin ODG',
    'super_admin'
  )
  ON CONFLICT (email) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================
-- 2. clients (annuaire, multi-tenant via commercial_id)
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  type_client text DEFAULT 'dentiste'
    CHECK (type_client IN ('dentiste','clinique','hopital','revendeur','autre')),
  email text,
  telephone text,
  adresse text,
  wilaya text,
  contact_personne text,
  notes text,
  commercial_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
DO $$ BEGIN ALTER TABLE clients ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "clients read authenticated" ON clients;
  CREATE POLICY "clients read authenticated" ON clients FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_clients_commercial ON clients (commercial_id);
CREATE INDEX IF NOT EXISTS idx_clients_nom ON clients (nom);

-- ============================================
-- 3. devis (devis structurés avec lignes jsonb)
-- ============================================
CREATE TABLE IF NOT EXISTS devis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_snapshot jsonb,
  lignes jsonb NOT NULL DEFAULT '[]',
  sous_total numeric(12,2) DEFAULT 0,
  remise_total numeric(12,2) DEFAULT 0,
  tva_taux numeric(5,2) DEFAULT 19.00,
  tva_montant numeric(12,2) DEFAULT 0,
  montant_total numeric(12,2) DEFAULT 0,
  statut text DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon','envoye','accepte','refuse','expire')),
  date_emission date,
  date_validite date,
  notes text,
  commercial_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  converted_to_commande_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
DO $$ BEGIN ALTER TABLE devis ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "devis read authenticated" ON devis;
  CREATE POLICY "devis read authenticated" ON devis FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_devis_client ON devis (client_id);
CREATE INDEX IF NOT EXISTS idx_devis_commercial ON devis (commercial_id);
CREATE INDEX IF NOT EXISTS idx_devis_statut ON devis (statut);

-- ============================================
-- 4. commandes (devis acceptés convertis)
-- ============================================
CREATE TABLE IF NOT EXISTS commandes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  devis_id uuid REFERENCES devis(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  statut text DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente','en_preparation','livree','annulee')),
  date_commande date DEFAULT CURRENT_DATE,
  date_livraison_prevue date,
  date_livraison_reelle date,
  notes text,
  commercial_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
DO $$ BEGIN ALTER TABLE commandes ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "commandes read authenticated" ON commandes;
  CREATE POLICY "commandes read authenticated" ON commandes FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_commandes_client ON commandes (client_id);
CREATE INDEX IF NOT EXISTS idx_commandes_statut ON commandes (statut);

-- ============================================
-- 5. techniciens (équipe technique ODG)
-- ============================================
CREATE TABLE IF NOT EXISTS techniciens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  telephone text,
  email text,
  specialites jsonb DEFAULT '[]',
  zones_couvertes jsonb DEFAULT '[]',
  actif boolean DEFAULT true,
  user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
DO $$ BEGIN ALTER TABLE techniciens ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "techniciens read authenticated" ON techniciens;
  CREATE POLICY "techniciens read authenticated" ON techniciens FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- 6. interventions (livraison/installation/formation/maintenance)
-- ============================================
CREATE TABLE IF NOT EXISTS interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL
    CHECK (type IN ('livraison','installation','formation','maintenance_preventive','maintenance_curative')),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  commande_id uuid REFERENCES commandes(id) ON DELETE SET NULL,
  produit_id uuid,
  produit_nom text,
  technicien_id uuid REFERENCES techniciens(id) ON DELETE SET NULL,
  date_prevue timestamptz,
  duree_estimee_min integer DEFAULT 60,
  date_realisee timestamptz,
  adresse_intervention text,
  statut text DEFAULT 'planifie'
    CHECK (statut IN ('planifie','en_cours','termine','annule')),
  rapport text,
  notes text,
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
DO $$ BEGIN ALTER TABLE interventions ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "interventions read authenticated" ON interventions;
  CREATE POLICY "interventions read authenticated" ON interventions FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_interventions_date ON interventions (date_prevue);
CREATE INDEX IF NOT EXISTS idx_interventions_technicien ON interventions (technicien_id);
CREATE INDEX IF NOT EXISTS idx_interventions_statut ON interventions (statut);

-- ============================================
-- 7. garanties (auto-créées à la livraison)
-- ============================================
CREATE TABLE IF NOT EXISTS garanties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  commande_id uuid REFERENCES commandes(id) ON DELETE SET NULL,
  produit_id uuid,
  produit_nom text,
  date_debut date DEFAULT CURRENT_DATE,
  date_fin date,
  duree_mois integer DEFAULT 24,
  conditions text,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
DO $$ BEGIN ALTER TABLE garanties ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "garanties read authenticated" ON garanties;
  CREATE POLICY "garanties read authenticated" ON garanties FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_garanties_client ON garanties (client_id);
CREATE INDEX IF NOT EXISTS idx_garanties_date_fin ON garanties (date_fin);

-- ============================================
-- 8. maintenances (préventive + curative, liées aux garanties)
-- ============================================
CREATE TABLE IF NOT EXISTS maintenances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garantie_id uuid REFERENCES garanties(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  type text NOT NULL
    CHECK (type IN ('preventive','curative')),
  date_prevue date,
  date_realisee date,
  intervention_id uuid REFERENCES interventions(id) ON DELETE SET NULL,
  description text,
  rapport text,
  statut text DEFAULT 'planifie'
    CHECK (statut IN ('planifie','en_cours','termine','annule','en_retard')),
  technicien_id uuid REFERENCES techniciens(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
DO $$ BEGIN ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "maintenances read authenticated" ON maintenances;
  CREATE POLICY "maintenances read authenticated" ON maintenances FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_maintenances_garantie ON maintenances (garantie_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_date ON maintenances (date_prevue);

-- ============================================
-- DONE — 8 tables créées de façon idempotente
-- ============================================
