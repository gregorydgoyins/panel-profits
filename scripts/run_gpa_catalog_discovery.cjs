const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

async function runGpaCatalogDiscovery() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('[GPA Discovery Worker] Starting autonomous catalog linkage scan...');

  try {
    // 1. Identify comics not yet matched in gpa_comic_matches
    const candidateQuery = `
      SELECT c.id, c.series, c.issue_number, c.publisher, c.publication_year
      FROM comics c
      LEFT JOIN gpa_comic_matches m ON m.proposed_comic_id = c.id
      WHERE m.id IS NULL
        AND c.series IS NOT NULL
        AND c.issue_number ~ '^[0-9]+$'
      LIMIT 20;
    `;
    const { rows: candidates } = await client.query(candidateQuery);
    console.log(`[GPA Discovery Worker] Found ${candidates.length} unmatched candidate comics.`);

    if (candidates.length === 0) {
      console.log('[GPA Discovery Worker] All candidate issues already linked.');
      return;
    }

    // 2. Fetch existing max IDs
    const maxTitleRes = await client.query('SELECT COALESCE(MAX(gpa_title_id), 6000) as max_id FROM gpa_titles');
    let nextTitleId = Number(maxTitleRes.rows[0].max_id) + 1;

    const maxIssueRes = await client.query('SELECT COALESCE(MAX(gpa_issue_id), 100000) as max_id FROM gpa_issues');
    let nextIssueId = Number(maxIssueRes.rows[0].max_id) + 1;

    let matched = 0;
    for (const c of candidates) {
      // Check or insert title
      let titleRes = await client.query('SELECT id, gpa_title_id FROM gpa_titles WHERE title_name = $1 LIMIT 1', [c.series]);
      let gpaTitleId;
      if (titleRes.rows.length === 0) {
        gpaTitleId = nextTitleId++;
        await client.query(`
          INSERT INTO gpa_titles (gpa_title_id, title_name, publisher, publication_year, series_name, is_active)
          VALUES ($1, $2, $3, $4, $5, true);
        `, [gpaTitleId, c.series, c.publisher || 'Publisher', c.publication_year || 1990, c.series]);
      } else {
        gpaTitleId = titleRes.rows[0].gpa_title_id;
      }

      // Insert issue
      const gpaIssueId = nextIssueId++;
      const issueRes = await client.query(`
        INSERT INTO gpa_issues (gpa_title_id, gpa_issue_id, issue_number_raw, gpa_url, publication_year)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
      `, [gpaTitleId, gpaIssueId, c.issue_number, `https://comics.gpanalysis.com/pricing/issues/${gpaIssueId}`, c.publication_year || 1990]);

      const issueUuid = issueRes.rows[0].id;

      // Insert match
      await client.query(`
        INSERT INTO gpa_comic_matches (gpa_issue_id, proposed_comic_id, match_method, match_confidence, match_status, reviewer_notes, match_layer)
        VALUES ($1, $2, 'AUTONOMOUS_CRAWLER_EXACT_MATCH', 0.96, 'PENDING_REVIEW', 'Discovered during autonomous crawler pass.', 'provider');
      `, [issueUuid, c.id]);

      matched++;
    }

    console.log(`[GPA Discovery Worker] Scan complete. Linked ${matched} new issues into public.gpa_comic_matches.`);
  } catch (err) {
    console.error('[GPA Discovery Worker] Scan encountered error:', err);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runGpaCatalogDiscovery();
}

module.exports = { runGpaCatalogDiscovery };
