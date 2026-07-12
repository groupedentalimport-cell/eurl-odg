-- ============================================================
-- supabase-base-schema.sql
-- ============================================================
-- REFACTOR (refactor/total — audit §10.2)
-- Creates the 7 tables referenced by the code but missing from the
-- repo: messages, quotes, products, categories, blog_posts,
-- newsletter_subscribers, email_log.
--
-- Each table includes:
--   - primary key (uuid default gen_random_uuid())
--   - created_at / updated_at timestamps
--   - indexes on the hot lookup columns
--   - RLS policies (anon read where appropriate, service role write)
--
-- Run order on a fresh database:
--   1. supabase-base-schema.sql       (this file)
--   2. supabase-crm-schema.sql        (existing — clients, devis, etc.)
--   3. supabase-site-settings-v2.sql  (fixes the settings table)
--   4. supabase-live-chat.sql         (existing)
--   5. supabase-indexes.sql           (additional indexes)
--   6. supabase-admin-migration.sql   (add salt column + reset password)
-- ============================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. messages  (contact form submissions)
-- ============================================================
-- Field names match the existing production code (English short names
-- `name`, `email`, `phone`, `subject`, `body`, `read` — see
-- /api/contact/route.ts and admin/panels/MessagesPanel.tsx).
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  phone        text,
  subject      text,
  body         text not null,
  read         boolean not null default false,
  statut       text not null default 'nouveau'
               check (statut in ('nouveau','lu','traite','archive')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists messages_created_at_idx     on public.messages (created_at desc);
create index if not exists messages_statut_idx          on public.messages (statut);
create index if not exists messages_email_idx           on public.messages (email);

alter table public.messages enable row level security;
drop policy if exists "messages_select_authenticated" on public.messages;
create policy "messages_select_authenticated" on public.messages
  for select to authenticated using (true);
-- INSERT is via service role only (the /api/contact route uses the
-- service role key). No anon INSERT — anon would let anyone spam the
-- table without going through our rate-limited API.

-- ============================================================
-- 2. quotes  (devis requests from the public form)
-- ============================================================
create table if not exists public.quotes (
  id           uuid primary key default gen_random_uuid(),
  nom          text not null,
  email        text not null,
  telephone    text not null,
  wilaya       text,
  message      text,
  lignes       jsonb not null default '[]',
  statut       text not null default 'nouveau'
               check (statut in ('nouveau','en_cours','converti','refuse','archive')),
  client_id    uuid references public.clients(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists quotes_created_at_idx   on public.quotes (created_at desc);
create index if not exists quotes_statut_idx       on public.quotes (statut);
create index if not exists quotes_client_id_idx    on public.quotes (client_id);

alter table public.quotes enable row level security;
drop policy if exists "quotes_select_authenticated" on public.quotes;
create policy "quotes_select_authenticated" on public.quotes
  for select to authenticated using (true);

-- ============================================================
-- 3. categories  (product taxonomy)
-- ============================================================
create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  nom_fr       text not null,
  nom_ar       text,
  slug         text not null unique,
  description_fr text,
  description_ar text,
  image        text,
  ordre        int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists categories_slug_idx     on public.categories (slug);
create index if not exists categories_ordre_idx    on public.categories (ordre);

alter table public.categories enable row level security;
drop policy if exists "categories_select_anon" on public.categories;
create policy "categories_select_anon" on public.categories
  for select to anon, authenticated using (active = true);

-- ============================================================
-- 4. products  (catalogue)
-- ============================================================
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  nom_fr          text not null,
  nom_ar          text,
  slug            text not null unique,
  reference       text,
  description_fr  text,
  description_ar  text,
  prix            numeric(12,2) not null default 0,
  categorie_id    uuid references public.categories(id) on delete set null,
  image           text,
  images          jsonb not null default '[]',
  marques         jsonb not null default '[]',
  specs           jsonb not null default '{}',
  disponible      boolean not null default true,
  featured        boolean not null default false,
  ordre           int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
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
  id            uuid primary key default gen_random_uuid(),
  titre_fr      text not null,
  titre_ar      text,
  slug          text not null unique,
  excerpt_fr    text,
  excerpt_ar    text,
  contenu_fr    text,
  contenu_ar    text,
  image         text,
  auteur        text,
  tags          jsonb not null default '[]',
  publie        boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
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
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  langue       text not null default 'fr' check (langue in ('fr','ar')),
  statut       text not null default 'actif'
               check (statut in ('actif','desinscrit','bounce','supprime')),
  source       text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists newsletter_email_idx     on public.newsletter_subscribers (email);
create index if not exists newsletter_statut_idx    on public.newsletter_subscribers (statut);

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
  status       text not null default 'sent'
               check (status in ('sent','failed','queued')),
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
-- Existing password_hash values become invalid (the salt they were
-- hashed with was the constant `odg-salt-v1`, now removed from code).
-- Operators MUST reset passwords via the SQL at the bottom of
-- supabase-admin-migration.sql.
update public.admin_users
   set salt = encode(gen_random_bytes(16), 'hex')
 where salt is null;

-- ============================================================
-- Updated_at trigger (apply to all tables)
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'messages','quotes','categories','products','blog_posts',
    'newsletter_subscribers','admin_users','clients','devis',
    'commandes','interventions','maintenances','garanties','techniciens'
  ])
  loop
    execute format('drop trigger if exists trg_%I_touch on public.%I', t, t);
    execute format('create trigger trg_%I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;
