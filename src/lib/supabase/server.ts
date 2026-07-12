import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerClient } from "../supabase";
import { isMissingTableError } from "./errors";

/**
 * Server-side Supabase client helpers.
 *
 * WHY: every API route used to inline the same 6-line dance:
 *   let client; try { client = getServerClient(); } catch { return 500; }
 * Now they call `getServerClientOr500()` and destructure `{ client, error }`.
 *
 * The table-missing case is so common (the CRM migration isn't applied
 * on every dev environment) that we expose a dedicated helper returning
 * a styled 503 with the table name — routes no longer roll their own
 * "table manquante" string.
 */

export type ServerClientResult =
  | { client: SupabaseClient; error: null }
  | { client: null; error: NextResponse };

/**
 * Returns the service-role Supabase client, or a 500 NextResponse
 * explaining that env vars are missing. Routes do:
 *
 *   const { client, error } = getServerClientOr500();
 *   if (error) return error;
 *   // here `client` is narrowed to SupabaseClient (non-null)
 */
export function getServerClientOr500(): ServerClientResult {
  try {
    return { client: getServerClient(), error: null };
  } catch (err) {
    return {
      client: null,
      error: NextResponse.json(
        {
          error: "Server database is not configured.",
          hint:
            process.env.NODE_ENV === "production"
              ? "SUPABASE_SERVICE_ROLE_KEY is missing on the server."
              : `Detail: ${(err as Error).message}`,
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Builds a styled 503 response for the "table doesn't exist" case.
 * Routes that hit a missing table should:
 *
 *   if (isMissingTableError(error)) return tableMissingResponse("clients");
 */
export function tableMissingResponse(tableName: string): NextResponse {
  return NextResponse.json(
    {
      error: `La table '${tableName}' n'existe pas encore.`,
      hint:
        "Appliquez les migrations SQL du dépôt (supabase-crm-schema.sql, supabase-base-schema.sql, supabase-site-settings-v2.sql).",
    },
    { status: 503 }
  );
}

/**
 * Convenience wrapper: run a query against `tableName`, and if the
 * table is missing return the styled 503. Otherwise return `{ data,
 * error }` for the route to handle.
 *
 *   const { data, error, tableMissing } = await runQuery(
 *     client.from("clients").select("*").limit(50),
 *     "clients"
 *   );
 *   if (tableMissing) return tableMissingResponse("clients");
 */
export async function runQuery<T>(
  query: Promise<{ data: T | null; error: unknown }>,
  _tableName: string
): Promise<{ data: T | null; error: unknown; tableMissing: boolean }> {
  try {
    const result = await query;
    const tableMissing = isMissingTableError(
      (result.error as { code?: string; message?: string } | null) ?? null
    );
    return { ...result, tableMissing };
  } catch (err) {
    return { data: null, error: err, tableMissing: false };
  }
}
