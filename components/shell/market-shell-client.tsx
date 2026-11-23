"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

// Public stand-alone routes that must render completely outside the market trading rails and login apparatus
const STANDALONE_PUBLIC_ROUTES = ["/beta", "/donate", "/book"];

interface MarketShellClientProps {
  header: React.ReactNode;
  rails: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}

export function MarketShellClient({
  header,
  rails,
  footer,
  children,
}: MarketShellClientProps) {
  const pathname = usePathname();

  // If user is visiting /beta, /donate, or /book (or sub-paths), completely skip the market rails and trading header
  const isStandalone = STANDALONE_PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );

  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#07080B] text-slate-100 antialiased selection:bg-purple-900 selection:text-purple-100">
      {header}
      {rails}
      <main className="flex-1">{children}</main>
      {footer}
    </div>
  );
}
