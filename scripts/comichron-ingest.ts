/** CLI wrapper: npx tsx scripts/comichron-ingest.ts (job logic lives in lib/jobs/comichron-ingest.ts). */
import { runComichronIngest } from "../lib/jobs/comichron-ingest";
export { parseMonthlyChart } from "../lib/jobs/comichron-ingest";
if (process.argv[1]?.includes("comichron-ingest")) {
  runComichronIngest({ from: process.env.COMICHRON_FROM || undefined, to: process.env.COMICHRON_TO || undefined })
    .then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
