import Link from "next/link";
import { BookOpenText, Clock3 } from "lucide-react";

interface DiaryRailEntry {
  id: string;
  title: string;
  entry_type: string;
  occurred_at: string;
}

export function DiaryRail({ entries }: { entries: DiaryRailEntry[] }) {
  if (!entries.length) return null;
  return (
    <aside aria-label="Broker diary rail" className="border-b border-slate-800/80 bg-[#080b10] px-4 py-1.5 text-xs text-slate-300">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <Link href="/diary" className="flex shrink-0 items-center gap-1.5 border-r border-slate-800 pr-3 text-[10px] uppercase tracking-[0.15em] text-violet-300 hover:text-violet-200">
          <BookOpenText className="h-3.5 w-3.5" /> BROKER DIARY
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto py-0.5">
          {entries.slice(0, 8).map((entry) => (
            <Link key={entry.id} href="/diary" className="group flex shrink-0 items-center gap-2 border border-slate-800/70 bg-[#0c1118] px-2.5 py-1 text-[10px] hover:border-violet-300/60">
              <Clock3 className="h-3 w-3 text-violet-300" />
              <span className="text-slate-500">{entry.entry_type}</span>
              <span className="max-w-[190px] truncate text-slate-300 group-hover:text-violet-200">{entry.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
