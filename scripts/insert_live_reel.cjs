const { Client } = require('pg');

const DIRECT_URL =
  process.env.CLEAN_DATABASE_URL ||
  process.env.SUPABASE_DIRECT_URL ||
  undefined;

async function main() {
  const pg = new Client({ connectionString: DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const storyId = 'ee2967cd-1192-43c9-8187-f75dd26dc1b9';
  await pg.query('DELETE FROM public.pp_video_reels WHERE story_id = $1;', [storyId]);

  const insertSql = `
    INSERT INTO public.pp_video_reels (
      story_id, headline, presenter_name, presenter_role,
      video_url, poster_url, transcript, duration_seconds, provider, status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, 10, 'did', 'READY', now(), now()
    ) RETURNING *;
  `;

  const res = await pg.query(insertSql, [
    storyId,
    "WizKids Reveals New 'Marvel HeroClix: Secret Wars Map and Terrain Kit'",
    'Corinne Howard',
    'Chief Market Anchor & Bureau Chief',
    '/media/newsdesk-loop.mp4',
    '/media/anchor-face.jpg',
    "WizKids has revealed the new 'Marvel HeroClix: Secret Wars Map and Terrain Kit'. The upcoming tabletop release includes two limited edition miniatures for collectors.",
  ]);

  console.log('Successfully inserted live video reel:', res.rows[0]);
  await pg.end();
}

main().catch((err) => {
  console.error('Insert error:', err);
  process.exit(1);
});
