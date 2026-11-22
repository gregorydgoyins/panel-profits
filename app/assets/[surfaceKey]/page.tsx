import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Boxes, ShieldCheck, Sparkles, TrendingUp, Layers, Award } from "lucide-react";
import { getCleanEquityDetail } from "@/lib/panel-profits/assets";
import { AssetClassesMatrix } from "@/components/equity/asset-classes-matrix";
import { formatComicEquityTicker } from "@/lib/equity/canonical-equities";

export const revalidate = 300;

interface AssetSurfacePageProps {
  params: Promise<{ surfaceKey: string }>;
}

export default async function AssetSurfacePage({ params }: AssetSurfacePageProps) {
  const { surfaceKey } = await params;
  const asset = await getCleanEquityDetail(surfaceKey);

  if (!asset) {
    redirect("/assets");
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/assets"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-cyan-400 hover:text-cyan-200 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to asset registry
      </Link>

      <section className="mt-8 border border-slate-800 bg-[#0b0f15] p-6 sm:p-8 rounded-lg shadow-xl">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Cover Art Visual */}
          <div className="w-full md:w-64 shrink-0">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md border border-slate-800 bg-[#07090d]">
              {asset.cover_url ? (
                <Image
                  src={asset.cover_url}
                  alt={`${asset.series} ${asset.issue_number ? `#${asset.issue_number}` : ""}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 256px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-slate-600">
                  <Boxes className="h-8 w-8 text-slate-700" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    Certified Vault Cover Pending
                  </span>
                </div>
              )}
            </div>
            {asset.seat_number && (
              <div className="mt-3 text-center border border-cyan-500/20 bg-cyan-950/40 py-1.5 px-3 rounded text-[11px] font-mono text-cyan-300">
                Seat #{asset.seat_number} · {asset.seat_type || "CONSTITUTIONAL"}
              </div>
            )}
          </div>

          {/* Asset Metadata & Valuation */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                <ShieldCheck className="h-3 w-3" />
                {asset.source}
              </span>
              {asset.origin_era && (
                <span className="rounded bg-slate-800/80 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-300">
                  {asset.origin_era} Era
                </span>
              )}
              {asset.lineage && (
                <span className="rounded bg-blue-950/50 border border-blue-500/30 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-blue-300">
                  {asset.lineage}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <h1 className="mt-4 text-2xl sm:text-4xl font-bold tracking-tight text-slate-100">
                {asset.series} {asset.issue_number && !asset.issue_number.startsWith("$") ? `#${asset.issue_number}` : ""}
              </h1>
              {asset.issue_number?.startsWith("$") && (
                <span className="mt-4 inline-block font-mono text-sm px-2.5 py-1 bg-cyan-950/70 border border-cyan-500/50 text-cyan-300 rounded font-bold">
                  {asset.issue_number}
                </span>
              )}
            </div>

            {asset.title && asset.title !== asset.series && (
              <p className="mt-2 text-sm text-slate-400 font-medium">{asset.title}</p>
            )}

            <p className="mt-2 text-xs text-slate-500 font-mono">
              Canonical Identity: {asset.canonical_issue_id || asset.id}
            </p>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="border border-slate-800 bg-[#070A10] p-3.5 rounded">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Fair Market Value</p>
                <p className="mt-1 text-xl font-bold text-emerald-300">
                  {asset.price_formatted || (asset.reference_fmv_usd ? `$${asset.reference_fmv_usd.toLocaleString()}` : "Unpriced")}
                </p>
              </div>

              <div className="border border-slate-800 bg-[#070A10] p-3.5 rounded">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Reference Grade</p>
                <p className="mt-1 text-xl font-bold text-cyan-300">
                  {asset.reference_grade
                    ? asset.reference_grade === "RAW" || asset.reference_grade === "UNGRADED"
                      ? "RAW Ungraded"
                      : `Grade ${asset.reference_grade}`
                    : "Unpriced"}
                </p>
              </div>

              <div className="border border-slate-800 bg-[#070A10] p-3.5 rounded">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Audit Status</p>
                <p className="mt-1 text-sm font-semibold text-cyan-400">
                  {asset.evidence_confidence || "VERIFIED"}
                </p>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-800/80 pt-6">
              <h2 className="text-sm uppercase tracking-wider text-slate-300 font-semibold mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                Institutional Asset Specifications
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
                <li className="flex justify-between border-b border-slate-800/50 py-1.5">
                  <span className="text-slate-500">Publisher:</span>
                  <span className="text-slate-200 font-medium">{asset.publisher || "Unlisted"}</span>
                </li>
                <li className="flex justify-between border-b border-slate-800/50 py-1.5">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-emerald-400 font-medium">{asset.status}</span>
                </li>
                <li className="flex justify-between border-b border-slate-800/50 py-1.5">
                  <span className="text-slate-500">Production Age:</span>
                  <span className="text-slate-200 capitalize font-medium">{asset.production_age || "Golden/Silver"}</span>
                </li>
                <li className="flex justify-between border-b border-slate-800/50 py-1.5">
                  <span className="text-slate-500">Float Security:</span>
                  <span className="text-cyan-300 font-medium">Sovereign Cold Storage</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {asset.reference_fmv_usd && (
                <Link
                  href={asset.issue_number?.startsWith("$") ? `/assets/${asset.surface_key}` : `/equity/${formatComicEquityTicker(asset.series, asset.issue_number || "1", "SOV")}`}
                  className="inline-flex items-center gap-2 rounded bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-xs font-mono font-bold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                >
                  {asset.issue_number?.startsWith("$") ? `Trade Asset ${asset.issue_number}` : `Trade Sovereign Equity (${formatComicEquityTicker(asset.series, asset.issue_number || "1", "SOV")})`}
                </Link>
              )}
              <Link
                href={`/comics/${asset.id}`}
                className="inline-flex items-center gap-2 rounded bg-cyan-500/10 border border-cyan-500/40 px-4 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors"
              >
                Inspect in Master Catalog
              </Link>
              <Link
                href="/equities"
                className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-800/60 px-4 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 transition-colors"
              >
                Equities Trading Floor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 16 Canonical Collectible Asset Classes Matrix */}
      {asset.reference_fmv_usd ? (
        <section className="mt-8">
          <AssetClassesMatrix
            series={asset.series}
            issueNumber={asset.issue_number || "1"}
            baseFmv={asset.reference_fmv_usd}
          />
        </section>
      ) : null}
    </main>
  );
}
