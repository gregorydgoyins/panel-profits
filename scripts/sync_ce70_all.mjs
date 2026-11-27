#!/usr/bin/env node
/**
 * scripts/sync_ce70_all.mjs
 *
 * Automated CE70 batch-linker & GPAnalysis database synchronizer:
 *   1. Links all verified US/Canadian/EU CE70 seats in ce70-constitutional-dossiers.json,
 *      ppcf_source_links (PANEL_PROFITS), and recovered_index_constituents.
 *   2. Syncs ALL existing Universal GPAnalysis rows from gpa_issues / gpa_editions /
 *      gpa_grade_summaries straight into verified_completed_sales, catalog_comics,
 *      ppcf_price_observations, and ppcf_price_summaries (zero fake data, zero manual paste).
 *   3. Emits scripts/ce70_gpa_manifest.json listing every remaining CGC-graded CE70 seat
 *      that still needs a live GPAnalysis pull via gpa-brightdata-worker / gpa_multi_title_crawler.
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Verified exact-year, exact-edition catalog_comics IDs for CE70 seats (Zero Fake Data — no reprints/omnibuses)
const VERIFIED_CATALOG_LINKS = {
  6:  { id: "2454135", year: 1941 }, // Daredevil Comics #1 (1941)
  9:  { id: "2385397", year: 1944 }, // Jumbo Comics #69 (Nov 1944)
  11: { id: "2312629", year: 1952 }, // Four Color #386 (1952)
  12: { id: "2386441", year: 1952 }, // Mad #1 (1952)
  13: { id: "2453703", year: 1953 }, // Two-Fisted Tales #35 (1953)
  14: { id: "2312450", year: 1949 }, // Four Color #223 (1949)
  15: { id: "3369177", year: 1955 }, // Impact #1 (1955)
  17: { id: "13067782", year: 1950 }, // It Rhymes with Lust (1950 Picture Novel)
  19: { id: "2315072", year: 1966 }, // Amazing Spider-Man #33 (1966)
  20: { id: "2363310", year: 1966 }, // Fantastic Four #51 (1966)
  21: { id: "3305487", year: 1968 }, // Nick Fury, Agent of SHIELD #1 (1968)
  23: { id: "2388864", year: 1965 }, // Strange Tales #138 (1965)
  27: { id: "2413058", year: 1972 }, // New Gods #7 (1972)
  28: { id: "2395317", year: 1980 }, // The X-Men #137 (1980)
  29: { id: "2389409", year: 1982 }, // Daredevil #181 (1982)
  30: { id: "2314844", year: 1973 }, // The Amazing Spider-Man #121 (1973)
  32: { id: "6167126", year: 1981 }, // Love and Rockets #1 (1981)
  33: { id: "2412878", year: 1976 }, // Warlock #11 (1976)
  35: { id: "3295989", year: 1984 }, // Saga of the Swamp Thing #21 (1984)
  36: { id: "2417771", year: 1986 }, // Batman: The Dark Knight #1 (1986)
  38: { id: "2403660", year: 1989 }, // Sandman #8 (1989)
  40: { id: "2398703", year: 1984 }, // Teenage Mutant Ninja Turtles #1 (1984)
  42: { id: "3697461", year: 1994 }, // Marvels #1 (1994)
  44: { id: "3369157", year: 1996 }, // Eightball #17 (1996)
  48: { id: "2394200", year: 2003 }, // The Walking Dead #1 (2003)
  49: { id: "3553961", year: 1995 }, // Astro City #1 (1995)
  50: { id: "3693447", year: 2006 }, // All-Star Superman #1 (2005/2006)
  62: { id: "2401364", year: 2019 }, // Immortal Hulk #25 (2019)
};

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/^the\s+/i, "")
    .replace(/,\s*the$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const BENCHMARK_COL_BY_GRADE = {
  "2.0": "cgc_2_0",
  "3.0": "cgc_3_0",
  "4.0": "cgc_4_0",
  "5.0": "cgc_5_0",
  "6.0": "cgc_6_0",
  "7.0": "cgc_7_0",
  "8.0": "cgc_8_0",
  "9.0": "cgc_9_0",
  "9.2": "cgc_9_2",
  "9.4": "cgc_9_4",
  "9.6": "cgc_9_6",
  "9.8": "cgc_9_8",
};

async function main() {
  const dossierPath = path.join(ROOT, "lib/wiki/ce70-constitutional-dossiers.json");
  const dossiers = JSON.parse(fs.readFileSync(dossierPath, "utf8"));

  // ── PHASE 1: Link verified catalog_comics IDs across dossiers + ppcf_source_links ──
  let newlyLinked = 0;
  let totalLinked = 0;
  for (const d of dossiers) {
    const patch = VERIFIED_CATALOG_LINKS[d.seatNumber];
    if (patch && d.ppSourceId !== patch.id) {
      d.ppSourceId = patch.id;
      d.detailUrl = `/comics/${patch.id}`;
      if (d.seatNumber === 9) {
        d.year = 1944;
        d.titleLine = d.titleLine.replace("(1945)", "(1944)");
      }
      newlyLinked++;
    }
    if (d.ppSourceId) totalLinked++;

    // Ensure ppcf_source_links has PANEL_PROFITS corroboration link
    if (d.ppcfId && d.ppSourceId) {
      const { data: existing } = await sb
        .from("ppcf_source_links")
        .select("id")
        .eq("ppcf_id", d.ppcfId)
        .eq("source_system", "PANEL_PROFITS")
        .eq("source_record_id", String(d.ppSourceId))
        .maybeSingle();
      if (!existing) {
        const { error } = await sb.from("ppcf_source_links").insert({
          ppcf_id: d.ppcfId,
          source_system: "PANEL_PROFITS",
          source_record_id: String(d.ppSourceId),
          source_role: "CORROBORATION",
        });
        if (error && !/duplicate|unique/i.test(error.message)) {
          console.warn(`  [warn] ppcf_source_links insert #${d.seatNumber}: ${error.message}`);
        }
      }
    }
  }
  fs.writeFileSync(dossierPath, JSON.stringify(dossiers, null, 2) + "\n", "utf8");
  console.log(`[Phase 1] Linked ${newlyLinked} new CE70 seats (${totalLinked}/65 active seats now have live ppSourceId & detailUrl).`);

  // ── PHASE 2: Sync ALL existing Universal GPAnalysis summaries into verified_completed_sales + PPCF ──
  const [{ data: gt }, { data: gi }, { data: ge }, { data: gs }] = await Promise.all([
    sb.from("gpa_titles").select("gpa_title_id,title_name,publication_year"),
    sb.from("gpa_issues").select("id,gpa_title_id,gpa_issue_id,issue_number_raw,publication_year"),
    sb.from("gpa_editions").select("id,gpa_issue_id,edition_name"),
    sb
      .from("gpa_grade_summaries")
      .select("id,gpa_edition_id,grader,grade,designation,last_sale_price,last_sale_date,avg_2024,avg_2025,avg_12m")
      .eq("designation", "UNI")
      .limit(5000),
  ]);

  const titleById = Object.fromEntries((gt || []).map((t) => [t.gpa_title_id, t]));
  const edsByIssue = {};
  for (const e of ge || []) (edsByIssue[e.gpa_issue_id] = edsByIssue[e.gpa_issue_id] || []).push(e);
  const sumsByEd = {};
  for (const s of gs || []) (sumsByEd[s.gpa_edition_id] = sumsByEd[s.gpa_edition_id] || []).push(s);

  let seatsSyncedFromGpa = 0;
  let totalSalesUpserted = 0;
  let totalObsUpserted = 0;

  for (const d of dossiers) {
    if (!d.series || !d.ppSourceId || /Unresolved/i.test(d.series)) continue;
    // Skip Seats #1-#5 which already have hand-verified primary-source auction ledgers
    if (d.seatNumber <= 5) continue;

    const ds = norm(d.series);
    const di = String(d.issueNumber || "").replace(/^#/, "").trim();
    const matchingIssues = (gi || []).filter((iss) => {
      const t = titleById[iss.gpa_title_id];
      if (!t || norm(t.title_name) !== ds || String(iss.issue_number_raw || "").trim() !== di) return false;
      // Strict year guard: prevents modern volumes (e.g. 1996 Green Lantern #76) from contaminating 1970 Vol. 2 #76
      const gpaYr = Number(iss.publication_year || t.publication_year || 0);
      if (gpaYr > 1900 && d.year && Math.abs(gpaYr - Number(d.year)) > 3) return false;
      return true;
    });
    if (matchingIssues.length === 0) continue;

    // Collect clean Universal complete-book sales from standard/primary editions (exclude Incomplete / NO GRADE / Double Cover / variants)
    const bestByGrade = new Map();
    for (const iss of matchingIssues) {
      const eds = edsByIssue[iss.id] || [];
      for (const ed of eds) {
        const edLabel = String(ed.edition_name || "").trim();
        if (/incomplete|no grade|page only|cover only|reprint|facsimile|variant|newsstand|uk price|mark jewelers|canadian/i.test(edLabel)) {
          continue;
        }
        const rows = sumsByEd[ed.id] || [];
        for (const r of rows) {
          const gNum = Number(r.grade);
          const price = Number(r.last_sale_price);
          const date = String(r.last_sale_date || "").slice(0, 10);
          if (!Number.isFinite(gNum) || gNum < 0.5 || gNum > 10.0) continue;
          if (!Number.isFinite(price) || price <= 0) continue;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
          const gKey = gNum.toFixed(1);
          const prev = bestByGrade.get(gKey);
          if (!prev || date > prev.date || (date === prev.date && price > prev.price)) {
            bestByGrade.set(gKey, { grade: gNum, gradeKey: gKey, price, date, edition: edLabel || "Universal" });
          }
        }
      }
    }

    if (bestByGrade.size === 0) continue;

    const cid = String(d.ppSourceId);
    const lookupKey = `${String(d.series).toLowerCase()}:${di}`;
    const salesList = [...bestByGrade.values()].sort((a, b) => b.grade - a.grade);

    // Upsert into verified_completed_sales
    const vcsRows = salesList.map((s) => ({
      sale_id: `gpa-sync-${cid}-${s.gradeKey}-${s.date}-${Math.round(s.price)}`,
      catalog_id: cid,
      lookup_key: lookupKey,
      price_usd: s.price,
      sold_at: `${s.date}T16:00:00+00:00`,
      certified_grade: s.grade,
      grading_company: "CGC",
      label_type: "Universal",
      venue: "GPAnalysis",
      source_url: "https://comics.gpanalysis.com/",
      raw_title: `${d.titleLine} CGC ${s.gradeKey} Universal`,
    }));

    const { error: vcsErr } = await sb
      .from("verified_completed_sales")
      .upsert(vcsRows, { onConflict: "sale_id" });
    if (vcsErr) {
      console.warn(`  [warn] vcs upsert #${d.seatNumber} (${d.titleLine}): ${vcsErr.message}`);
      continue;
    }
    totalSalesUpserted += vcsRows.length;

    // Update catalog_comics benchmark columns strictly for verified grades (and verify CGC census for 9.8/9.6)
    const seriesVars = [d.series, d.series.replace(/^The\s+/i, "")];
    const { data: cgcRows } = await sb
      .from("cgc_population")
      .select("pop,year")
      .in("title", seriesVars)
      .eq("issue_number", di)
      .eq("is_base", true)
      .limit(5);
    const cgcRow = (cgcRows || []).find((r) => Math.abs(Number(r.year) - Number(d.year)) <= 1) || cgcRows?.[0] || null;
    const pop = cgcRow?.pop || null;

    const ccPatch = {};
    for (const s of salesList) {
      const col = BENCHMARK_COL_BY_GRADE[s.gradeKey];
      if (!col) continue;
      if (pop && s.grade >= 9.6 && (pop[s.gradeKey.replace(".", "_")] ?? 0) === 0) continue;
      ccPatch[col] = s.price;
    }
    if (pop) {
      if ((pop["9_8"] ?? 0) === 0) { ccPatch.cgc_9_8 = null; ccPatch.cgc_9_8_ask = null; }
      if ((pop["9_6"] ?? 0) === 0) { ccPatch.cgc_9_6 = null; }
    }
    if (Object.keys(ccPatch).length > 0) {
      await sb.from("catalog_comics").update(ccPatch).eq("id", cid);
    }

    // Sync into ppcf_price_observations & ppcf_price_summaries if seat has ppcfId
    if (d.ppcfId) {
      const obsRows = salesList.map((s) => {
        const recId = `gpa-sync-${cid}-${s.gradeKey}-${s.date}-${Math.round(s.price)}`;
        return {
          ppcf_id: d.ppcfId,
          source_system: "PANEL_PROFITS",
          source_record_id: recId,
          price_field: `GPAnalysis CGC ${s.gradeKey} Universal`,
          grade_label: s.gradeKey,
          amount: s.price,
          currency: "USD",
          observed_at: s.date,
          source_locator: "https://comics.gpanalysis.com/",
          dedupe_key: `${d.ppcfId}|PANEL_PROFITS|${recId}|${s.gradeKey}|${s.price}|USD|${s.date}`,
        };
      });
      const { error: obsErr } = await sb
        .from("ppcf_price_observations")
        .upsert(obsRows, { onConflict: "dedupe_key" });
      if (!obsErr) {
        totalObsUpserted += obsRows.length;
        const amounts = salesList.map((s) => s.price);
        const latestDate = salesList.map((s) => s.date).sort().pop();
        const gradeSet = salesList.map((s) => s.gradeKey).sort((a, b) => parseFloat(a) - parseFloat(b));
        await sb.from("ppcf_price_summaries").upsert(
          {
            ppcf_id: d.ppcfId,
            observation_count: obsRows.length,
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
    }

    seatsSyncedFromGpa++;
    console.log(`  [Synced] Seat #${d.seatNumber} ${d.titleLine} (id=${cid}) -> ${vcsRows.length} GPA Universal grades (top ${salesList[0].gradeKey}=$${salesList[0].price})`);
  }

  console.log(`[Phase 2] Synced ${seatsSyncedFromGpa} CE70 seats from gpa_grade_summaries (${totalSalesUpserted} sales, ${totalObsUpserted} PPCF obs).`);

  // ── PHASE 3: Build exact CE70 GPA Manifest for remaining seats missing GPA sales ──
  const allLinkedIds = dossiers.map((d) => String(d.ppSourceId || "")).filter(Boolean);
  const { data: currentVcs } = await sb
    .from("verified_completed_sales")
    .select("catalog_id,venue,certified_grade,price_usd")
    .in("catalog_id", allLinkedIds);
  const salesCountByCid = {};
  for (const r of currentVcs || []) {
    salesCountByCid[r.catalog_id] = (salesCountByCid[r.catalog_id] || 0) + 1;
  }

  const manifest = [];
  let seatsWithVerifiedSales = 0;
  for (const d of dossiers) {
    if (!d.series || /Unresolved/i.test(d.series)) continue;
    const cid = d.ppSourceId ? String(d.ppSourceId) : null;
    const salesCount = cid ? salesCountByCid[cid] || 0 : 0;
    if (salesCount > 0) {
      seatsWithVerifiedSales++;
      continue;
    }
    const isEuOrGnx = /casterman|dargaud|les humano|pantheon|drawn & quarterly|fantagraphics|houghton|mariner|humanoids/i.test(String(d.publisher || "")) || /^\[/.test(String(d.issueNumber || ""));
    manifest.push({
      seat: d.seatNumber,
      titleLine: d.titleLine,
      series: d.series,
      issueNumber: String(d.issueNumber || "").replace(/^#/, ""),
      year: d.year,
      publisher: d.publisher,
      catalogId: cid,
      ppcfId: d.ppcfId || null,
      category: isEuOrGnx ? "EU_BD_OR_GRAPHIC_NOVEL" : "US_CGC_GPA_TARGET",
    });
  }

  const manifestPath = path.join(ROOT, "scripts/ce70_gpa_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), seatsWithVerifiedSales, remaining: manifest }, null, 2) + "\n", "utf8");
  const usTargets = manifest.filter((m) => m.category === "US_CGC_GPA_TARGET");
  const euTargets = manifest.filter((m) => m.category === "EU_BD_OR_GRAPHIC_NOVEL");
  console.log(`[Phase 3] Wrote scripts/ce70_gpa_manifest.json: ${seatsWithVerifiedSales}/65 active seats now have verified sales | ${usTargets.length} US CGC GPA targets remaining | ${euTargets.length} EU BD / graphic novels.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
