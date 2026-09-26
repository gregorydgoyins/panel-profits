const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { Client } = require("pg");

(async () => {

const root = path.resolve(process.cwd(), "..");
const sqlitePath = path.join(root, "shadow_database.sqlite");
const envPath = path.join(process.cwd(), ".env.local");

function readEnv(name) {
  const text = fs.readFileSync(envPath, "utf8");
  const line = text.split(/\r?\n/).find((candidate) => candidate.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, "") || null;
}

const databaseUrl = process.env.CLEAN_DATABASE_URL || process.env.SUPABASE_DIRECT_URL || readEnv("CLEAN_DATABASE_URL") || readEnv("SUPABASE_DIRECT_URL");
if (!databaseUrl) throw new Error("CLEAN_DATABASE_URL or SUPABASE_DIRECT_URL is required");
if (!fs.existsSync(sqlitePath)) throw new Error(`Local source database not found: ${sqlitePath}`);

const local = new DatabaseSync(sqlitePath);
const sourceRows = local.prepare(`
  SELECT scenario, seat_number, seat_type, origin_era, production_age,
         canonical_issue_id, title, issue_number, lineage, reference_grade,
         reference_fmv_usd, gregory_score, country_code, is_foreign,
         evidence_confidence, effective_date, status
  FROM ce70_constituents_final
  ORDER BY scenario, seat_number
`).all();
local.close();

const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query("BEGIN");
  const contract = await client.query("SELECT index_code FROM public.recovered_index_contracts WHERE index_code = $1", ["CE70"]);
  if (!contract.rowCount) throw new Error("Clean index contract CE70 is not deployed");

  for (const row of sourceRows) {
    const historicalIdentity = `${row.scenario}:${row.canonical_issue_id}:seat-${row.seat_number}`;
    const notes = JSON.stringify({
      source_file: "shadow_database.sqlite",
      source_table: "ce70_constituents_final",
      scenario: row.scenario,
      seat_type: row.seat_type,
      origin_era: row.origin_era,
      production_age: row.production_age,
      title: row.title,
      issue_number: row.issue_number,
      lineage: row.lineage,
      gregory_score: row.gregory_score,
      country_code: row.country_code,
      is_foreign: Boolean(row.is_foreign),
      evidence_confidence: row.evidence_confidence,
      status: row.status,
      reason_unresolved: "Historical local constituent identity has not been proven against one PPCF edition.",
    });
    await client.query(`
      INSERT INTO public.recovered_index_scenario_evidence
          (index_code, scenario, seat_number, historical_identity, historical_source,
          source_price, source_price_grade, source_price_origin, evidence, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
        ON CONFLICT (index_code, scenario, historical_identity) DO UPDATE SET
        historical_source = EXCLUDED.historical_source,
        source_price = EXCLUDED.source_price,
        source_price_grade = EXCLUDED.source_price_grade,
        source_price_origin = EXCLUDED.source_price_origin,
        evidence = EXCLUDED.evidence,
        notes = EXCLUDED.notes
    `, [
      "CE70",
      row.scenario,
      row.seat_number,
      historicalIdentity,
      "local:shadow_database.sqlite:ce70_constituents_final",
      row.reference_fmv_usd,
      row.reference_grade == null ? null : String(row.reference_grade),
      "LOCAL_FINAL_REGISTER_REFERENCE_ONLY",
      JSON.stringify([{ source: "shadow_database.sqlite", table: "ce70_constituents_final", effective_date: row.effective_date }]),
      notes,
    ]);
  }
  await client.query("COMMIT");
  console.log(JSON.stringify({ imported: sourceRows.length, index_code: "CE70", match_status: "UNRESOLVED" }));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
