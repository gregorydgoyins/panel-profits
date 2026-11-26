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
    color: "#00ff66",
    textColor: "#b8ffd6",
    bgColor: "rgba(0, 255, 102, 0.14)",
    glow: "0 0 14px rgba(0, 255, 102, 0.55), inset 0 0 8px rgba(0, 255, 102, 0.22), 0 0 2px #00ff66",
  },
  {
    key: "beta",
    label: "Private Beta",
    href: "/beta",
    title: "Private Beta Sign-Up & Terminal Access",
    color: "#38bdf8",
    textColor: "#e0f2fe",
    bgColor: "rgba(56, 189, 248, 0.15)",
    glow: "0 0 14px rgba(56, 189, 248, 0.55), inset 0 0 8px rgba(56, 189, 248, 0.22), 0 0 2px #38bdf8",
  },
  {
    key: "book",
    label: "Monograph / Book",
    href: "/book",
    title: "Panel Profits Monograph & Book Editions",
    color: "#fbbf24",
    textColor: "#fef3c7",
    bgColor: "rgba(251, 191, 36, 0.15)",
    glow: "0 0 14px rgba(251, 191, 36, 0.55), inset 0 0 8px rgba(251, 191, 36, 0.22), 0 0 2px #fbbf24",
  },
  {
    key: "donate",
    label: "Donate",
    href: "/donate",
    title: "Support Independent Scholarship & Patron Endowment",
    color: "#e879f9",
    textColor: "#fae8ff",
    bgColor: "rgba(232, 121, 249, 0.15)",
    glow: "0 0 14px rgba(232, 121, 249, 0.55), inset 0 0 8px rgba(232, 121, 249, 0.22), 0 0 2px #e879f9",
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
