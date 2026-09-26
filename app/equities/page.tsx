import Link from "next/link";
import { ArrowUpRight, BarChart3, ShieldAlert } from "lucide-react";
import { getEquityContracts } from "@/lib/equity/queries";

export const dynamic = "force-dynamic";

export default async function EquitiesPage() {
  const contracts = await getEquityContracts();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="border-b border-slate-800 pb-7">
        <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-300">Equity desk / Clean index register</p>
        <h1 className="mt-3 text-4xl text-slate-100">Comic equities</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Recovered index definitions are shown with their methodology and population state. Prices and charts appear only when Clean contains verified dated observations.</p>
      </header>
      {!contracts.length ? <section className="mt-8 border border-amber-900/50 bg-amber-950/10 p-8"><ShieldAlert className="h-6 w-6 text-amber-300" /><p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-amber-300">No Clean index contracts available</p><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">No equity values are inferred from the comic catalog.</p></section> : <section className="mt-8 grid gap-4 md:grid-cols-2">{contracts.map((contract) => <Link key={contract.index_code} href={`/equity/${contract.index_code}`} className="group border border-emerald-900/50 bg-[#0b0f15] p-6 transition-colors hover:border-emerald-300/70"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">{contract.index_code}</p><h2 className="mt-2 text-xl text-slate-100">{contract.display_name}</h2></div><ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-emerald-300" /></div><div className="mt-6 grid grid-cols-2 gap-4 text-xs"><div><p className="text-slate-600">Expected constituents</p><p className="mt-1 text-slate-200">{contract.expected_constituent_count.toLocaleString()}</p></div><div><p className="text-slate-600">Clean observations</p><p className="mt-1 text-slate-200">{contract.observation_count.toLocaleString()}</p></div><div><p className="text-slate-600">Production status</p><p className="mt-1 text-amber-200">{contract.production_status}</p></div><div><p className="text-slate-600">History status</p><p className="mt-1 text-slate-300">{contract.historical_status}</p></div></div></Link>)}</section>}
      <div className="mt-8 flex items-center gap-2 text-xs text-slate-500"><BarChart3 className="h-4 w-4 text-emerald-300" /> <span>Charts require dated observations with a verified methodology.</span></div>
    </main>
  );
}
