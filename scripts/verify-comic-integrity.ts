import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { extractYearFromTitle } from '../lib/comics/integrity-guard';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const sb = createClient(url, key);
  const args = process.argv.slice(2);
  const fixCovers = args.includes('--fix-swapped-covers');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 500;
  const seriesArg = args.find((a) => a.startsWith('--series='));
  const seriesFilter = seriesArg ? seriesArg.split('=')[1] : null;
  const idsArg = args.find((a) => a.startsWith('--ids='));
  const idsFilter = idsArg ? idsArg.split('=')[1].split(',').filter(Boolean) : null;

  let query = sb
    .from('pp_comics')
    .select('id, title, series, issue_number, cover_url, cgc_total, cgc_9_8_count, cgc_pop')
    .limit(limit);

  if (idsFilter && idsFilter.length > 0) {
    query = query.in('id', idsFilter);
  } else if (seriesFilter) {
    query = query.eq('series', seriesFilter);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error('Supabase query failed:', error.message);
    process.exit(1);
  }

  let checked = 0;
  let issues = 0;

  for (const row of rows || []) {
    checked++;
    const year = extractYearFromTitle(row.title || '');
    const pop = row.cgc_pop as Record<string, number> | null;
    const popTotal = pop
      ? Object.values(pop).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0)
      : null;

    if (row.cgc_total != null && popTotal != null && popTotal > 0 && row.cgc_total !== popTotal) {
      issues++;
      console.log(`[CENSUS_POP_MISMATCH] ${row.id} (${row.title}): cgc_total=${row.cgc_total}, sum(cgc_pop)=${popTotal}`);
    }

    if (year && year < 1990 && typeof row.cover_url === 'string' && /4th%20Series|4th Series/i.test(row.cover_url)) {
      issues++;
      console.log(`[COVER_ERA_MISMATCH] ${row.id} (${row.title}): Modern series cover on ${year} issue -> ${row.cover_url}`);
    }
  }

  if (fixCovers) {
    // Known verified swap: 2399925 (2006) <-> 2400013 (1978)
    const { data: pair } = await sb
      .from('pp_comics')
      .select('id, title, cover_url')
      .in('id', ['2399925', '2400013']);
    const c2006 = pair?.find((r) => String(r.id) === '2399925');
    const c1978 = pair?.find((r) => String(r.id) === '2400013');
    if (
      c2006 &&
      c1978 &&
      c2006.cover_url?.includes('85d85c87') &&
      c1978.cover_url?.includes('4th%20Series')
    ) {
      await sb.from('pp_comics').update({ cover_url: c1978.cover_url }).eq('id', '2399925');
      await sb.from('pp_comics').update({ cover_url: c2006.cover_url }).eq('id', '2400013');
      console.log('[FIXED] Swapped cover_url between 2399925 (2006) and 2400013 (1978).');
    }
  }

  console.log(`Verification complete: checked=${checked}, issues=${issues}`);
}

main();
