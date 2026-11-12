export const GRADE_ORDER = ['10.0','9.8','9.6','9.4','9.2','9.0','8.5','8.0','7.5','7.0','6.5','6.0','5.5','5.0','4.5','4.0','3.5','3.0','2.5','2.0','1.8','1.5','1.0','0.5','RAW'];
export const PC_GRADE_LADDER = ['9.8','9.2','8.0','6.0','4.0','RAW'] as const;

export const ERA_LABELS: Record<string, string> = {
  platinum: 'Platinum Age', golden: 'Golden Age', atomic: 'Atomic Age',
  silver: 'Silver Age', bronze: 'Bronze Age', copper: 'Copper Age',
  modern: 'Modern Age', postmodern: 'Postmodern Age', independent: 'Independent',
};

export function fmt(usd: number): string {
  if (!usd) return '—';
  return '$' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDollars(v: number): string {
  if (v == null || isNaN(v)) return '—';
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  // Parse YYYY-MM-DD in UTC so '2024-01-01' formats as 'Jan 2024' instead of shifting to Dec 31, 2023 in local time
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    if (m[3] === '01') {
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function computeEma(prices: number[], period: number): (number | null)[] {
  if (prices.length < period) return prices.map(() => null);
  const k = 2 / (period + 1);
  const out: (number | null)[] = prices.map(() => null);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = ema;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}

export function computeMacd(prices: number[]): { macd: (number | null)[]; signal: (number | null)[]; hist: (number | null)[] } {
  const ema12 = computeEma(prices, 12);
  const ema26 = computeEma(prices, 26);
  const macd = prices.map((_, i) => ema12[i] != null && ema26[i] != null ? ema12[i]! - ema26[i]! : null);
  // The signal EMA must start at the first real MACD value. Feeding the
  // pre-MACD nulls in as zero creates a false early signal line.
  const firstMacdIndex = macd.findIndex(v => v != null);
  const macdValues = firstMacdIndex >= 0 ? macd.slice(firstMacdIndex).map(v => v as number) : [];
  const rawSignal = computeEma(macdValues, 9);
  const signal = prices.map((_, i) => {
    const signalIndex = i - firstMacdIndex;
    return signalIndex >= 0 && rawSignal[signalIndex] != null ? rawSignal[signalIndex] : null;
  });
  const hist = macd.map((v, i) => v != null && signal[i] != null ? v - signal[i]! : null);
  return { macd, signal, hist };
}

export const ERA_CONTEXT: Record<string, string> = {
  golden: 'Published during the Golden Age (1938–1956), when superheroes were born. These issues represent the founding mythology of the medium — extreme scarcity, condition sensitivity, and cultural significance compound their value.',
  silver: 'Silver Age (1956–1970) — the era that redefined the superhero genre. Scientific themes, moral complexity, and Stan Lee\'s Marvel revolution define this period. High-grade copies command aggressive premiums.',
  bronze: 'Bronze Age (1970–1984) — comics grew darker and more socially aware. The era of classic runs, creator-driven storytelling, and the birth of serious collecting culture. Newsstand variants carry a meaningful scarcity premium.',
  copper: 'Copper Age (1984–1991) — the speculator boom begins. Direct market matures, prestige formats launch. First appearances from this era have become blue chips. High print runs mean condition is the differentiator.',
  modern: 'Modern Age (1992–present) — foil cover era, variant proliferation, and the independent movement. Strong narrative significance drives key issue demand. Census-registered copies anchor pricing.',
  postmodern: 'Postmodern era — deconstructionist storytelling and trade paperback culture. Sustained demand comes from adaptations and creator prestige rather than print scarcity.',
  independent: 'Independent publisher — outside the Marvel/DC duopoly. These issues often carry outsized cultural impact with far greater natural scarcity. No returnable copies, no overprint buffer.',
};

const GRADE_COLOR_MAP: Record<string, string> = {
  'RAW': '#475569',
  '4.0': '#6b7280', '4.5': '#6b7280',
  '5.0': '#7c8ea0', '5.5': '#7c8ea0',
  '6.0': '#64748b', '6.5': '#64748b',
  '7.0': '#7ea8c4', '7.5': '#7ea8c4',
  '8.0': '#38bdf8', '8.5': '#38bdf8',
  '9.0': '#22d3ee', '9.2': '#22d3ee',
  '9.4': '#818cf8', '9.6': '#8b5cf6',
  '9.8': '#a78bfa', '9.9': '#f59e0b', '10.0': '#fde68a',
};
export function gradeColor(g: string): string { return GRADE_COLOR_MAP[g] ?? '#475569'; }

export function variantTypeLabel(variantKey: string | null | undefined, artifactType?: string | null): string | null {
  if (!variantKey || variantKey === 'standard' || variantKey === 'direct') return null;
  if (artifactType === 'base_issue') return null;
  if (variantKey === 'newsstand') return 'Newsstand';
  if (variantKey === 'price-variant' || variantKey === 'price_variant') return 'Price Variant';
  if (variantKey === 'canadian-price-variant') return 'Canadian Price Variant';
  if (variantKey === 'uk-price-variant') return 'UK Price Variant';
  if (variantKey === 'whitman') return 'Whitman';
  if (variantKey === 'mark-jewelers') return 'Mark Jewelers Insert';
  if (/^1:\d+/.test(variantKey)) return `Incentive ${variantKey}`;
  if (variantKey.includes('foil')) return 'Foil Variant';
  if (variantKey.includes('blank')) return 'Blank Variant';
  if (variantKey.includes('sketch')) return 'Sketch Variant';
  if (variantKey.includes('virgin')) return 'Virgin Variant';
  if (variantKey.includes('convention')) return 'Convention Variant';
  return null;
}

export function proxyCoverUrl(url: string | null | undefined): string | null {
  return url || null;
}

export function computeRsi14(prices: number[]): (number | null)[] {
  if (prices.length < 15) return prices.map(() => null);
  const out: (number | null)[] = prices.map(() => null);
  const changes = prices.slice(1).map((v, i) => v - prices[i]);
  let avgGain = changes.slice(0, 14).filter(c => c > 0).reduce((a, b) => a + b, 0) / 14;
  let avgLoss = changes.slice(0, 14).filter(c => c < 0).reduce((a, b) => a - b, 0) / 14;
  out[14] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = 14; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? -changes[i] : 0;
    avgGain = (avgGain * 13 + gain) / 14;
    avgLoss = (avgLoss * 13 + loss) / 14;
    out[i + 1] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}
