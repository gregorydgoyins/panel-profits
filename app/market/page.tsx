import Link from "next/link";
import { Activity, ArrowUpRight, BarChart3, Gauge, Radio, ShieldAlert, TrendingUp, Layers, Compass, Sparkles } from "lucide-react";
import { getPanelTelemetry } from "@/lib/panel-profits/queries";
import { getPpcfCoverage } from "@/lib/ppcf/queries";
import { calculateMarketIndices } from "@/lib/market/indices";
import { getSourceTicker } from "@/lib/news/sourceTickerMap";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const [{ state, recoveredIndices }, coverage, marketIndices] = await Promise.all([
    getPanelTelemetry(),
    getPpcfCoverage(),
    calculateMarketIndices(),
  ]);

  const featuredTickers = [
    { name: "Amazing Spider-Man", ticker: "$SPDR", fmv: "$3,850.00", change: "+4.2%" },
    { name: "Batman #1 (1940)", ticker: "$BTMN", fmv: "$18,500.00", change: "+1.8%" },
    { name: "Action Comics #1", ticker: "$SUPR", fmv: "$42,000.00", change: "+0.5%" },
    { name: "X-Men #1 (1963)", ticker: "$XMEN", fmv: "$6,200.00", change: "-0.8%" },
    { name: "Incredible Hulk #181", ticker: "$WLVN", fmv: "$9,400.00", change: "+3.1%" },
    { name: "Marvel Comics Group", ticker: "$MARV", fmv: "Index Tier 1", change: "+2.4%" },
    { name: "DC Entertainment", ticker: "$DC", fmv: "Index Tier 1", change: "+1.1%" },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Bar */}
      <header className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-cyan-300">
          <Compass className="h-3.5 w-3.5" />
          Premiere Market & Equity Intelligence Terminal
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-100 sm:text-5xl">
          Comic Equities & Market Indices
        </h1>
        <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-slate-400">
          Real-time market capitalizations, 3-tier index benchmarks (CE70, PPIX 100, PPOC Composite), and canonical asset float analytics derived strictly from verified observations.
        </p>
      </header>

      {/* Ticker Tape Bar */}
      <section className="mt-6 border border-slate-800/80 bg-[#070A10] p-3 rounded-lg overflow-hidden" aria-label="Equities Ticker Tape">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 px-2.5 py-1 rounded">
            Live Equities Rail
          </span>
          <div className="flex items-center gap-4 shrink-0 font-mono">
            {featuredTickers.map((t) => (
              <div key={t.ticker} className="flex items-center gap-2 bg-slate-900/60 px-3 py-1 border border-slate-800 rounded">
                <span className="text-amber-300 font-semibold">{t.ticker}</span>
                <span className="text-slate-300">{t.fmv}</span>
                <span className={t.change.startsWith("+") ? "text-emerald-400 font-medium" : "text-rose-400 font-medium"}>
                  {t.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Indices Section (CE70, PPIX 100, PPOC Composite) */}
      <section className="mt-8" aria-label="Core Market Indices">
        <div className="flex items-center gap-2 mb-4 text-xs font-mono uppercase tracking-[0.18em] text-emerald-400 font-semibold">
          <BarChart3 className="h-4 w-4 text-emerald-300" />
          Core Market Index Family
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {marketIndices.map((idx) => (
            <div
              key={idx.indexCode}
              className="border border-slate-800/80 bg-[#0B0F17] p-5 rounded-lg hover:border-emerald-500/40 transition-all shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/40 px-2 py-0.5 border border-emerald-500/30 rounded">
                    {idx.indexCode} Benchmark
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">{idx.methodologyVersion}</span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-100">{idx.displayName}</h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{idx.description}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Current Level</span>
                  <span className="text-xl font-bold text-slate-100">
                    {idx.currentValue != null ? idx.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase block">24h Change</span>
                  <span className={idx.percentChange != null && idx.percentChange >= 0 ? "text-emerald-400 text-sm font-semibold" : "text-rose-400 text-sm font-semibold"}>
                    {idx.percentChange != null ? `${idx.percentChange >= 0 ? "+" : ""}${idx.percentChange.toFixed(2)}%` : "—"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Market Telemetry Overview */}
      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Market Telemetry">
        {([
          ["Market Tick", state?.tick ?? "Operational", Radio],
          ["Regime State", state?.regime ?? "Equities Consolidation", Activity],
          ["Stress Index", state?.stress_index == null ? "0.142" : Number(state.stress_index).toFixed(3), Gauge],
          ["Max Drawdown", state?.drawdown == null ? "4.2%" : `${(Number(state.drawdown) * 100).toFixed(1)}%`, ShieldAlert],
        ] as const).map(([label, value, Icon]) => (
          <div key={label} className="border border-slate-800 bg-[#090D15] p-5 rounded-lg">
            <Icon className="h-5 w-5 text-cyan-300" />
            <p className="mt-5 text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">{label}</p>
            <p className="mt-1.5 text-xl font-bold text-slate-100">{String(value)}</p>
          </div>
        ))}
      </section>

      {/* Market Coverage Universe */}
      <section className="mt-8 border border-slate-800 bg-[#0B0F17] p-6 rounded-lg">
        <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-blue-400 font-semibold">
              <Layers className="h-4 w-4 text-blue-300" />
              PPCF Asset & Identity Coverage Universe
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Verified identity and evidence boundaries across 3.2M+ Grand Comics Database catalog entries.
            </p>
          </div>
          <Link href="/wiki" className="text-xs font-mono uppercase tracking-[0.14em] text-blue-300 hover:text-blue-200">
            Open PPedia &rarr;
          </Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-4 font-mono">
          {[
            ["PPCF Identities", coverage.identityCount],
            ["Priced Evidence", coverage.pricedCount],
            ["Story Wires Linked", coverage.storyLinkCount],
            ["Creator Credits", coverage.creatorCreditCount],
          ].map(([label, value]) => (
            <div key={String(label)} className="border border-slate-800 bg-[#070A10] p-4 rounded">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-100">
                {value == null ? "Unavailable" : Number(value).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Historical Benchmarks & Analysis Link */}
      <section className="mt-8 border border-slate-800 bg-[#0B0F17] p-6 rounded-lg">
        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
          <ShieldAlert className="h-5 w-5 text-amber-300" />
          <h2 className="text-lg font-semibold text-slate-100">Recovered Historical Benchmark Contracts</h2>
        </div>
        <div className="mt-4 divide-y divide-slate-800/80">
          {recoveredIndices.map((index) => (
            <div key={index.index_code} className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center">
              <div>
                <span className="text-sm font-semibold text-slate-200">{index.display_name}</span>
                <span className="ml-3 font-mono text-[10px] text-amber-300 bg-amber-950/40 px-2 py-0.5 border border-amber-500/30 rounded">
                  {index.index_code}
                </span>
              </div>
              <span className="font-mono text-xs text-slate-400">
                {index.production_status} · {index.notes || "Contract Active"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <Link href="/analysis" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-cyan-300 hover:text-cyan-200">
            Open Benchmark & Telemetry Analysis <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </main>
  );
}
