import Link from "next/link";
import { Activity, ArrowUpRight, BarChart3, Gauge, Radio, ShieldAlert } from "lucide-react";
import { getPanelTelemetry } from "@/lib/panel-profits/queries";
import { getPpcfCoverage } from "@/lib/ppcf/queries";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const [{ state, indices, recoveredIndices }, coverage] = await Promise.all([getPanelTelemetry(), getPpcfCoverage()]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="border-b border-slate-800 pb-7">
        <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300">Market / operating environment</p>
        <h1 className="mt-3 text-4xl text-slate-100">Read the active market state</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          This market surface exposes only verified Clean state and any recovered historical index contracts.
          Unknown or incomplete methodologies remain clearly blocked instead of being rendered as fake values.
        </p>
      </header>

      <section className="markets-rimlight-hover mt-8 bg-[#0b0f15] p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-blue-300">PPCF market universe</p><h2 className="mt-2 text-xl text-slate-100">Market coverage before valuation</h2><p className="mt-2 text-xs leading-5 text-slate-500">Identity and evidence coverage are shown separately from prices. Values are never compared across currencies or grades without a defined method.</p></div><Link href="/wiki" className="text-xs uppercase tracking-[0.14em] text-blue-200 hover:text-blue-100">Open PPedia</Link></div><div className="mt-5 grid gap-4 sm:grid-cols-4">{[["PPCF identities",coverage.identityCount],["With pricing evidence",coverage.pricedCount],["Story links",coverage.storyLinkCount],["Creator credits",coverage.creatorCreditCount]].map(([label,value]) => <div key={label} className="border border-slate-800 bg-[#080c13] p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{label}</p><p className="mt-2 text-2xl text-slate-100">{value == null ? "Unavailable" : Number(value).toLocaleString()}</p></div>)}</div></section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {([
          ["Tick", state?.tick ?? "Unavailable", Radio],
          ["Regime", state?.regime ?? "Unavailable", Activity],
          ["Stress", state?.stress_index == null ? "Unavailable" : Number(state.stress_index).toFixed(3), Gauge],
          ["Drawdown", state?.drawdown == null ? "Unavailable" : `${(Number(state.drawdown) * 100).toFixed(1)}%`, ShieldAlert],
        ] as const).map(([label, value, Icon]) => (
          <div key={label} className="markets-rimlight-hover bg-[#0b0f15] p-5">
            <Icon className="h-5 w-5 text-cyan-300" />
            <p className="mt-6 text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl text-slate-100">{String(value)}</p>
          </div>
        ))}
      </section>

      <section className="markets-rimlight-hover mt-8 bg-[#0b0f15] p-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-emerald-300" />
          <h2 className="text-xl text-slate-100">Populated Clean index family</h2>
        </div>

        <div className="mt-5 divide-y divide-slate-800">
          {indices.map((index) => (
            <div key={index.index_id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm text-slate-100">{index.index_name}</p>
                <p className="mt-1 text-xs text-slate-500">{index.index_type} · {index.constituent_count} constituents</p>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-slate-500">Base {Number(index.base_value).toFixed(2)}</span>
                <span className="text-emerald-300">{Number(index.current_value).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="markets-rimlight-hover mt-8 p-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-300" />
          <h2 className="text-xl text-slate-100">Recovered historical benchmarks</h2>
        </div>

        <div className="mt-5 divide-y divide-slate-800">
          {recoveredIndices.map((index) => (
            <div key={index.index_code} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
              <span className="text-sm text-slate-200">{index.display_name}</span>
              <span className="text-xs text-amber-200">{index.production_status} · {index.notes}</span>
            </div>
          ))}
        </div>

        <Link href="/analysis" className="mt-5 inline-flex items-center gap-2 text-xs text-cyan-200 hover:text-cyan-100">
          Open benchmark analysis <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </main>
  );
}
