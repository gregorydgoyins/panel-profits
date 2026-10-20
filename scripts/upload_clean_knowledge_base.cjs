/**
 * upload_clean_knowledge_base.js
 *
 * Direct high-performance bulk ingestion engine streaming all characters, creators,
 * teams, artifacts, and CBR Investopedia market lexicon terms into Clean Supabase:
 *
 * 1. public.ppcf_market_lexicon (4,653 financial and market mechanics terms)
 * 2. public.ppcf_wiki_pages (Marvel, DC, Star Wars, Image, Dark Horse, and Lexicon)
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { Client: PgClient } = require('pg');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vbcmjmakluyjnsmisoth.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  undefined;
if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
const DIRECT_URL =
  process.env.SUPABASE_DIRECT_URL;
if (!DIRECT_URL) throw new Error('SUPABASE_DIRECT_URL is required.');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function runDdlMigrations() {
  console.log('Connecting to PostgreSQL directly for DDL setup...');
  const pg = new PgClient({ connectionString: DIRECT_URL, ssl: { rejectUnauthorized: false } });
  try {
    await pg.connect();
    console.log('Connected to PostgreSQL.');

    const ddl = `
      -- Ensure ppcf_market_lexicon table exists
      CREATE TABLE IF NOT EXISTS public.ppcf_market_lexicon (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        term text NOT NULL UNIQUE,
        slug text NOT NULL UNIQUE,
        category text NOT NULL,
        investopedia_definition text NOT NULL,
        panel_profits_translation text NOT NULL,
        canonical_formula text,
        comic_example text,
        anti_patterns text,
        is_core_canon boolean NOT NULL DEFAULT true,
        investopedia_url text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS ppcf_market_lexicon_slug_idx ON public.ppcf_market_lexicon (slug);
      CREATE INDEX IF NOT EXISTS ppcf_market_lexicon_cat_idx ON public.ppcf_market_lexicon (category);

      ALTER TABLE public.ppcf_market_lexicon ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "ppcf_market_lexicon_read" ON public.ppcf_market_lexicon;
      CREATE POLICY "ppcf_market_lexicon_read" ON public.ppcf_market_lexicon FOR SELECT USING (true);

      -- Ensure ppcf_wiki_pages constraints support all entity and lexicon types
      ALTER TABLE public.ppcf_wiki_pages DROP CONSTRAINT IF EXISTS ppcf_wiki_pages_page_type_check;
      ALTER TABLE public.ppcf_wiki_pages ADD CONSTRAINT ppcf_wiki_pages_page_type_check 
        CHECK (page_type IN ('COMIC_ISSUE', 'SERIES', 'CREATOR', 'PUBLISHER', 'CHARACTER', 'STORY', 'LOCATION', 'ITEM', 'TEAM', 'VEHICLE', 'LEXICON'));

      ALTER TABLE public.ppcf_wiki_pages ALTER COLUMN ppcf_id DROP NOT NULL;
      ALTER TABLE public.ppcf_wiki_pages ADD COLUMN IF NOT EXISTS universe text DEFAULT 'UNSPECIFIED';
      ALTER TABLE public.ppcf_wiki_pages ADD COLUMN IF NOT EXISTS reality text DEFAULT 'Earth-616';
      ALTER TABLE public.ppcf_wiki_pages ADD COLUMN IF NOT EXISTS creators text;
      ALTER TABLE public.ppcf_wiki_pages ADD COLUMN IF NOT EXISTS first_appearance text;

      CREATE INDEX IF NOT EXISTS ppcf_wiki_pages_type_idx ON public.ppcf_wiki_pages (page_type);
      CREATE INDEX IF NOT EXISTS ppcf_wiki_pages_slug_idx ON public.ppcf_wiki_pages (slug);
      CREATE INDEX IF NOT EXISTS ppcf_wiki_pages_universe_type_idx ON public.ppcf_wiki_pages (universe, page_type);
    `;

    await pg.query(ddl);
    console.log('DDL migration completed successfully.');
  } catch (err) {
    console.warn('Direct PG DDL warning (continuing via Supabase REST):', err.message);
  } finally {
    try {
      await pg.end();
    } catch {}
  }
}

async function bulkUpsert(table, rows, onConflict = 'slug') {
  if (!rows || rows.length === 0) return 0;
  const { error } = await supabase.from(table).upsert(rows, { onConflict, ignoreDuplicates: true });
  if (error) {
    console.error(`Error upserting ${rows.length} rows to ${table}:`, error.message);
    return 0;
  }
  return rows.length;
}

async function uploadLexicon() {
  console.log('\n--- Ingesting CBR Investopedia Market Lexicon ---');
  const lexiconPath = path.resolve(__dirname, '../panel-profits/lib/lexicon/cbr_market_lexicon.json');
  if (!fs.existsSync(lexiconPath)) {
    console.warn('Lexicon JSON not found at:', lexiconPath);
    return;
  }

  const raw = JSON.parse(fs.readFileSync(lexiconPath, 'utf8'));
  const terms = Object.values(raw);
  console.log(`Loaded ${terms.length} market terms from disk.`);

  let lexiconUploaded = 0;
  let wikiUploaded = 0;
  const CHUNK_SIZE = 250;

  for (let i = 0; i < terms.length; i += CHUNK_SIZE) {
    const chunk = terms.slice(i, i + CHUNK_SIZE);

    // 1. Table ppcf_market_lexicon
    const lexiconRows = chunk.map((t) => ({
      term: t.term,
      slug: t.slug,
      category: t.category,
      investopedia_definition: t.investopedia_definition,
      panel_profits_translation: t.panel_profits_translation,
      canonical_formula: t.canonical_formula || null,
      comic_example: t.comic_example || null,
      anti_patterns: t.anti_patterns || null,
      is_core_canon: Boolean(t.is_core_canon),
      investopedia_url: t.investopedia_url || null,
    }));
    lexiconUploaded += await bulkUpsert('ppcf_market_lexicon', lexiconRows, 'slug');

    // 2. Table ppcf_wiki_pages
    const wikiRows = chunk.map((t) => ({
      slug: `lexicon-${t.slug}`,
      display_title: t.term,
      page_type: 'LEXICON',
      summary: `${t.panel_profits_translation}\n\nInvestopedia Foundation: ${t.investopedia_definition}${
        t.canonical_formula ? `\n\nCanonical Formula: ${t.canonical_formula}` : ''
      }${t.comic_example ? `\n\nMarket Application: ${t.comic_example}` : ''}`,
      page_status: 'READY',
      universe: 'FINANCIAL',
      reality: 'INVESTOPEDIA_CBR',
    }));
    wikiUploaded += await bulkUpsert('ppcf_wiki_pages', wikiRows, 'slug');

    process.stdout.write(`  Lexicon progress: ${Math.min(i + CHUNK_SIZE, terms.length)} / ${terms.length}\r`);
  }
  console.log(`\nLexicon Ingest Complete: ${lexiconUploaded} rows to ppcf_market_lexicon, ${wikiUploaded} rows to ppcf_wiki_pages.`);
}

async function uploadJsonlFile(filePath, universe, pageType, mapFn) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return 0;
  }

  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    return 0;
  }

  console.log(`\n--- Streaming ${path.basename(filePath)} (${(stat.size / (1024 * 1024)).toFixed(1)} MB) ---`);

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const CHUNK_SIZE = 250;
  let batch = [];
  let totalProcessed = 0;
  let totalUploaded = 0;
  const seenSlugs = new Set();

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const item = JSON.parse(line);
      const row = mapFn(item, universe, pageType);
      if (row && row.slug && !seenSlugs.has(row.slug)) {
        seenSlugs.add(row.slug);
        batch.push(row);
        totalProcessed++;

        if (batch.length >= CHUNK_SIZE) {
          totalUploaded += await bulkUpsert('ppcf_wiki_pages', batch, 'slug');
          batch = [];
          process.stdout.write(`  Uploaded ${totalUploaded} rows (${totalProcessed} read)\r`);
        }
      }
    } catch {}
  }

  if (batch.length > 0) {
    totalUploaded += await bulkUpsert('ppcf_wiki_pages', batch, 'slug');
  }

  console.log(`\nCompleted ${path.basename(filePath)}: ${totalUploaded} rows uploaded to ppcf_wiki_pages.`);
  return totalUploaded;
}

function mapCharacter(item, universe, pageType) {
  const title = item.title || item.name || '';
  if (!title) return null;
  const alias = item.current_alias ? ` "${item.current_alias}"` : '';
  const displayTitle = item.current_alias ? `${item.current_alias} (${item.name || item.title})` : item.name || item.title;
  const slug = slugify(`${title}-${universe}`);

  const details = [];
  if (item.origin) details.push(`Origin: ${item.origin}`);
  if (item.identity) details.push(`Identity: ${item.identity}`);
  if (item.citizenship) details.push(`Citizenship: ${item.citizenship}`);
  if (item.occupation) details.push(`Occupation: ${item.occupation}`);
  if (item.species) details.push(`Species: ${item.species}`);
  if (item.affiliation) details.push(`Affiliation: ${item.affiliation}`);

  return {
    slug,
    display_title: displayTitle.slice(0, 200),
    page_type: 'CHARACTER',
    summary: details.length > 0 ? details.join(' · ') : `Canonical ${universe} character appearance.`,
    page_status: 'READY',
    universe,
    reality: item.universe || item.continuity || 'Earth-616',
    creators: item.creators || null,
    first_appearance: item.first_appearance || null,
  };
}

function mapCreator(item, universe) {
  const name = item.name || item.page_title || '';
  if (!name) return null;
  const slug = slugify(`creator-${name}-${universe}`);
  const details = [];
  if (item.birth_date) details.push(`Born: ${item.birth_date}`);
  if (item.country) details.push(`Country: ${item.country}`);
  if (item.awards) details.push(`Awards: ${item.awards}`);

  return {
    slug,
    display_title: name.slice(0, 200),
    page_type: 'CREATOR',
    summary: details.length > 0 ? details.join(' · ') : `Master comic book creator in ${universe}.`,
    page_status: 'READY',
    universe,
    reality: 'CANON',
    creators: null,
    first_appearance: null,
  };
}

function mapTeam(item, universe) {
  const name = item.name || item.page_title || '';
  if (!name) return null;
  const slug = slugify(`team-${name}-${universe}`);
  const details = [];
  if (item.leaders) details.push(`Leadership: ${item.leaders}`);
  if (item.members) details.push(`Members: ${item.members}`);
  if (item.headquarters) details.push(`HQ: ${item.headquarters}`);

  return {
    slug,
    display_title: name.slice(0, 200),
    page_type: 'TEAM',
    summary: details.length > 0 ? details.join(' · ') : `Formidable comic book alliance in ${universe}.`,
    page_status: 'READY',
    universe,
    reality: item.universe || 'Earth-616',
    creators: item.creators || null,
    first_appearance: item.first_appearance || null,
  };
}

function mapArtifact(item, universe) {
  const name = item.name || item.page_title || '';
  if (!name) return null;
  const category = (item.category || '').toUpperCase();
  const pageType = category.includes('VEHICLE') ? 'VEHICLE' : category.includes('LOCATION') ? 'LOCATION' : 'ITEM';
  const slug = slugify(`${pageType.toLowerCase()}-${name}-${universe}`);

  return {
    slug,
    display_title: name.slice(0, 200),
    page_type: pageType,
    summary: item.description || `Legendary artifact, vehicle, or landmark in ${universe}.`,
    page_status: 'READY',
    universe,
    reality: item.universe || 'Earth-616',
    creators: item.creators || null,
    first_appearance: item.first_appearance || null,
  };
}

async function uploadIndieManifest() {
  const manifestPath = path.resolve(__dirname, '../publisher_dumps/indie_character_manifest.json');
  if (!fs.existsSync(manifestPath)) return 0;
  console.log('\n--- Uploading Indie Character Manifest (Image, Dark Horse, Spawn, Transformers) ---');

  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const rows = [];
  const seenSlugs = new Set();

  for (const [universe, characters] of Object.entries(raw)) {
    if (!Array.isArray(characters)) continue;
    for (const c of characters) {
      const name = typeof c === 'string' ? c.trim() : (c.name || c.title || '').trim();
      if (!name) continue;
      const slug = slugify(`${name}-${universe}`);
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);

      rows.push({
        slug,
        display_title: name.slice(0, 200),
        page_type: 'CHARACTER',
        summary: (typeof c === 'object' && (c.summary || c.description)) || `Canonical ${universe} character appearance.`,
        page_status: 'READY',
        universe: universe.toUpperCase(),
        reality: (typeof c === 'object' && c.reality) || 'CANON',
        creators: (typeof c === 'object' && c.creators) || null,
        first_appearance: (typeof c === 'object' && c.first_appearance) || null,
      });
    }
  }

  let uploaded = 0;
  const CHUNK_SIZE = 250;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    uploaded += await bulkUpsert('ppcf_wiki_pages', chunk, 'slug');
    process.stdout.write(`  Uploaded ${uploaded} / ${rows.length} indie characters\r`);
  }

  console.log(`\nCompleted Indie Manifest: ${uploaded} rows uploaded.`);
  return uploaded;
}

async function run() {
  console.log('================================================================');
  console.log('PANEL PROFITS — CLEAN FOUNDATION BULK KNOWLEDGE BASE INGESTION');
  console.log('================================================================');

  if (process.argv.includes('--only-indie')) {
    await uploadIndieManifest();
    console.log('\nIndie manifest uploaded successfully.');
    return;
  }

  // 1. Run DDL migration setup
  await runDdlMigrations();

  // 2. Upload CBR Investopedia Market Lexicon (4,653 terms)
  await uploadLexicon();

  // 3. Marvel Universe
  await uploadJsonlFile(path.resolve(__dirname, '../marvel_database_dump/marvel_characters.jsonl'), 'MARVEL', 'CHARACTER', mapCharacter);
  await uploadJsonlFile(path.resolve(__dirname, '../marvel_database_dump/marvel_creators.jsonl'), 'MARVEL', 'CREATOR', mapCreator);
  await uploadJsonlFile(path.resolve(__dirname, '../marvel_database_dump/marvel_teams.jsonl'), 'MARVEL', 'TEAM', mapTeam);
  await uploadJsonlFile(path.resolve(__dirname, '../marvel_database_dump/marvel_lore_and_artifacts.jsonl'), 'MARVEL', 'ITEM', mapArtifact);

  // 4. DC Universe
  await uploadJsonlFile(path.resolve(__dirname, '../dc_database_dump/dc_characters.jsonl'), 'DC', 'CHARACTER', mapCharacter);
  await uploadJsonlFile(path.resolve(__dirname, '../dc_database_dump/dc_teams.jsonl'), 'DC', 'TEAM', mapTeam);
  await uploadJsonlFile(path.resolve(__dirname, '../dc_database_dump/dc_lore_and_artifacts.jsonl'), 'DC', 'ITEM', mapArtifact);

  // 5. Star Wars (Canon & Legends)
  await uploadJsonlFile(path.resolve(__dirname, '../publisher_dumps/starwars/starwars_characters.jsonl'), 'STAR_WARS', 'CHARACTER', mapCharacter);

  // 6. Indie Manifest (Image, Dark Horse, Spawn, Transformers)
  await uploadIndieManifest();

  console.log('\n================================================================');
  console.log('ALL UNIVERSES & MARKET LEXICON UPLOADED TO CLEAN SUPABASE!');
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('Fatal ingestion error:', err);
  process.exit(1);
});
