import { createAdminServerClient } from "@/lib/supabase/admin";

interface PriceObservationTimelineProps {
  ppcfId: string;
}

export async function PriceObservationTimeline({ ppcfId }: PriceObservationTimelineProps) {
  const db = createAdminServerClient();
  const { data: observations, error } = await db
    .from("ppcf_price_observations")
    .select("source_system,source_record_id,price_field,grade_label,amount,currency,observed_at")
    .eq("ppcf_id", ppcfId)
    .order("observed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) throw new Error(`Failed to query pricing observations: ${error.message}`);

  return (
    <section className="border border-slate-800 bg-[#0b0f15] p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-sm uppercase tracking-[0.16em] text-slate-200">Pricing evidence timeline</h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">Recent source observations remain labeled by grade and currency. No blended price is calculated.</p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{observations?.length || 0} shown</span>
      </div>
      {!observations?.length ? (
        <p className="py-8 text-sm text-slate-500">No reconciled pricing observations are attached yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
              <tr><th className="px-3 py-2">Observed</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Evidence field</th><th className="px-3 py-2">Grade</th><th className="px-3 py-2 text-right">Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {observations.map((observation) => (
                <tr key={`${observation.source_system}-${observation.source_record_id}-${observation.price_field}-${observation.observed_at || "undated"}`}>
                  <td className="px-3 py-3 text-slate-400">{observation.observed_at || "Undated"}</td>
                  <td className="px-3 py-3 text-slate-300">{observation.source_system === "PANEL_PROFITS" ? "Panel Profits" : "ComicBase"}</td>
                  <td className="px-3 py-3 text-slate-400">{observation.price_field}</td>
                  <td className="px-3 py-3 text-amber-200">{observation.grade_label || "Unspecified"}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-emerald-300">{observation.amount == null ? "Unpriced" : `${observation.currency || "Unspecified currency"} ${Number(observation.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
