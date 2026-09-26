import type { ComicRecord } from "@/lib/comics/types";
import { comicBaseGrades, comicBaseReference, GRADES, panelProfitsGrades } from "@/lib/pricing/source-ladder";
import { formatCurrency } from "@/lib/utils";
import { getCleanPricingEvidence } from "@/lib/pricing/clean";

const SOURCES = ["Panel Profits", "ComicBase", "CGC · GPA sales", "CBCS", "PSA", "GoCollect"] as const;

export async function PricingDossier({ comic }: { comic: ComicRecord }) {
  const cleanEvidence = await getCleanPricingEvidence(comic.id);
  const pp = Object.keys(cleanEvidence.grades).length ? cleanEvidence.grades : panelProfitsGrades(comic);
  const cbGrades = comicBaseGrades(comic);
  const cb = comicBaseReference(comic);

  return (
    <section aria-labelledby="pricing-heading" className="rounded-xl border border-slate-700 bg-[#111319] p-4 sm:p-6 shadow-lg">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-700 pb-4">
        <div>
          <h2 id="pricing-heading" className="text-lg font-semibold text-slate-100">
            Price evidence by source and grade
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Each pricing authority (Panel Profits, ComicBase, CGC, CBCS, PSA, GoCollect) operates under its own isolated normalization rules. No cross-source blending occurs.
          </p>
        </div>
        <span className="text-xs text-slate-400">
          {GRADES.length} grade tiers · Clean evidence {cleanEvidence.observationCount ? "connected" : "not found"}
        </span>
      </div>

      <div
        className="mt-4 overflow-x-auto rounded-lg border border-slate-700 focus-visible:ring-2 focus-visible:ring-amber-400"
        role="region"
        aria-label="Pricing evidence ladder by source and grade tier"
        tabIndex={0}
      >
        <table className="w-full min-w-[1120px] border-collapse text-left text-xs tabular-nums">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-slate-900 px-3 py-3 font-medium border-r border-slate-800">
                Authority Source
              </th>
              <th scope="col" className="px-2 py-3 text-right font-medium">
                Catalog Ref
              </th>
              {GRADES.map((grade) => (
                <th scope="col" key={grade} className="px-2 py-3 text-right font-medium">
                  {grade}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {SOURCES.map((source) => (
              <tr key={source} className="hover:bg-slate-800/40 transition-colors">
                <th
                  scope="row"
                  className="sticky left-0 bg-[#111319] px-3 py-3 whitespace-nowrap font-medium text-slate-100 border-r border-slate-800"
                >
                  {source}
                </th>
                <td className="px-2 py-3 text-right text-amber-300">
                  {source === "ComicBase" && cb !== null ? formatCurrency(cb) : "—"}
                </td>
                {GRADES.map((grade) => {
                  let price: number | undefined;

                  if (source === "Panel Profits") {
                    price = pp[grade];
                  } else if (source === "ComicBase") {
                    price = cbGrades[grade];
                  }
                  // CGC, CBCS, PSA, GoCollect stay strictly unblended unless exact observation matches exist in Clean
                  // Missing prices remain unpriced; no synthetic extrapolation across grades.

                  return (
                    <td
                      key={grade}
                      className={`px-2 py-3 text-right ${price ? "text-emerald-300 font-medium" : "text-slate-600"}`}
                    >
                      {price ? formatCurrency(price) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-3.5">
          <div className="text-[10px] font-mono font-medium uppercase tracking-wider text-amber-300">
            ComicBase Catalog Reference
          </div>
          <div className="mt-1.5 text-lg font-semibold text-slate-100">{cb === null ? "—" : formatCurrency(cb)}</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            ComicBase catalog reference price. Evaluated independently from certified CGC/CBCS/PSA transaction records and Panel Profits grade matrices.
          </p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3.5 text-xs text-slate-300">
          <strong className="block text-slate-100 uppercase tracking-wide text-[10px] font-mono">Strict Authority Isolation Policy</strong>
          <p className="mt-1.5 leading-relaxed text-slate-400">
            Panel Profits, ComicBase, CGC GPA, CBCS, PSA, and GoCollect observations are stored in isolated channels. Unpriced grades remain unpriced (`—`) without mathematical interpolation.
          </p>
        </div>
      </div>
    </section>
  );
}
