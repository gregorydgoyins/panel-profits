const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

function parseMaster(filePath) {
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter((line) => /^\|\s*\d+\s*\|/.test(line)).map((line) => {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const titleIssue = cells[2];
    const match = titleIssue.match(/^(.*?)(?:\s+#([^\s]+))?$/);
    return { seat: Number(cells[0]), title: match?.[1]?.trim() || titleIssue, issue: match?.[2] || null, year: cells[3], publisher: cells[4], status: cells[6] };
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
    const { rows: ppcf } = await client.query("SELECT ppcf.ppcf_id, ppcf.series_name, ppcf.issue_number, ppcf.variant_name, ppcf.edition_fingerprint, ppcf.publication_date, publisher.name AS publisher_name FROM public.ppcf_canonical_comics ppcf LEFT JOIN public.ppcf_gcd_series series ON series.gcd_series_id = ppcf.gcd_series_id LEFT JOIN public.ppcf_gcd_publishers publisher ON publisher.gcd_publisher_id = series.publisher_id WHERE ppcf.series_name IS NOT NULL AND ppcf.issue_number IS NOT NULL");
    const seats = parseMaster(path.join(root, "CE70_MASTER_INDEX.md"));
    const normalize = (value) => String(value || "").toLowerCase().replace(/^(the|a)\s+/, "").replace(/[^a-z0-9]+/g, "");
    const report = seats.map((seat) => {
      const titleIssue = ppcf.filter((record) => normalize(record.series_name) === normalize(seat.title) && String(record.issue_number).trim() === String(seat.issue).trim());
      const yearMatches = titleIssue.filter((record) => String(record.publication_date || "").includes(String(seat.year || "")));
      const publisherMatches = yearMatches.filter((record) => !seat.publisher || !record.publisher_name || normalize(record.publisher_name).includes(normalize(seat.publisher)) || normalize(seat.publisher).includes(normalize(record.publisher_name)));
      const candidates = publisherMatches.length ? publisherMatches : yearMatches.length ? yearMatches : titleIssue;
      return { ...seat, titleIssueCount: titleIssue.length, yearCount: yearMatches.length, candidateCount: candidates.length, candidates: candidates.slice(0, 8).map((candidate) => ({ ppcf_id: candidate.ppcf_id, variant_name: candidate.variant_name, edition_fingerprint: candidate.edition_fingerprint, publication_date: candidate.publication_date, publisher_name: candidate.publisher_name })) };
    });
    const counts = report.reduce((summary, row) => { summary[row.candidateCount === 0 ? "unmatched" : row.candidateCount === 1 ? "unique" : "ambiguous"] += 1; return summary; }, { unique: 0, ambiguous: 0, unmatched: 0 });
    console.log(JSON.stringify({ seats: seats.length, counts, report }, null, 2));
  } finally {
    await client.end();
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
