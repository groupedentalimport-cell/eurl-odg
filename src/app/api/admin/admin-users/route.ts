import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import {
  requireRole,
  hashPassword,
  ALL_ROLES,
  type AdminRole,
} from "@/lib/admin-auth";

// Admin-users management — SUPER_ADMIN ONLY.
//
// requireRole(request, []) means: super_admin bypasses (returns session),
// every other role gets null → 403. This matches the established auth model.
//
// Table: admin_users (id uuid PK, email text UNIQUE, password_hash text,
//   full_name text, role text CHECK in 6 roles, active boolean, created_at)
// Writes go through the service-role client (bypasses RLS).

function isMissingTableError(err: any): boolean {
  const msg = (err?.message || err?.toString() || "").toLowerCase();
  const code = String(err?.code || "");
  if (code === "42p01") return true; // undefined_table
  if (code === "pgrst205") return true; // schema cache miss
  return (
    msg.includes("could not find the table") ||
    (msg.includes("relation") && msg.includes("does not exist")) ||
    (msg.includes("table") && msg.includes("does not exist")) ||
    (msg.includes("schema cache") && msg.includes("does not exist"))
  );
}

function getClient() {
  try {
    return getServerClient();
  } catch {
    return null;
  }
}

// Public projection (never leak password_hash to the client).
const PUBLIC_COLS = "id, email, full_name, role, active, created_at";

// ---- GET: list all admin_users (super_admin only) ----
export async function GET(request: NextRequest) {
  const session = requireRole(request, []);
  if (!session) {
    return NextResponse.json(
      { error: "Accès refusé. Réservé au super_admin." },
      { status: 403 }
    );
  }
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré. Vérifiez SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await client
      .from("admin_users")
      .select(PUBLIC_COLS)
      .order("created_at", { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'admin_users' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/admin-users] list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: data || [] });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'admin_users' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/admin-users] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// ---- POST: create a new admin_user (super_admin only) ----
// Body: { email, password, full_name, role, active }
export async function POST(request: NextRequest) {
  const session = requireRole(request, []);
  if (!session) {
    return NextResponse.json(
      { error: "Accès refusé. Réservé au super_admin." },
      { status: 403 }
    );
  }
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré." },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const full_name = String(body?.full_name || "").trim();
  const role = String(body?.role || "") as AdminRole;
  const active = body?.active !== false; // default true

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Email invalide." },
      { status: 400 }
    );
  }
  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "Mot de passe requis (6 caractères minimum)." },
      { status: 400 }
    );
  }
  if (!ALL_ROLES.includes(role)) {
    return NextResponse.json(
      { error: "Rôle invalide. Valeurs attendues : " + ALL_ROLES.join(", ") },
      { status: 400 }
    );
  }

  const payload = {
    email,
    password_hash: hashPassword(password),
    full_name,
    role,
    active,
  };

  try {
    const { data, error } = await client
      .from("admin_users")
      .insert(payload)
      .select(PUBLIC_COLS)
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'admin_users' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      // 23505 = unique_violation (email already used)
      if (error.code === "23505" || /duplicate/i.test(error.message || "")) {
        return NextResponse.json(
          { error: "Cet email est déjà utilisé." },
          { status: 409 }
        );
      }
      console.error("[admin/admin-users] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'admin_users' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/admin-users] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// ---- PUT: update an admin_user (super_admin only) ----
// Body: { id, email?, full_name?, role?, active?, password? }
// Safeguards:
//  - cannot change your own role (super_admin protection against self-lockout)
//  - cannot deactivate the last super_admin (no check needed for role change
//    since you can only change OTHERS' roles — but we still guard: cannot
//    change role of a super_admin if that would leave 0 super_admins)
export async function PUT(request: NextRequest) {
  const session = requireRole(request, []);
  if (!session) {
    return NextResponse.json(
      { error: "Accès refusé. Réservé au super_admin." },
      { status: 403 }
    );
  }
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré." },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const { id, ...rest } = body;
  if (!id) {
    return NextResponse.json(
      { error: "Champ 'id' requis." },
      { status: 400 }
    );
  }

  // Fetch current row to validate safeguards.
  const { data: current, error: fetchErr } = await client
    .from("admin_users")
    .select("id, email, role, active")
    .eq("id", id)
    .single();
  if (fetchErr || !current) {
    return NextResponse.json(
      { error: "Utilisateur introuvable." },
      { status: 404 }
    );
  }

  // Safeguard 1: cannot change your own role.
  if (
    String(rest.role || "").length > 0 &&
    rest.role !== current.role &&
    id === session.userId
  ) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas modifier votre propre rôle." },
      { status: 400 }
    );
  }

  // Safeguard 2: cannot demote/deactivate the LAST super_admin.
  const isDemotingFromSuperAdmin =
    current.role === "super_admin" &&
    typeof rest.role === "string" &&
    rest.role !== "super_admin";
  const isDeactivatingSuperAdmin =
    current.role === "super_admin" && rest.active === false;
  if (isDemotingFromSuperAdmin || isDeactivatingSuperAdmin) {
    const { count } = await client
      .from("admin_users")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin")
      .eq("active", true);
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Impossible : au moins un super_admin actif doit rester." },
        { status: 400 }
      );
    }
  }

  // Build update payload (only provided fields).
  const update: Record<string, unknown> = {};
  if (typeof rest.email === "string") {
    const email = rest.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Email invalide." },
        { status: 400 }
      );
    }
    update.email = email;
  }
  if (typeof rest.full_name === "string") {
    update.full_name = rest.full_name.trim();
  }
  if (typeof rest.role === "string") {
    if (!ALL_ROLES.includes(rest.role as AdminRole)) {
      return NextResponse.json(
        { error: "Rôle invalide." },
        { status: 400 }
      );
    }
    update.role = rest.role;
  }
  if (typeof rest.active === "boolean") {
    update.active = rest.active;
  }
  if (typeof rest.password === "string" && rest.password.length > 0) {
    if (rest.password.length < 6) {
      return NextResponse.json(
        { error: "Mot de passe trop court (6 caractères minimum)." },
        { status: 400 }
      );
    }
    update.password_hash = hashPassword(rest.password);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "Aucun champ à mettre à jour." },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await client
      .from("admin_users")
      .update(update)
      .eq("id", id)
      .select(PUBLIC_COLS)
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'admin_users' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      if (error.code === "23505" || /duplicate/i.test(error.message || "")) {
        return NextResponse.json(
          { error: "Cet email est déjà utilisé." },
          { status: 409 }
        );
      }
      console.error("[admin/admin-users] update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'admin_users' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/admin-users] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}

// ---- DELETE: remove an admin_user (super_admin only) ----
// Query: ?id=...
// Safeguards: cannot delete yourself / cannot delete the last super_admin.
export async function DELETE(request: NextRequest) {
  const session = requireRole(request, []);
  if (!session) {
    return NextResponse.json(
      { error: "Accès refusé. Réservé au super_admin." },
      { status: 403 }
    );
  }
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase serveur non configuré." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Param 'id' requis." },
      { status: 400 }
    );
  }

  // Safeguard 1: cannot delete yourself.
  if (id === session.userId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte." },
      { status: 400 }
    );
  }

  // Fetch current row.
  const { data: current, error: fetchErr } = await client
    .from("admin_users")
    .select("id, role")
    .eq("id", id)
    .single();
  if (fetchErr || !current) {
    return NextResponse.json(
      { error: "Utilisateur introuvable." },
      { status: 404 }
    );
  }

  // Safeguard 2: cannot delete the last super_admin.
  if (current.role === "super_admin") {
    const { count } = await client
      .from("admin_users")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Impossible : au moins un super_admin doit rester." },
        { status: 400 }
      );
    }
  }

  try {
    const { error } = await client.from("admin_users").delete().eq("id", id);
    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "La table 'admin_users' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
            tableMissing: true,
          },
          { status: 501 }
        );
      }
      console.error("[admin/admin-users] delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        {
          error:
            "La table 'admin_users' n'existe pas. Exécutez le script SQL fourni dans le Supabase Dashboard.",
          tableMissing: true,
        },
        { status: 501 }
      );
    }
    console.error("[admin/admin-users] exception:", e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
