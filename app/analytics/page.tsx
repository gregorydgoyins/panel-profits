import Link from "next/link";
import { BarChart3, ShieldAlert } from "lucide-react";
import { getPpcfAnalyticsSnapshot } from "@/lib/ppcf/queries";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const analytics = await getPpcfAnalyticsSnapshot();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="border-b border-slate-800 pb-7">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-blue-300"><BarChart3 className="h-3.5 w-3.5" /> Evidence analytics</div>
        <h1 className="mt-3 text-3xl text-slate-100 sm:text-4xl">PPCF pricing intelligence</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">A data-density view of the Panel Profits identity universe. Currency, grade, source, and edition remain separate evidence dimensions.</p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[["PPCF identities", analytics.identityCount], ["Identities with evidence", analytics.pricedIdentityCount], ["Recorded observations", analytics.observationCount]].map(([label, value]) => (
          <div key={label} className="border border-slate-800 bg-[#0b0f15] p-5"><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-2 text-3xl tabular-nums text-slate-100">{Number(value).toLocaleString()}</p></div>
        ))}
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="border border-slate-800 bg-[#0b0f15] p-5">
          <h2 className="text-lg text-slate-100">Evidence by currency</h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">Counts only. Amounts are not ranked across currencies.</p>
          <div className="mt-5 divide-y divide-slate-800">{analytics.currencies.map((row) => <div key={row.currency} className="flex items-center justify-between py-3 text-sm"><span className="text-slate-300">{row.currency}</span><span className="tabular-nums text-blue-200">{row.observationCount.toLocaleString()} observations · {row.identityCount.toLocaleString()} identities</span></div>)}</div>
        </div>
        <div className="border border-slate-800 bg-[#0b0f15] p-5">
          <h2 className="text-lg text-slate-100">Analytical density</h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">Fourteen observations is the threshold for continuous indicators. Sparse records remain descriptive.</p>
          <div className="mt-5 divide-y divide-slate-800">{analytics.density.map((row) => <div key={row.label} className="flex items-center justify-between py-3 text-sm"><span className="text-slate-300">{row.label}</span><span className="tabular-nums text-pink-200">{row.identityCount.toLocaleString()} identities</span></div>)}</div>
        </div>
      </section>

      <aside className="mt-8 flex gap-3 border border-amber-900/50 bg-amber-950/20 p-4 text-xs leading-5 text-amber-100/80"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><p>These are evidence coverage metrics, not synthetic market signals. No moving average, volatility, trend, or cross-source valuation is rendered until the underlying observations satisfy the relevant density, edition, currency, and grade requirements.</p></aside>
      <div className="mt-6 text-xs text-slate-500"><Link href="/wiki" className="text-blue-200 hover:text-blue-100">Browse the PPedia identity graph</Link></div>
    </main>
  );
}