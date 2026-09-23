import Link from "next/link";
import { ArrowUpRight, BarChart3 } from "lucide-react";
import { getEquityRegistry } from "@/lib/panel-profits/assets";

export const dynamic = "force-dynamic";

export default async function EquitiesPage() {
  const equities = await getEquityRegistry(48);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="border-b border-slate-800 pb-7">
        <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-300">Equity desk / verified entities</p>
        <h1 className="mt-3 text-4xl text-slate-100">Comic equities</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Clean equity records backed by verified truth-layer observations. These are not generic asset cards;
          each record carries anchor pricing, scarcity, census, and confidence context whenever available.
        </p>
      </header>

      <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {equities.map((equity) => (
          <Link
            key={equity.id}
            href={`/equity/${equity.id}`}
            className="group border border-slate-800 bg-[#0b0f15] p-5 transition-colors hover:border-emerald-300/70"
          >
            <div className="flex justify-between">
              <BarChart3 className="h-5 w-5 text-emerald-300" />
              <ArrowUpRight className="h-4 w-4 text-slate-600 group-hover:text-emerald-200" />
            </div>

            <p className="mt-6 text-[10px] uppercase tracking-[0.16em] text-emerald-300">
              {equity.asset_class || "Equity"}
            </p>

            <h2 className="mt-2 line-clamp-2 text-base text-slate-100">
              {equity.comic?.series || "Unresolved equity"} {equity.comic?.issue_number ? `#${equity.comic.issue_number}` : ""}
            </h2>

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-800 pt-3 text-xs">
              <span>
                <b className="block text-emerald-300">
                  {equity.anchor_price_usd == null ? "Unpriced" : `$${Number(equity.anchor_price_usd).toFixed(2)}`}
                </b>
                Anchor
              </span>
              <span>
                <b className="block text-slate-200">{equity.census_total_graded ?? "—"}</b>
                Census
              </span>
            </div>
          </Link>
        ))}
        {!equities.length && (
          <div className="border border-dashed border-slate-700 p-6 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
            No verified equity truth-layer records are available in Clean.
          </div>
        )}
      </div>
    </main>
  );
}
