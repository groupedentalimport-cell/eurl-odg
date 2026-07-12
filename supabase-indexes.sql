-- ============================================================
-- supabase-indexes.sql
-- ============================================================
-- REFACTOR (refactor/total — audit §10.4)
-- Adds the missing indexes identified in the audit. Each index has
-- a comment explaining the query it accelerates.
-- Idempotent: uses `create index if not exists`.
-- ============================================================

-- clients.email — used by findClientByEmail() and findAdminUserByEmail()
-- (admin_users already has unique on email; clients does not).
create index if not exists clients_email_idx
  on public.clients (email);

-- commandes — used by /api/admin/commandes filters
create index if not exists commandes_devis_id_idx
  on public.commandes (devis_id);
create index if not exists commandes_commercial_id_idx
  on public.commandes (commercial_id);
create index if not exists commandes_date_commande_idx
  on public.commandes (date_commande desc);

-- interventions — used by /api/admin/interventions + cron reminders
create index if not exists interventions_client_id_idx
  on public.interventions (client_id);
create index if not exists interventions_commande_id_idx
  on public.interventions (commande_id);
create index if not exists interventions_produit_id_idx
  on public.interventions (produit_id);

-- garanties — used by /api/admin/garanties + cron
create index if not exists garanties_commande_id_idx
  on public.garanties (commande_id);
create index if not exists garanties_produit_id_idx
  on public.garanties (produit_id);
create index if not exists garanties_actif_date_fin_idx
  on public.garanties (actif, date_fin);

-- maintenances — used by /api/admin/maintenances + cron
create index if not exists maintenances_client_id_idx
  on public.maintenances (client_id);
create index if not exists maintenances_statut_idx
  on public.maintenances (statut);
create index if not exists maintenances_technicien_id_idx
  on public.maintenances (technicien_id);

-- live_chat_messages — used by /api/admin/chat-live "agent messages" query
create index if not exists live_chat_messages_sender_created_idx
  on public.live_chat_messages (sender, created_at desc);

-- live_chat_conversations — admin "my conversations" filter
create index if not exists live_chat_conversations_assigned_to_idx
  on public.live_chat_conversations (assigned_to);

-- email_log — already in base-schema.sql, included here for completeness
-- on deployments where the base schema was applied before this file.
create index if not exists email_log_created_at_idx
  on public.email_log (created_at desc);

-- ============================================================
-- Partial indexes for the cron's "active + soon-to-expire" queries
-- (the cron scans these every hour — partial indexes keep them small)
-- ============================================================
create index if not exists garanties_active_expiring_soon_idx
  on public.garanties (date_fin)
  where actif = true and statut is distinct from 'expire';

create index if not exists maintenances_pending_soon_idx
  on public.maintenances (date_prevue)
  where statut in ('planifie','confirme');

create index if not exists interventions_pending_soon_idx
  on public.interventions (date_prevue)
  where statut in ('planifie','en_cours');
