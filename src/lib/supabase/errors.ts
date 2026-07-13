/**
 * Shared Supabase error classification.
 *
 * WHY: this helper was copy-pasted into 27 route files with subtly
 * different regex (`/42P01/`, `/"42p01"/`, `/relation .* does not exist/i`,
 * `/404/`, etc.) — see audit §3.1. Centralising it removes ~170 LOC of
 * repetition and guarantees identical behaviour across routes.
 */

/** Error shape returned by @supabase/supabase-js on a query failure. */
export interface SupabaseError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Returns true when the error indicates the target table does not exist
 * (Postgres code 42P01) or Supabase returned a 404 because the schema
 * is missing. Both happen when the SQL migrations haven't been applied.
 */
export function isMissingTableError(err: SupabaseError | null | undefined): boolean {
  if (!err) return false;
  const code = err.code ?? "";
  const message = err.message ?? "";
  if (code === "42P01" || code === "42P02") return true;
  return /relation "[^"]+" does not exist/i.test(message);
}

/**
 * Returns true when the error indicates a row was not found (Postgres
 * code P0002 / `JSON_OBJECT_NOT_FOUND_KEY`). Useful to distinguish
 * "missing row" (404) from "DB error" (500) in PATCH/DELETE handlers.
 */
export function isNotFoundError(err: SupabaseError | null | undefined): boolean {
  if (!err) return false;
  const code = err.code ?? "";
  if (code === "P0002") return true;
  return /no rows returned/i.test(err.message ?? "");
}

/**
 * Returns true when the error indicates a unique-constraint violation
 * (Postgres code 23505). Used by the `insertWithNumeroRetry` helper
 * to retry on `devis.numero` / `commandes.numero` collisions.
 */
export function isUniqueViolation(err: SupabaseError | null | undefined): boolean {
  return err?.code === "23505";
}
