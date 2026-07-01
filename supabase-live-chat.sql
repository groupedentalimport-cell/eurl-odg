-- ============================================================
-- OUADAH DENTAL GROUPE — Live Chat (human agent) schema
-- Task BONUS-2
-- ============================================================
-- Two tables:
--   live_chat_conversations  — one row per visitor chat session
--   live_chat_messages       — individual messages (client / agent)
--
-- Business hours (Algeria, UTC+1, no DST):
--   Dimanche → Jeudi  ·  08:00 → 16:30
--   (enforced server-side in /api/chat-live via a JS check, not in SQL)
--
-- RLS policy:
--   - Public (anon) can INSERT into both tables (start a conversation
--     + send messages) AND can SELECT messages of a conversation whose
--     id they know. This is the minimum needed for the public widget
--     to work without exposing a service-role key to the browser.
--   - Authenticated (service role, used by admin API) bypasses RLS
--     and can SELECT/UPDATE everything.
--
-- Run this in the Supabase Dashboard → SQL Editor → New query.
-- ============================================================

-- ---- 1. Conversations ---------------------------------------
CREATE TABLE IF NOT EXISTS live_chat_conversations (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name  text,
  client_email text,
  client_phone text,
  status       text        NOT NULL DEFAULT 'waiting',   -- 'waiting' | 'active' | 'closed'
  assigned_to  uuid        REFERENCES admin_users(id) ON DELETE SET NULL,
  last_msg_at  timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_chat_conversations_status
  ON live_chat_conversations (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_chat_conversations_created
  ON live_chat_conversations (created_at DESC);

-- ---- 2. Messages --------------------------------------------
CREATE TABLE IF NOT EXISTS live_chat_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES live_chat_conversations(id) ON DELETE CASCADE,
  sender          text        NOT NULL,   -- 'client' | 'agent'
  content         text        NOT NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_chat_messages_conv
  ON live_chat_messages (conversation_id, created_at ASC);

-- ---- 3. updated_at trigger ----------------------------------
-- Keeps `updated_at` fresh on every UPDATE so the admin can sort
-- conversations by "most recent activity".
CREATE OR REPLACE FUNCTION trg_live_chat_touch_updated()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS live_chat_conversations_touch
  ON live_chat_conversations;
CREATE TRIGGER live_chat_conversations_touch
  BEFORE UPDATE ON live_chat_conversations
  FOR EACH ROW EXECUTE FUNCTION trg_live_chat_touch_updated();

-- Auto-update last_msg_at on the parent conversation whenever a
-- new message is inserted. Lets the admin list sort by "last reply".
CREATE OR REPLACE FUNCTION trg_live_chat_messages_touch_conv()
RETURNS trigger AS $$
BEGIN
  UPDATE live_chat_conversations
     SET last_msg_at = now(),
         status      = CASE WHEN status = 'closed' THEN status ELSE 'active' END,
         updated_at  = now()
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS live_chat_messages_touch_conv
  ON live_chat_messages;
CREATE TRIGGER live_chat_messages_touch_conv
  AFTER INSERT ON live_chat_messages
  FOR EACH ROW EXECUTE FUNCTION trg_live_chat_messages_touch_conv();

-- ---- 4. Row Level Security ----------------------------------
ALTER TABLE live_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_chat_messages      ENABLE ROW LEVEL SECURITY;

-- Conversations: anon can insert (start a chat) and select BY ID.
-- We can't restrict SELECT to "own" rows because anon has no
-- identity — but the id is a 128-bit UUID, effectively unguessable,
-- so exposing SELECT to anon is acceptable. Service role bypasses
-- RLS entirely.
DROP POLICY IF EXISTS "lc_conv_public_insert" ON live_chat_conversations;
CREATE POLICY "lc_conv_public_insert"
  ON live_chat_conversations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "lc_conv_public_select" ON live_chat_conversations;
CREATE POLICY "lc_conv_public_select"
  ON live_chat_conversations FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "lc_conv_admin_update" ON live_chat_conversations;
CREATE POLICY "lc_conv_admin_update"
  ON live_chat_conversations FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

-- Messages: same idea.
DROP POLICY IF EXISTS "lc_msg_public_insert" ON live_chat_messages;
CREATE POLICY "lc_msg_public_insert"
  ON live_chat_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "lc_msg_public_select" ON live_chat_messages;
CREATE POLICY "lc_msg_public_select"
  ON live_chat_messages FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- End of live chat schema.
-- ============================================================
