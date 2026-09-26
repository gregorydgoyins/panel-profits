const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

function readMaster(filePath) {
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter((line) => /^\|\s*\d+\s*\|/.test(line)).map((line) => {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const match = cells[2].match(/^(.*?)(?:\s+#([^\s]+))?$/);
    return { seat: Number(cells[0]), title: match?.[1]?.trim() || cells[2], issue: match?.[2] || null, year: cells[3], publisher: cells[4], status: cells[6] };
  }).filter((row) => row.status !== "vacant");
}

(async () => {
  const root = path.resolve(process.cwd(), "..");
  const envText = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  const envValue = (name) => envText.split(/\r?\n/).find((line) => line.startsWith(`${name}=`))?.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, "") || null;
  const databaseUrl = process.env.CLEAN_DATABASE_URL || process.env.SUPABASE_DIRECT_URL || envValue("CLEAN_DATABASE_URL") || envValue("SUPABASE_DIRECT_URL");
  if (!databaseUrl) throw new Error("CLEAN_DATABASE_URL or SUPABASE_DIRECT_URL is required");
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const seats = readMaster(path.join(root, "CE70_MASTER_INDEX.md"));
    const { rows: ppcf } = await client.query("SELECT ppcf.ppcf_id, ppcf.series_name, ppcf.issue_number, ppcf.publication_date, publisher.name AS publisher_name FROM public.ppcf_canonical_comics ppcf LEFT JOIN public.ppcf_gcd_series series ON series.gcd_series_id = ppcf.gcd_series_id LEFT JOIN public.ppcf_gcd_publishers publisher ON publisher.gcd_publisher_id = series.publisher_id WHERE ppcf.series_name IS NOT NULL AND ppcf.issue_number IS NOT NULL");
    const normalize = (value) => String(value || "").toLowerCase().replace(/^(the|a)\s+/, "").replace(/[^a-z0-9]+/g, "");
    const matches = seats.map((seat) => {
      const titleIssue = ppcf.filter((record) => normalize(record.series_name) === normalize(seat.title) && String(record.issue_number).trim() === String(seat.issue).trim());
      const yearMatches = titleIssue.filter((record) => String(record.publication_date || "").includes(String(seat.year || "")));
      const publisherMatches = yearMatches.filter((record) => !seat.publisher || !record.publisher_name || normalize(record.publisher_name).includes(normalize(seat.publisher)) || normalize(seat.publisher).includes(normalize(record.publisher_name)));
      return { seat, candidates: publisherMatches.length ? publisherMatches : yearMatches.length ? yearMatches : titleIssue };
    }).filter((entry) => entry.candidates.length === 1);
    await client.query("BEGIN");
    for (const { seat, candidates } of matches) {
      await client.query(`
        UPDATE public.recovered_index_constituents
        SET ppcf_id = $1, match_status = 'MATCHED_PPCF', match_method = 'EXACT_SERIES_ISSUE_YEAR_PUBLISHER_UNIQUE'
        WHERE index_code = 'CE70' AND seat_number = $2
      `, [candidates[0].ppcf_id, seat.seat]);
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ promoted: matches.length, remaining_named_unresolved: seats.length - matches.length }));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
