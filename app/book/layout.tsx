import * as React from "react";
import { PublicPageShell } from "@/components/shell/public-page-shell";

export const metadata = {
  title: "Panel Profits: The Architecture of Sequential Art Equities | Official Canonical Library",
  description: "Explore the comprehensive canonical curriculum of Panel Profits across 20 volumes of forensic art history, material science, and economic analysis.",
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <PublicPageShell>{children}</PublicPageShell>;
}
