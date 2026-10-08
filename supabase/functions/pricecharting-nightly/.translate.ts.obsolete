// Pure CSV -> Panel Profits column translation. Mapping verified against the live PriceCharting page
// and PRICECHARTING_COMICS_MERGED_37_FIELDS_TRANSLATED.csv:
//   loose=RAW cib=4.0 new=6.0 graded=8.0 box-only=9.2 manual-only=9.8 bgs-10=10.0
//   condition-9=2.0 condition-13=3.0 condition-14=5.0 condition-15=7.0 condition-16=9.0
//   condition-10=9.6 condition-17=9.4 condition-18=9.8 dealer sell
//   retail-loose=RAW buy/sell retail-cib=4.0 buy/sell retail-new=6.0 buy/sell
export const EXPECTED = ["id","console-name","product-name","loose-price","cib-price","new-price","graded-price","box-only-price",
 "manual-only-price","bgs-10-price","condition-9-price","condition-10-price","condition-13-price","condition-14-price",
 "condition-15-price","condition-16-price","condition-17-price","condition-18-price","condition-19-price","condition-20-price",
 "condition-21-price","condition-22-price","gamestop-price","gamestop-trade-price","retail-loose-buy","retail-loose-sell",
 "retail-cib-buy","retail-cib-sell","retail-new-buy","retail-new-sell","upc","sales-volume","genre","tcg-id","asin","epid","release-date"];

export const MAP: Array<[string, string]> = [
  ["pp_price_raw","loose-price"],["pp_price_2_0","condition-9-price"],["pp_price_3_0","condition-13-price"],
  ["pp_price_4_0","cib-price"],["pp_price_5_0","condition-14-price"],["pp_price_6_0","new-price"],
  ["pp_price_7_0","condition-15-price"],["pp_price_8_0","graded-price"],["pp_price_9_0","condition-16-price"],
  ["pp_price_9_2","box-only-price"],["pp_price_9_4","condition-17-price"],["pp_price_9_6","condition-10-price"],
  ["pp_price_9_8","manual-only-price"],["pp_price_9_8_sell","condition-18-price"],["pp_price_10_0","bgs-10-price"],
  ["pp_retail_raw_buy","retail-loose-buy"],["pp_retail_raw_sell","retail-loose-sell"],
  ["pp_retail_4_0_buy","retail-cib-buy"],["pp_retail_4_0_sell","retail-cib-sell"],
  ["pp_retail_6_0_buy","retail-new-buy"],["pp_retail_6_0_sell","retail-new-sell"],
];

/** Streaming RFC-4180 CSV reader: yields one string[] per record without holding the file in memory. */
export async function* records(stream: ReadableStream<Uint8Array>): AsyncGenerator<string[]> {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  let field = "", row: string[] = [], inQ = false, q = false, first = true;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    let text: string = value;
    if (first) { first = false; if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); }
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (q) {
          if (c === '"') { field += '"'; q = false; continue; }
          inQ = false; q = false;
        } else if (c === '"') { q = true; continue; }
        else { field += c; continue; }
      }
      if (c === '"' && field === "") { inQ = true; continue; }
      if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); field = ""; yield row; row = []; }
      else if (c !== "\r") field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); yield row; }
}

const money = (v: string | undefined): number | null => {
  const s = (v ?? "").trim().replace(/[$,]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export type StageRow = Record<string, number | string | null>;

/** Validates the header, then yields translated rows (one per distinct PriceCharting id). */
export async function* translate(stream: ReadableStream<Uint8Array>, label: string): AsyncGenerator<StageRow> {
  const it = records(stream);
  const h = await it.next();
  if (h.done) throw new Error("empty file");
  const header = h.value.map((s) => s.trim());
  if (header.length !== EXPECTED.length || header.some((c, i) => c !== EXPECTED[i])) {
    throw new Error("header differs from the 37-column PriceCharting layout - nothing loaded");
  }
  const col = new Map(header.map((c, i) => [c, i]));
  const idIdx = col.get("id")!, svIdx = col.get("sales-volume")!;
  const idx = MAP.map(([out, src]) => [out, col.get(src)!] as [string, number]);
  const seen = new Set<string>();
  for await (const r of it) {
    if (r.length < EXPECTED.length - 6) continue;
    const id = (r[idIdx] || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const svn = Number(String(r[svIdx] ?? "").trim());
    const row: StageRow = { run_label: label, pp_id: id, pp_sales_volume: Number.isFinite(svn) && String(r[svIdx] ?? "").trim() !== "" ? Math.trunc(svn) : null };
    for (const [out, i] of idx) row[out] = money(r[i]);
    yield row;
  }
}
