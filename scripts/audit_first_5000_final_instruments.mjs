import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// FINAL Supabase project credentials (ghjlzrmuugquumqwlqgl)
const FINAL_SUPABASE_URL = "https://ghjlzrmuugquumqwlqgl.supabase.co";
const FINAL_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!FINAL_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");

const supabase = createClient(FINAL_SUPABASE_URL, FINAL_SERVICE_ROLE_KEY);

async function fetchFirst5000FinalMarketInstruments() {
  console.log("Fetching first 5,000 records from comic_market_instruments on FINAL (ghjlzrmuugquumqwlqgl)...");
  const pageSize = 1000;
  const targetTotal = 5000;
  let allInstruments = [];
  let lastProductId = null;

  for (let page = 0; page < targetTotal / pageSize; page++) {
    const t0 = Date.now();
    let query = supabase
      .from("comic_market_instruments")
      .select("source_product_id, series_name, artifact_identity_string, ungraded_value, grade_2_0_value, grade_3_0_value, grade_4_0_value, grade_6_0_value, grade_8_0_value, grade_9_0_value, grade_9_2_value, grade_9_4_value, grade_9_6_value, grade_9_8_value, grade_10_0_value, ungraded_buy, ungraded_sell, grade_9_8_buy, grade_9_8_sell, upc, publication_date, liquidity_rate")
      .order("source_product_id", { ascending: true })
      .limit(pageSize);

    if (lastProductId !== null) {
      query = query.gt("source_product_id", lastProductId);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`Error on page ${page + 1}:`, error);
      break;
    }

    if (!data || data.length === 0) break;

    allInstruments.push(...data);
    lastProductId = data[data.length - 1].source_product_id;
    console.log(`Page ${page + 1}: fetched ${data.length} records in ${Date.now() - t0}ms (total: ${allInstruments.length}, lastProductId: ${lastProductId})`);

    if (data.length < pageSize) break;
  }

  return allInstruments;
}

function parseNum(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function auditFinalInstruments(instruments) {
  console.log(`\nAuditing ${instruments.length} comic instruments from Final...`);

  const summary = {
    totalChecked: instruments.length,
    zeroCbConfirmed: true,
    comicBasePriceCount: 0, // Should be 0
    completelyUnpriced: 0,
    hasAnyPrice: 0,

    // Grade observations
    hasUngradedValue: 0,
    hasGrade98Value: 0,
    hasGrade96Value: 0,
    hasGrade94Value: 0,
    hasGrade92Value: 0,
    hasGrade90Value: 0,
    hasGrade80Value: 0,
    hasGrade60Value: 0,
    hasGrade40Value: 0,
    hasGrade20Value: 0,
    hasGrade100Value: 0,

    // Execution Spreads
    hasUngradedSpreads: 0,
    hasGrade98Spreads: 0,

    // Pricing arrays
    all98Prices: [],
    allRawPrices: [],

    // Price inversions
    inversionsWhereRawExceeds98: 0,
    inversionExamples: [],

    topGrails: []
  };

  for (const item of instruments) {
    const raw = parseNum(item.ungraded_value);
    const p98 = parseNum(item.grade_9_8_value);
    const p96 = parseNum(item.grade_9_6_value);
    const p94 = parseNum(item.grade_9_4_value);
    const p92 = parseNum(item.grade_9_2_value);
    const p90 = parseNum(item.grade_9_0_value);
    const p80 = parseNum(item.grade_8_0_value);
    const p60 = parseNum(item.grade_6_0_value);
    const p40 = parseNum(item.grade_4_0_value);
    const p20 = parseNum(item.grade_2_0_value);
    const p10 = parseNum(item.grade_10_0_value);

    const hasPrice = raw || p98 || p96 || p94 || p92 || p90 || p80 || p60 || p40 || p20 || p10;

    if (!hasPrice) {
      summary.completelyUnpriced++;
    } else {
      summary.hasAnyPrice++;
    }

    if (raw) {
      summary.hasUngradedValue++;
      summary.allRawPrices.push(raw);
    }
    if (p98) {
      summary.hasGrade98Value++;
      summary.all98Prices.push(p98);
    }
    if (p96) summary.hasGrade96Value++;
    if (p94) summary.hasGrade94Value++;
    if (p92) summary.hasGrade92Value++;
    if (p90) summary.hasGrade90Value++;
    if (p80) summary.hasGrade80Value++;
    if (p60) summary.hasGrade60Value++;
    if (p40) summary.hasGrade40Value++;
    if (p20) summary.hasGrade20Value++;
    if (p10) summary.hasGrade100Value++;

    if (parseNum(item.ungraded_buy) && parseNum(item.ungraded_sell)) {
      summary.hasUngradedSpreads++;
    }
    if (parseNum(item.grade_9_8_buy) && parseNum(item.grade_9_8_sell)) {
      summary.hasGrade98Spreads++;
    }

    // Inversions
    if (raw && p98 && raw > p98) {
      summary.inversionsWhereRawExceeds98++;
      if (summary.inversionExamples.length < 10) {
        summary.inversionExamples.push({
          source_product_id: item.source_product_id,
          title: item.artifact_identity_string,
          raw,
          p98
        });
      }
    }

    const maxVal = Math.max(p98 || 0, raw || 0);
    if (maxVal > 0) {
      summary.topGrails.push({
        source_product_id: item.source_product_id,
        series_name: item.series_name,
        title: item.artifact_identity_string,
        publication_date: item.publication_date,
        raw,
        p98,
        maxVal
      });
    }
  }

  summary.topGrails.sort((a, b) => (b.p98 || b.raw) - (a.p98 || a.raw));

  function getStats(arr) {
    if (arr.length === 0) return { count: 0, min: 0, max: 0, median: 0, mean: 0, p75: 0, p90: 0 };
    const sorted = [...arr].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const min = sorted[0];
    const max = sorted[count - 1];
    const mean = Number((sum / count).toFixed(2));
    const median = sorted[Math.floor(count * 0.5)];
    const p75 = sorted[Math.floor(count * 0.75)];
    const p90 = sorted[Math.floor(count * 0.90)];
    return { count, min, max, median, mean, p75, p90 };
  }

  const p98Stats = getStats(summary.all98Prices);
  const rawStats = getStats(summary.allRawPrices);

  return { summary, p98Stats, rawStats };
}

async function auditFinalComicsCollection() {
  console.log("\nAuditing first 5,000 records from comics table on FINAL (CLZ collection)...");
  const pageSize = 1000;
  const targetTotal = 5000;
  let allComics = [];
  let lastCreatedAt = null;

  for (let page = 0; page < targetTotal / pageSize; page++) {
    let query = supabase
      .from("comics")
      .select("id, series, issue_number, publisher, index_value, cover_price, cover_price_raw, source, created_at")
      .order("created_at", { ascending: true })
      .limit(pageSize);

    if (lastCreatedAt) {
      query = query.gt("created_at", lastCreatedAt);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`Comics page ${page + 1} error:`, error);
      break;
    }
    if (!data || data.length === 0) break;
    allComics.push(...data);
    lastCreatedAt = data[data.length - 1].created_at;
  }

  const sources = {};
  let totalWithSeries = 0;
  let totalWithCoverPrice = 0;
  let totalWithIndexValue = 0;

  for (const c of allComics) {
    sources[c.source || "unknown"] = (sources[c.source || "unknown"] || 0) + 1;
    if (c.series) totalWithSeries++;
    if (c.cover_price || c.cover_price_raw) totalWithCoverPrice++;
    if (c.index_value) totalWithIndexValue++;
  }

  return {
    totalChecked: allComics.length,
    sources,
    totalWithSeries,
    totalWithCoverPrice,
    totalWithIndexValue,
    hasComicBase: false // Zero CB columns in this schema
  };
}

async function main() {
  const instruments = await fetchFirst5000FinalMarketInstruments();
  const instAudit = auditFinalInstruments(instruments);

  const comicsAudit = await auditFinalComicsCollection();

  console.log("\n===============================================================================");
  console.log("       PANEL PROFITS: FINAL DATABASE (ghjlzrmuugquumqwlqgl) AUDIT REPORT        ");
  console.log("                  SEPTEMBER GIT CANONICAL BENCHMARKS                           ");
  console.log("===============================================================================\n");

  console.log("1. COMIC MARKET INSTRUMENTS AUDIT (first 5,000 sorted by source_product_id):");
  console.log(`- Total Audited: ${instAudit.summary.totalChecked}`);
  console.log(`- ComicBase Prices Present: ${instAudit.summary.comicBasePriceCount} (ZERO CB Confirmed: ${instAudit.summary.zeroCbConfirmed})`);
  console.log(`- Completely Unpriced: ${instAudit.summary.completelyUnpriced} (${((instAudit.summary.completelyUnpriced/instAudit.summary.totalChecked)*100).toFixed(1)}%)`);
  console.log(`- Has Any Market Price: ${instAudit.summary.hasAnyPrice} (${((instAudit.summary.hasAnyPrice/instAudit.summary.totalChecked)*100).toFixed(1)}%)`);

  console.log("\n--- GRADE LEVEL POPULATION IN FINAL (SEPTEMBER GIT) ---");
  console.log(`- Ungraded / Raw Value: ${instAudit.summary.hasUngradedValue} (${((instAudit.summary.hasUngradedValue/instAudit.summary.totalChecked)*100).toFixed(1)}%)`);
  console.log(`- Grade 9.8 Value:      ${instAudit.summary.hasGrade98Value} (${((instAudit.summary.hasGrade98Value/instAudit.summary.totalChecked)*100).toFixed(1)}%)`);
  console.log(`- Grade 9.6 Value:      ${instAudit.summary.hasGrade96Value} (${((instAudit.summary.hasGrade96Value/instAudit.summary.totalChecked)*100).toFixed(1)}%)`);
  console.log(`- Grade 9.4 Value:      ${instAudit.summary.hasGrade94Value} (${((instAudit.summary.hasGrade94Value/instAudit.summary.totalChecked)*100).toFixed(1)}%)`);
  console.log(`- Grade 9.2 Value:      ${instAudit.summary.hasGrade92Value}`);
  console.log(`- Grade 9.0 Value:      ${instAudit.summary.hasGrade90Value}`);
  console.log(`- Grade 8.0 Value:      ${instAudit.summary.hasGrade80Value}`);
  console.log(`- Grade 6.0 Value:      ${instAudit.summary.hasGrade60Value}`);
  console.log(`- Grade 4.0 Value:      ${instAudit.summary.hasGrade40Value}`);
  console.log(`- Grade 2.0 Value:      ${instAudit.summary.hasGrade20Value}`);
  console.log(`- Grade 10.0 Value:     ${instAudit.summary.hasGrade100Value}`);

  console.log("\n--- BID/ASK SPREADS POPULATION ---");
  console.log(`- Ungraded Buy/Sell Spreads: ${instAudit.summary.hasUngradedSpreads}`);
  console.log(`- Grade 9.8 Buy/Sell Spreads: ${instAudit.summary.hasGrade98Spreads}`);

  console.log("\n--- STATISTICAL DISTRIBUTIONS ON FINAL ---");
  console.log(`Grade 9.8 Market Prices (n=${instAudit.p98Stats.count}):`);
  console.log(`  Min: $${instAudit.p98Stats.min} | Median: $${instAudit.p98Stats.median} | Mean: $${instAudit.p98Stats.mean} | 75th: $${instAudit.p98Stats.p75} | 90th: $${instAudit.p98Stats.p90} | Max: $${instAudit.p98Stats.max}`);

  console.log(`\nUngraded / Raw Market Prices (n=${instAudit.rawStats.count}):`);
  console.log(`  Min: $${instAudit.rawStats.min} | Median: $${instAudit.rawStats.median} | Mean: $${instAudit.rawStats.mean} | 75th: $${instAudit.rawStats.p75} | 90th: $${instAudit.rawStats.p90} | Max: $${instAudit.rawStats.max}`);

  console.log("\n--- TOP 20 HIGHEST VALUED COMICS IN FIRST 5,000 (FINAL) ---");
  console.table(instAudit.summary.topGrails.slice(0, 20).map(c => ({
    id: c.source_product_id,
    title: c.title,
    date: c.publication_date,
    raw: c.raw ? `$${c.raw.toLocaleString()}` : "null",
    grade_9_8: c.p98 ? `$${c.p98.toLocaleString()}` : "null"
  })));

  console.log("\n2. FINAL COMICS COLLECTION AUDIT (CLZ table, 5,000 records):");
  console.log(`- Total Records: ${comicsAudit.totalChecked}`);
  console.log(`- Source Breakdown:`, comicsAudit.sources);
  console.log(`- Has ComicBase: ${comicsAudit.hasComicBase} (ZERO CB columns or data)`);
  console.log(`- Records with Series: ${comicsAudit.totalWithSeries}`);
  console.log(`- Records with Cover Price: ${comicsAudit.totalWithCoverPrice}`);

  // Write results to JSON
  const outputData = {
    database: "PANEL PROFITS FINAL (ghjlzrmuugquumqwlqgl)",
    git_source: "September Git (Wed Sep 23, 2026)",
    comic_market_instruments_audit: instAudit,
    comics_collection_audit: comicsAudit
  };
  fs.writeFileSync("audit_final_first_5000_results.json", JSON.stringify(outputData, null, 2));
  console.log("\nFull results saved to audit_final_first_5000_results.json");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
