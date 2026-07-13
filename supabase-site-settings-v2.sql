-- ============================================================
-- supabase-site-settings-v2.sql  (v2 — defensive)
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
-- ⚠️ v2 FIX: this version is fully idempotent and defensive.
--   - All ADD COLUMN use IF NOT EXISTS
--   - The data migration from the legacy `value` jsonb column is
--     wrapped in a DO block that first checks if `value` exists,
--     so the script succeeds whether the table is in the old
--     3-column state, the new 7-column state, or any intermediate.
--   - The DROP COLUMN `value` is skipped if the column doesn't exist
--
-- Idempotent: safe to run multiple times.
-- ============================================================

-- 1. Add the missing columns (all idempotent)
alter table public.site_settings
  add column if not exists value_fr   text,
  add column if not exists value_ar   text,
  add column if not exists value_json jsonb,
  add column if not exists category   text default 'general',
  add column if not exists label      text,
  add column if not exists type       text default 'text';

-- 2. Migrate old `value` (jsonb) → `value_fr` / `value_json`
--    SKIPPED if the `value` column doesn't exist (already migrated)
do $$
declare
  has_value_col boolean;
begin
  select exists(
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name = 'value'
  ) into has_value_col;

  if not has_value_col then
    raise notice 'Skipping data migration: column "value" does not exist (already migrated or never existed).';
    return;
  end if;

  -- For rows where value_fr is null but value (jsonb) is set:
  -- if the jsonb is a string, copy to value_fr; otherwise copy to value_json.
  execute 'update public.site_settings
             set value_fr = value::text
           where value_fr is null
             and value is not null
             and jsonb_typeof(value) = ''string''';

  execute 'update public.site_settings
             set value_json = value
           where value_json is null
             and value is not null
             and jsonb_typeof(value) in (''array'',''object'')';

  -- For numeric/boolean values, stringify into value_fr.
  execute 'update public.site_settings
             set value_fr = value::text
           where value_fr is null
             and value is not null
             and jsonb_typeof(value) in (''number'',''boolean'')';

  raise notice 'Data migration from "value" column completed.';
end $$;

-- 3. Drop the old `value` column (only if it still exists).
--    Wrapped in DO block because `drop column if not exists` is not
--    a Postgres syntax — we have to check information_schema.
do $$
declare
  has_value_col boolean;
begin
  select exists(
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name = 'value'
  ) into has_value_col;

  if has_value_col then
    alter table public.site_settings drop column value;
    raise notice 'Dropped legacy column "value".';
  else
    raise notice 'Legacy column "value" already absent — skipping drop.';
  end if;
end $$;

-- 4. Index the `category` column (admin settings panel groups by it).
create index if not exists site_settings_category_idx
  on public.site_settings (category);

-- 5. Update RLS: anon can read public settings only (categories:
--    contact, social, hero, about, home, footer, general). Authenticated
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

-- 7. Final verification — show the resulting schema
do $$
begin
  raise notice '===========================================================';
  raise notice 'supabase-site-settings-v2.sql — APPLY SUCCESS';
  raise notice '===========================================================';
  raise notice 'Columns of public.site_settings:';
end $$;

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'site_settings'
order by ordinal_position;
