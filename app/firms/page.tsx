import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness } from "lucide-react";
import { getFirms } from "@/lib/panel-profits/queries";

export const dynamic = "force-dynamic";

export default async function FirmsPage() {
  const firms = (await getFirms()).filter(Boolean);
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="border-b border-slate-800 pb-7">
        <p className="text-[10px] uppercase tracking-[0.28em] text-amber-300">Institutional market / Clean firm identities</p>
        <h1 className="mt-3 text-4xl text-slate-100">The houses moving capital</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Firm cards are sourced from each firm&apos;s own Clean-prefixed identity and population tables. Missing capabilities are not inferred from Arnveld or another firm.</p>
      </header>
      <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {firms.map((firm) => <Link key={firm!.firm_id} href={`/firms/${firm!.firm_id}`} className="group border border-slate-800 bg-[#0b0f15] p-5 hover:border-amber-300/60"><div className="flex justify-between"><BriefcaseBusiness className="h-5 w-5 text-amber-300" /><ArrowUpRight className="h-4 w-4 text-slate-600 group-hover:text-amber-200" /></div><h2 className="mt-7 text-lg text-slate-100">{firm!.firm_name}</h2><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{firm!.philosophy || "No player-facing philosophy is currently published."}</p><div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-800 pt-4 text-xs"><span><b className="block text-slate-200">{firm!.aum_usd == null ? "—" : `$${(firm!.aum_usd / 1_000_000_000).toFixed(1)}B`}</b>AUM</span><span><b className="block text-slate-200">{firm!.total_brokers}</b>Brokers</span><span><b className="block text-slate-200">{firm!.total_clients}</b>Clients</span></div></Link>)}
        {!firms.length && <p className="border border-dashed border-slate-700 p-6 text-sm text-slate-500 md:col-span-2 xl:col-span-3">No Clean firm identity records are available.</p>}
      </div>
    </main>
  );
}
