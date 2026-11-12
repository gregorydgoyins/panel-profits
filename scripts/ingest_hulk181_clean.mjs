import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

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

const cleanStandardGrades = new Map(); // key: grade -> { price, date }

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

    if (gradetype === 'UNI' && !notes && price && !cleanStandardGrades.has(grade)) {
      cleanStandardGrades.set(grade, {
        price,
        date: formatGpaDateToIso(date)
      });
    }
    i = j;
  } else {
    i++;
  }
}

console.log('Clean Universal Grades parsed:', Array.from(cleanStandardGrades.entries()));

async function run() {
  const editionId = '9ec0452a-9910-4f8c-9738-6daafbd1ed1b'; // Hulk 181 regular edition
  
  for (const [grade, data] of cleanStandardGrades) {
    const { error } = await supabase
      .from('gpa_grade_summaries')
      .upsert({
        gpa_edition_id: editionId,
        grader: 'CGC',
        grade: grade,
        designation: 'UNI',
        serial: null,
        last_sale_price: data.price,
        last_sale_date: data.date,
        updated_at: new Date().toISOString()
      }, { onConflict: 'gpa_edition_id, grader, grade, designation' });

    if (error) console.error(`Error upserting ${grade}:`, error);
    else console.log(`✓ Upserted Grade ${grade}: $${data.price} (${data.date})`);
  }

  // Also update pp_comics directly with the authentic GPA prices!
  const { data: comic } = await supabase
    .from('pp_comics')
    .select('id, series, issue_number, panel_profits_data')
    .eq('id', '2386994')
    .single();

  if (comic) {
    const ppData = comic.panel_profits_data || {};
    const updates = {
      pp_grade_9_8_price: cleanStandardGrades.get('9.8')?.price || null,
      '9.8': cleanStandardGrades.get('9.8')?.price || null,
      '9.6': cleanStandardGrades.get('9.6')?.price || null,
      '9.4': cleanStandardGrades.get('9.4')?.price || null,
      '9.2': cleanStandardGrades.get('9.2')?.price || null,
      '9.0': cleanStandardGrades.get('9.0')?.price || null,
      '8.5': cleanStandardGrades.get('8.5')?.price || null,
      '8.0': cleanStandardGrades.get('8.0')?.price || null,
      '7.5': cleanStandardGrades.get('7.5')?.price || null,
      '7.0': cleanStandardGrades.get('7.0')?.price || null,
      '6.5': cleanStandardGrades.get('6.5')?.price || null,
      '6.0': cleanStandardGrades.get('6.0')?.price || null,
      '5.5': cleanStandardGrades.get('5.5')?.price || null,
      '5.0': cleanStandardGrades.get('5.0')?.price || null,
      '4.5': cleanStandardGrades.get('4.5')?.price || null,
      '4.0': cleanStandardGrades.get('4.0')?.price || null,
      '3.5': cleanStandardGrades.get('3.5')?.price || null,
      '3.0': cleanStandardGrades.get('3.0')?.price || null,
      '2.5': cleanStandardGrades.get('2.5')?.price || null,
      '2.0': cleanStandardGrades.get('2.0')?.price || null,
      '1.8': cleanStandardGrades.get('1.8')?.price || null,
      '1.5': cleanStandardGrades.get('1.5')?.price || null,
      '1.0': cleanStandardGrades.get('1.0')?.price || null,
      '0.5': cleanStandardGrades.get('0.5')?.price || null,
    };

    for (const [grade, d] of cleanStandardGrades) {
      ppData[`PP - Grade ${grade} Market Price`] = String(d.price);
      ppData[`grade_${grade.replace('.', '_')}`] = d.price;
    }
    updates.panel_profits_data = ppData;

    const { error: ppErr } = await supabase
      .from('pp_comics')
      .update(updates)
      .eq('id', '2386994');

    if (ppErr) console.error('Error updating pp_comics:', ppErr);
    else console.log('✓ Successfully updated pp_comics record #2386994 with authentic GPA prices!');
  }
}

run().catch(console.error);
