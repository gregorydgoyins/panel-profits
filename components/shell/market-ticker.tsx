import { Activity, Gauge, ShieldCheck } from "lucide-react";

interface MarketTickerProps {
  state?: { tick?: number | string | null; regime?: string | null; stress_index?: number | null } | null;
  broadIndex?: { current_value?: number | string | null } | null;
  qualityIndex?: { current_value?: number | string | null } | null;
}

const tickerItems = [
  "CLEAN DATABASE: operational state only",
  "CLEAN SOURCE: operational pricing and cover evidence",
  "CE70: defined / uncertain membership",
  "PPIX-60: historical benchmark retained",
  "PPIX-100: blocked until verified constituents",
  "PPIX COMPOSITE: methodology pending recovery",
  "Market regime and stress values are shown only when verified",
  "No synthetic prices or fabricated volume",
];

export function MarketTicker({ state, broadIndex, qualityIndex }: MarketTickerProps) {
  const tick = state?.tick ?? "—";
  const regime = state?.regime || "UNKNOWN";
  const stress = state?.stress_index == null ? "—" : Number(state.stress_index).toFixed(3);
  const broad = broadIndex?.current_value == null ? "—" : Number(broadIndex.current_value).toFixed(2);
  const quality = qualityIndex?.current_value == null ? "—" : Number(qualityIndex.current_value).toFixed(2);

  const items = [
    ...tickerItems,
    `TICK ${tick}`,
    `CMI ${broad}`,
    `SOV ${quality}`,
    `REGIME ${regime}`,
    `STRESS ${stress}`,
  ];

  return (
    <div className="border-b border-slate-800/70 bg-[#06090d] px-4 py-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-400 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-hidden rounded border border-slate-800/80 bg-[#0a0d12]">
        <div className="flex shrink-0 items-center gap-2 border-r border-slate-800 bg-[#0e131c] px-3 py-1.5 text-cyan-300">
          <Activity className="h-3.5 w-3.5" />
          <span>LIVE TICKER</span>
        </div>
        <div className="ticker-wrap flex-1 overflow-hidden">
          <div className="ticker-track flex min-w-max items-center gap-9 whitespace-nowrap py-1.5">
            {[...items, ...items].map((item, index) => (
              <span key={`${item}-${index}`} className="inline-flex items-center gap-2 text-slate-300">
                {item.includes("CMI") || item.includes("SOV") ? <Gauge className="h-3 w-3 text-emerald-300" /> : null}
                {item.includes("PPIX") || item.includes("CE70") ? <ShieldCheck className="h-3 w-3 text-amber-300" /> : null}
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
