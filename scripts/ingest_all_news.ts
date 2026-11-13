/** CLI wrapper: npx tsx scripts/ingest_all_news.ts (job logic lives in lib/jobs/news-ingest.ts). */
import { runFullNewsIngest } from "../lib/jobs/news-ingest";
export { runFullNewsIngest };
if (process.argv[1]?.endsWith("ingest_all_news.ts")) {
  runFullNewsIngest().then(() => process.exit(0)).catch((err) => { console.error("Fatal ingest error:", err); process.exit(1); });
}
