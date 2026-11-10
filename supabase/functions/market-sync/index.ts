// market-sync: imports new operator draws and fills in results, per market.
// Called by pg_cron (migration *_market_sync_cron.sql) with the service-role key:
//   POST /functions/v1/market-sync  {"kind": "import" | "results", "market"?: "se"}
// Scores are not computed here: updating columns.games fires the scoring triggers.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import { serverAdapters } from "./adapters.ts";
import { drawToColumnRow, mergeResults, refreshFixtures } from "../_shared/merge.ts";
import type { ServerAdapter, StoredGame } from "../_shared/types.ts";

type Kind = "import" | "results";
type Stats = Record<string, number>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function importDraws(db: SupabaseClient, adapter: ServerAdapter): Promise<Stats> {
  const draws = await adapter.listOpenDraws();
  const { data: existing, error } = await db
    .from("columns")
    .select("id, external_draw_id, games, source_status")
    .eq("market", adapter.market)
    .in("external_draw_id", draws.map((d) => d.externalId));
  if (error) throw error;

  const stats: Stats = { draws_seen: draws.length, columns_created: 0, columns_refreshed: 0 };
  for (const draw of draws) {
    const have = existing?.find((c) => c.external_draw_id === draw.externalId);
    if (!have) {
      // the insert trigger offers the new column to every group of the market
      const { error } = await db.from("columns").insert(drawToColumnRow(adapter.market, draw, adapter.limits));
      if (error) throw error;
      stats.columns_created++;
    } else if (have.source_status === "open") {
      const { error } = await db
        .from("columns")
        .update({ deadline: draw.deadline, games: refreshFixtures(have.games as StoredGame[], draw), synced_at: new Date().toISOString() })
        .eq("id", have.id);
      if (error) throw error;
      stats.columns_refreshed++;
    }
  }
  return stats;
}

async function syncResults(db: SupabaseClient, adapter: ServerAdapter): Promise<Stats> {
  // closed for betting but not final yet
  const { data: columns, error } = await db
    .from("columns")
    .select("id, external_draw_id, games")
    .eq("market", adapter.market)
    .not("external_draw_id", "is", null)
    .or("source_status.is.null,source_status.neq.final")
    .lte("deadline", new Date().toISOString());
  if (error) throw error;

  const stats: Stats = { columns_checked: columns?.length ?? 0, results_updated: 0, columns_final: 0 };
  for (const column of columns ?? []) {
    const dto = await adapter.getResults(column.external_draw_id!);
    const { games, updated, final } = mergeResults(column.games as StoredGame[], dto);
    const { error } = await db
      .from("columns")
      .update({ games, source_status: final ? "final" : "closed", synced_at: new Date().toISOString() })
      .eq("id", column.id);
    if (error) throw error;
    stats.results_updated += updated;
    if (final) stats.columns_final++;
  }
  return stats;
}

async function run(db: SupabaseClient, market: string, kind: Kind) {
  const { data: runRow } = await db.from("sync_runs").insert({ market, kind }).select("id").single();
  const finish = (status: string, message: string | null, stats: Stats | null = null) =>
    db.from("sync_runs").update({ status, message, stats, finished_at: new Date().toISOString() }).eq("id", runRow!.id);

  const adapter = serverAdapters[market];
  if (!adapter) {
    await finish("skipped", "no server adapter for this market");
    return { market, kind, status: "skipped" };
  }
  try {
    const stats = kind === "import" ? await importDraws(db, adapter) : await syncResults(db, adapter);
    await finish("ok", null, stats);
    return { market, kind, status: "ok", stats };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await finish("error", message.slice(0, 2000));
    return { market, kind, status: "error", message };
  }
}

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (req.headers.get("Authorization") !== `Bearer ${serviceKey}`) return json({ error: "forbidden" }, 403);

  const body = await req.json().catch(() => ({}));
  const kind: Kind = body.kind === "import" ? "import" : "results";
  const db = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, { auth: { persistSession: false } });

  // every market that has groups, or only the one asked for
  let markets: string[] = body.market ? [String(body.market)] : [];
  if (!markets.length) {
    const { data, error } = await db.from("groups").select("market");
    if (error) return json({ error: error.message }, 500);
    markets = [...new Set((data ?? []).map((g) => g.market as string))];
  }

  const results = [];
  for (const market of markets) results.push(await run(db, market, kind));
  return json({ results });
});
