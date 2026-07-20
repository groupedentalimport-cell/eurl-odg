-- ============================================================
-- supabase-rehash-admins.sql  (PERSONNALISÉ — pour votre projet)
-- ============================================================
-- Re-hash des 6 comptes admin existants en bcrypt avec un salt
-- intégré au hash (format $2a$10$...). Le code admin-auth.ts
-- (après refonte) supporte les deux formats via verifyPassword().
--
-- ⚠️ AVANT D'EXÉCUTER:
--   1. Remplacez les 6 mots de passe en clair ci-dessous par les
--      VRAIS mots de passe de vos comptes admin (tels que vous les
--      connaissez actuellement).
--   2. Exécutez ce script dans le SQL Editor Supabase.
--   3. Vérifiez le récapitulatif final (chaque compte doit avoir
--      a_bcrypt_hash = true).
--   4. Déployez la branche refactor/total sur Vercel.
--   5. Testez la connexion avec chaque compte — les mots de passe
--      actuels DOIVENT fonctionner.
--
-- NOTES:
--   - Ce script utilise pgcrypto (déjà installé par supabase-base-schema.sql)
--   - bcrypt via crypt(password, gen_salt('bf', 10)) — cost factor 10
--   - Le salt de la colonne `salt` n'est PAS utilisé pour bcrypt
--     (le salt est intégré dans le hash bcrypt). La colonne reste
--     pour les futurs comptes créés via l'UI admin (qui utilisent
--     scrypt + per-row salt).
--   - Idempotent: peut être re-exécuté si un mot de passe a été
--     mal saisi (remplace le hash à chaque exécution).
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- ⚠️ REMPLACEZ CES MOTS DE PASSE PAR LES VRAIS (en clair)
-- ============================================================
-- Astuce: utilisez des chaînes PostgreSQL escape ('' pour un seul ').
-- Si un mot de passe contient un caractère spécial ($, \, etc.),
-- utilisez la syntaxe dollar-quote $$mot_de_passe$$ à la place.
-- ============================================================

UPDATE admin_users
   SET password_hash = crypt('VOTRE_PASSWORD_ADMIN_2026', gen_salt('bf', 10))
 WHERE email = 'admin@odg.dz';

UPDATE admin_users
   SET password_hash = crypt('VOTRE_PASSWORD_COMMERCIAL', gen_salt('bf', 10))
 WHERE email = 'commercial@odg.dz';

UPDATE admin_users
   SET password_hash = crypt('VOTRE_PASSWORD_MANAGER', gen_salt('bf', 10))
 WHERE email = 'manager@odg.dz';

UPDATE admin_users
   SET password_hash = crypt('VOTRE_PASSWORD_TECHNICIEN', gen_salt('bf', 10))
 WHERE email = 'technicien@odg.dz';

UPDATE admin_users
   SET password_hash = crypt('VOTRE_PASSWORD_EDITEUR', gen_salt('bf', 10))
 WHERE email = 'editeur@odg.dz';

UPDATE admin_users
   SET password_hash = crypt('VOTRE_PASSWORD_COMPTABLE', gen_salt('bf', 10))
 WHERE email = 'comptable@odg.dz';

-- ============================================================
-- Vérification finale
-- ============================================================
SELECT
  email,
  full_name,
  role,
  active,
  (password_hash LIKE '$2a$10$%') AS a_bcrypt_hash,
  (salt IS NOT NULL) AS a_salt,
  length(password_hash) AS hash_length,
  updated_at
FROM admin_users
ORDER BY email;

-- ============================================================
-- Récapitulatif
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '===========================================================';
  RAISE NOTICE 'supabase-rehash-admins.sql — APPLY SUCCESS';
  RAISE NOTICE '===========================================================';
  RAISE NOTICE 'Les 6 comptes admin ont été re-hashés en bcrypt.';
  RAISE NOTICE 'Vous pouvez maintenant déployer la branche refactor/total.';
  RAISE NOTICE '===========================================================';
END $$;
