#!/usr/bin/env node
/**
 * scripts/ingest_gpa_batch_json.mjs
 *
 * Clean, idempotent Supabase ingester for GPAnalysis Universal batch JSON files
 * (produced by our CE70 GPAnalysis collector).
 *
 * Usage:
 *   node scripts/ingest_gpa_batch_json.mjs <path-to-batch.json>
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
for (const envFile of [".env.local", ".env"]) {
  const p = path.join(ROOT, envFile);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const MONTH_MAP = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function parseMonthYear(str) {
  const m = String(str || "").trim().match(/^([A-Za-z]{3})\s+(\d{4})$/);
  if (!m) return null;
  const mm = MONTH_MAP[m[1]];
  if (!mm) return null;
  return `${m[2]}-${mm}-01`;
}

const BENCHMARK_COL = {
  "2.0": "cgc_2_0", "3.0": "cgc_3_0", "4.0": "cgc_4_0", "5.0": "cgc_5_0",
  "6.0": "cgc_6_0", "7.0": "cgc_7_0", "8.0": "cgc_8_0", "9.0": "cgc_9_0",
  "9.2": "cgc_9_2", "9.4": "cgc_9_4", "9.6": "cgc_9_6", "9.8": "cgc_9_8",
};

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node scripts/ingest_gpa_batch_json.mjs <batch.json>");
    process.exit(1);
  }
  const batch = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const dossierPath = path.join(ROOT, "lib/wiki/ce70-constitutional-dossiers.json");
  const dossiers = JSON.parse(fs.readFileSync(dossierPath, "utf8"));
  const dossierBySeat = Object.fromEntries(dossiers.map((d) => [d.seatNumber, d]));

  let dossierChanged = false;
  let totalSales = 0;

  for (const item of batch) {
    const d = dossierBySeat[item.seat];
    if (!d) {
      console.warn(`[skip] Unknown seat #${item.seat}`);
      continue;
    }
    const rows = Array.isArray(item.uniRows) ? item.uniRows : [];
    if (rows.length === 0) {
      console.warn(`[skip] Seat #${item.seat} (${d.titleLine}) has 0 uniRows`);
      continue;
    }

    // Ensure catalog_comics row exists (use existing ppSourceId, else create canonical PPCF-ID row)
    let cid = d.ppSourceId ? String(d.ppSourceId) : d.ppcfId ? String(d.ppcfId) : null;
    if (!cid) {
      console.warn(`[skip] Seat #${item.seat} has neither ppSourceId nor ppcfId`);
      continue;
    }

    const { data: ccExists } = await sb.from("catalog_comics").select("id").eq("id", cid).maybeSingle();
    if (!ccExists) {
      const issueClean = String(d.issueNumber || "").replace(/^#/, "").trim();
      const { error: insCcErr } = await sb.from("catalog_comics").insert({
        id: cid,
        lookup_key: `${String(d.series).toLowerCase()}:${issueClean}`,
        series_name: d.series,
        product_name: d.titleLine,
        issue_number: issueClean,
        release_date: `${d.year}-01-01`,
        genre: "",
        barcode_upc: "",
        ebay_epid: "",
        sales_volume: rows.length,
        is_variant: false,
        variant_type: "DIRECT",
        is_sovereign_eligible: true,
        source_payload: { highres_cover_url: d.coverUrl || null, gpa_url: item.gpaUrl || null },
      });
      if (insCcErr) {
        console.warn(`[warn] catalog_comics insert Seat #${item.seat}: ${insCcErr.message}`);
        continue;
      }
      console.log(`  [Created catalog_comics] Seat #${item.seat} -> id=${cid} (${d.titleLine})`);
    }

    if (d.ppSourceId !== cid) {
      d.ppSourceId = cid;
      d.detailUrl = `/comics/${cid}`;
      dossierChanged = true;
    }

    // Ensure ppcf_source_links has PANEL_PROFITS link
    if (d.ppcfId) {
      const { data: exLink } = await sb
        .from("ppcf_source_links")
        .select("id")
        .eq("ppcf_id", d.ppcfId)
        .eq("source_system", "PANEL_PROFITS")
        .eq("source_record_id", cid)
        .maybeSingle();
      if (!exLink) {
        await sb.from("ppcf_source_links").insert({
          ppcf_id: d.ppcfId,
          source_system: "PANEL_PROFITS",
          source_record_id: cid,
          source_role: "CORROBORATION",
        });
      }
    }

    // Normalize & deduplicate rows into verified_completed_sales
    const issueClean = String(d.issueNumber || "").replace(/^#/, "").trim();
    const lookupKey = `${String(d.series).toLowerCase()}:${issueClean}`;
    const vcsRows = [];
    const obsRows = [];
    const latestByGrade = new Map();

    for (const r of rows) {
      const gNum = Number(r.grade);
      const price = Number(r.lastSalePrice);
      const isoDate = parseMonthYear(r.lastSaleDate);
      if (!Number.isFinite(gNum) || gNum < 0.5 || gNum > 10.0) continue;
      if (!Number.isFinite(price) || price <= 0) continue;
      if (!isoDate) continue;

      const gKey = gNum.toFixed(1);
      const noteClean = String(r.note || "").trim();
      const noteSlug = noteClean ? "-" + noteClean.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 14) : "";
      const saleId = `gpa-${cid}-${gKey}-${isoDate}-${Math.round(price)}${noteSlug}`;

      vcsRows.push({
        sale_id: saleId,
        catalog_id: cid,
        lookup_key: lookupKey,
        price_usd: price,
        sold_at: `${isoDate}T16:00:00+00:00`,
        certified_grade: gNum,
        grading_company: "CGC",
        label_type: "Universal",
        venue: "GPAnalysis",
        source_url: item.gpaUrl || "https://comics.gpanalysis.com/",
        raw_title: `${d.titleLine} CGC ${gKey} ${noteClean || "Universal"}`,
      });

      if (d.ppcfId) {
        obsRows.push({
          ppcf_id: d.ppcfId,
          source_system: "PANEL_PROFITS",
          source_record_id: saleId,
          price_field: `GPAnalysis CGC ${gKey} ${noteClean || "Universal"}`,
          grade_label: gKey,
          amount: price,
          currency: "USD",
          observed_at: isoDate,
          source_locator: item.gpaUrl || "https://comics.gpanalysis.com/",
          dedupe_key: `${d.ppcfId}|PANEL_PROFITS|${saleId}|${gKey}|${price}|USD|${isoDate}`,
        });
      }

      // Track best benchmark per grade (prefer clean standard Direct non-signed/non-cracked/non-newsstand, latest date)
      const isSecondary = /signed|jsa|autograph|cracked|trimmed|manufacturing error|newsstand/i.test(noteClean);
      const prev = latestByGrade.get(gKey);
      if (
        !prev ||
        (prev.isSecondary && !isSecondary) ||
        (prev.isSecondary === isSecondary && isoDate > prev.isoDate) ||
        (prev.isSecondary === isSecondary && isoDate === prev.isoDate && price > prev.price)
      ) {
        latestByGrade.set(gKey, { price, isoDate, isSecondary });
      }
    }

    if (vcsRows.length === 0) continue;

    // Dedupe by sale_id inside the batch
    const uniqVcs = [...new Map(vcsRows.map((x) => [x.sale_id, x])).values()];
    const { error: vcsErr } = await sb.from("verified_completed_sales").upsert(uniqVcs, { onConflict: "sale_id" });
    if (vcsErr) {
      console.warn(`[warn] vcs upsert Seat #${item.seat}: ${vcsErr.message}`);
      continue;
    }
    totalSales += uniqVcs.length;

    // Update catalog_comics benchmark columns strictly for verified grades & zero-out phantom 9.8/9.6 when CGC pop = 0
    const seriesVars = [d.series, d.series.replace(/^The\s+/i, ""), `${d.series} Comics`];
    const { data: cgcRows } = await sb
      .from("cgc_population")
      .select("pop,year")
      .in("title", seriesVars)
      .eq("issue_number", issueClean)
      .eq("is_base", true)
      .limit(5);
    const cgcRow = (cgcRows || []).find((r) => Math.abs(Number(r.year) - Number(d.year)) <= 1) || cgcRows?.[0] || null;
    const pop = cgcRow?.pop || null;

    const ccPatch = {};
    for (const [gKey, info] of latestByGrade.entries()) {
      const col = BENCHMARK_COL[gKey];
      if (!col) continue;
      if (pop && parseFloat(gKey) >= 9.6 && (pop[gKey.replace(".", "_")] ?? 0) === 0) continue;
      ccPatch[col] = info.price;
    }
    if (pop) {
      if ((pop["9_8"] ?? 0) === 0) { ccPatch.cgc_9_8 = null; ccPatch.cgc_9_8_ask = null; }
      if ((pop["9_6"] ?? 0) === 0) { ccPatch.cgc_9_6 = null; }
    }
    if (Object.keys(ccPatch).length > 0) {
      await sb.from("catalog_comics").update(ccPatch).eq("id", cid);
    }

    // Update ppcf_price_observations & ppcf_price_summaries
    if (d.ppcfId && obsRows.length > 0) {
      const uniqObs = [...new Map(obsRows.map((x) => [x.dedupe_key, x])).values()];
      await sb.from("ppcf_price_observations").upsert(uniqObs, { onConflict: "dedupe_key" });
      const amounts = uniqObs.map((o) => o.amount);
      const latestDate = uniqObs.map((o) => o.observed_at).sort().pop();
      const gradeSet = [...new Set(uniqObs.map((o) => o.grade_label))].sort((a, b) => parseFloat(a) - parseFloat(b));
      await sb.from("ppcf_price_summaries").upsert(
        {
          ppcf_id: d.ppcfId,
          observation_count: uniqObs.length,
          source_count: 1,
          latest_observed_at: latestDate,
          min_amount: Math.min(...amounts),
          max_amount: Math.max(...amounts),
          currency_set: ["USD"],
          grade_set: gradeSet,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "ppcf_id" }
      );
    }

    const topG = [...latestByGrade.keys()].sort((a, b) => parseFloat(b) - parseFloat(a))[0];
    console.log(`  [Ingested] Seat #${item.seat} ${d.titleLine} (id=${cid}) -> ${uniqVcs.length} Universal sales (top ${topG}=$${latestByGrade.get(topG).price})`);
  }

  if (dossierChanged) {
    fs.writeFileSync(dossierPath, JSON.stringify(dossiers, null, 2) + "\n", "utf8");
    console.log("Updated lib/wiki/ce70-constitutional-dossiers.json with newly linked catalog IDs.");
  }
  console.log(`DONE: Ingested ${totalSales} verified Universal GPAnalysis sales across ${batch.length} seats.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
