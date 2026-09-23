"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, BookOpen, BriefcaseBusiness, GraduationCap, LayoutDashboard, Newspaper, Search, Users, UserRound, Wallet, Watch } from "lucide-react";

export const PRIMARY_NAV_LINKS = [
  { href: "/market", label: "Market", icon: LayoutDashboard },
  { href: "/telemetry", label: "Telemetry", icon: Activity },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/assets", label: "Assets", icon: BookOpen },
  { href: "/comics", label: "Catalog", icon: Search },
  { href: "/equities", label: "Equities", icon: BarChart3 },
  { href: "/firms", label: "Firms", icon: BriefcaseBusiness },
  { href: "/people", label: "People", icon: Users },
  { href: "/collection", label: "Portfolio", icon: Wallet },
  { href: "/research", label: "Research", icon: Search },
  { href: "/analysis", label: "Analysis", icon: BarChart3 },
  { href: "/learn", label: "Learn", icon: GraduationCap },
  { href: "/diary", label: "Diary", icon: UserRound },
  { href: "/watchlist", label: "Watchlist", icon: Watch },
];

export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="flex min-w-0 items-center gap-1 overflow-x-auto">
      {PRIMARY_NAV_LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`group flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-[11px] uppercase tracking-[0.12em] transition-colors ${
              active
                ? "border-cyan-300 text-slate-100"
                : "border-transparent text-slate-500 hover:border-slate-600 hover:text-slate-200"
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${active ? "text-cyan-300" : "text-slate-600 group-hover:text-slate-300"}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}