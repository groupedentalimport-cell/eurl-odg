-- ============================================
-- EURL ODG — Migration admin_users vers le schéma CRM
-- Adapte la table admin_users existante (ancien site) au nouveau schéma
-- attendu par le code CRM multi-rôles.
--
-- À exécuter dans Supabase Dashboard → SQL Editor → Run.
-- Idempotent — sûr à relancer.
-- ============================================

-- ============================================
-- 1. Renommer les colonnes pour matcher le code CRM
-- ============================================

-- nom → full_name
DO $$ BEGIN
  ALTER TABLE admin_users RENAME COLUMN nom TO full_name;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- actif → active
DO $$ BEGIN
  ALTER TABLE admin_users RENAME COLUMN actif TO active;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 2. Remplacer la contrainte CHECK sur role
-- (l'ancienne n'acceptait que 'superadmin' sans underscore)
-- ============================================

DO $$
DECLARE
  con_name text;
BEGIN
  -- Trouve et supprime l'ancienne contrainte CHECK sur la colonne role
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'admin_users'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%';
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS %I', con_name);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Ajoute la nouvelle contrainte avec les 6 rôles CRM (avec underscores)
DO $$ BEGIN
  ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
    CHECK (role IN ('super_admin','manager','commercial','technician','editor','accountant'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 3. Mettre à jour les valeurs de role existantes
-- ============================================

UPDATE admin_users SET role = 'super_admin' WHERE role = 'superadmin';
UPDATE admin_users SET role = 'manager' WHERE role = 'admin';
UPDATE admin_users SET role = 'editor' WHERE role = 'editeur';

-- ============================================
-- 4. Mettre à jour le hash du mot de passe du Super Admin
-- (l'ancien hash était en SHA-512, le nouveau utilise scrypt)
-- Mot de passe: odg-admin-2026
-- ============================================

UPDATE admin_users
SET password_hash = '35aac822eabc2911d596a6bc2f9926a2e1ed4ff0990fccb61a26b9fdf5675fc2a57718ae3cff408d15f7d6a2b5c9481ba8c0f9ef65987fe3973b08679355186e'
WHERE email = 'admin@odg.dz';

-- ============================================
-- 5. S'assurer que le compte Super Admin existe
-- ============================================
DO $$ BEGIN
  INSERT INTO admin_users (email, password_hash, full_name, role, active)
  VALUES (
    'admin@odg.dz',
    '35aac822eabc2911d596a6bc2f9926a2e1ed4ff0990fccb61a26b9fdf5675fc2a57718ae3cff408d15f7d6a2b5c9481ba8c0f9ef65987fe3973b08679355186e',
    'Super Admin ODG',
    'super_admin',
    true
  )
  ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = 'super_admin',
    active = true;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- DONE
-- ============================================
