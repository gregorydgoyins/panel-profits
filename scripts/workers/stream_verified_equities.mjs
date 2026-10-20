import { createClient } from "@supabase/supabase-js";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vbcmjmakluyjnsmisoth.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required; no service credential fallback is permitted.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Open or initialize SQLite database
const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, "pp115k.sqlite");
const db = new DatabaseSync(dbPath);

// Ensure verified_equities schema and indexes
db.exec(`
  CREATE TABLE IF NOT EXISTS verified_equities (
    id TEXT PRIMARY KEY,
    series TEXT,
    issue_number TEXT,
    title TEXT,
    publication_year INTEGER,
    publisher TEXT,
    fmv_usd REAL,
    price_formatted TEXT,
    cover_url TEXT,
    ticker TEXT,
    origin_era TEXT,
    production_age TEXT,
    reference_grade TEXT,
    gregory_score REAL,
    delta_percent REAL,
    status TEXT,
    variant TEXT,
    source_product_id TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_v_fmv ON verified_equities(fmv_usd);
  CREATE INDEX IF NOT EXISTS idx_v_ticker ON verified_equities(ticker);
  CREATE INDEX IF NOT EXISTS idx_v_source_product_id ON verified_equities(source_product_id);
  CREATE INDEX IF NOT EXISTS idx_v_series_issue ON verified_equities(series, issue_number);
`);

function formatComicEquityTicker(series, issueNumber) {
  const cleanSeries = (series || "").toLowerCase().trim();
  const cleanNum = (issueNumber || "").toString().trim().replace(/[^0-9]/g, "");

  if (cleanSeries.includes("action comics") && cleanNum === "1") return "ACT01";
  if (cleanSeries.includes("detective comics") && cleanNum === "27") return "DET27";
  if (cleanSeries.includes("amazing fantasy") && cleanNum === "15") return "AF015";
  if (cleanSeries.includes("amazing spider-man") && cleanNum === "1") return "ASM01";
  if (cleanSeries.includes("amazing spider-man") && cleanNum === "300") return "AS300";
  if (cleanSeries.includes("x-men") && cleanNum === "1") return "XMN01";
  if (cleanSeries.includes("x-men") && cleanNum === "94") return "XMN94";
  if (cleanSeries.includes("giant-size x-men") && cleanNum === "1") return "GSX01";
  if (cleanSeries.includes("batman") && cleanNum === "1") return "BAT01";
  if (cleanSeries.includes("superman") && cleanNum === "1") return "SUP01";
  if (cleanSeries.includes("incredible hulk") && cleanNum === "181") return "HL181";

  let root = "CMX";
  if (cleanSeries.includes("action comics")) root = "ACT";
  else if (cleanSeries.includes("detective comics")) root = "DET";
  else if (cleanSeries.includes("amazing spider-man")) root = "ASM";
  else if (cleanSeries.includes("spider-man")) root = "SPD";
  else if (cleanSeries.includes("batman")) root = "BAT";
  else if (cleanSeries.includes("superman")) root = "SUP";
  else if (cleanSeries.includes("incredible hulk") || cleanSeries.includes("hulk")) root = "HLK";
  else if (cleanSeries.includes("x-men")) root = "XMN";
  else if (cleanSeries.includes("fantastic four")) root = "FF";
  else if (cleanSeries.includes("avengers")) root = "AVG";
  else if (cleanSeries.includes("tales of suspense")) root = "TOS";
  else if (cleanSeries.includes("journey into mystery")) root = "JIM";
  else if (cleanSeries.includes("strange tales")) root = "ST";
  else if (cleanSeries.includes("daredevil")) root = "DD";
  else if (cleanSeries.includes("iron man")) root = "IRM";
  else if (cleanSeries.includes("captain america")) root = "CAP";
  else if (cleanSeries.includes("thor")) root = "TH";
  else if (cleanSeries.includes("wonder woman")) root = "WW";
  else if (cleanSeries.includes("silver surfer")) root = "SS";
  else if (cleanSeries.includes("green lantern")) root = "GL";
  else if (cleanSeries.includes("aquaman")) root = "AQM";
  else if (cleanSeries.includes("spawn")) root = "SPW";
  else {
    const words = cleanSeries.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
    if (words.length === 1) root = words[0].slice(0, 3).toUpperCase();
    else if (words.length === 2) root = (words[0].slice(0, 2) + words[1].slice(0, 1)).toUpperCase();
    else if (words.length >= 3) root = words.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  }

  if (!cleanNum) {
    return root.padEnd(4, "X").slice(0, 5);
  }

  if (root.length >= 3) {
    const numPart = cleanNum.slice(-2).padStart(2, "0");
    return `${root.slice(0, 3)}${numPart}`.slice(0, 5);
  }

  const numPart = cleanNum.slice(-3).padStart(2, "0");
  return `${root}${numPart}`.slice(0, 5);
}

function determineEra(year) {
  if (!year || year >= 1985) return { originEra: "MODERN", productionAge: "modern" };
  if (year >= 1970) return { originEra: "BRONZE", productionAge: "bronze" };
  if (year >= 1956) return { originEra: "SILVER", productionAge: "silver" };
  return { originEra: "GOLDEN", productionAge: "golden" };
}

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO verified_equities (
    id, series, issue_number, title, publication_year, publisher,
    fmv_usd, price_formatted, cover_url, ticker, origin_era,
    production_age, reference_grade, gregory_score, delta_percent,
    status, variant, source_product_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

async function main() {
  const args = process.argv.slice(2);
  let targetTotal = Infinity;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--max" && args[i + 1]) {
      targetTotal = parseInt(args[i + 1], 10);
      i++;
    }
  }

  console.log(`Starting verified equities streaming harvester... (target: ${targetTotal === Infinity ? "ALL" : targetTotal})`);

  const initialCount = db.prepare("SELECT COUNT(*) as c FROM verified_equities").get().c;
  console.log(`Current verified_equities in SQLite: ${initialCount}`);

  const pageSize = 1000;
  let totalInserted = 0;
  let page = 0;
  let lastPpId = null;
  const startTime = Date.now();

  while (totalInserted < targetTotal) {
    page++;
    const t0 = Date.now();
    let query = supabase
      .from("comics")
      .select("id, series, issue_number, title, publication_year, publisher, pp_source_id, pp_grade_9_8_price, cover_storage_path")
      .not("pp_source_id", "is", null)
      .neq("pp_source_id", "")
      .gte("pp_grade_9_8_price", 17.01)
      .not("cover_storage_path", "is", null)
      .neq("cover_storage_path", "")
      .order("pp_source_id", { ascending: true })
      .limit(pageSize);

    if (lastPpId) {
      query = query.gt("pp_source_id", lastPpId);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`Error on page ${page}:`, error);
      break;
    }

    if (!data || data.length === 0) {
      console.log("No more comics returned from Supabase.");
      break;
    }

    lastPpId = data[data.length - 1].pp_source_id;

    // Filter and prepare records
    let eligible = 0;
    db.exec("BEGIN TRANSACTION");
    try {
      for (const row of data) {
        const rawPrice = Number(row.pp_grade_9_8_price);
        if (!rawPrice || rawPrice < 17.01) continue;

        const coverPath = row.cover_storage_path;
        if (!coverPath || typeof coverPath !== "string" || coverPath.trim() === "") continue;

        const coverUrl = `https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/${coverPath.trim().replace(/^\/+/, "")}`;
        const fmvUsd = Math.round(rawPrice * 100) / 100;
        const priceFormatted = `$${fmvUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const ticker = formatComicEquityTicker(row.series, row.issue_number);
        const { originEra, productionAge } = determineEra(row.publication_year);

        insertStmt.run(
          row.id,
          row.series || "Untitled",
          row.issue_number || "1",
          row.title || `${row.series} #${row.issue_number}`,
          row.publication_year || null,
          row.publisher || "Marvel / DC",
          fmvUsd,
          priceFormatted,
          coverUrl,
          ticker,
          originEra,
          productionAge,
          "9.8",
          192.5,
          0.45,
          "ACTIVE",
          null,
          row.pp_source_id ? String(row.pp_source_id) : null
        );
        eligible++;
        totalInserted++;

        if (totalInserted >= targetTotal) break;
      }
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      console.error("Error inserting batch:", err);
      break;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `Page ${page}: fetched ${data.length} comics in ${Date.now() - t0}ms -> +${eligible} eligible inserted (Total added: ${totalInserted}, Elapsed: ${elapsed}s, lastPpId: ${lastPpId})`
    );

    if (data.length < pageSize) {
      console.log("Reached end of table.");
      break;
    }
  }

  const finalCount = db.prepare("SELECT COUNT(*) as c FROM verified_equities").get().c;
  console.log(`\nStreaming complete! Total verified_equities in SQLite: ${finalCount}`);
}

main().catch(console.error);
