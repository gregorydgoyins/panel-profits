import { notFound, redirect } from "next/navigation";
import { getEquityDetail } from "@/lib/equity/queries";
import { getComicById } from "@/lib/comics/queries";
import { IndexDossierView } from "@/components/equity/index-dossier-view";

export const revalidate = 300;

interface EquityDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EquityDetailPage({ params }: EquityDetailPageProps) {
  const { id } = await params;
  if (!id) notFound();

  const cleanId = decodeURIComponent(id).trim().toUpperCase().replace(/^\$/, "");

  // 1. Check if identifier corresponds to an index contract (CE70, PPIX100, PPIX60, etc.)
  const indexDetail = await getEquityDetail(cleanId);
  if (indexDetail) {
    return (
      <main className="min-h-screen bg-[#06080F] text-slate-100 py-8">
        <IndexDossierView
          contract={indexDetail.contract}
          observations={indexDetail.observations}
          constituents={indexDetail.constituents}
        />
      </main>
    );
  }

  // 2. Check if identifier is a Sovereign Comic Equity ticker, seat, or slug
  // Redirect directly to the user's authentic September comic detail page (/comics/[id])
  const comic = await getComicById(id);
  if (comic) {
    const canonicalTicker = (comic.panel_profits_data as any)?.ticker || (comic as any).ticker;
    const targetSlug = canonicalTicker ? canonicalTicker.replace(/^\$/, "") : comic.id;
    redirect(`/comics/${encodeURIComponent(targetSlug)}`);
  }

  // 3. Fallback: Redirect to /comics with search query so user never hits a dead-end 404
  redirect(`/comics?q=${encodeURIComponent(id)}`);
}
