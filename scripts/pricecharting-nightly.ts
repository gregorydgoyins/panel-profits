/** CLI wrapper: npx tsx scripts/pricecharting-nightly.ts (job logic lives in lib/jobs/pricecharting-sync.ts). */
import { runPricechartingSync } from "../lib/jobs/pricecharting-sync";
runPricechartingSync().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
