-- ============================================
-- EURL ODG — Migration admin_users vers le schéma CRM (v2 corrigée)
-- Adapte la table admin_users existante au nouveau schéma CRM.
--
-- IMPORTANT: l'ordre des étapes compte — on met à jour les valeurs
-- de role AVANT d'ajouter la nouvelle contrainte CHECK.
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
-- 2. Supprimer l'ancienne contrainte CHECK sur role
-- (l'ancienne n'acceptait que 'superadmin' sans underscore)
-- ============================================

DO $$
DECLARE
  con_name text;
  con_rec record;
BEGIN
  -- Trouve et supprime TOUTES les contraintes CHECK sur la colonne role
  FOR con_rec IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'admin_users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS %I', con_rec.conname);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 3. Mettre à jour les valeurs de role AVANT la contrainte
-- (toute valeur non reconnue → 'editor' par défaut)
-- ============================================

UPDATE admin_users SET role = 'super_admin' WHERE role = 'superadmin';
UPDATE admin_users SET role = 'super_admin' WHERE role = 'admin';
UPDATE admin_users SET role = 'manager'   WHERE role = 'manager';
UPDATE admin_users SET role = 'commercial' WHERE role = 'commercial';
UPDATE admin_users SET role = 'technician' WHERE role = 'technician';
UPDATE admin_users SET role = 'editor'    WHERE role = 'editeur';
UPDATE admin_users SET role = 'editor'    WHERE role = 'editor';
UPDATE admin_users SET role = 'accountant' WHERE role = 'accountant';

-- Toute valeur restante qui n'est pas dans les 6 rôles → 'editor'
UPDATE admin_users
SET role = 'editor'
WHERE role NOT IN ('super_admin','manager','commercial','technician','editor','accountant');

-- ============================================
-- 4. Ajouter la nouvelle contrainte CHECK
-- (maintenant que toutes les valeurs sont valides)
-- ============================================

DO $$ BEGIN
  ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
    CHECK (role IN ('super_admin','manager','commercial','technician','editor','accountant'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 5. Mettre à jour le hash du mot de passe du Super Admin
-- (l'ancien hash était en SHA-512, le nouveau utilise scrypt)
-- Mot de passe: odg-admin-2026
-- ============================================

UPDATE admin_users
SET password_hash = '35aac822eabc2911d596a6bc2f9926a2e1ed4ff0990fccb61a26b9fdf5675fc2a57718ae3cff408d15f7d6a2b5c9481ba8c0f9ef65987fe3973b08679355186e'
WHERE email = 'admin@odg.dz';

-- ============================================
-- 6. S'assurer que le compte Super Admin existe
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
