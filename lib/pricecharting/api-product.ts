export interface PriceChartingApiProduct {
  id: string;
  productName: string | null;
  consoleName: string | null;
  releaseDate: string | null;
  salesVolume: number | null;
  pricesUsd: {
    raw: number | null;
    grade_4_0: number | null;
    grade_6_0: number | null;
    grade_8_0: number | null;
    grade_9_2: number | null;
    grade_9_4: number | null;
    grade_9_6: number | null;
    grade_9_8: number | null;
    grade_10_0: number | null;
  };
}

function centsToUsd(val: unknown): number | null {
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) && n > 0 ? Math.round(n) / 100 : null;
}

/**
 * Fetches the authoritative PriceCharting JSON API product payload for a comic ID.
 * Returns null if PRICECHARTING_API_TOKEN is missing or the request fails.
 */
export async function fetchPriceChartingApiProduct(
  id: string
): Promise<PriceChartingApiProduct | null> {
  const token = process.env.PRICECHARTING_API_TOKEN;
  if (!token || !/^\d+$/.test(id)) return null;

  try {
    const res = await fetch(
      `https://www.pricecharting.com/api/product?t=${encodeURIComponent(token)}&id=${encodeURIComponent(id)}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const j = await res.json();
    if (!j || j.status === 'error') return null;

    const sv = j['sales-volume'] != null ? Number(j['sales-volume']) : null;
    return {
      id: String(j.id ?? id),
      productName: typeof j['product-name'] === 'string' ? j['product-name'] : null,
      consoleName: typeof j['console-name'] === 'string' ? j['console-name'] : null,
      releaseDate: typeof j['release-date'] === 'string' ? j['release-date'] : null,
      salesVolume: sv != null && Number.isFinite(sv) ? sv : null,
      pricesUsd: {
        raw: centsToUsd(j['loose-price']),
        grade_4_0: centsToUsd(j['cib-price']),
        grade_6_0: centsToUsd(j['new-price']),
        grade_8_0: centsToUsd(j['graded-price']),
        grade_9_2: centsToUsd(j['box-only-price']),
        grade_9_4: centsToUsd(j['condition-17-price']),
        grade_9_6: centsToUsd(j['condition-18-price']),
        grade_9_8: centsToUsd(j['manual-only-price']),
        grade_10_0: centsToUsd(j['bgs-10-price']),
      },
    };
  } catch {
    return null;
  }
}
