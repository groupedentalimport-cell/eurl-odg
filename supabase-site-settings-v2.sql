-- ============================================================
-- supabase-site-settings-v2.sql
-- ============================================================
-- REFACTOR (refactor/total — audit §10.1)
--
-- The original supabase-site-settings.sql shipped a 3-column schema:
--   site_settings (key text PK, value jsonb, updated_at)
--
-- But the code (lib/settings-service.tsx, api/admin/settings/route.ts,
-- lib/chat-company.ts) reads/writes 7 columns:
--   key, value_fr, value_ar, value_json, category, label, type
--
-- This migration ALTERs the existing table to add the missing columns
-- and migrates any rows from the old `value jsonb` into either
-- `value_fr` (for scalar values) or `value_json` (for arrays/objects).
--
-- Idempotent: safe to run multiple times.
-- ============================================================

-- 1. Add the missing columns
alter table public.site_settings
  add column if not exists value_fr   text,
  add column if not exists value_ar   text,
  add column if not exists value_json jsonb,
  add column if not exists category   text default 'general',
  add column if not exists label      text,
  add column if not exists type       text default 'text';

-- 2. Migrate old `value` → `value_fr` (or `value_json` for arrays/objects)
do $$
begin
  -- For rows where value_fr is null but value (jsonb) is set:
  -- if the jsonb is a string, copy to value_fr; otherwise copy to value_json.
  update public.site_settings
     set value_fr = value::text
   where value_fr is null
     and value is not null
     and jsonb_typeof(value) = 'string';

  update public.site_settings
     set value_json = value
   where value_json is null
     and value is not null
     and jsonb_typeof(value) in ('array','object');

  -- For numeric/boolean values, stringify into value_fr.
  update public.site_settings
     set value_fr = value::text
   where value_fr is null
     and value is not null
     and jsonb_typeof(value) in ('number','boolean');
end $$;

-- 3. Drop the old `value` column (optional but recommended — it's
--    now redundant and confusing for direct SQL users). Comment out
--    if you want to keep it for backward compat.
alter table public.site_settings
  drop column if exists value;

-- 4. Index the `category` column (admin settings panel groups by it).
create index if not exists site_settings_category_idx
  on public.site_settings (category);

-- 5. Update RLS: anon can read public settings only (categories:
--    contact, social, hero, about, home, footer). Authenticated
--    (service role bypasses RLS) can read everything.
drop policy if exists "site_settings_select_anon" on public.site_settings;
create policy "site_settings_select_anon" on public.site_settings
  for select to anon, authenticated using (
    category in ('contact','social','hero','about','home','footer','general')
  );

-- 6. Re-seed default categories for any existing rows missing one.
update public.site_settings
   set category = 'general'
 where category is null;
