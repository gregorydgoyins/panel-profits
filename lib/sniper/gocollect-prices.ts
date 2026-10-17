import { createAdminServerClient } from "@/lib/supabase/admin";

/**
 * Realized-sale prices from GoCollect for a slab's OWN grader, label type and grade (no cross-grader conversion).
 * Every number is a recorded sale someone paid; a grade with no recorded sales has no row and stays unpriced.
 */
export interface GoCollectPrice {
  grader: string;
  labelType: string;
  grade: string;
  salesCount: number | null;
  lastSoldDate: string | null;
  lastSoldPrice: number | null;
  fmv: number | null;
  avg1y: number | null; n1y: number | null;
  avg90d: number | null; n90d: number | null;
  avg30d: number | null; n30d: number | null;
}
export interface GoCollectQuery { key: string; title: string; issue: string; date?: string | null; grader: string; labelType: string | null | undefined; grade: number | null | undefined }

/** Map the label type printed on the slab to GoCollect's name for that grader. Unknown/missing label type = no match (never assumed). */
export function gocollectLabel(grader: string, labelType: string | null | undefined): string | null {
  const g = grader.toLowerCase();
  const t = String(labelType ?? "").toLowerCase().trim();
  if (!t) return null;
  if (g === "cgc") {
    if (/signature|\bss\b/.test(t)) return /qualified/.test(t) ? "Qualified SS" : "Signature";
    if (/qualified/.test(t)) return "Qualified";
    if (/restored/.test(t)) return "Restored";
    if (/conserved/.test(t)) return "Conserved";
    if (/universal/.test(t)) return "Universal";
    return null;
  }
  if (g === "cbcs") {
    if (/verified/.test(t)) return "Verified Signature";
    if (/signed.*restored|restored.*signed/.test(t)) return "Signed/Restored";
    if (/signed|signature/.test(t)) return "Signed";
    if (/restored/.test(t)) return "Restored";
    if (/conserved/.test(t)) return "Conserved";
    if (/certified|blue/.test(t)) return "Certified/Blue";
    return null;
  }
  if (g === "psa") {
    if (/signed|signature/.test(t)) return "Signed";
    if (/restored/.test(t)) return "Restored";
    if (/conserved/.test(t)) return "Conserved";
    if (/standard|universal|certified/.test(t)) return "Standard";
    return null;
  }
  return null;
}

export async function lookupGoCollectBatch(queries: GoCollectQuery[]): Promise<Map<string, GoCollectPrice>> {
  const out = new Map<string, GoCollectPrice>();
  const keys = queries
    .map((q) => ({ k: q.key, title: q.title, issue: q.issue.replace(/^#/, ""), date: q.date ?? "", grader: q.grader, label: gocollectLabel(q.grader, q.labelType), grade: q.grade != null ? Number(q.grade).toFixed(1) : null }))
    .filter((q) => q.title && q.issue && q.label && q.grade);
  if (!keys.length) return out;
  const db = createAdminServerClient();
  for (let i = 0; i < keys.length; i += 100) {
    const { data, error } = await db.rpc("sniper_gocollect_batch", { p_keys: keys.slice(i, i + 100) });
    if (error) throw new Error(`sniper_gocollect_batch failed: ${error.message}`);
    // several books can share title+issue (e.g. variants); only an unambiguous single match is used.
    const byKey = new Map<string, any[]>();
    for (const r of (data ?? []) as any[]) byKey.set(r.k, [...(byKey.get(r.k) ?? []), r]);
    for (const [k, rows] of byKey) {
      if (new Set(rows.map((r) => r.slug)).size !== 1) continue;
      const r = rows[0];
      out.set(k, { grader: r.grader, labelType: r.label_type, grade: r.grade, salesCount: r.sales_count, lastSoldDate: r.last_sold_date, lastSoldPrice: r.last_sold_price != null ? Number(r.last_sold_price) : null, fmv: r.fmv != null ? Number(r.fmv) : null, avg1y: r.avg_1y != null ? Number(r.avg_1y) : null, n1y: r.n_1y, avg90d: r.avg_90d != null ? Number(r.avg_90d) : null, n90d: r.n_90d, avg30d: r.avg_30d != null ? Number(r.avg_30d) : null, n30d: r.n_30d });
    }
  }
  return out;
}

/**
 * Resolve a bounded batch of slab-specific GoCollect observations outside the page request.
 * Only verified label identities are queried. Missing matches stay unavailable.
 */
export async function captureGoCollectPrices(db: any, limit = 40): Promise<number> {
  const { data, error } = await db.from("sniper_listings")
    .select("item_id,payload,label")
    .eq("status", "live")
    .not("label", "is", null)
    .order("last_seen", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`GoCollect listing scan failed: ${error.message}`);
  const queries: GoCollectQuery[] = [];
  const ids = new Map<string, { itemId: string; payload: Record<string, unknown> }>();
  for (const row of data ?? []) {
    const payload = row.payload as Record<string, unknown> | null;
    const label = row.label as Record<string, unknown> | null;
    if (!payload || !label || payload.gocollectPrice) continue;
    if (typeof label.title !== "string" || typeof label.issueNumber !== "string" ||
        typeof label.grader !== "string" || typeof label.labelType !== "string" ||
        typeof label.grade !== "number") continue;
    const key = String(row.item_id);
    queries.push({ key, title: label.title, issue: label.issueNumber,
      date: typeof label.issueDate === "string" ? label.issueDate : null,
      grader: label.grader, labelType: label.labelType, grade: label.grade });
    ids.set(key, { itemId: key, payload });
    if (queries.length >= limit) break;
  }
  if (!queries.length) return 0;
  const prices = await lookupGoCollectBatch(queries);
  let updated = 0;
  for (const [key, price] of prices) {
    const entry = ids.get(key);
    if (!entry) continue;
    const { error: writeError } = await db.from("sniper_listings")
      .update({ payload: { ...entry.payload, gocollectPrice: price } })
      .eq("item_id", entry.itemId);
    if (writeError) throw new Error(`GoCollect enrichment failed: ${writeError.message}`);
    updated++;
  }
  return updated;
}
