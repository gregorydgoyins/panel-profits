import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function EquityDeskPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="border border-emerald-900/50 bg-[#0b0f15] p-8">
        <BarChart3 className="h-6 w-6 text-emerald-300" />
        <p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-emerald-300">Clean equity port pending</p>
        <h1 className="mt-3 text-3xl text-slate-100">Equity detail is not populated</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">The underlying Final equity data has not been transferred into Clean, so there is no verified record to display.</p>
      </section>
    </main>
  );
}
