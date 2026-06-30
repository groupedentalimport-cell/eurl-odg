// ============================================================
// OUADAH DENTAL GROUPE — Email logging service (Tier 3)
// Task EMAIL-V3 — #11
// ============================================================
// Records every email sent through the system into the `email_log`
// Supabase table for audit + debug purposes. Used by sendEmail()
// in src/lib/email.ts (sent / failed / skipped) and by the bulk
// newsletter send route.
//
// NON-BLOCKING GUARANTEE:
//   logEmail() NEVER throws. If the table is missing, the service
//   role key isn't set, or the insert fails for any reason, the
//   error is logged to console.warn and swallowed. The caller's
//   email send is not affected.
//
// REQUIRED SQL (run in Supabase Dashboard → SQL Editor):
//
//   CREATE TABLE IF NOT EXISTS email_log (
//     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//     to_email text NOT NULL,
//     subject text,
//     template text,             -- which template function was used
//     status text DEFAULT 'sent', -- 'sent' | 'failed' | 'skipped'
//     error text,
//     message_id text,
//     created_at timestamptz DEFAULT now()
//   );
//
//   -- Speeds up the admin "recent logs" query:
//   CREATE INDEX IF NOT EXISTS email_log_created_at_idx
//     ON email_log (created_at DESC);
//
//   -- Optional: row-level security. The table is written by the
//   -- service-role client (bypasses RLS), so any RLS policy only
//   -- affects direct anon/authenticated access (none in this app).
//   ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
// ============================================================

import { getServerClient } from "./supabase";

export type EmailLogStatus = "sent" | "failed" | "skipped";

export interface EmailLogEntry {
  /** Recipient(s). May be a single address or an array (joined with ", "). */
  to: string | string[];
  /** Email subject line. */
  subject: string;
  /** Template function identifier (e.g. "sendQuoteConfirmation"). */
  template?: string;
  /** Outcome of the send attempt. */
  status: EmailLogStatus;
  /** Error message (only when status === "failed"). */
  error?: string;
  /** SMTP message id returned by nodemailer (only when status === "sent"). */
  messageId?: string;
}

export interface EmailLogRow {
  id: string;
  to_email: string;
  subject: string | null;
  template: string | null;
  status: string;
  error: string | null;
  message_id: string | null;
  created_at: string;
}

/**
 * Insert a single row into the `email_log` table.
 *
 * This function is NON-BLOCKING:
 *   - Catches all errors (Supabase not configured, table missing, etc.).
 *   - Never throws.
 *   - Returns void.
 *
 * Callers do NOT need to wrap this in try/catch.
 */
export async function logEmail(entry: EmailLogEntry): Promise<void> {
  try {
    let client;
    try {
      client = getServerClient();
    } catch {
      // Service role key not configured (e.g. local dev without env) —
      // nothing to log. Silent.
      return;
    }
    if (!client) return;

    const toEmail = Array.isArray(entry.to)
      ? entry.to.join(", ")
      : entry.to;

    const { error } = await client.from("email_log").insert({
      to_email: toEmail,
      subject: entry.subject || null,
      template: entry.template || null,
      status: entry.status,
      error: entry.error || null,
      message_id: entry.messageId || null,
    });

    if (error) {
      // Most likely "relation email_log does not exist" — log silently.
      // The user must create the table manually via SQL (see comment above).
      console.warn(
        `[email-log] insert failed (table may not exist yet): ${error.message}`
      );
    }
  } catch (e: any) {
    // Hard guarantee: never throw from logging.
    console.warn("[email-log] exception:", e?.message || String(e));
  }
}

/**
 * Fetch the most recent email logs (for admin display in the
 * Newsletter panel).
 *
 * Returns an empty array on any error (table missing, supabase not
 * configured, etc.) — never throws.
 *
 * @param limit Max rows to return (default 50, clamped to [1, 500]).
 */
export async function getEmailLogs(limit: number = 50): Promise<EmailLogRow[]> {
  try {
    let client;
    try {
      client = getServerClient();
    } catch {
      return [];
    }
    if (!client) return [];

    const safeLimit = Math.min(Math.max(limit, 1), 500);

    const { data, error } = await client
      .from("email_log")
      .select(
        "id, to_email, subject, template, status, error, message_id, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      console.warn(`[email-log] fetch failed: ${error.message}`);
      return [];
    }
    return (data || []) as EmailLogRow[];
  } catch (e: any) {
    console.warn("[email-log] exception:", e?.message || String(e));
    return [];
  }
}
