import { notFound } from "next/navigation";
import { ArrowLeft, Award, BriefcaseBusiness, Crown, Users } from "lucide-react";
import Link from "next/link";
import { getFirmDossier } from "@/lib/panel-profits/queries";

export const dynamic = "force-dynamic";

function firstValue(row: Record<string, unknown>, fragments: string[]) {
  const entry = Object.entries(row).find(([key, value]) => fragments.some((fragment) => key.includes(fragment)) && value != null && String(value).trim() !== "");
  return entry ? String(entry[1]) : "Unavailable";
}

export default async function FirmPage({ params }: { params: Promise<{ firmId: string }> }) {
  const { firmId } = await params;
  const dossier = await getFirmDossier(firmId);
  if (!dossier) notFound();

  const identity = dossier.identity as Record<string, unknown>;
  const displayName = firstValue(identity, ["firm_name", "name"]) || firmId;
  const philosophy = firstValue(identity, ["personality_statement", "institutional_mission", "operating_creed"]);
  const mythology = firstValue(identity, ["mythology"]);
  const cards = [
    ["Brokers", dossier.counts.brokerCount, BriefcaseBusiness],
    ["Clients", dossier.counts.clientCount, Users],
    ["Staff", dossier.counts.staffCount, Users],
    ["Gods / Titans", `${dossier.counts.godCount} / ${dossier.counts.titanCount}`, Crown],
  ] as const;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/firms" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-amber-300 hover:text-amber-200"><ArrowLeft className="h-3.5 w-3.5" /> Firms</Link>
      <header className="mt-6 border-b border-slate-800 pb-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-amber-300">Clean firm dossier / {firmId}</p>
        <h1 className="mt-3 text-4xl text-slate-100">{displayName}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">{philosophy}</p>
        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-600">Mythology: {mythology}</p>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value, Icon]) => <div key={label} className="border border-amber-500/30 bg-[#0b0f15] p-5 dashboard-rimlight-hover"><Icon className="h-5 w-5 text-amber-300" /><p className="mt-6 text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p><p className="mt-2 text-2xl text-slate-100">{String(value)}</p></div>)}
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-2">
        <Roster title="Broker identity sample" rows={dossier.brokers} nameFragments={["human_name", "name"]} idFragments={["broker", "source"]} />
        <Roster title="Client identity sample" rows={dossier.clients} nameFragments={["human_name", "name"]} idFragments={["client", "legacy"]} />
        <Roster title="Staff roster sample" rows={dossier.staff} nameFragments={["human_name", "name"]} idFragments={["employee", "staff"]} />
        <Roster title="Mythological leadership sample" rows={[...dossier.gods, ...dossier.titans]} nameFragments={["human_name", "name"]} idFragments={["god", "titan", "myth"]} />
      </section>

      <section className="mt-8 border border-slate-800 p-6">
        <div className="flex items-center gap-3"><Award className="h-5 w-5 text-cyan-300" /><h2 className="text-xl text-slate-100">Capability posture</h2></div>
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><p className="text-slate-400">Free agents<br /><span className="text-slate-100">{dossier.counts.freeAgentCount}</span></p><p className="text-slate-400">Coverage rows<br /><span className="text-slate-100">{dossier.counts.coverageCount}</span></p><p className="text-slate-400">Certification rows<br /><span className="text-slate-100">{dossier.counts.certificationCount}</span></p></div>
        <p className="mt-5 text-xs leading-5 text-slate-500">Counts come from Clean firm-prefixed relations. Missing or zero capability tables remain visible as unavailable rather than being inferred from another firm.</p>
      </section>
    </main>
  );
}

function Roster({ title, rows, nameFragments, idFragments }: { title: string; rows: Record<string, unknown>[]; nameFragments: string[]; idFragments: string[] }) {
  return <section className="border border-slate-800 bg-[#0b0f15] p-5"><h2 className="text-lg text-slate-100">{title}</h2><div className="mt-4 divide-y divide-slate-800">{rows.slice(0, 8).map((row, index) => <div key={index} className="flex items-center justify-between gap-3 py-3 text-xs"><span className="text-slate-200">{firstValue(row, nameFragments)}</span><span className="text-slate-500">{firstValue(row, idFragments)}</span></div>)}{!rows.length && <p className="py-4 text-sm text-slate-500">Unavailable in Clean.</p>}</div></section>;
}
