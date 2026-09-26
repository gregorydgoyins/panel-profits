import Link from "next/link";
import { Activity, ArrowUpRight, Database, ShieldCheck } from "lucide-react";

export function AuthFrontDoor({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#07090d] text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-5 py-10 lg:grid-cols-[1fr_440px] lg:px-10">
        <section className="max-w-2xl">
          <Link href="/" className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-slate-400 hover:text-slate-100">
            <span className="flex h-8 w-8 items-center justify-center bg-purple-600 text-[11px] text-white">PP</span>
            Panel Profits
          </Link>
          <p className="mt-16 flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-cyan-300"><Activity className="h-3.5 w-3.5" /> Comic equity market terminal</p>
          <h1 className="mt-5 max-w-xl text-5xl leading-[1.02] tracking-tight text-slate-100 sm:text-7xl">Enter the market with intent.</h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-slate-400">A serious operating environment for comic instruments, verified market intelligence, holdings, and player development.</p>
          <div className="mt-12 grid max-w-xl gap-3 sm:grid-cols-3">
            {[{ icon: Database, label: "3.48M", copy: "canonical records" }, { icon: Activity, label: "LIVE", copy: "market context" }, { icon: ShieldCheck, label: "CLEAN", copy: "read authority" }].map(({ icon: Icon, label, copy }) => <div key={label} className="border-l border-slate-700 pl-3"><Icon className="h-4 w-4 text-slate-500"/><p className="mt-3 text-sm text-slate-200">{label}</p><p className="mt-1 text-xs text-slate-500">{copy}</p></div>)}
          </div>
          <Link href="/news" className="mt-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500 hover:text-cyan-200">View public intelligence <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </section>
        <section className="relative">{children}</section>
      </div>
    </div>
  );
}
