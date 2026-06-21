import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

let _client: SupabaseClient | null = null;

function getBrowserClient(): SupabaseClient {
  if (_client) return _client;
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Missing env vars.");
  }
  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  return _client;
}

// Lazy proxy — avoids build-time crash when env vars are absent
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getBrowserClient();
    const value: unknown = (client as Record<PropertyKey, unknown>)[prop as PropertyKey];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});

// Server-side client using the service role key (bypasses RLS). API routes only.
export function getServerClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Server Supabase not configured.");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getProductImageUrl(filename?: string): string | null {
  if (!filename) return null;
  // Pass through full URLs (some rows store the absolute URL)
  if (/^https?:\/\//i.test(filename)) return filename;
  if (!isSupabaseConfigured()) return null;
  return `${supabaseUrl}/storage/v1/object/public/product-images/${filename}`;
}

export function getBlogImageUrl(filename?: string): string | null {
  if (!filename || !isSupabaseConfigured()) return null;
  return `${supabaseUrl}/storage/v1/object/public/blog-images/${filename}`;
}

export function placeholderImage(text = "ODG", w = 600, h = 400): string {
  return `https://placehold.co/${w}x${h}/0f766e/ffffff?text=${encodeURIComponent(text)}`;
}
