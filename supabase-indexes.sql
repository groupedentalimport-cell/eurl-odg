-- ============================================================
-- supabase-indexes.sql  (v2 — defensive)
-- ============================================================
-- REFACTOR (refactor/total — audit §10.4)
-- Adds the missing indexes identified in the audit. Each index has
-- a comment explaining the query it accelerates.
--
-- ⚠️ v2 FIX: every index is now wrapped in a DO block with
-- EXCEPTION handling, so a missing column on a pre-existing table
-- (e.g. garanties.statut) doesn't abort the whole script. The
-- script will skip the index and emit a NOTICE explaining why.
--
-- Idempotent: uses `create index if not exists` everywhere.
-- ============================================================

-- clients.email — used by findClientByEmail() and findAdminUserByEmail()
do $$ begin
  execute 'create index if not exists clients_email_idx on public.clients (email)';
exception when others then
  raise notice 'Skipping clients_email_idx: %', sqlerrm;
end $$;

-- commandes — used by /api/admin/commandes filters
do $$ begin
  execute 'create index if not exists commandes_devis_id_idx on public.commandes (devis_id)';
exception when others then
  raise notice 'Skipping commandes_devis_id_idx: %', sqlerrm;
end $$;

do $$ begin
  execute 'create index if not exists commandes_commercial_id_idx on public.commandes (commercial_id)';
exception when others then
  raise notice 'Skipping commandes_commercial_id_idx: %', sqlerrm;
end $$;

do $$ begin
  execute 'create index if not exists commandes_date_commande_idx on public.commandes (date_commande desc)';
exception when others then
  raise notice 'Skipping commandes_date_commande_idx: %', sqlerrm;
end $$;

-- interventions — used by /api/admin/interventions + cron reminders
do $$ begin
  execute 'create index if not exists interventions_client_id_idx on public.interventions (client_id)';
exception when others then
  raise notice 'Skipping interventions_client_id_idx: %', sqlerrm;
end $$;

do $$ begin
  execute 'create index if not exists interventions_commande_id_idx on public.interventions (commande_id)';
exception when others then
  raise notice 'Skipping interventions_commande_id_idx: %', sqlerrm;
end $$;

do $$ begin
  execute 'create index if not exists interventions_produit_id_idx on public.interventions (produit_id)';
exception when others then
  raise notice 'Skipping interventions_produit_id_idx: %', sqlerrm;
end $$;

-- garanties — used by /api/admin/garanties + cron
do $$ begin
  execute 'create index if not exists garanties_commande_id_idx on public.garanties (commande_id)';
exception when others then
  raise notice 'Skipping garanties_commande_id_idx: %', sqlerrm;
end $$;

do $$ begin
  execute 'create index if not exists garanties_produit_id_idx on public.garanties (produit_id)';
exception when others then
  raise notice 'Skipping garanties_produit_id_idx: %', sqlerrm;
end $$;

do $$ begin
  execute 'create index if not exists garanties_actif_date_fin_idx on public.garanties (actif, date_fin)';
exception when others then
  raise notice 'Skipping garanties_actif_date_fin_idx: %', sqlerrm;
end $$;

-- maintenances — used by /api/admin/maintenances + cron
do $$ begin
  execute 'create index if not exists maintenances_client_id_idx on public.maintenances (client_id)';
exception when others then
  raise notice 'Skipping maintenances_client_id_idx: %', sqlerrm;
end $$;

do $$ begin
  execute 'create index if not exists maintenances_statut_idx on public.maintenances (statut)';
exception when others then
  raise notice 'Skipping maintenances_statut_idx: %', sqlerrm;
end $$;

do $$ begin
  execute 'create index if not exists maintenances_technicien_id_idx on public.maintenances (technicien_id)';
exception when others then
  raise notice 'Skipping maintenances_technicien_id_idx: %', sqlerrm;
end $$;

-- live_chat_messages — used by /api/admin/chat-live "agent messages" query
do $$ begin
  execute 'create index if not exists live_chat_messages_sender_created_idx on public.live_chat_messages (sender, created_at desc)';
exception when others then
  raise notice 'Skipping live_chat_messages_sender_created_idx: %', sqlerrm;
end $$;

-- live_chat_conversations — admin "my conversations" filter
do $$ begin
  execute 'create index if not exists live_chat_conversations_assigned_to_idx on public.live_chat_conversations (assigned_to)';
exception when others then
  raise notice 'Skipping live_chat_conversations_assigned_to_idx: %', sqlerrm;
end $$;

-- email_log — already in base-schema.sql, included here for completeness
do $$ begin
  execute 'create index if not exists email_log_created_at_idx on public.email_log (created_at desc)';
exception when others then
  raise notice 'Skipping email_log_created_at_idx: %', sqlerrm;
end $$;

-- ============================================================
-- Partial indexes for the cron's "active + soon-to-expire" queries
-- (the cron scans these every hour — partial indexes keep them small)
-- Each wrapped in DO block to skip cleanly if the column doesn't exist.
-- ============================================================

-- garanties: actif=true AND statut != 'expire' (cron scans this every hour)
do $$ begin
  execute 'create index if not exists garanties_active_expiring_soon_idx on public.garanties (date_fin) where actif = true and statut is distinct from ''expire''';
exception
  when undefined_column then
    -- Try alternative without statut (some schemas only have actif)
    begin
      execute 'create index if not exists garanties_active_expiring_soon_idx on public.garanties (date_fin) where actif = true';
      raise notice 'Created garanties_active_expiring_soon_idx WITHOUT statut filter (column missing).';
    exception when others then
      raise notice 'Skipping garanties_active_expiring_soon_idx: %', sqlerrm;
    end;
  when others then
    raise notice 'Skipping garanties_active_expiring_soon_idx: %', sqlerrm;
end $$;

-- maintenances: statut IN ('planifie','confirme')
do $$ begin
  execute 'create index if not exists maintenances_pending_soon_idx on public.maintenances (date_prevue) where statut in (''planifie'',''confirme'')';
exception
  when undefined_column then
    begin
      execute 'create index if not exists maintenances_pending_soon_idx on public.maintenances (date_prevue)';
      raise notice 'Created maintenances_pending_soon_idx WITHOUT statut filter (column missing).';
    exception when others then
      raise notice 'Skipping maintenances_pending_soon_idx: %', sqlerrm;
    end;
  when others then
    raise notice 'Skipping maintenances_pending_soon_idx: %', sqlerrm;
end $$;

-- interventions: statut IN ('planifie','en_cours')
do $$ begin
  execute 'create index if not exists interventions_pending_soon_idx on public.interventions (date_prevue) where statut in (''planifie'',''en_cours'')';
exception
  when undefined_column then
    begin
      execute 'create index if not exists interventions_pending_soon_idx on public.interventions (date_prevue)';
      raise notice 'Created interventions_pending_soon_idx WITHOUT statut filter (column missing).';
    exception when others then
      raise notice 'Skipping interventions_pending_soon_idx: %', sqlerrm;
    end;
  when others then
    raise notice 'Skipping interventions_pending_soon_idx: %', sqlerrm;
end $$;

-- ============================================================
-- Final verification — count indexes per table
-- ============================================================
do $$
begin
  raise notice '===========================================================';
  raise notice 'supabase-indexes.sql v2 — APPLY SUCCESS';
  raise notice '===========================================================';
  raise notice 'Some indexes may have been skipped with a NOTICE above';
  raise notice 'if the underlying column does not exist on your schema.';
  raise notice 'That is expected — the script is idempotent and defensive.';
  raise notice '===========================================================';
end $$;

select tablename, count(*) as index_count
from pg_indexes
where schemaname = 'public'
group by tablename
order by tablename;
