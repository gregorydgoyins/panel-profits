import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Footer } from "./footer";

interface PublicPageShellProps {
  children: React.ReactNode;
}

export function PublicPageShell({ children }: PublicPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#07080B] text-slate-100 antialiased selection:bg-purple-900 selection:text-purple-100">
      {/* Clean, Dedicated Public Header - Completely Independent of App Rails & App Login */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#07080B]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <Image
              src="/brand/panel-profits-mark.svg"
              alt="ComicBookStockExchange.com"
              width={30}
              height={30}
              className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
              priority
            />
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100">
                COMICBOOKSTOCKEXCHANGE.COM
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-cyan-400 font-semibold">
                AUTONOMOUS COMIC EQUITY EXCHANGE
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/book"
              className="rounded-md px-2.5 py-1 text-[11px] sm:text-xs font-semibold tracking-wider text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors uppercase"
            >
              The Book
            </Link>
            <Link
              href="/beta"
              className="rounded-md px-2.5 py-1 text-[11px] sm:text-xs font-semibold tracking-wider text-cyan-300 hover:text-cyan-200 hover:bg-cyan-950/40 border border-cyan-500/30 transition-colors uppercase"
            >
              Beta Access
            </Link>
            <Link
              href="/donate"
              className="rounded-md px-2.5 py-1 text-[11px] sm:text-xs font-semibold tracking-wider text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-500/30 transition-colors uppercase"
            >
              Donate
            </Link>
            <Link
              href="/"
              className="rounded-md bg-purple-600/30 px-3 py-1 text-[11px] sm:text-xs font-semibold tracking-wider text-purple-200 border border-purple-500/40 hover:bg-purple-600/50 hover:text-white transition-colors uppercase"
            >
              Exchange Floor &rarr;
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area - Full Bleed, Zero Internal Rails */}
      <main className="flex-1">{children}</main>

      <Footer />
    </div>
  );
}
