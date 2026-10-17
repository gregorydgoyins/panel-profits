"use client";

import { useMemo, useState } from "react";

type PackageKind = "unsigned" | "signed" | "remarque" | "sketch";
type CostField = "grading" | "signing" | "artwork" | "inbound" | "returnShipping" | "insurance" | "handling";

const MONEY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const labels: Record<CostField, string> = {
  grading: "Grading + encapsulation",
  signing: "Creator signing / verification",
  artwork: "Remarque or cover sketch",
  inbound: "Shipping to grading company",
  returnShipping: "Insured return shipping (shipping portion)",
  insurance: "Insurance not included above",
  handling: "Handling and other documented fees",
};
const emptyCosts: Record<CostField, string> = {
  grading: "", signing: "", artwork: "", inbound: "", returnShipping: "", insurance: "", handling: "",
};
const asAmount = (value: string): number | null => {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** A fee bundled into a signing or artwork package must never be added again. */
export function WholeTomatoCalculator({ acquisitionCost, grader, signed, title }: {
  acquisitionCost: number; grader?: string; signed?: boolean; title?: string;
}) {
  const [kind, setKind] = useState<PackageKind>(signed ? "signed" : "unsigned");
  const [signatureCount, setSignatureCount] = useState(signed ? "1" : "0");
  const [creators, setCreators] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [packageIncludes, setPackageIncludes] = useState<CostField[]>([]);
  const [costs, setCosts] = useState<Record<CostField, string>>(() => ({ ...emptyCosts, grading: signed ? "53" : "30", inbound: "25", returnShipping: "25", insurance: "0", handling: "0" }));
  const [feeSource, setFeeSource] = useState("");
  const [feeDate, setFeeDate] = useState("");
  const [marketValue, setMarketValue] = useState("");
  const [sellingCosts, setSellingCosts] = useState("");
  const [notes, setNotes] = useState("");
  const [rawStreetValue, setRawStreetValue] = useState("");
  const [strategicPremium, setStrategicPremium] = useState("0");
  const [requiredMargin, setRequiredMargin] = useState("20");
  const [gradeComparison, setGradeComparison] = useState(false);
  const [existingCopies, setExistingCopies] = useState("0");
  const [existingBasis, setExistingBasis] = useState("0");
  const fields = (Object.keys(labels) as CostField[]).filter(f =>
    !packageIncludes.includes(f) &&
    (kind !== "unsigned" || (f !== "signing" && f !== "artwork")) &&
    (kind !== "signed" || f !== "artwork"));
  const packageAmount = asAmount(packagePrice);
  const costEntries = fields.map(f => ({ field: f, amount: asAmount(costs[f]) }));
  const known = costEntries.filter(x => x.amount !== null);
  const missing = costEntries.filter(x => x.amount === null).map(x => labels[x.field]);
  const total = (packageAmount ?? 0) + known.reduce((sum, x) => sum + (x.amount ?? 0), 0);
  const hasBasis = packageAmount !== null || known.length > 0;
  const raw = asAmount(rawStreetValue);
  const strategic = asAmount(strategicPremium) ?? 0;
  const wholeTomato = raw === null ? null : raw + total;
  const replacementAdvantage = wholeTomato === null ? null : wholeTomato - acquisitionCost;
  const personalizedValue = wholeTomato === null ? null : wholeTomato + strategic;
  const margin = Math.min(100, Math.max(0, asAmount(requiredMargin) ?? 0));
  const maxRationalAcquisition = personalizedValue === null ? null : personalizedValue * (1 - margin / 100);
  const copies = Math.floor(asAmount(existingCopies) ?? 0);
  const basis = asAmount(existingBasis) ?? 0;
  const averageBasis = (copies + 1) > 0 ? (basis + acquisitionCost) / (copies + 1) : null;
  const advantage = replacementAdvantage;
  const fmv = asAmount(marketValue);
  const exit = asAmount(sellingCosts);
  const cashProfit = fmv === null || exit === null ? null : fmv - acquisitionCost - exit;
  const completeness = missing.length === 0 && (packageIncludes.length === 0 || packageAmount !== null);
  const numberField = (label: string, value: string, change: (next: string) => void) =>
    <label className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
      <span>{label}</span>
      <input aria-label={label} type="number" min="0" step="0.01" value={value} onChange={e => change(e.target.value)}
        placeholder="Unknown" className="w-28 rounded bg-slate-950 border border-slate-700 p-1.5 text-right text-white" />
    </label>;
  return <section className="rounded-lg border border-cyan-700/40 bg-slate-950/70 p-3 space-y-3 text-xs text-slate-200">
    <div className="font-bold text-cyan-300 uppercase">Whole Tomato — Certified Comic Replacement Cost</div>
    <div className="text-[10px] text-slate-400">{title || "Selected comic"} · {grader || "Grader not verified"} · Cash acquisition: {MONEY.format(acquisitionCost)}</div>
    <label className="flex items-center justify-between gap-2">Certified book type
      <select aria-label="Certified book type" value={kind} onChange={e => {
        const next = e.target.value as PackageKind;
        setKind(next);
        setPackageIncludes([]);\n        setCosts(prev => ({ ...prev, grading: next === "unsigned" ? "30" : "53" }));
      }} className="bg-slate-950 border border-slate-700 rounded p-1.5">
        <option value="unsigned">Graded, unsigned</option>
        <option value="signed">Signed</option>
        <option value="remarque">Signed and remarqued</option>
        <option value="sketch">Signed / cover sketch</option>
      </select>
    </label>
    {kind !== "unsigned" && <>
      {numberField("Verified signatures", signatureCount, setSignatureCount)}
      <label className="block text-[11px]">Verified creators (names)
        <input value={creators} onChange={e => setCreators(e.target.value)} placeholder="List the actual signers"
          className="block w-full mt-1 rounded bg-slate-950 border border-slate-700 p-1.5" />
      </label>
    </>}
    {numberField("Published all-in package price (optional)", packagePrice, setPackagePrice)}
    <div className="text-[10px] text-slate-400">If a package includes grading, signatures, artwork or return shipping, mark those inclusions to prevent double-counting.</div>
    <div className="grid grid-cols-2 gap-1">
      {(Object.keys(labels) as CostField[]).map(f =>
        <label key={f} className="flex gap-1.5 items-start text-[10px]">
          <input type="checkbox" checked={packageIncludes.includes(f)}
            onChange={e => setPackageIncludes(prev => e.target.checked ? [...prev, f] : prev.filter(x => x !== f))} />
          <span>Included: {labels[f]}</span>
        </label>)}
    </div>
    {fields.map(f => <div key={f}>{numberField(labels[f], costs[f], next => setCosts(prev => ({ ...prev, [f]: next })))}</div>)}
    <label className="block text-[11px]">Fee source / URL
      <input value={feeSource} onChange={e => setFeeSource(e.target.value)} placeholder="Required for verified status"
        className="block w-full mt-1 rounded bg-slate-950 border border-slate-700 p-1.5" />
    </label>
    <label className="flex justify-between gap-2 items-center text-[11px]">Fee schedule date
      <input type="date" value={feeDate} onChange={e => setFeeDate(e.target.value)}
        className="bg-slate-950 border border-slate-700 rounded p-1.5" />
    </label>
    <label className="block text-[11px]">Remarque / sketch description
      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Subject, size, placement; leave blank if absent"
        className="block w-full mt-1 rounded bg-slate-950 border border-slate-700 p-1.5" />
    </label>
    <div className="border-t border-slate-700 pt-2 space-y-2">
      <div className="font-semibold text-cyan-300">Investment valuation — Whole Tomato</div>
      {numberField("Raw comic street value (market evidence)", rawStreetValue, setRawStreetValue)}
      {numberField("Buyer-specific strategic premium (estimated)", strategicPremium, setStrategicPremium)}
      {numberField("Required margin of safety (%)", requiredMargin, setRequiredMargin)}
      <p className="text-[10px] text-slate-400">Strategic value includes set completion, matching signatures, grade continuity and collection synergy. It is personal to the buyer, not guaranteed resale value.</p>
      <div className="flex justify-between"><span>Raw street value</span><strong>{raw === null ? "Unknown" : MONEY.format(raw)}</strong></div>
      <div className="flex justify-between"><span>Certification, shipping, artist and artwork costs</span><strong>{MONEY.format(total)}</strong></div>
      <div className="flex justify-between font-bold"><span>Whole Tomato replacement value</span><strong>{wholeTomato === null ? "Unknown" : MONEY.format(wholeTomato)}</strong></div>
      <div className="flex justify-between"><span>Personalized strategic value</span><strong>{personalizedValue === null ? "Unknown" : MONEY.format(personalizedValue)}</strong></div>
      <div className="flex justify-between text-cyan-300 font-bold"><span>Maximum rational acquisition cost</span><strong>{maxRationalAcquisition === null ? "Unknown" : MONEY.format(maxRationalAcquisition)}</strong></div>
      <div className="flex justify-between"><span>Margin of safety against personal value</span><strong>{personalizedValue === null || personalizedValue === 0 ? "Unknown" : ((personalizedValue-acquisitionCost)/personalizedValue*100).toFixed(1)+"%"}</strong></div>
      <div className="flex justify-between"><span>Decision vs maximum cost</span><strong>{maxRationalAcquisition === null ? "Insufficient data" : acquisitionCost <= maxRationalAcquisition ? "Within ceiling" : "Above ceiling"}</strong></div>
      <p className="text-[10px] text-amber-300">This ceiling is a replacement-value screening tool, not a forecast of resale returns. Verified graded-market comparables and selling costs are required before an investment recommendation.</p>
    </div>
    <div className="border-t border-slate-700 pt-2 space-y-2">
      <div className="font-semibold text-cyan-300">Position economics — dollar-cost averaging</div>
      {numberField("Existing copies of this exact comic", existingCopies, setExistingCopies)}
      {numberField("Combined acquisition basis of existing copies", existingBasis, setExistingBasis)}
      <div className="flex justify-between"><span>Average cost per copy after acquisition</span><strong>{averageBasis === null ? "Unknown" : MONEY.format(averageBasis)}</strong></div>
      <p className="text-[10px] text-slate-400">For mixed lots, allocate purchase cost by relative comparable market value rather than averaging unlike books.</p>
    </div>
    <div className="border-t border-slate-700 pt-2 space-y-2">
      <button type="button" onClick={() => setGradeComparison(!gradeComparison)} className="text-cyan-300 font-semibold underline">Grade comparison — CGC / CBCS / PGX / EGS / PSA {gradeComparison ? "−" : "+"}</button>
      {gradeComparison && <>
        <p className="text-[10px] text-slate-400">Industry condition reference only; identical numeric grades across graders do not establish identical market prices. Use grader-specific sold comparables and census counts.</p>
        <table className="w-full text-[11px] text-left"><thead><tr><th>Grade</th><th>Condition reference</th><th>Market context</th></tr></thead><tbody>
        {[["10.0","Gem Mint","Exceptional unicorn"],["9.9","Mint","Exceptional unicorn"],["9.8","Near Mint / Mint","Practical modern top-grade benchmark"],["9.6","Near Mint +","High grade"],["9.4","Near Mint","High grade"],["9.2","Near Mint −","High grade"],["9.0","Very Fine / Near Mint","Grade-sensitive"],["8.5","Very Fine +","Grade-sensitive"],["8.0","Very Fine","Grade-sensitive"],["7.5","Very Fine −","Era-relative"],["7.0","Fine / Very Fine","Era-relative"],["6.0","Fine","Era-relative"],["5.0","Very Good / Fine","Era-relative"],["4.0","Very Good","Era-relative"],["3.0","Good / Very Good","Era-relative"],["2.0","Good","Era-relative"],["1.0","Fair","Era-relative"],["0.5","Poor","Era-relative"]].map(([grade,condition,context]) => <tr key={grade} className="border-t border-slate-800"><td>{grade}</td><td>{condition}</td><td>{context}</td></tr>)}
        </tbody></table>
        <p className="text-[10px] text-slate-400">Reference: CGC official comic grading scale, https://www.cgccomics.com/grading/grading-scale/ . PSA comic grading also uses decimal grades. PGX, EGS and CBCS require separate source-verified standards and population feeds; no equivalence or census figures are assumed.</p>
      </>}
    </div>
    <div className="border-t border-slate-700 pt-2 space-y-1">
      <div className="flex justify-between"><span>Certification / service replacement costs</span><strong>{hasBasis ? MONEY.format(total) : "Unknown"}</strong></div>
      <div className="flex justify-between"><span>Acquisition cost</span><strong>{MONEY.format(acquisitionCost)}</strong></div>
      <div className="flex justify-between font-bold text-cyan-300"><span>Whole Tomato replacement-cost advantage</span><strong>{advantage === null ? "Unknown" : `${advantage >= 0 ? "+" : "−"}${MONEY.format(Math.abs(advantage))}`}</strong></div>
      <p className="text-[10px] text-amber-300">{!completeness ? `Partial estimate — missing: ${missing.join(", ") || "package price"}.` : !feeSource || !feeDate ? "Illustrative calculation — fee source/date not verified." : "Fee source entered; authenticity and applicability still require review."}</p>
    </div>
    <div className="border-t border-slate-700 pt-2 space-y-2">
      {numberField("Comparable resale value", marketValue, setMarketValue)}
      {numberField("Expected exit fees + costs", sellingCosts, setSellingCosts)}
      <div className="flex justify-between font-bold"><span>Separate cash profit estimate</span><span>{cashProfit === null ? "Unknown" : `${cashProfit >= 0 ? "+" : "−"}${MONEY.format(Math.abs(cashProfit))}`}</span></div>
      <p className="text-[10px] text-slate-400">Replacement-cost advantage is not resale profit. Enter actual creator-specific fees; never infer fees from signature count alone. Shipping/insurance already included in a quoted rate must not be added twice.</p>
    </div>
  </section>;
}
