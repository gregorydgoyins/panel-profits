import * as React from "react";
import { PublicPageShell } from "@/components/shell/public-page-shell";

export const metadata = {
  title: "Beta Access & Early Desk Waitlist | ComicBookStockExchange.com",
  description: "Request early institutional access, collector deal radar, and algorithmic pricing terminal credentials on ComicBookStockExchange.com.",
};

export default function BetaLayout({ children }: { children: React.ReactNode }) {
  return <PublicPageShell>{children}</PublicPageShell>;
}
