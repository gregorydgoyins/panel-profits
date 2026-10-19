/**
 * upload_remaining_reconciled_datasets.cjs
 *
 * High-performance streaming uploader for the remaining reconciled datasets:
 * 1. public.gcd_candidate_snapshots (106,334 rows, 28 MB)
 * 2. public.gcd_creator_entities (113,499 rows, 65 MB)
 * 3. public.gcd_series_entities (232,820 rows, 173 MB)
 * 4. public.canonical_identity_reconciliation (591,758 rows, 222 MB)
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { Client: PgClient } = require('pg');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const RECON_DIR = path.join(ROOT_DIR, 'source_reconciliation_output');

const DIRECT_URL =
  process.env.CLEAN_DATABASE_URL ||
  process.env.SUPABASE_DIRECT_URL ||
  undefined;

async function createTables(pg) {
  console.log('Ensuring destination tables and RLS policies exist in Clean Supabase...');
  await pg.query(`
    -- 1. gcd_candidate_snapshots
    CREATE TABLE IF NOT EXISTS public.gcd_candidate_snapshots (
      run_id text,
      gcd_issue_id integer PRIMARY KEY,
      gcd_series_id integer,
      series_name text,
      issue_number text,
      publication_date text,
      barcode text,
      isbn text,
      issue_title text,
      variant_name text,
      created_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS gcd_candidate_snapshots_series_idx ON public.gcd_candidate_snapshots (gcd_series_id);

    -- 2. gcd_creator_entities
    CREATE TABLE IF NOT EXISTS public.gcd_creator_entities (
      id integer PRIMARY KEY,
      gcd_official_name text,
      sort_name text,
      whos_who text,
      birth_city text,
      death_city text,
      bio text,
      disambiguation text,
      birth_country_id integer,
      birth_date_id integer,
      death_country_id integer,
      death_date_id integer,
      raw_source jsonb,
      created_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS gcd_creator_entities_name_idx ON public.gcd_creator_entities (gcd_official_name);

    -- 3. gcd_series_entities
    CREATE TABLE IF NOT EXISTS public.gcd_series_entities (
      id integer PRIMARY KEY,
      name text,
      sort_name text,
      format text,
      year_began integer,
      year_ended integer,
      publisher_id integer,
      country_id integer,
      language_id integer,
      issue_count integer,
      publication_dates text,
      publishing_format text,
      dimensions text,
      binding text,
      color text,
      is_comics_publication integer,
      raw_source jsonb,
      created_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS gcd_series_entities_name_idx ON public.gcd_series_entities (name);
    CREATE INDEX IF NOT EXISTS gcd_series_entities_pub_idx ON public.gcd_series_entities (publisher_id);

    -- 4. canonical_identity_reconciliation
    CREATE TABLE IF NOT EXISTS public.canonical_identity_reconciliation (
      run_id text,
      gcd_issue_id integer PRIMARY KEY,
      gcd_series_id integer,
      series_name text,
      issue_number text,
      publication_date text,
      barcode text,
      isbn text,
      issue_title text,
      variant_name text,
      pp_row_count integer,
      comicbase_row_count integer,
      source_presence text,
      identity_status text,
      created_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS canonical_identity_series_idx ON public.canonical_identity_reconciliation (gcd_series_id);
    CREATE INDEX IF NOT EXISTS canonical_identity_status_idx ON public.canonical_identity_reconciliation (identity_status);

    -- RLS Policies
    ALTER TABLE public.gcd_candidate_snapshots ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.gcd_creator_entities ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.gcd_series_entities ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.canonical_identity_reconciliation ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "gcd_candidate_snapshots_read" ON public.gcd_candidate_snapshots;
    CREATE POLICY "gcd_candidate_snapshots_read" ON public.gcd_candidate_snapshots FOR SELECT USING (true);

    DROP POLICY IF EXISTS "gcd_creator_entities_read" ON public.gcd_creator_entities;
    CREATE POLICY "gcd_creator_entities_read" ON public.gcd_creator_entities FOR SELECT USING (true);

    DROP POLICY IF EXISTS "gcd_series_entities_read" ON public.gcd_series_entities;
    CREATE POLICY "gcd_series_entities_read" ON public.gcd_series_entities FOR SELECT USING (true);

    DROP POLICY IF EXISTS "canonical_identity_reconciliation_read" ON public.canonical_identity_reconciliation;
    CREATE POLICY "canonical_identity_reconciliation_read" ON public.canonical_identity_reconciliation FOR SELECT USING (true);
  `);
  console.log('Tables and indexes confirmed.');
}

async function uploadJsonlTable(pg, filePath, tableName, columns, parseRow, batchSize = 1000) {
  console.log(`\n=== Streaming ${path.basename(filePath)} into ${tableName} ===`);
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let batch = [];
  let totalUploaded = 0;
  const startTime = Date.now();

  async function flushBatch() {
    if (batch.length === 0) return;
    const valuePlaceholders = [];
    const values = [];
    let pIdx = 1;

    for (const item of batch) {
      const rowPlaceholders = [];
      for (const val of item) {
        rowPlaceholders.push(`$${pIdx++}`);
        values.push(val);
      }
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    const query = `
      INSERT INTO public.${tableName} (${columns.join(', ')})
      VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT DO NOTHING
    `;

    await pg.query(query, values);
    totalUploaded += batch.length;
    batch = [];

    const elapsed = (Date.now() - startTime) / 1000;
    const rps = Math.round(totalUploaded / (elapsed || 1));
    process.stdout.write(`\r  Uploaded: ${totalUploaded.toLocaleString()} rows (${rps} rows/sec)`);
  }

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      const rowVals = parseRow(obj);
      if (rowVals) {
        batch.push(rowVals);
        if (batch.length >= batchSize) {
          await flushBatch();
        }
      }
    } catch (err) {
      // ignore malformed lines
    }
  }

  if (batch.length > 0) {
    await flushBatch();
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nCompleted ${tableName}: ${totalUploaded.toLocaleString()} rows in ${duration}s.`);
}

async function main() {
  console.log('Connecting to Clean Supabase PostgreSQL...');
  const pg = new PgClient({ connectionString: DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  console.log('Connected.');

  try {
    await createTables(pg);

    // 1. gcd_candidate_snapshots
    await uploadJsonlTable(
      pg,
      path.join(RECON_DIR, 'gcd_candidate_snapshots.jsonl'),
      'gcd_candidate_snapshots',
      ['run_id', 'gcd_issue_id', 'gcd_series_id', 'series_name', 'issue_number', 'publication_date', 'barcode', 'isbn', 'issue_title', 'variant_name'],
      (o) => [
        o.run_id || null,
        o.gcd_issue_id,
        o.gcd_series_id || null,
        o.series_name || '',
        String(o.issue_number || ''),
        o.publication_date || null,
        o.barcode || null,
        o.isbn || null,
        o.issue_title || null,
        o.variant_name || null,
      ],
      1000
    );

    // 2. gcd_creator_entities
    await uploadJsonlTable(
      pg,
      path.join(RECON_DIR, 'gcd_creator_entities.jsonl'),
      'gcd_creator_entities',
      ['id', 'gcd_official_name', 'sort_name', 'whos_who', 'birth_city', 'death_city', 'bio', 'disambiguation', 'birth_country_id', 'birth_date_id', 'death_country_id', 'death_date_id', 'raw_source'],
      (o) => [
        o.id,
        o.gcd_official_name || '',
        o.sort_name || null,
        o.whos_who || null,
        o.birth_city || null,
        o.death_city || null,
        o.bio || null,
        o.disambiguation || null,
        o.birth_country_id || null,
        o.birth_date_id || null,
        o.death_country_id || null,
        o.death_date_id || null,
        o.raw_source ? JSON.stringify(o.raw_source) : null,
      ],
      500
    );

    // 3. gcd_series_entities
    await uploadJsonlTable(
      pg,
      path.join(RECON_DIR, 'gcd_series_entities.jsonl'),
      'gcd_series_entities',
      ['id', 'name', 'sort_name', 'format', 'year_began', 'year_ended', 'publisher_id', 'country_id', 'language_id', 'issue_count', 'publication_dates', 'publishing_format', 'dimensions', 'binding', 'color', 'is_comics_publication', 'raw_source'],
      (o) => [
        o.id,
        o.name || '',
        o.sort_name || null,
        o.format || null,
        o.year_began || null,
        o.year_ended || null,
        o.publisher_id || null,
        o.country_id || null,
        o.language_id || null,
        o.issue_count || null,
        o.publication_dates || null,
        o.publishing_format || null,
        o.dimensions || null,
        o.binding || null,
        o.color || null,
        o.is_comics_publication ?? null,
        o.raw_source ? JSON.stringify(o.raw_source) : null,
      ],
      500
    );

    // 4. canonical_identity_reconciliation
    await uploadJsonlTable(
      pg,
      path.join(RECON_DIR, 'canonical_identity_reconciliation.jsonl'),
      'canonical_identity_reconciliation',
      ['run_id', 'gcd_issue_id', 'gcd_series_id', 'series_name', 'issue_number', 'publication_date', 'barcode', 'isbn', 'issue_title', 'variant_name', 'pp_row_count', 'comicbase_row_count', 'source_presence', 'identity_status'],
      (o) => [
        o.run_id || null,
        o.gcd_issue_id,
        o.gcd_series_id || null,
        o.series_name || '',
        String(o.issue_number || ''),
        o.publication_date || null,
        o.barcode || null,
        o.isbn || null,
        o.issue_title || null,
        o.variant_name || null,
        o.pp_row_count || 0,
        o.comicbase_row_count || 0,
        o.source_presence || null,
        o.identity_status || null,
      ],
      1000
    );

    console.log('\n======================================================');
    console.log('ALL RECONCILED DATASETS SUCCESSFULLY LOADED INTO CLEAN');
    console.log('======================================================');

    const counts = await Promise.all([
      pg.query('SELECT count(*) FROM public.gcd_candidate_snapshots'),
      pg.query('SELECT count(*) FROM public.gcd_creator_entities'),
      pg.query('SELECT count(*) FROM public.gcd_series_entities'),
      pg.query('SELECT count(*) FROM public.canonical_identity_reconciliation'),
    ]);

    console.log(`gcd_candidate_snapshots:             ${counts[0].rows[0].count}`);
    console.log(`gcd_creator_entities:                ${counts[1].rows[0].count}`);
    console.log(`gcd_series_entities:                 ${counts[2].rows[0].count}`);
    console.log(`canonical_identity_reconciliation:   ${counts[3].rows[0].count}`);
  } finally {
    await pg.end();
  }
}

main().catch((err) => {
  console.error('Fatal upload error:', err);
  process.exit(1);
});
