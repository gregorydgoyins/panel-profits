import * as React from "react";
import { PublicPageShell } from "@/components/shell/public-page-shell";

export const metadata = {
  title: "Support Sequential Art Equity & Research | ComicBookStockExchange.com",
  description: "Contribute to independent historical comic market scholarship, creator equity advocacy, and autonomous pricing infrastructure.",
};

export default function DonateLayout({ children }: { children: React.ReactNode }) {
  return <PublicPageShell>{children}</PublicPageShell>;
}
