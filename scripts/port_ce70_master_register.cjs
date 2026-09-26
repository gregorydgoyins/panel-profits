const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

(async () => {
  const root = path.resolve(process.cwd(), "..");
  const envText = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  const envValue = (name) => envText.split(/\r?\n/).find((line) => line.startsWith(`${name}=`))?.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, "") || null;
  const databaseUrl = process.env.CLEAN_DATABASE_URL || process.env.SUPABASE_DIRECT_URL || envValue("CLEAN_DATABASE_URL") || envValue("SUPABASE_DIRECT_URL");
  if (!databaseUrl) throw new Error("CLEAN_DATABASE_URL or SUPABASE_DIRECT_URL is required");

  const sourceFile = path.join(root, "CE70_MASTER_INDEX.md");
  const rows = fs.readFileSync(sourceFile, "utf8").split(/\r?\n/).filter((line) => /^\|\s*\d+\s*\|/.test(line)).map((line) => {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const seatNumber = Number(cells[0]);
    const status = cells[6] || "unresolved";
    return {
      seatNumber,
      historicalIdentity: `CE70_MASTER:seat-${seatNumber}`,
      matchStatus: status === "vacant" ? "VACANT" : "UNRESOLVED",
      notes: {
        source_file: "CE70_MASTER_INDEX.md",
        seat: seatNumber,
        era: cells[1],
        title_issue: cells[2],
        year: cells[3],
        publisher: cells[4],
        creators: cells[5],
        status,
        gregory_score: cells[7],
        dossier: cells[9],
        reason_unresolved: status === "vacant" ? "Explicit vacant master seat." : "Master seat has not been matched to a PPCF edition.",
      },
    };
  });
  if (rows.length !== 70) throw new Error(`Expected 70 master seats, found ${rows.length}`);

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query("BEGIN");
    for (const row of rows) {
      await client.query(`
        INSERT INTO public.recovered_index_constituents
          (index_code, seat_number, historical_identity, historical_source, match_status, evidence, notes)
        VALUES ('CE70', $1, $2, 'local:CE70_MASTER_INDEX.md', $3, $4::jsonb, $5::jsonb)
        ON CONFLICT (index_code, seat_number) DO UPDATE SET
          historical_identity = EXCLUDED.historical_identity,
          historical_source = EXCLUDED.historical_source,
          match_status = EXCLUDED.match_status,
          evidence = EXCLUDED.evidence,
          notes = EXCLUDED.notes
      `, [row.seatNumber, row.historicalIdentity, row.matchStatus, JSON.stringify([{ source: "CE70_MASTER_INDEX.md", seat: row.seatNumber }]), JSON.stringify(row.notes)]);
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ imported: rows.length, named: rows.filter((row) => row.matchStatus === "UNRESOLVED").length, vacant: rows.filter((row) => row.matchStatus === "VACANT").length }));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
