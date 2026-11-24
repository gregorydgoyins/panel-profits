import Link from "next/link";
import { Database, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-[#07080B] py-6 text-xs text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-cyan-600 text-[8px] font-bold text-white">
              CBSE
            </span>
            <span className="text-slate-200 uppercase tracking-wider font-bold">COMICBOOKSTOCKEXCHANGE.COM</span>
            <span className="text-slate-600">·</span>
            <span className="text-[11px] text-slate-400">AUTONOMOUS COMIC EQUITY EXCHANGE &amp; VALUATION CLEARINGHOUSE</span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-2 text-[11px] text-slate-400">
            <Link href="/book" className="text-purple-300 hover:text-white transition-colors">THE BOOK</Link>
            <Link href="/beta" className="text-cyan-300 hover:text-white transition-colors">BETA ACCESS</Link>
            <Link href="/donate" className="text-emerald-300 hover:text-white transition-colors">DONATE</Link>
            <a
              href="https://facebook.com/comicbookstockexchange"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#1877F2] hover:text-blue-400 transition-colors"
            >
              <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>FACEBOOK</span>
            </a>
            <Link href="/" className="hover:text-slate-200 transition-colors">DASHBOARD</Link>
            <Link href="/market" className="hover:text-slate-200 transition-colors">MARKETS</Link>
            <Link href="/equities" className="hover:text-slate-200 transition-colors">EQUITIES</Link>
            <Link href="/comics" className="hover:text-slate-200 transition-colors">CATALOG</Link>
            <Link href="/wiki" className="hover:text-slate-200 transition-colors">ENCYCLOPEDIA</Link>
            <Link href="/lexicon" className="hover:text-slate-200 transition-colors">LEXICON</Link>
          </div>
        </div>

        <div className="border-t border-slate-800/40 pt-4 flex flex-col md:flex-row items-center justify-between gap-2 text-[10px] text-slate-400">
          <div className="flex items-center gap-2">
            <Database className="h-3 w-3 text-emerald-400" />
            <span>OPERATIONAL DATABASE: PANEL PROFITS CLEAN (3,481,445 CANONICAL RECORDS)</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 text-purple-400" />
            <span>PROVENANCE: PANEL PROFITS · COMICBASE · GRAND COMICS DATABASE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
