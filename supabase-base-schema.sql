-- ============================================================
-- supabase-base-schema.sql  (v2 — idempotent & defensive)
-- ============================================================
-- REFACTOR (refactor/total — audit §10.2)
-- Creates the 7 tables referenced by the code but missing from the
-- repo: messages, quotes, products, categories, blog_posts,
-- newsletter_subscribers, email_log.
--
-- ⚠️ v2 FIX: this version uses `CREATE TABLE IF NOT EXISTS` followed
-- by `ALTER TABLE ADD COLUMN IF NOT EXISTS` for EVERY column. This
-- handles the case where the table pre-exists (created manually via
-- the Supabase Dashboard) with a different / partial column set —
-- the ALTER will fill in the missing columns instead of being
-- silently skipped and then crashing on the index creation.
--
-- Idempotent: safe to run multiple times.
--
-- Run order on a fresh database:
--   1. supabase-base-schema.sql       (this file)
--   2. supabase-crm-schema.sql        (existing — clients, devis, etc.)
--   3. supabase-site-settings-v2.sql  (fixes the settings table)
--   4. supabase-live-chat.sql         (existing)
--   5. supabase-indexes.sql           (additional indexes)
--   6. supabase-admin-migration.sql   (add salt column + reset password)
-- ============================================================

-- Required for gen_random_uuid() and crypt()
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. messages  (contact form submissions)
-- ============================================================
-- Field names match the existing production code (English short names
-- `name`, `email`, `phone`, `subject`, `body`, `read` — see
-- /api/contact/route.ts and admin/panels/MessagesPanel.tsx).
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid()
);

-- Ensure all columns exist (whether the table was just created or pre-existed)
alter table public.messages add column if not exists name         text;
alter table public.messages add column if not exists email        text;
alter table public.messages add column if not exists phone        text;
alter table public.messages add column if not exists subject      text;
alter table public.messages add column if not exists body         text;
alter table public.messages add column if not exists "read"       boolean not null default false;
alter table public.messages add column if not exists statut       text not null default 'nouveau';
alter table public.messages add column if not exists notes        text;
alter table public.messages add column if not exists created_at   timestamptz not null default now();
alter table public.messages add column if not exists updated_at   timestamptz not null default now();

-- Drop & re-add CHECK constraint on statut (idempotent)
do $$
begin
  -- Drop any existing constraint with this name
  execute 'alter table public.messages drop constraint if exists messages_statut_check';
  -- Re-add it; ignore if the column already had a different constraint
  execute 'alter table public.messages add constraint messages_statut_check check (statut in (''nouveau'',''lu'',''traite'',''archive''))';
exception when others then
  raise notice 'Skipping messages_statut_check: %', sqlerrm;
end $$;

-- NOT NULL constraints (only on columns the code requires)
do $$ begin
  alter table public.messages alter column name set not null;
exception when others then raise notice 'messages.name NOT NULL skipped: %', sqlerrm; end $$;
do $$ begin
  alter table public.messages alter column email set not null;
exception when others then raise notice 'messages.email NOT NULL skipped: %', sqlerrm; end $$;
do $$ begin
  alter table public.messages alter column body set not null;
exception when others then raise notice 'messages.body NOT NULL skipped: %', sqlerrm; end $$;

create index if not exists messages_created_at_idx on public.messages (created_at desc);
create index if not exists messages_email_idx      on public.messages (email);
-- NB: statut index moved to supabase-indexes.sql (conditional on column existence)

alter table public.messages enable row level security;
drop policy if exists "messages_select_authenticated" on public.messages;
create policy "messages_select_authenticated" on public.messages
  for select to authenticated using (true);

-- ============================================================
-- 2. quotes  (devis requests from the public form)
-- ============================================================
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid()
);

alter table public.quotes add column if not exists nom          text;
alter table public.quotes add column if not exists email        text;
alter table public.quotes add column if not exists telephone    text;
alter table public.quotes add column if not exists wilaya       text;
alter table public.quotes add column if not exists message      text;
alter table public.quotes add column if not exists lignes       jsonb not null default '[]';
alter table public.quotes add column if not exists statut       text not null default 'nouveau';
alter table public.quotes add column if not exists client_id    uuid;
alter table public.quotes add column if not exists created_at   timestamptz not null default now();
alter table public.quotes add column if not exists updated_at   timestamptz not null default now();

-- Foreign key (skip if clients table doesn't exist yet — operator can add later)
do $$ begin
  execute 'alter table public.quotes drop constraint if exists quotes_client_id_fkey';
  execute 'alter table public.quotes add constraint quotes_client_id_fkey foreign key (client_id) references public.clients(id) on delete set null';
exception when others then
  raise notice 'Skipping quotes_client_id_fkey (clients table may not exist yet): %', sqlerrm;
end $$;

create index if not exists quotes_created_at_idx on public.quotes (created_at desc);
create index if not exists quotes_client_id_idx  on public.quotes (client_id);

alter table public.quotes enable row level security;
drop policy if exists "quotes_select_authenticated" on public.quotes;
create policy "quotes_select_authenticated" on public.quotes
  for select to authenticated using (true);

-- ============================================================
-- 3. categories  (product taxonomy)
-- ============================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid()
);

alter table public.categories add column if not exists nom_fr         text;
alter table public.categories add column if not exists nom_ar         text;
alter table public.categories add column if not exists slug           text;
alter table public.categories add column if not exists description_fr text;
alter table public.categories add column if not exists description_ar text;
alter table public.categories add column if not exists image          text;
alter table public.categories add column if not exists ordre          int not null default 0;
alter table public.categories add column if not exists active         boolean not null default true;
alter table public.categories add column if not exists created_at     timestamptz not null default now();
alter table public.categories add column if not exists updated_at     timestamptz not null default now();

-- Unique constraint on slug (idempotent)
do $$ begin
  execute 'alter table public.categories drop constraint if exists categories_slug_key';
  execute 'alter table public.categories add constraint categories_slug_key unique (slug)';
exception when others then
  raise notice 'Skipping categories_slug_key: %', sqlerrm;
end $$;

create index if not exists categories_slug_idx  on public.categories (slug);
create index if not exists categories_ordre_idx on public.categories (ordre);

alter table public.categories enable row level security;
drop policy if exists "categories_select_anon" on public.categories;
create policy "categories_select_anon" on public.categories
  for select to anon, authenticated using (active = true);

-- ============================================================
-- 4. products  (catalogue)
-- ============================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid()
);

alter table public.products add column if not exists nom_fr          text;
alter table public.products add column if not exists nom_ar          text;
alter table public.products add column if not exists slug            text;
alter table public.products add column if not exists reference       text;
alter table public.products add column if not exists description_fr  text;
alter table public.products add column if not exists description_ar  text;
alter table public.products add column if not exists prix            numeric(12,2) not null default 0;
alter table public.products add column if not exists categorie_id    uuid;
alter table public.products add column if not exists image           text;
alter table public.products add column if not exists images          jsonb not null default '[]';
alter table public.products add column if not exists marques         jsonb not null default '[]';
alter table public.products add column if not exists specs           jsonb not null default '{}';
alter table public.products add column if not exists disponible      boolean not null default true;
alter table public.products add column if not exists featured        boolean not null default false;
alter table public.products add column if not exists ordre           int not null default 0;
-- Legacy columns used by admin/products/route.ts buildPayload()
alter table public.products add column if not exists pdf_url         text;
alter table public.products add column if not exists brochure_pdf    text;
alter table public.products add column if not exists category_id     uuid;
alter table public.products add column if not exists marque          text;
alter table public.products add column if not exists modele          text;
alter table public.products add column if not exists en_vedette      boolean not null default false;
alter table public.products add column if not exists cible           jsonb not null default '[]';
alter table public.products add column if not exists created_at      timestamptz not null default now();
alter table public.products add column if not exists updated_at      timestamptz not null default now();

do $$ begin
  execute 'alter table public.products drop constraint if exists products_slug_key';
  execute 'alter table public.products add constraint products_slug_key unique (slug)';
exception when others then
  raise notice 'Skipping products_slug_key: %', sqlerrm;
end $$;

do $$ begin
  execute 'alter table public.products drop constraint if exists products_categorie_id_fkey';
  execute 'alter table public.products add constraint products_categorie_id_fkey foreign key (categorie_id) references public.categories(id) on delete set null';
exception when others then
  raise notice 'Skipping products_categorie_id_fkey: %', sqlerrm;
end $$;

create index if not exists products_slug_idx         on public.products (slug);
create index if not exists products_categorie_id_idx on public.products (categorie_id);
create index if not exists products_disponible_idx   on public.products (disponible);
create index if not exists products_featured_idx     on public.products (featured);

alter table public.products enable row level security;
drop policy if exists "products_select_anon" on public.products;
create policy "products_select_anon" on public.products
  for select to anon, authenticated using (disponible = true);

-- ============================================================
-- 5. blog_posts  (articles)
-- ============================================================
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid()
);

alter table public.blog_posts add column if not exists titre_fr      text;
alter table public.blog_posts add column if not exists titre_ar      text;
alter table public.blog_posts add column if not exists slug          text;
alter table public.blog_posts add column if not exists excerpt_fr    text;
alter table public.blog_posts add column if not exists excerpt_ar    text;
alter table public.blog_posts add column if not exists contenu_fr    text;
alter table public.blog_posts add column if not exists contenu_ar    text;
alter table public.blog_posts add column if not exists image         text;
alter table public.blog_posts add column if not exists auteur        text;
alter table public.blog_posts add column if not exists tags          jsonb not null default '[]';
alter table public.blog_posts add column if not exists publie        boolean not null default false;
alter table public.blog_posts add column if not exists published_at  timestamptz;
alter table public.blog_posts add column if not exists created_at    timestamptz not null default now();
alter table public.blog_posts add column if not exists updated_at    timestamptz not null default now();

do $$ begin
  execute 'alter table public.blog_posts drop constraint if exists blog_posts_slug_key';
  execute 'alter table public.blog_posts add constraint blog_posts_slug_key unique (slug)';
exception when others then
  raise notice 'Skipping blog_posts_slug_key: %', sqlerrm;
end $$;

create index if not exists blog_posts_slug_idx        on public.blog_posts (slug);
create index if not exists blog_posts_published_at_idx on public.blog_posts (published_at desc);
create index if not exists blog_posts_publie_idx       on public.blog_posts (publie);

alter table public.blog_posts enable row level security;
drop policy if exists "blog_posts_select_anon" on public.blog_posts;
create policy "blog_posts_select_anon" on public.blog_posts
  for select to anon, authenticated using (publie = true);

-- ============================================================
-- 6. newsletter_subscribers
-- ============================================================
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid()
);

alter table public.newsletter_subscribers add column if not exists email        text;
alter table public.newsletter_subscribers add column if not exists langue       text not null default 'fr';
alter table public.newsletter_subscribers add column if not exists statut       text not null default 'actif';
alter table public.newsletter_subscribers add column if not exists source       text;
alter table public.newsletter_subscribers add column if not exists created_at   timestamptz not null default now();
alter table public.newsletter_subscribers add column if not exists updated_at   timestamptz not null default now();

do $$ begin
  execute 'alter table public.newsletter_subscribers drop constraint if exists newsletter_subscribers_email_key';
  execute 'alter table public.newsletter_subscribers add constraint newsletter_subscribers_email_key unique (email)';
exception when others then
  raise notice 'Skipping newsletter_subscribers_email_key: %', sqlerrm;
end $$;

create index if not exists newsletter_email_idx  on public.newsletter_subscribers (email);

alter table public.newsletter_subscribers enable row level security;
drop policy if exists "newsletter_select_authenticated" on public.newsletter_subscribers;
create policy "newsletter_select_authenticated" on public.newsletter_subscribers
  for select to authenticated using (true);

-- ============================================================
-- 7. email_log  (audit trail for every outgoing email)
-- ============================================================
create table if not exists public.email_log (
  id           uuid primary key default gen_random_uuid(),
  to_email     text not null,
  subject      text not null,
  template     text,
  status       text not null default 'sent',
  error        text,
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index if not exists email_log_created_at_idx  on public.email_log (created_at desc);
create index if not exists email_log_to_email_idx    on public.email_log (to_email);
create index if not exists email_log_template_idx    on public.email_log (template);

alter table public.email_log enable row level security;
drop policy if exists "email_log_select_authenticated" on public.email_log;
create policy "email_log_select_authenticated" on public.email_log
  for select to authenticated using (true);

-- ============================================================
-- 8. admin_users.salt  (audit §2.2 — per-row salt)
-- ============================================================
-- The code now requires a `salt` column on admin_users. This is a
-- separate ALTER so the migration is idempotent against both the
-- old schema (no salt column) and the new one.
alter table public.admin_users
  add column if not exists salt text;

-- Backfill salt for existing rows: generate a random 16-byte hex.
update public.admin_users
   set salt = encode(gen_random_bytes(16), 'hex')
 where salt is null;

-- ============================================================
-- 9. Conditional indexes on `statut` columns
-- ============================================================
-- Only create these if the `statut` column actually exists on the
-- table (it may not, if the table was created manually with a
-- different schema and our ALTER TABLE ADD COLUMN IF NOT EXISTS
-- was blocked by a conflicting constraint).
do $$ begin
  execute 'create index if not exists messages_statut_idx on public.messages (statut)';
exception when others then
  raise notice 'Skipping messages_statut_idx: %', sqlerrm;
end $$;

do $$ begin
  execute 'create index if not exists quotes_statut_idx on public.quotes (statut)';
exception when others then
  raise notice 'Skipping quotes_statut_idx: %', sqlerrm;
end $$;

do $$ begin
  execute 'create index if not exists newsletter_statut_idx on public.newsletter_subscribers (statut)';
exception when others then
  raise notice 'Skipping newsletter_statut_idx: %', sqlerrm;
end $$;

-- ============================================================
-- 10. Updated_at trigger (apply to all tables that have updated_at)
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare
  t text;
  has_col boolean;
begin
  for t in select unnest(array[
    'messages','quotes','categories','products','blog_posts',
    'newsletter_subscribers','email_log','admin_users','clients',
    'devis','commandes','interventions','maintenances','garanties','techniciens'
  ])
  loop
    -- Only create the trigger if the table has an `updated_at` column
    select exists(
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'updated_at'
    ) into has_col;
    if has_col then
      begin
        execute format('drop trigger if exists trg_%I_touch on public.%I', t, t);
        execute format('create trigger trg_%I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
      exception when others then
        raise notice 'Skipping trigger on %: %', t, sqlerrm;
      end;
    else
      raise notice 'Skipping trigger on % (no updated_at column)', t;
    end if;
  end loop;
end $$;

-- ============================================================
-- DONE — print a summary
-- ============================================================
do $$
declare
  t text;
  n bigint;
begin
  raise notice '===========================================================';
  raise notice 'supabase-base-schema.sql v2 — APPLY SUCCESS';
  raise notice '===========================================================';
  for t in select unnest(array[
    'messages','quotes','categories','products','blog_posts',
    'newsletter_subscribers','email_log','admin_users'
  ])
  loop
    begin
      execute format('SELECT count(*) FROM public.%I', t) into n;
      raise notice '  % : % lignes', t, n;
    exception when others then
      raise notice '  % : TABLE INEXISTANTE', t;
    end;
  end loop;
  raise notice '===========================================================';
  raise notice 'NEXT: run supabase-site-settings-v2.sql, then supabase-indexes.sql';
  raise notice '===========================================================';
end $$;
