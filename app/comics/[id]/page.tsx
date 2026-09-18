import { notFound } from "next/navigation";
import Link from "next/link";
import { getComicById } from "@/lib/comics/queries";
import { getCurrentUser, getComicUserStatus } from "@/lib/account/queries";
import { ComicCover } from "@/components/comics/comic-cover";
import { PricingDossier } from "@/components/comics/pricing-dossier";
import { ProvenanceCard } from "@/components/comics/provenance-card";
import { ComicActions } from "@/components/comics/comic-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface ComicDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ComicDetailPage({ params }: ComicDetailPageProps) {
  const { id } = await params;
  const [comic, user] = await Promise.all([
    getComicById(id),
    getCurrentUser(),
  ]);

  if (!comic) {
    notFound();
  }

  const userStatus = user ? await getComicUserStatus(comic.id) : {
    isInCollection: false,
    collectionItem: null,
    isInWatchlist: false,
    watchlistItem: null,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-graphite-800 pb-4">
        <Link href="/comics">
          <Button variant="outline" size="sm" className="flex items-center gap-1.5 h-8 text-xs">
            <ChevronLeft className="h-4 w-4" />
            <span>BACK TO CATALOG</span>
          </Button>
        </Link>
        <div className="flex items-center gap-2 text-xs text-graphite-400">
          <span>CATALOG</span>
          <span>/</span>
          <span className="text-chalk truncate max-w-[200px] sm:max-w-xs">{comic.series}</span>
          <span>/</span>
          <span className="text-cobalt-400">#{comic.issue_number}</span>
        </div>
      </div>

      {/* Main Dossier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Primary Cover & Physical Profile */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border-2 border-orange-500/60 bg-graphite-900/90 p-4 shadow-xl portfolio-rimlight-hover">
            <ComicCover
              coverUrl={comic.cover_url}
              storagePath={comic.cover_storage_path}
              series={comic.series}
              issueNumber={comic.issue_number}
              publisher={comic.publisher}
              size="full"
              priority={true}
            />

            {/* Quick Metadata Spec */}
            <div className="mt-4 pt-4 border-t border-graphite-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-graphite-400">
                <span>COVER VERIFICATION</span>
                <Badge variant={comic.cover_verified_at ? "success" : "secondary"} className="text-[9px]">
                  {comic.cover_verified_at ? "VERIFIED" : "PENDING AUDIT"}
                </Badge>
              </div>

              {comic.cover_sha256 && (
                <div className="flex flex-col text-[10px] text-graphite-500 pt-1">
                  <span>SHA256 CHECKSUM:</span>
                  <span className="truncate text-graphite-400">{comic.cover_sha256}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Identity, Actions, Pricing, Provenance */}
        <div className="lg:col-span-8 space-y-6">
          {/* Identity & Actions Header Card */}
          <div className="rounded-xl border-2 border-orange-500/60 bg-graphite-900/90 p-6 space-y-5 shadow-xl markets-rimlight-hover">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default" className="text-xs">
                  {comic.publisher || "INDEPENDENT PUBLISHER"}
                </Badge>
                {comic.publication_year && (
                  <Badge variant="secondary" className="text-xs">
                    {comic.publication_year}
                  </Badge>
                )}
                {comic.direct_or_variant && (
                  <Badge variant="secondary" className="text-xs">
                    {comic.direct_or_variant}
                  </Badge>
                )}
                {comic.cover_variant && (
                  <Badge variant="copper" className="text-xs">
                    VARIANT: {comic.cover_variant}
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl tracking-tight text-chalk">
                {comic.series}{" "}
                <span className="text-cobalt-400">#{comic.issue_number}</span>
              </h1>

              {comic.title && comic.title !== comic.series && (
                <p className="text-sm text-graphite-300 italic">
                  &ldquo;{comic.title}&rdquo;
                </p>
              )}
            </div>

            {/* Collection & Watchlist Actions */}
            <div className="pt-2 border-t border-graphite-800">
              <ComicActions
                comicId={comic.id}
                series={comic.series}
                issueNumber={comic.issue_number}
                isAuthenticated={Boolean(user)}
                isInCollection={userStatus.isInCollection}
                collectionQuantity={userStatus.collectionItem?.quantity || 1}
                collectionGrade={userStatus.collectionItem?.grade}
                collectionCost={userStatus.collectionItem?.acquisition_cost}
                isInWatchlist={userStatus.isInWatchlist}
              />
            </div>

            {/* Specification Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-graphite-800 text-xs">
              <div className="rounded bg-graphite-950 p-2.5 space-y-0.5">
                <span className="text-[10px] uppercase text-graphite-500">VOLUME</span>
                <p className="text-chalk">{comic.volume || "1"}</p>
              </div>

              <div className="rounded bg-graphite-950 p-2.5 space-y-0.5">
                <span className="text-[10px] uppercase text-graphite-500">PRINTING</span>
                <p className="text-chalk">{comic.printing ? `${comic.printing}st Printing` : "1st Printing"}</p>
              </div>

              <div className="rounded bg-graphite-950 p-2.5 space-y-0.5">
                <span className="text-[10px] uppercase text-graphite-500">PUB DATE</span>
                <p className="text-chalk">{formatDate(comic.publication_date)}</p>
              </div>

              <div className="rounded bg-graphite-950 p-2.5 space-y-0.5">
                <span className="text-[10px] uppercase text-graphite-500">UPC CODE</span>
                <p className="text-chalk truncate">{comic.upc || "—"}</p>
              </div>
            </div>
          </div>

          {/* Pricing Dossier */}
          <PricingDossier comic={comic} />

          {/* Provenance & Source Inspection */}
          <ProvenanceCard comic={comic} />
        </div>
      </div>
    </div>
  );
}
