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
        className="mt-4 overflow-x-auto rounded-lg border border-slate-700"
        role="region"
        aria-label="Pricing grade ladder"
        tabIndex={0}
      >
        <table className="w-full min-w-[1120px] border-collapse text-left text-xs tabular-nums">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-slate-900 px-3 py-3 font-medium">
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
              <tr key={source} className="hover:bg-slate-800/40">
                <th
                  scope="row"
                  className="sticky left-0 bg-[#111319] px-3 py-3 whitespace-nowrap font-medium text-slate-100"
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
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-amber-300">
            ComicBase 1.1M Catalog Reference
          </div>
          <div className="mt-1 text-lg text-slate-100">{cb === null ? "—" : formatCurrency(cb)}</div>
          <p className="mt-1 text-xs text-slate-400">
            ComicBase catalog reference value. Evaluated independently from CGC sales and Panel Profits grade matrices.
          </p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-xs text-slate-300">
          <strong className="block text-slate-100">Strict Source Isolation Policy</strong>
          <p className="mt-2 leading-relaxed">
            Panel Profits, ComicBase (1.1M catalog), CGC/GPA sales, CBCS, PSA, and GoCollect figures are stored in isolated schema channels. Each row on the ladder reflects its own source without cross-source pollution.
          </p>
        </div>
      </div>
    </section>
  );
}
