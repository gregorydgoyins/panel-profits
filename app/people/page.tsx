import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default function PeoplePage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="border-b border-slate-800 pb-7">
        <p className="text-[10px] uppercase tracking-[0.28em] text-purple-300">People / firm-prefixed directories</p>
        <h1 className="mt-3 text-4xl text-slate-100">The people behind the market</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">People are exposed through each firm&apos;s Clean-prefixed identity and directory tables. A global broker population is not inferred or recreated.</p>
      </header>
      <section className="mt-8 border border-purple-900/50 bg-[#0b0f15] p-8">
        <Users className="h-6 w-6 text-purple-300" />
        <p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-purple-300">Firm directory access</p>
        <h2 className="mt-3 text-2xl text-slate-100">Choose a firm to inspect its people</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">Broker, client, employee, leadership, and free-agent populations are joined by firm-prefixed IDs only.</p>
        <Link href="/firms" className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-cyan-200 hover:text-cyan-100">Open firms <ArrowUpRight className="h-3.5 w-3.5" /></Link>
      </section>
    </main>
  );
}
