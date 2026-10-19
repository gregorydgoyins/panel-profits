const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to Clean Supabase.');

  const sql = `
    GRANT SELECT ON public.ce70_equity_universe TO anon, authenticated;
    GRANT SELECT ON public.ce70_index_definitions TO anon, authenticated;
    GRANT SELECT ON public.pp_news_stories TO anon, authenticated;
    GRANT SELECT ON public.news_articles TO anon, authenticated;
    GRANT SELECT ON public.pp_video_reels TO anon, authenticated;
  `;

  await client.query(sql);
  console.log('Successfully granted SELECT permissions to anon and authenticated roles.');

  await client.end();
}

main().catch(err => {
  console.error('Permission grant error:', err);
  process.exit(1);
});
