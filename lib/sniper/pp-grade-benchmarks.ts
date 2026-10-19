/**
 * Read-only translation of the October 6 Panel Profits grade-price snapshot.
 * This is not a transaction feed or a Sniper calculation table.
 * The caller must resolve an exact PP source ID and edition before using a price.
 */
export const PP_GRADE_COLUMNS = {
  RAW: "pp_price_raw",
  "2.0": "pp_price_2_0",
  "3.0": "pp_price_3_0",
  "4.0": "pp_price_4_0",
  "5.0": "pp_price_5_0",
  "6.0": "pp_price_6_0",
  "7.0": "pp_price_7_0",
  "8.0": "pp_price_8_0",
  "9.0": "pp_price_9_0",
  "9.2": "pp_price_9_2",
  "9.4": "pp_price_9_4",
  "9.6": "pp_price_9_6",
  "9.8": "pp_price_9_8",
  "10.0": "pp_price_10_0",
} as const;

export type PPGrade = keyof typeof PP_GRADE_COLUMNS;
export type PPPriceRow = { pp_id: string; snapshot_date: string; [key: string]: string | number | null };
export type PPGradeBenchmark = {
  ppSourceId: string;
  snapshotDate: string;
  grade: PPGrade;
  price: number;
  source: "Panel Profits";
};

/** No interpolation: absent 8.5 or 9.9 source columns mean no benchmark at those grades. */
export function resolvePPGradeBenchmark(
  row: PPPriceRow | null | undefined,
  exactPPSourceId: string | null | undefined,
  grade: PPGrade,
): PPGradeBenchmark | undefined {
  if (!row || !exactPPSourceId || row.pp_id !== exactPPSourceId) return undefined;
  const column = PP_GRADE_COLUMNS[grade];
  if (!column || !/^\\d{4}-\\d{2}-\\d{2}$/.test(row.snapshot_date)) return undefined;
  const raw = row[column];
  if (raw == null || raw === "") return undefined;
  const price = Number(raw);
  if (!Number.isFinite(price) || price <= 0) return undefined;
  return { ppSourceId: exactPPSourceId, snapshotDate: row.snapshot_date, grade, price, source: "Panel Profits" };
}
