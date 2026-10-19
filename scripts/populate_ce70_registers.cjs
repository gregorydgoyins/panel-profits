/**
 * populate_ce70_registers.cjs
 *
 * Populates public.ce70_index_definitions and public.ce70_equity_universe
 * in Clean Supabase directly from:
 * 1. CE70_MASTER_INDEX.md (70 constitutional master index seats)
 * 2. shadow_database.sqlite:ce70_constituents_final (118 constituent equity records)
 *
 * Ensures RLS is enabled with permissive read policies.
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { Client: PgClient } = require('pg');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const SQLITE_PATH = path.join(ROOT_DIR, 'shadow_database.sqlite');
const MASTER_INDEX_PATH = path.join(ROOT_DIR, 'CE70_MASTER_INDEX.md');

const DIRECT_URL =
  process.env.CLEAN_DATABASE_URL ||
  process.env.SUPABASE_DIRECT_URL ||
  undefined;

async function main() {
  console.log('Connecting to Clean Supabase PostgreSQL...');
  const pg = new PgClient({ connectionString: DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  console.log('Connected.');

  try {
    console.log('Creating schema for ce70_index_definitions and ce70_equity_universe...');
    await pg.query(`
      CREATE TABLE IF NOT EXISTS public.ce70_index_definitions (
        seat_number integer PRIMARY KEY,
        index_code text NOT NULL DEFAULT 'CE70',
        era text NOT NULL,
        title_issue text NOT NULL,
        series text NOT NULL,
        issue_number text NOT NULL,
        year integer,
        publisher text NOT NULL,
        primary_creators text,
        status text NOT NULL,
        gregory_score numeric,
        word_count text,
        dossier_path text,
        constituent_count integer NOT NULL DEFAULT 1,
        asset_class text NOT NULL DEFAULT 'EQUITY_INDEX_SEAT',
        asset_subclass text,
        cover_url text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.ce70_equity_universe (
        id text PRIMARY KEY,
        scenario text NOT NULL,
        seat_number integer NOT NULL,
        seat_type text,
        origin_era text,
        production_age text,
        canonical_issue_id text,
        series text NOT NULL,
        title text NOT NULL,
        issue_number text NOT NULL,
        lineage text,
        reference_grade numeric,
        reference_fmv_usd numeric NOT NULL,
        price_formatted text NOT NULL,
        gregory_score numeric,
        country_code text DEFAULT 'US',
        is_foreign boolean DEFAULT false,
        evidence_confidence text,
        effective_date date,
        status text DEFAULT 'ACTIVE',
        cover_url text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS ce70_index_definitions_era_idx ON public.ce70_index_definitions (era);
      CREATE INDEX IF NOT EXISTS ce70_equity_universe_seat_idx ON public.ce70_equity_universe (seat_number);
      CREATE INDEX IF NOT EXISTS ce70_equity_universe_scenario_idx ON public.ce70_equity_universe (scenario);

      ALTER TABLE public.ce70_index_definitions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.ce70_equity_universe ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "ce70_index_definitions_read" ON public.ce70_index_definitions;
      CREATE POLICY "ce70_index_definitions_read" ON public.ce70_index_definitions FOR SELECT USING (true);

      DROP POLICY IF EXISTS "ce70_equity_universe_read" ON public.ce70_equity_universe;
      CREATE POLICY "ce70_equity_universe_read" ON public.ce70_equity_universe FOR SELECT USING (true);
    `);

    // 1. Read and parse CE70_MASTER_INDEX.md
    console.log('Parsing CE70_MASTER_INDEX.md...');
    const masterText = fs.readFileSync(MASTER_INDEX_PATH, 'utf8');
    const masterLines = masterText.split(/\r?\n/).filter((l) => /^\|\s*\d+\s*\|/.test(l));

    const masterRows = masterLines.map((line) => {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      const seatNumber = Number(cells[0]);
      const era = cells[1];
      const titleIssue = cells[2];
      const year = Number(cells[3]) || null;
      const publisher = cells[4];
      const primaryCreators = cells[5];
      const status = cells[6];
      const gregoryScore = parseFloat(cells[7]) || null;
      const wordCount = cells[8];
      const dossierMatch = cells[9]?.match(/\(([^)]+)\)/);
      const dossierPath = dossierMatch ? dossierMatch[1] : null;

      // Extract series and issue_number from titleIssue (e.g. "Detective Comics #2")
      const hashIdx = titleIssue.lastIndexOf('#');
      let series = titleIssue;
      let issueNumber = '1';
      if (hashIdx !== -1) {
        series = titleIssue.slice(0, hashIdx).trim();
        issueNumber = titleIssue.slice(hashIdx + 1).trim();
      }

      return {
        seatNumber,
        era,
        titleIssue,
        series,
        issueNumber,
        year,
        publisher,
        primaryCreators,
        status,
        gregoryScore,
        wordCount,
        dossierPath,
        assetSubclass: `${era.toUpperCase()} ERA CONSTITUENT`,
      };
    });

    console.log(`Upserting ${masterRows.length} seats into public.ce70_index_definitions...`);
    for (const r of masterRows) {
      await pg.query(`
        INSERT INTO public.ce70_index_definitions (
          seat_number, index_code, era, title_issue, series, issue_number,
          year, publisher, primary_creators, status, gregory_score, word_count,
          dossier_path, constituent_count, asset_class, asset_subclass, updated_at
        ) VALUES ($1, 'CE70', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1, 'EQUITY_INDEX_SEAT', $13, now())
        ON CONFLICT (seat_number) DO UPDATE SET
          era = EXCLUDED.era,
          title_issue = EXCLUDED.title_issue,
          series = EXCLUDED.series,
          issue_number = EXCLUDED.issue_number,
          year = EXCLUDED.year,
          publisher = EXCLUDED.publisher,
          primary_creators = EXCLUDED.primary_creators,
          status = EXCLUDED.status,
          gregory_score = EXCLUDED.gregory_score,
          word_count = EXCLUDED.word_count,
          dossier_path = EXCLUDED.dossier_path,
          asset_subclass = EXCLUDED.asset_subclass,
          updated_at = now();
      `, [
        r.seatNumber, r.era, r.titleIssue, r.series, r.issueNumber,
        r.year, r.publisher, r.primaryCreators, r.status, r.gregoryScore,
        r.wordCount, r.dossierPath, r.assetSubclass
      ]);
    }

    // 2. Read shadow_database.sqlite ce70_constituents_final
    console.log('Reading sqlite ce70_constituents_final...');
    const local = new DatabaseSync(SQLITE_PATH);
    const equityRows = local.prepare(`
      SELECT id, scenario, seat_number, seat_type, origin_era, production_age,
             canonical_issue_id, title, issue_number, lineage, reference_grade,
             reference_fmv_usd, gregory_score, country_code, is_foreign,
             evidence_confidence, effective_date, status
      FROM ce70_constituents_final
      ORDER BY seat_number, scenario
    `).all();
    local.close();

    console.log(`Upserting ${equityRows.length} equity constituents into public.ce70_equity_universe...`);
    for (const r of equityRows) {
      const fmv = Number(r.reference_fmv_usd) || 0;
      const formattedPrice = '$' + fmv.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      await pg.query(`
        INSERT INTO public.ce70_equity_universe (
          id, scenario, seat_number, seat_type, origin_era, production_age,
          canonical_issue_id, series, title, issue_number, lineage,
          reference_grade, reference_fmv_usd, price_formatted, gregory_score,
          country_code, is_foreign, evidence_confidence, effective_date, status, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, now())
        ON CONFLICT (id) DO UPDATE SET
          scenario = EXCLUDED.scenario,
          seat_number = EXCLUDED.seat_number,
          seat_type = EXCLUDED.seat_type,
          origin_era = EXCLUDED.origin_era,
          production_age = EXCLUDED.production_age,
          canonical_issue_id = EXCLUDED.canonical_issue_id,
          series = EXCLUDED.series,
          title = EXCLUDED.title,
          issue_number = EXCLUDED.issue_number,
          lineage = EXCLUDED.lineage,
          reference_grade = EXCLUDED.reference_grade,
          reference_fmv_usd = EXCLUDED.reference_fmv_usd,
          price_formatted = EXCLUDED.price_formatted,
          gregory_score = EXCLUDED.gregory_score,
          country_code = EXCLUDED.country_code,
          is_foreign = EXCLUDED.is_foreign,
          evidence_confidence = EXCLUDED.evidence_confidence,
          effective_date = EXCLUDED.effective_date,
          status = EXCLUDED.status,
          updated_at = now();
      `, [
        r.id, r.scenario, r.seat_number, r.seat_type, r.origin_era, r.production_age,
        r.canonical_issue_id, r.title, r.title, String(r.issue_number), r.lineage,
        r.reference_grade, fmv, formattedPrice, r.gregory_score,
        r.country_code, Boolean(r.is_foreign), r.evidence_confidence, r.effective_date, r.status
      ]);
    }

    // Correlate covers from public.comics if available
    console.log('Cross-correlating cover assets from public.comics...');
    await pg.query(`
      UPDATE public.ce70_equity_universe u
      SET cover_url = c.cover_url
      FROM public.comics c
      WHERE LOWER(c.series) = LOWER(u.series)
        AND c.issue_number = u.issue_number
        AND c.cover_url IS NOT NULL
        AND c.cover_url != ''
        AND u.cover_url IS NULL;

      UPDATE public.ce70_index_definitions d
      SET cover_url = u.cover_url
      FROM public.ce70_equity_universe u
      WHERE d.seat_number = u.seat_number
        AND u.cover_url IS NOT NULL
        AND d.cover_url IS NULL;
    `);

    // Verify row counts
    const defCount = await pg.query('SELECT count(*) FROM public.ce70_index_definitions');
    const eqCount = await pg.query('SELECT count(*) FROM public.ce70_equity_universe');

    console.log('--- CE70 CLEAN PORT COMPLETE ---');
    console.log(`public.ce70_index_definitions: ${defCount.rows[0].count} seats`);
    console.log(`public.ce70_equity_universe:    ${eqCount.rows[0].count} equities`);
  } finally {
    await pg.end();
  }
}

main().catch((err) => {
  console.error('Port failed:', err);
  process.exit(1);
});
