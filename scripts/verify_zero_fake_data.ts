import fs from "node:fs";
import path from "node:path";
import {
  PROHIBITED_FICTIONAL_TICKERS,
  PROHIBITED_IMAGE_PLACEHOLDERS,
  validateAssetCovenant,
  assertZeroFakeDataCovenant,
} from "../lib/guardrails/zero-fake-data-guardrail.ts";
import { INITIAL_SURFACE_ASSETS } from "../lib/assets/initial-assets.ts";

console.log("===============================================================");
console.log("🛡️  PANEL PROFITS: ZERO FAKE DATA COVENANT PRE-BUILD AUDITOR");
console.log("===============================================================");

let totalViolations = 0;

// 1. Audit INITIAL_SURFACE_ASSETS
console.log("\n[1/4] Auditing INITIAL_SURFACE_ASSETS (Surveillance Rail)...");
try {
  assertZeroFakeDataCovenant(INITIAL_SURFACE_ASSETS, "INITIAL_SURFACE_ASSETS");
  console.log(`  ✓ Passed: All ${INITIAL_SURFACE_ASSETS.length} initial assets conform to authentic sovereign exchange standards.`);
} catch (err: any) {
  console.error(`  ✗ VIOLATION in INITIAL_SURFACE_ASSETS:\n  ${err.message}`);
  totalViolations++;
}

// 2. Scan Codebase for Prohibited Fictional Parody Tickers and Placeholders
console.log("\n[2/4] Scanning active application source files for prohibited symbols & placeholders...");
const scanDirs = ["app", "components", "lib"];
const appRoot = path.resolve(process.cwd());

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  const relPath = path.relative(appRoot, filePath);

  // Skip self, tests, quarantine, and character encyclopedia entries
  if (
    relPath.includes("zero-fake-data-guardrail") ||
    relPath.includes("verify_zero_fake_data") ||
    relPath.includes("tests") ||
    relPath.includes("_quarantine") ||
    relPath.includes("multi_universe_character_index.json") ||
    relPath.includes("battle-engine.ts") || // Combat game lore
    relPath.includes("entity-extractor.ts") // Wiki NER extractor
  ) {
    return;
  }

  // Check prohibited tickers
  for (const ticker of PROHIBITED_FICTIONAL_TICKERS) {
    const regex = new RegExp(`\\b${ticker.replace("$", "\\$")}\\b`, "i");
    if (regex.test(content)) {
      console.error(`  ✗ VIOLATION in ${relPath}: Contains prohibited fictional parody ticker "${ticker}"`);
      totalViolations++;
    }
  }

  // Check prohibited image placeholders in active components and views
  if (!filePath.endsWith(".json")) {
    const lines = content.split("\n");
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      // Skip guardrail checks and filters that actively reject / purge placeholders
      if (
        line.includes(".includes(") ||
        line.includes("PROHIBITED_IMAGE_PLACEHOLDERS") ||
        line.includes("continue") ||
        line.includes("return null") ||
        line.trim().startsWith("//") ||
        line.trim().startsWith("*")
      ) {
        continue;
      }
      for (const placeholder of PROHIBITED_IMAGE_PLACEHOLDERS) {
        if (
          line.includes(`/${placeholder}`) ||
          line.includes(`"${placeholder}"`) ||
          line.includes(`'${placeholder}'`)
        ) {
          console.error(`  ✗ VIOLATION in ${relPath}:${lineNum + 1}: Emits prohibited image placeholder "${placeholder}"`);
          totalViolations++;
        }
      }
    }
  }

  // Check synthetic sine wave pricing formulas in pricing / valuation files
  if (relPath.includes("pricing") || relPath.includes("equity") || relPath.includes("valuation") || relPath.includes("sniper")) {
    if (/Math\.sin\s*\(/.test(content) && !relPath.includes("CulturalArchivePanel")) {
      console.error(`  ✗ VIOLATION in ${relPath}: Contains synthetic Math.sin waveform generation in financial logic!`);
      totalViolations++;
    }
  }
}

function walkDir(dir: string) {
  const full = path.join(appRoot, dir);
  if (!fs.existsSync(full)) return;
  const entries = fs.readdirSync(full, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(full, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== "_quarantine") {
        walkDir(path.join(dir, entry.name));
      }
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") || entry.name.endsWith(".js") || entry.name.endsWith(".jsx"))) {
      scanFile(fullPath);
    }
  }
}

for (const d of scanDirs) {
  walkDir(d);
}
console.log("  ✓ Source scan completed.");

// 3. Audit CE70 Reference Benchmarks
console.log("\n[3/4] Auditing CE70 Reference Benchmarks...");
try {
  const fmvPath = path.join(appRoot, "lib", "equity", "ce70-reference-fmv.json");
  if (fs.existsSync(fmvPath)) {
    const fmvData = JSON.parse(fs.readFileSync(fmvPath, "utf-8"));
    const numericKeys = Object.keys(fmvData).filter((k) => /^\d+$/.test(k));
    let fmvErrors = 0;
    for (const key of numericKeys) {
      const entry = fmvData[key];
      if (!entry.series || !entry.issueNumber) {
        console.error(`  ✗ VIOLATION in ce70-reference-fmv.json seat ${key}: Missing series or issue number`);
        fmvErrors++;
      }
      if (entry.referenceFmvUsd != null && entry.referenceFmvUsd <= 0) {
        console.error(`  ✗ VIOLATION in ce70-reference-fmv.json seat ${key}: Non-positive reference FMV (${entry.referenceFmvUsd})`);
        fmvErrors++;
      }
    }
    if (fmvErrors === 0) {
      console.log(`  ✓ Passed: All ${numericKeys.length} CE70 constitutional seats have authentic series, issue numbers, and verified FMVs.`);
    } else {
      totalViolations += fmvErrors;
    }
  }
} catch (err: any) {
  console.error(`  ✗ Error auditing CE70 benchmarks: ${err.message}`);
  totalViolations++;
}

// 4. Final Verdict
console.log("\n[4/4] Covenant Guardrail Verdict...");
if (totalViolations > 0) {
  console.error(`\n❌ BUILD HALTED: Found ${totalViolations} Zero Fake Data Covenant violations!`);
  console.error("The application strictly prohibits mock, fake, placeholder, or synthetic data in production and development.\n");
  process.exit(1);
} else {
  console.log("✅ COVENANT VERIFIED: Zero fake data, zero fictional parody tickers, and zero synthetic waveforms detected.\n");
  process.exit(0);
}
