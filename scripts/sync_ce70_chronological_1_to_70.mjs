#!/usr/bin/env node
/**
 * Synchronize CE70 chronological seat numbering (1..70: Platinum #1 -> Postmodern #70)
 * across:
 *   1. panel-profits/lib/wiki/ce70-constitutional-dossiers.json
 *   2. Supabase: ce70_index_definitions (70 certified_constituent rows, zero vacant)
 *   3. Supabase: recovered_index_constituents (70 MATCHED_PPCF rows with exact ppcf_id & verified price)
 *   4. Supabase: recovered_index_contracts (CE70 metadata)
 *   5. Scratch enriched JSON + old->new seat map for Book One Chapter 1
 */
import fs from "node:fs";
import path from "node:path";

const APP_ROOT = "/Users/macuser/Documents/anti gravity panel profits/panel-profits";
const SCRATCH = "/Users/macuser/.gemini/antigravity/brain/acb4f0ca-2d70-4756-9733-853b617e0ffe/scratch";

const ERA_ORDER = [
  "Platinum Age",
  "Golden Age",
  "Atomic Age",
  "Silver Age",
  "Bronze Age",
  "Copper Age",
  "Modern Age",
  "Independent Age",
  "Postmodern Age",
];

function loadEnv() {
  const envPath = path.join(APP_ROOT, ".env.local");
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function cleanTitle(titleLine) {
  return String(titleLine || "").replace(/\s*\(\d{4}\)\s*$/, "").trim();
}

function replaceSeatText(text, oldSeat, newSeat) {
  if (!text) return text;
  let out = String(text);
  out = out.replace(new RegExp(`\\bSeat\\s*#?${oldSeat}\\b`, "gi"), `Seat ${newSeat}`);
  out = out.replace(new RegExp(`Platinum Seat\\s*#?${oldSeat}\\b`, "gi"), `Platinum Seat ${newSeat}`);
  return out;
}

async function main() {
  const env = loadEnv();
  const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("Missing Supabase env vars in .env.local");
  }

  const dossiersPath = path.join(APP_ROOT, "lib/wiki/ce70-constitutional-dossiers.json");
  const enrichedPath = path.join(SCRATCH, "ce70_all70_enriched.json");

  const dossiers = JSON.parse(fs.readFileSync(dossiersPath, "utf8"));
  const enriched = JSON.parse(fs.readFileSync(enrichedPath, "utf8"));

  if (dossiers.length !== 70 || enriched.length !== 70) {
    throw new Error(`Expected 70 dossiers (${dossiers.length}) and 70 enriched (${enriched.length})`);
  }

  // Sort strictly chronologically by Era then year ASC then old seatNumber ASC
  const sorted = [...dossiers].sort((a, b) => {
    const ea = ERA_ORDER.indexOf(a.era);
    const eb = ERA_ORDER.indexOf(b.era);
    if (ea !== eb) return ea - eb;
    const ya = Number(a.year) || 0;
    const yb = Number(b.year) || 0;
    if (ya !== yb) return ya - yb;
    return Number(a.seatNumber) - Number(b.seatNumber);
  });

  const enrichedByPpcf = new Map(enriched.map((e) => [e.ppcfId, e]));
  const oldToNew = {};
  const newToOld = {};

  const updatedDossiers = sorted.map((d, idx) => {
    const oldSeat = Number(d.seatNumber);
    const newSeat = idx + 1;
    oldToNew[oldSeat] = newSeat;
    newToOld[newSeat] = oldSeat;
    return {
      ...d,
      seatNumber: newSeat,
      role: replaceSeatText(d.role, oldSeat, newSeat),
      essay: replaceSeatText(d.essay, oldSeat, newSeat),
    };
  });

  // Update enriched scratch JSON with new chronological seat numbers and preserve oldSeatNumber for cover mapping
  const updatedEnriched = updatedDossiers.map((d) => {
    const e = enrichedByPpcf.get(d.ppcfId);
    if (!e) throw new Error(`Missing enriched record for ${d.ppcfId}`);
    return {
      ...e,
      oldSeatNumber: Number(e.oldSeatNumber ?? e.seatNumber),
      seatNumber: d.seatNumber,
      role: d.role,
      essay: d.essay,
    };
  });

  // 1. Write updated JSON files
  fs.writeFileSync(dossiersPath, JSON.stringify(updatedDossiers, null, 2) + "\n", "utf8");
  fs.writeFileSync(enrichedPath, JSON.stringify(updatedEnriched, null, 2) + "\n", "utf8");
  fs.writeFileSync(
    path.join(SCRATCH, "ce70_seat_remap.json"),
    JSON.stringify({ oldToNew, newToOld }, null, 2) + "\n",
    "utf8"
  );
  console.log("Updated ce70-constitutional-dossiers.json and ce70_all70_enriched.json (1..70 chronological).");

  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  };

  // 2. Sync Supabase ce70_index_definitions (70 rows, 1..70, zero vacant)
  const nowIso = new Date().toISOString();
  const defRows = updatedDossiers.map((d) => {
    const eraShort = String(d.era || "").replace(/\s+Age$/i, "");
    const titleIssue = cleanTitle(d.titleLine);
    const wordCount = `${String(d.essay || "").trim().split(/\s+/).length} words`;
    return {
      seat_number: d.seatNumber,
      index_code: "CE70",
      era: eraShort,
      title_issue: titleIssue,
      series: d.series,
      issue_number: String(d.issueNumber || "1"),
      year: Number(d.year),
      publisher: d.publisher,
      primary_creators: d.creators,
      status: "certified_constituent",
      gregory_score: Number(d.gregoryScore),
      word_count: wordCount,
      dossier_path: `./ce70_adjudication_dossiers/seat_${String(d.seatNumber).padStart(2, "0")}.md`,
      constituent_count: 1,
      asset_class: "EQUITY_INDEX_SEAT",
      asset_subclass: `${eraShort.toUpperCase()} ERA CONSTITUENT`,
      cover_url: d.coverUrl,
      updated_at: nowIso,
    };
  });

  const defResp = await fetch(`${SUPABASE_URL}/rest/v1/ce70_index_definitions?on_conflict=seat_number`, {
    method: "POST",
    headers,
    body: JSON.stringify(defRows),
  });
  if (!defResp.ok) {
    throw new Error(`ce70_index_definitions upsert failed: ${defResp.status} ${await defResp.text()}`);
  }
  console.log("Synced Supabase ce70_index_definitions: 70/70 certified_constituent (seats 1..70).");

  // 3. Sync Supabase recovered_index_constituents (update existing 70 CE70 rows by seat_number 1..70)
  let recUpdated = 0;
  for (const e of updatedEnriched) {
    const seat = e.seatNumber;
    const eraShort = String(e.era || "").replace(/\s+Age$/i, "");
    const titleIssue = cleanTitle(e.titleLine);
    const notesObj = {
      era: eraShort,
      seat,
      year: String(e.year),
      status: "certified_constituent",
      dossier: `./ce70_adjudication_dossiers/seat_${String(seat).padStart(2, "0")}.md`,
      creators: e.creators,
      publisher: e.publisher,
      source_file: "ce70-constitutional-dossiers.json",
      title_issue: titleIssue,
      gregory_score: String(e.gregoryScore),
    };
    const payload = {
      historical_identity: `CE70_MASTER:seat-${seat}`,
      historical_source: "local:ce70-constitutional-dossiers.json",
      ppcf_id: e.ppcfId,
      match_status: "MATCHED_PPCF",
      match_method: "EXACT_PPCF_CONSTITUTIONAL_LOCK_70",
      source_price: Number(e.qualPrice),
      source_price_grade: String(e.qualGrade),
      source_price_origin: String(e.qualVenue || "GPAnalysis"),
      notes: notesObj,
    };
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/recovered_index_constituents?index_code=eq.CE70&seat_number=eq.${seat}`,
      {
        method: "PATCH",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      }
    );
    if (!r.ok) {
      throw new Error(`recovered_index_constituents patch seat ${seat} failed: ${r.status} ${await r.text()}`);
    }
    recUpdated++;
  }
  console.log(`Synced Supabase recovered_index_constituents: ${recUpdated}/70 MATCHED_PPCF (seats 1..70).`);

  // 4. Update recovered_index_contracts CE70 metadata
  const cResp = await fetch(`${SUPABASE_URL}/rest/v1/recovered_index_contracts?index_code=eq.CE70`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      expected_constituent_count: 70,
      selection_rule:
        "9 Canonical Eras numbered chronologically 1..70 (Platinum #1-#3, Golden #4-#11, Atomic #12-#19, Silver #20-#27, Bronze #28-#37, Copper #38-#46, Modern #47-#54, Independent #55-#62, Postmodern #63-#70); zero vacant seats; RTS >= 195.0, verified 9.0+ Universal (or Artcurial 9.4+ Euro BD) <= $65,000, zero overlap.",
      grade_basis: "CGC 9.0+ Universal (Artcurial 9.4+ Euro BD) <= $65,000 Qualifying Cap",
      notes: "All 70 CE70 constitutional seats locked, matched to PPCF IDs, and numbered chronologically 1..70.",
      verified_at: nowIso,
    }),
  });
  if (!cResp.ok) {
    throw new Error(`recovered_index_contracts patch failed: ${cResp.status} ${await cResp.text()}`);
  }
  console.log("Synced Supabase recovered_index_contracts (CE70).");

  // Print clean 1..70 summary
  console.log("\n=== CHRONOLOGICAL CE70 ROSTER (1..70) ===");
  for (const d of updatedDossiers) {
    console.log(`  #${String(d.seatNumber).padStart(2, "0")} | ${d.era.padEnd(15)} | ${d.year} | ${cleanTitle(d.titleLine)} | ${d.ppcfId}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
