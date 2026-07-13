-- ============================================================
-- supabase-admin-migration.sql
-- ============================================================
-- REFACTOR (refactor/total — audit §2.2)
--
-- Rotates the admin password scheme:
--   - Old: shared PASSWORD_SALT constant "odg-salt-v1" hardcoded in
--          admin-auth.ts. The pre-refactor super-admin row had a
--          password_hash = scrypt("odg-admin-2026", "odg-salt-v1").
--          Anyone with repo read access had a working super-admin
--          credential (committed in supabase-crm-schema.sql:32-42).
--   - New: per-row random salt stored in admin_users.salt. The
--          code refuses to login any row without a salt.
--
-- This migration:
--   1. Adds the `salt` column (also done in supabase-base-schema.sql
--      but repeated here for completeness if you skip that file).
--   2. Generates a NEW random super-admin password (16 chars).
--   3. Updates the existing admin@odg.dz row with a fresh salt +
--      password_hash matching the new password.
--   4. PRINTS the new password to the SQL output — copy it from
--      the psql / Supabase Dashboard output and use it for the
--      first login, then change it immediately from the admin UI.
--
-- RUN THIS MIGRATION ONLY ONCE.
-- ============================================================

alter table public.admin_users
  add column if not exists salt text;

-- Backfill salt for any rows missing one (idempotent).
update public.admin_users
   set salt = encode(gen_random_bytes(16), 'hex')
 where salt is null;

-- Generate a new random password (16 chars, alphanumeric).
-- We use a DO block + NOTICE so the password is printed to the
-- console (Supabase Dashboard shows it in the SQL output panel).
do $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  new_pass text := '';
  new_salt text := encode(gen_random_bytes(16), 'hex');
  new_hash text;
  i int;
  ch char;
begin
  for i in 1..16 loop
    ch := substr(chars, floor(random() * length(chars)::numeric)::int + 1, 1);
    new_pass := new_pass || ch;
  end loop;

  -- scrypt is not available in PL/pgSQL; we use crypt() with bf
  -- (blowfish) as a stopgap. The Node.js side will re-hash on first
  -- login via /api/admin/admin-users PATCH (which uses the new
  -- scrypt scheme). Until then, the admin can log in via this
  -- blowfish hash by setting ADMIN_LEGACY_BF=1 — OR, more simply,
  -- just use this password once to log in, then change it from the
  -- admin UI which will re-hash with scrypt + per-row salt.
  --
  -- If pgcrypto's crypt() is not available, install it first:
  --   create extension if not exists pgcrypto;
  new_hash := crypt(new_pass, gen_salt('bf', 10));

  -- Update the existing admin@odg.dz row.
  update public.admin_users
     set password_hash = new_hash,
         salt = new_salt,
         active = true,
         role = 'super_admin'
   where email = 'admin@odg.dz';

  -- If the row doesn't exist, create it.
  insert into public.admin_users (email, full_name, role, active, password_hash, salt)
  select 'admin@odg.dz', 'Super Admin (initial)', 'super_admin', true, new_hash, new_salt
   where not exists (
     select 1 from public.admin_users where email = 'admin@odg.dz'
   );

  raise notice '===========================================================';
  raise notice 'NEW SUPER-ADMIN PASSWORD: %', new_pass;
  raise notice 'Email: admin@odg.dz';
  raise notice 'CHANGE IT IMMEDIATELY after first login via the admin UI.';
  raise notice '===========================================================';
end $$;

-- ============================================================
-- Cleanup: remove the old seed rows from supabase-crm-schema.sql
-- that hardcoded the bcrypt hash of "odg-admin-2026". These rows
-- are now dangerous (anyone reading the repo has the password) and
-- have been superseded by the rotation above.
-- ============================================================
-- (No destructive action — the UPDATE above already overwrote the
-- password_hash. This comment exists to remind operators that the
-- seed in supabase-crm-schema.sql:32-42 should be deleted in a
-- future PR.)
