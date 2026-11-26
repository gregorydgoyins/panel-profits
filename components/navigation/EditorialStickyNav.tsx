"use client";

import React from "react";
import Link from "next/link";

export type EditorialPageKey = "podcasts" | "beta" | "book" | "donate";

interface NavPillSpec {
  key: EditorialPageKey;
  label: string;
  href: string;
  title: string;
  color: string;
  textColor: string;
  bgColor: string;
  glow: string;
}

const ALL_EDITORIAL_PILLS: NavPillSpec[] = [
  {
    key: "podcasts",
    label: "Podcasts",
    href: "/podcasts",
    title: "Master Video & Audio Podcast Broadcasts",
    color: "#39ff88",
    textColor: "#d9ffe8",
    bgColor: "rgba(4, 24, 14, 0.78)",
    glow: "0 0 0 1px rgba(185, 255, 212, 0.45), 0 0 3px #b8ffd6, 0 0 8px #00ff66, inset 0 0 4px rgba(0, 255, 102, 0.42)",
  },
  {
    key: "beta",
    label: "Private Beta",
    href: "/beta",
    title: "Private Beta Sign-Up & Terminal Access",
    color: "#5cf4ff",
    textColor: "#e0fbff",
    bgColor: "rgba(4, 18, 30, 0.8)",
    glow: "0 0 0 1px rgba(207, 250, 254, 0.45), 0 0 3px #e0fbff, 0 0 8px #00e5ff, inset 0 0 4px rgba(0, 229, 255, 0.42)",
  },
  {
    key: "book",
    label: "Monograph / Book",
    href: "/book",
    title: "Panel Profits Monograph & Book Editions",
    color: "#ffd147",
    textColor: "#fef3c7",
    bgColor: "rgba(28, 18, 4, 0.8)",
    glow: "0 0 0 1px rgba(254, 243, 199, 0.45), 0 0 3px #fef3c7, 0 0 8px #fbbf24, inset 0 0 4px rgba(251, 191, 36, 0.42)",
  },
  {
    key: "donate",
    label: "Donate",
    href: "/donate",
    title: "Support Independent Scholarship & Patron Endowment",
    color: "#f472ff",
    textColor: "#fae8ff",
    bgColor: "rgba(28, 6, 30, 0.8)",
    glow: "0 0 0 1px rgba(250, 232, 255, 0.45), 0 0 3px #fae8ff, 0 0 8px #e879f9, inset 0 0 4px rgba(232, 121, 249, 0.42)",
  },
];

export default function EditorialStickyNav({
  currentPage,
}: {
  currentPage: EditorialPageKey;
}) {
  // Always display the 3 sibling pages — omitting the page the visitor is currently on
  const visiblePills = ALL_EDITORIAL_PILLS.filter(
    (pill) => pill.key !== currentPage
  );

  return (
    <nav className="border-b border-white/15 bg-[#060b14]/65 backdrop-blur-2xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-14 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <span
            className="text-emerald-300 font-mono font-bold tracking-widest text-xs uppercase px-2 py-0.5 rounded"
            style={{
              backgroundColor: "rgba(0, 255, 102, 0.14)",
              border: "1px solid rgba(0, 255, 102, 0.55)",
              boxShadow: "0 0 10px rgba(0, 255, 102, 0.3)",
            }}
          >
            CBSE
          </span>
          <span className="text-white tracking-widest text-xs sm:text-sm font-medium uppercase drop-shadow group-hover:text-emerald-300 transition-colors">
            Comic Book Stock Exchange
          </span>
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {visiblePills.map((pill) => (
            <Link
              key={pill.key}
              href={pill.href}
              title={pill.title}
              className="px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap"
              style={{
                color: pill.textColor,
                backgroundColor: pill.bgColor,
                border: `1.5px solid ${pill.color}`,
                boxShadow: pill.glow,
              }}
            >
              {pill.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
