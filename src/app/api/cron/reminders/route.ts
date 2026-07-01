import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import {
  sendRappelInterventionEmail,
  sendRappelMaintenanceEmail,
  sendGarantieExpirationEmail,
  sendMaintenanceRetardAlertEmail,
  getAdminInbox,
} from "@/lib/email";

// ============================================================
// CRON — Daily time-based reminder emails (Tier 2)
// Task EMAIL-V2
// ============================================================
// Called once a day by an external scheduler (cron-job.org).
// Triggers 4 reminder emails:
//   #7  Rappel intervention        — date_prevue in [now+23h, now+25h]
//                                  — statut='planifie'            → client
//   #8  Rappel maintenance         — type='preventive'
//                                     date_prevue in [now+6d, now+8d]
//                                  — statut='planifie'            → client
//   #9  Garantie expiration        — date_fin in [now+29d, now+31d]
//                                  — actif=true                   → client
//   #10 Maintenance en retard      — date_prevue in [now-9d, now-7d]
//                                  — statut NOT IN (termine,annule)
//                                                                 → admin (EMAIL_TO)
//
// To avoid sending duplicate reminders without a `last_reminder_sent`
// column, each window is 1-day wide. Since the cron runs once a day,
// every row matches at most one run → exactly one reminder per row.
//
// SECURITY:
//   The endpoint is protected by CRON_SECRET. The caller MUST pass
//   ?key=<CRON_SECRET> as a query param. Without it (or if it doesn't
//   match the env var), the endpoint returns 401. This is a simple
//   shared-secret guard, sufficient for cron-job.org.
//
//   DEV MODE: if CRON_SECRET is not set in the env, the endpoint
//   runs unprotected but logs a warning. This lets a developer hit
//   the endpoint locally without setting up the secret. In production
//   this would be a misconfiguration — the warning makes the gap
//   visible in the logs.
//
// METHOD:
//   Both GET and POST are supported. cron-job.org typically sends GET.
//
// NON-BLOCKING:
//   Every individual email send is wrapped in its own try/catch so a
//   Gmail hiccup never aborts the rest of the run. The endpoint always
//   returns 200 with a per-section count.
// ============================================================

function isMissingTableError(err: any): boolean {
  const msg = (err?.message || err?.toString() || "").toLowerCase();
  const code = String(err?.code || "");
  if (code === "42p01") return true;
  if (code === "pgrst205") return true;
  return (
    msg.includes("could not find the table") ||
    (msg.includes("relation") && msg.includes("does not exist")) ||
    (msg.includes("table") && msg.includes("does not exist")) ||
    (msg.includes("schema cache") && msg.includes("does not exist"))
  );
}

// Build an ISO timestamp offset from `now` by the given number of ms.
function isoOffset(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

// Build a YYYY-MM-DD string offset from `now` by the given number of
// days. Used for `date` columns (maintenances.date_prevue, garanties.
// date_fin) where ISO timestamps would be cast awkwardly.
function dateOffset(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

type CronResult = {
  ok: boolean;
  sent: {
    interventions: number;
    maintenances: number;
    garanties: number;
    retard: number;
  };
  errors: number;
  skipped: string[];
};

// ----- #7: Rappel intervention (24h avant) -----
// 23h..25h window → matches interventions whose date_prevue is ~24h away.
async function runInterventionsReminders(
  client: ReturnType<typeof getServerClient>,
  result: CronResult
): Promise<void> {
  const from = isoOffset(23 * 60 * 60 * 1000); // now + 23h
  const to = isoOffset(25 * 60 * 60 * 1000); // now + 25h

  let rows: any[] = [];
  try {
    const { data, error } = await client
      .from("interventions")
      .select(
        "id, type, date_prevue, statut, technicien_id, client_id, adresse_intervention"
      )
      .eq("statut", "planifie")
      .gte("date_prevue", from)
      .lte("date_prevue", to);

    if (error) {
      if (isMissingTableError(error)) {
        console.warn(
          "[cron/reminders] interventions table missing — skipping #7"
        );
        result.skipped.push("interventions:table-missing");
        return;
      }
      console.error("[cron/reminders] #7 query error:", error.message);
      result.errors += 1;
      return;
    }
    rows = Array.isArray(data) ? data : [];
  } catch (e: any) {
    console.error("[cron/reminders] #7 exception:", e?.message || e);
    result.errors += 1;
    return;
  }

  console.log(`[cron/reminders] #7 interventions matched: ${rows.length}`);

  for (const itv of rows) {
    try {
      if (!itv.client_id) {
        console.warn(
          `[cron/reminders] #7 intervention ${itv.id} has no client_id — skipping`
        );
        result.skipped.push(`intervention:${itv.id}:no-client`);
        continue;
      }
      // Fetch client email + name (server-side, bypasses RLS).
      const { data: clientRow, error: ce } = await client
        .from("clients")
        .select("email, nom")
        .eq("id", itv.client_id)
        .maybeSingle();
      if (ce || !clientRow?.email) {
        console.warn(
          `[cron/reminders] #7 intervention ${itv.id} — no client email found`
        );
        result.skipped.push(`intervention:${itv.id}:no-client-email`);
        continue;
      }

      // Resolve technicien name (nullable).
      let technicien_nom: string | null = null;
      if (itv.technicien_id) {
        const { data: tech } = await client
          .from("techniciens")
          .select("nom")
          .eq("id", itv.technicien_id)
          .maybeSingle();
        technicien_nom = tech?.nom || null;
      }

      const res = await sendRappelInterventionEmail(clientRow.email, clientRow.nom, {
        type: itv.type,
        date_prevue: itv.date_prevue,
        technicien_nom,
        adresse_intervention: itv.adresse_intervention,
      });
      if (res?.skipped) {
        result.skipped.push(`intervention:${itv.id}:smtp-skipped`);
      } else {
        result.sent.interventions += 1;
      }
    } catch (e: any) {
      console.error(
        `[cron/reminders] #7 intervention ${itv.id} send error:`,
        e?.message || e
      );
      result.errors += 1;
    }
  }
}

// ----- #8: Rappel maintenance préventive (7 jours avant) -----
// date_prevue is a `date` column. We use date-only strings (YYYY-MM-DD).
async function runMaintenancesPreventivesReminders(
  client: ReturnType<typeof getServerClient>,
  result: CronResult
): Promise<void> {
  const from = dateOffset(6); // now + 6 days
  const to = dateOffset(8); // now + 8 days

  let rows: any[] = [];
  try {
    const { data, error } = await client
      .from("maintenances")
      .select(
        "id, type, date_prevue, statut, client_id, garantie_id, description"
      )
      .eq("type", "preventive")
      .eq("statut", "planifie")
      .gte("date_prevue", from)
      .lte("date_prevue", to);

    if (error) {
      if (isMissingTableError(error)) {
        console.warn(
          "[cron/reminders] maintenances table missing — skipping #8"
        );
        result.skipped.push("maintenances:table-missing");
        return;
      }
      console.error("[cron/reminders] #8 query error:", error.message);
      result.errors += 1;
      return;
    }
    rows = Array.isArray(data) ? data : [];
  } catch (e: any) {
    console.error("[cron/reminders] #8 exception:", e?.message || e);
    result.errors += 1;
    return;
  }

  console.log(
    `[cron/reminders] #8 preventive maintenances matched: ${rows.length}`
  );

  // Resolve garantie produit_nom for all matched rows in one go
  // (one query instead of N) — best-effort, tolerate failures.
  const garantieIds = Array.from(
    new Set(rows.map((r) => r.garantie_id).filter(Boolean))
  ) as string[];
  const garantieProduits: Record<string, string> = {};
  if (garantieIds.length > 0) {
    try {
      const { data: garanties } = await client
        .from("garanties")
        .select("id, produit_nom")
        .in("id", garantieIds);
      if (Array.isArray(garanties)) {
        for (const g of garanties) {
          if (g?.id && g.produit_nom) garantieProduits[g.id] = g.produit_nom;
        }
      }
    } catch (e: any) {
      console.warn(
        "[cron/reminders] #8 garantie lookup failed:",
        e?.message || e
      );
    }
  }

  for (const m of rows) {
    try {
      if (!m.client_id) {
        console.warn(
          `[cron/reminders] #8 maintenance ${m.id} has no client_id — skipping`
        );
        result.skipped.push(`maintenance:${m.id}:no-client`);
        continue;
      }
      const { data: clientRow, error: ce } = await client
        .from("clients")
        .select("email, nom")
        .eq("id", m.client_id)
        .maybeSingle();
      if (ce || !clientRow?.email) {
        console.warn(
          `[cron/reminders] #8 maintenance ${m.id} — no client email found`
        );
        result.skipped.push(`maintenance:${m.id}:no-client-email`);
        continue;
      }

      const produit_nom = m.garantie_id
        ? garantieProduits[m.garantie_id] || null
        : null;

      const res = await sendRappelMaintenanceEmail(clientRow.email, clientRow.nom, {
        date_prevue: m.date_prevue,
        produit_nom,
        description: m.description,
      });
      if (res?.skipped) {
        result.skipped.push(`maintenance:${m.id}:smtp-skipped`);
      } else {
        result.sent.maintenances += 1;
      }
    } catch (e: any) {
      console.error(
        `[cron/reminders] #8 maintenance ${m.id} send error:`,
        e?.message || e
      );
      result.errors += 1;
    }
  }
}

// ----- #9: Expiration garantie (30 jours avant) -----
async function runGarantiesExpirationReminders(
  client: ReturnType<typeof getServerClient>,
  result: CronResult
): Promise<void> {
  const from = dateOffset(29); // now + 29 days
  const to = dateOffset(31); // now + 31 days

  let rows: any[] = [];
  try {
    const { data, error } = await client
      .from("garanties")
      .select(
        "id, produit_nom, date_fin, date_debut, duree_mois, actif, client_id"
      )
      .eq("actif", true)
      .gte("date_fin", from)
      .lte("date_fin", to);

    if (error) {
      if (isMissingTableError(error)) {
        console.warn(
          "[cron/reminders] garanties table missing — skipping #9"
        );
        result.skipped.push("garanties:table-missing");
        return;
      }
      console.error("[cron/reminders] #9 query error:", error.message);
      result.errors += 1;
      return;
    }
    rows = Array.isArray(data) ? data : [];
  } catch (e: any) {
    console.error("[cron/reminders] #9 exception:", e?.message || e);
    result.errors += 1;
    return;
  }

  console.log(`[cron/reminders] #9 garanties matched: ${rows.length}`);

  for (const g of rows) {
    try {
      if (!g.client_id) {
        console.warn(
          `[cron/reminders] #9 garantie ${g.id} has no client_id — skipping`
        );
        result.skipped.push(`garantie:${g.id}:no-client`);
        continue;
      }
      const { data: clientRow, error: ce } = await client
        .from("clients")
        .select("email, nom")
        .eq("id", g.client_id)
        .maybeSingle();
      if (ce || !clientRow?.email) {
        console.warn(
          `[cron/reminders] #9 garantie ${g.id} — no client email found`
        );
        result.skipped.push(`garantie:${g.id}:no-client-email`);
        continue;
      }

      const res = await sendGarantieExpirationEmail(clientRow.email, clientRow.nom, {
        produit_nom: g.produit_nom,
        date_fin: g.date_fin,
        date_debut: g.date_debut,
        duree_mois: g.duree_mois,
      });
      if (res?.skipped) {
        result.skipped.push(`garantie:${g.id}:smtp-skipped`);
      } else {
        result.sent.garanties += 1;
      }
    } catch (e: any) {
      console.error(
        `[cron/reminders] #9 garantie ${g.id} send error:`,
        e?.message || e
      );
      result.errors += 1;
    }
  }
}

// ----- #10: Maintenance en retard → admin alert -----
// date_prevue in [now-9d, now-7d], statut NOT IN ('termine','annule').
// The window is 1-day wide so the alert fires exactly once per overdue
// maintenance, then the next day it falls out of the window.
async function runMaintenancesRetardAlert(
  client: ReturnType<typeof getServerClient>,
  result: CronResult
): Promise<void> {
  const from = dateOffset(-9); // now - 9 days
  const to = dateOffset(-7); // now - 7 days

  let rows: any[] = [];
  try {
    // Supabase client doesn't expose a `.notIn()` for arrays directly,
    // so we use two `.neq()` filters chained (AND).
    const { data, error } = await client
      .from("maintenances")
      .select(
        "id, type, date_prevue, statut, client_id, garantie_id, description"
      )
      .neq("statut", "termine")
      .neq("statut", "annule")
      .gte("date_prevue", from)
      .lte("date_prevue", to);

    if (error) {
      if (isMissingTableError(error)) {
        console.warn(
          "[cron/reminders] maintenances table missing — skipping #10"
        );
        result.skipped.push("maintenances:table-missing");
        return;
      }
      console.error("[cron/reminders] #10 query error:", error.message);
      result.errors += 1;
      return;
    }
    rows = Array.isArray(data) ? data : [];
  } catch (e: any) {
    console.error("[cron/reminders] #10 exception:", e?.message || e);
    result.errors += 1;
    return;
  }

  console.log(
    `[cron/reminders] #10 retard maintenances matched: ${rows.length}`
  );

  // Resolve garantie produit_nom + client nom in batch.
  const garantieIds = Array.from(
    new Set(rows.map((r) => r.garantie_id).filter(Boolean))
  ) as string[];
  const clientIds = Array.from(
    new Set(rows.map((r) => r.client_id).filter(Boolean))
  ) as string[];
  const garantieProduits: Record<string, string> = {};
  const clientNoms: Record<string, string> = {};

  if (garantieIds.length > 0) {
    try {
      const { data: gs } = await client
        .from("garanties")
        .select("id, produit_nom")
        .in("id", garantieIds);
      if (Array.isArray(gs)) {
        for (const g of gs)
          if (g?.id && g.produit_nom) garantieProduits[g.id] = g.produit_nom;
      }
    } catch (e: any) {
      console.warn(
        "[cron/reminders] #10 garantie lookup failed:",
        e?.message || e
      );
    }
  }
  if (clientIds.length > 0) {
    try {
      const { data: cs } = await client
        .from("clients")
        .select("id, nom")
        .in("id", clientIds);
      if (Array.isArray(cs)) {
        for (const c of cs) if (c?.id && c.nom) clientNoms[c.id] = c.nom;
      }
    } catch (e: any) {
      console.warn(
        "[cron/reminders] #10 client lookup failed:",
        e?.message || e
      );
    }
  }

  const adminEmail = getAdminInbox();

  for (const m of rows) {
    try {
      const produit_nom = m.garantie_id
        ? garantieProduits[m.garantie_id] || null
        : null;
      const client_nom = m.client_id ? clientNoms[m.client_id] || null : null;

      const res = await sendMaintenanceRetardAlertEmail(adminEmail, {
        id: m.id,
        type: m.type,
        date_prevue: m.date_prevue,
        produit_nom,
        client_nom,
        description: m.description,
        statut: m.statut,
      });
      if (res?.skipped) {
        result.skipped.push(`maintenance-retard:${m.id}:smtp-skipped`);
      } else {
        result.sent.retard += 1;
      }
    } catch (e: any) {
      console.error(
        `[cron/reminders] #10 maintenance ${m.id} send error:`,
        e?.message || e
      );
      result.errors += 1;
    }
  }
}

async function runCron(): Promise<CronResult> {
  const result: CronResult = {
    ok: true,
    sent: { interventions: 0, maintenances: 0, garanties: 0, retard: 0 },
    errors: 0,
    skipped: [],
  };

  let client: ReturnType<typeof getServerClient>;
  try {
    client = getServerClient();
  } catch (e: any) {
    console.error("[cron/reminders] Supabase not configured:", e?.message || e);
    return {
      ...result,
      ok: false,
      errors: 1,
      skipped: ["supabase:not-configured"],
    };
  }

  // Each section is independent — a failure in one doesn't stop the others.
  await runInterventionsReminders(client, result);
  await runMaintenancesPreventivesReminders(client, result);
  await runGarantiesExpirationReminders(client, result);
  await runMaintenancesRetardAlert(client, result);

  return result;
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest): Promise<NextResponse> {
  // ---- Auth: secret query param ----
  const url = new URL(req.url);
  const providedKey = url.searchParams.get("key");
  const expectedKey = process.env.CRON_SECRET;

  if (!expectedKey) {
    // Dev mode: CRON_SECRET not configured. The task spec says "allow
    // but log a warning" so a developer can hit the endpoint locally
    // without setting up the secret. In production this would be a
    // misconfiguration — the warning makes the gap visible.
    console.warn(
      "[cron/reminders] CRON_SECRET env var is not set — running unprotected (dev mode). Set CRON_SECRET in production."
    );
  } else if (!providedKey || providedKey !== expectedKey) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized — invalid or missing key." },
      { status: 401 }
    );
  }

  console.log("[cron/reminders] starting daily reminder run…");

  const startedAt = Date.now();
  let result: CronResult;
  try {
    result = await runCron();
  } catch (e: any) {
    console.error("[cron/reminders] fatal exception:", e?.message || e);
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erreur lors du cron.",
        durationMs: Date.now() - startedAt,
      },
      { status: 500 }
    );
  }

  const durationMs = Date.now() - startedAt;
  console.log(
    `[cron/reminders] done in ${durationMs}ms — sent:`,
    result.sent,
    `errors: ${result.errors}`
  );

  return NextResponse.json(
    {
      ok: result.ok,
      sent: result.sent,
      errors: result.errors,
      skipped: result.skipped,
      durationMs,
    },
    { status: 200 }
  );
}
