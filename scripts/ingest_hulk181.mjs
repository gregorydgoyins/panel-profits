import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { processGpaBatchIngestion } from '../lib/gpa/ingest.ts';

const envText = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

function formatGpaDateToIso(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length === 2) {
    const m = MONTH_MAP[parts[0].toLowerCase()];
    const y = parts[1];
    if (m && y) return `${y}-${m}-01`;
  }
  return null;
}

const rawData = JSON.parse(fs.readFileSync('scripts/hulk181_clean.json', 'utf8'));
const lines = rawData.text.split('\n').map(l => l.trim()).filter(Boolean);

let stopIdx = lines.length;
for (let idx = 0; idx < lines.length; idx++) {
  if (lines[idx].includes('Incredible Hulk, The, No. 181, 1979, Ediciones Vertice')) {
    stopIdx = idx;
    break;
  }
}

const usLines = lines.slice(0, stopIdx);
const gradeRegex = /^(UNI|SS|Q|A|C1|C2|SP|SA|B1|A1|MA|MP|QSS|ASS)\t(\d+\.?\d*)$/;
const priceRegex = /^\$([0-9,]+)$/;
const dateRegex = /^[A-Z][a-z]{2}\s+20\d\d$/;

const gradeSummaries = [];
let i = 0;

while (i < usLines.length) {
  const m = usLines[i].match(gradeRegex);
  if (m) {
    const gradetype = m[1];
    const grade = m[2];
    let notes = null;
    let price = null;
    let date = null;

    let j = i + 1;
    while (j < Math.min(i + 6, usLines.length)) {
      if (gradeRegex.test(usLines[j])) break;
      if (priceRegex.test(usLines[j]) && !price) {
        price = parseInt(usLines[j].replace(/[$,]/g, ''), 10);
        if (j + 1 < usLines.length && dateRegex.test(usLines[j + 1])) {
          date = usLines[j + 1];
          j++;
        }
      } else if (!notes && !price && !date && !['Back', 'Grade', 'Help', 'CGC Census CensusCensus-2'].includes(usLines[j])) {
        notes = usLines[j];
      }
      j++;
    }

    gradeSummaries.push({
      grader: 'CGC',
      grade: grade,
      designation: gradetype,
      serial: notes,
      last_sale_price: price,
      last_sale_date: formatGpaDateToIso(date),
      avg_2024: null,
      avg_2025: null,
      avg_12m: null,
      avg_90d: null,
    });
    i = j;
  } else {
    i++;
  }
}

console.log(`Parsed ${gradeSummaries.length} grade items for US Regular Edition with ISO dates.`);

const payload = {
  title: {
    gpa_title_id: 41,
    title_name: 'Incredible Hulk, The',
    publisher: 'Marvel Comics',
    publication_year: 1974,
  },
  issue: {
    gpa_issue_id: 181,
    issue_number_raw: '181',
    gpa_url: 'https://comics.gpanalysis.com/analyse-prices/sales-data/41/181#m111974',
  },
  editions: [
    {
      edition_name: 'Regular / Cover A',
      variant_name: null,
      is_regular_edition: true,
      grade_summaries: gradeSummaries,
    },
  ],
};

async function run() {
  console.log('Sending payload to processGpaBatchIngestion...');
  const result = await processGpaBatchIngestion(supabase, payload);
  console.log('Ingestion result:', result);
}

run().catch(err => {
  console.error('Run failed:', err);
  process.exit(1);
});
