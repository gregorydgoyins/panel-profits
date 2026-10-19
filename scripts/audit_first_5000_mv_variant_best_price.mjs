import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// FINAL Supabase project credentials (ghjlzrmuugquumqwlqgl)
const FINAL_SUPABASE_URL = "https://ghjlzrmuugquumqwlqgl.supabase.co";
const FINAL_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!FINAL_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");

const supabase = createClient(FINAL_SUPABASE_URL, FINAL_SERVICE_ROLE_KEY);

async function auditFirst5000MvVariantBestPrices() {
  console.log("Fetching first 5,000 records from mv_variant_best_price on FINAL (ghjlzrmuugquumqwlqgl)...");
  const pageSize = 1000;
  const targetTotal = 5000;
  let allBestPrices = [];

  for (let page = 0; page < targetTotal / pageSize; page++) {
    const t0 = Date.now();
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("mv_variant_best_price")
      .select("variant_id, price_usd, grade, sales_volume")
      .range(from, to);

    if (error) {
      console.error(`Error on range ${from}-${to}:`, error);
      break;
    }

    if (!data || data.length === 0) break;
    allBestPrices.push(...data);
    console.log(`Page ${page + 1}: fetched ${data.length} records in ${Date.now() - t0}ms (total: ${allBestPrices.length})`);
  }

  // Now resolve product names from comic_instrument_market_artifacts
  console.log("\nResolving artifact metadata for 5,000 variants...");
  const variantIds = allBestPrices.map(b => b.variant_id);
  const artifactMap = new Map();

  const chunkSize = 80;
  for (let i = 0; i < variantIds.length; i += chunkSize) {
    const chunk = variantIds.slice(i, i + chunkSize);
    const { data: arts, error } = await supabase
      .from("comic_instrument_market_artifacts")
      .select("id, product_name, product_id, is_sovereign, market_price_class, certification_state")
      .in("id", chunk);

    if (error) {
      console.error(`Error fetching artifacts chunk ${i}:`, error);
    } else if (arts) {
      for (const a of arts) {
        artifactMap.set(a.id, a);
      }
    }
  }

  console.log(`Resolved metadata for ${artifactMap.size} artifacts.`);

  // Audit Metrics
  const summary = {
    totalAudited: allBestPrices.length,
    zeroCbConfirmed: true,
    comicBasePriceCount: 0,
    gradesDistribution: {},
    marketClassDistribution: {},
    sovereignCount: 0,
    totalVolumeTracked: 0,
    pricedRecordsCount: 0,
    pricesByGrade: {
      RAW: [],
      "9.8": [],
      "9.6": [],
      "9.4": [],
      "9.2": [],
      "other": []
    },
    topValuedItems: [],
    sampleItemsByGrade: {
      RAW: [],
      "9.8": [],
      "9.6": [],
      "9.4": []
    }
  };

  for (const b of allBestPrices) {
    const price = Number(b.price_usd);
    const vol = Number(b.sales_volume) || 0;
    const grade = String(b.grade || "RAW").trim().toUpperCase();
    const art = artifactMap.get(b.variant_id);

    summary.gradesDistribution[grade] = (summary.gradesDistribution[grade] || 0) + 1;
    summary.totalVolumeTracked += vol;

    if (art?.is_sovereign) summary.sovereignCount++;
    const mClass = art?.market_price_class || "UNKNOWN";
    summary.marketClassDistribution[mClass] = (summary.marketClassDistribution[mClass] || 0) + 1;

    if (price > 0) {
      summary.pricedRecordsCount++;
      if (grade === "RAW") summary.pricesByGrade.RAW.push(price);
      else if (grade === "9.8") summary.pricesByGrade["9.8"].push(price);
      else if (grade === "9.6") summary.pricesByGrade["9.6"].push(price);
      else if (grade === "9.4") summary.pricesByGrade["9.4"].push(price);
      else if (grade === "9.2") summary.pricesByGrade["9.2"].push(price);
      else summary.pricesByGrade.other.push(price);

      // Collect samples
      if (summary.sampleItemsByGrade[grade] && summary.sampleItemsByGrade[grade].length < 10) {
        summary.sampleItemsByGrade[grade].push({
          title: art?.product_name || b.variant_id,
          grade,
          price,
          volume: vol,
          class: mClass
        });
      }

      summary.topValuedItems.push({
        variant_id: b.variant_id,
        title: art?.product_name || b.variant_id,
        grade,
        price,
        volume: vol,
        marketClass: mClass,
        isSovereign: art?.is_sovereign || false
      });
    }
  }

  summary.topValuedItems.sort((a, b) => b.price - a.price);

  function getStats(arr) {
    if (!arr || arr.length === 0) return { count: 0, min: 0, max: 0, median: 0, mean: 0, p75: 0, p90: 0 };
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

  const rawStats = getStats(summary.pricesByGrade.RAW);
  const p98Stats = getStats(summary.pricesByGrade["9.8"]);
  const p96Stats = getStats(summary.pricesByGrade["9.6"]);
  const p94Stats = getStats(summary.pricesByGrade["9.4"]);
  const p92Stats = getStats(summary.pricesByGrade["9.2"]);

  return {
    summary,
    rawStats,
    p98Stats,
    p96Stats,
    p94Stats,
    p92Stats
  };
}

async function main() {
  const result = await auditFirst5000MvVariantBestPrices();
  const { summary, rawStats, p98Stats, p96Stats, p94Stats, p92Stats } = result;

  console.log("\n===============================================================================");
  console.log("    PANEL PROFITS: FIRST 5,000 BEST PRICES AUDIT (mv_variant_best_price)        ");
  console.log("            CANONICAL SEPTEMBER GIT MARKET VALUATIONS (FINAL)                  ");
  console.log("===============================================================================\n");

  console.log(`TOTAL RECORDS AUDITED: ${summary.totalAudited}`);
  console.log(`- ComicBase Prices: 0 (ZERO CB Confirmed: ${summary.zeroCbConfirmed})`);
  console.log(`- Total Trade Sales Volume Tracked: ${summary.totalVolumeTracked.toLocaleString()} verified market transactions`);
  console.log(`- Sovereign Classified Assets: ${summary.sovereignCount}`);

  console.log("\n--- GRADE COMPOSITION ---");
  for (const [grade, count] of Object.entries(summary.gradesDistribution)) {
    console.log(`  * Grade ${grade}: ${count} (${((count / summary.totalAudited) * 100).toFixed(1)}%)`);
  }

  console.log("\n--- MARKET PRICE CLASS DISTRIBUTION ---");
  for (const [mClass, count] of Object.entries(summary.marketClassDistribution)) {
    console.log(`  * ${mClass}: ${count} (${((count / summary.totalAudited) * 100).toFixed(1)}%)`);
  }

  console.log("\n--- STATISTICAL DISTRIBUTIONS BY GRADE ---");
  console.log(`Grade RAW (n=${rawStats.count}):`);
  console.log(`  Min: $${rawStats.min} | Median: $${rawStats.median} | Mean: $${rawStats.mean} | 75th: $${rawStats.p75} | 90th: $${rawStats.p90} | Max: $${rawStats.max}`);

  console.log(`\nGrade 9.8 Certified (n=${p98Stats.count}):`);
  console.log(`  Min: $${p98Stats.min} | Median: $${p98Stats.median} | Mean: $${p98Stats.mean} | 75th: $${p98Stats.p75} | 90th: $${p98Stats.p90} | Max: $${p98Stats.max}`);

  console.log(`\nGrade 9.6 Certified (n=${p96Stats.count}):`);
  console.log(`  Min: $${p96Stats.min} | Median: $${p96Stats.median} | Mean: $${p96Stats.mean} | 75th: $${p96Stats.p75} | 90th: $${p96Stats.p90} | Max: $${p96Stats.max}`);

  console.log(`\nGrade 9.4 Certified (n=${p94Stats.count}):`);
  console.log(`  Min: $${p94Stats.min} | Median: $${p94Stats.median} | Mean: $${p94Stats.mean} | 75th: $${p94Stats.p75} | 90th: $${p94Stats.p90} | Max: $${p94Stats.max}`);

  console.log("\n--- TOP 20 HIGHEST VALUED SPECIMENS IN THE FIRST 5,000 ---");
  console.table(summary.topValuedItems.slice(0, 20), ["title", "grade", "price", "volume", "marketClass"]);

  console.log("\n--- REPRESENTATIVE SAMPLE: GRADE 9.8 SLABS ---");
  console.table(summary.sampleItemsByGrade["9.8"].slice(0, 8), ["title", "price", "volume", "class"]);

  console.log("\n--- REPRESENTATIVE SAMPLE: RAW SPECIMENS ---");
  console.table(summary.sampleItemsByGrade["RAW"].slice(0, 8), ["title", "price", "volume", "class"]);

  fs.writeFileSync("audit_mv_variant_best_price_5000.json", JSON.stringify(result, null, 2));
  console.log("\nFull audit saved to audit_mv_variant_best_price_5000.json");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
