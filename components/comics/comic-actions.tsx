"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleWatchlistAction, addOrUpdateHoldingAction } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bookmark, Check, Layers, Loader2, Plus, X } from "lucide-react";

interface ComicActionsProps {
  comicId: string;
  series: string;
  issueNumber?: string | null;
  isAuthenticated: boolean;
  isInCollection: boolean;
  collectionQuantity?: number;
  collectionGrade?: string | null;
  collectionCost?: number | null;
  isInWatchlist: boolean;
}

export function ComicActions({
  comicId,
  series,
  issueNumber,
  isAuthenticated,
  isInCollection,
  collectionQuantity = 1,
  collectionGrade = "",
  collectionCost = null,
  isInWatchlist,
}: ComicActionsProps) {
  const router = useRouter();

  const [inWatchlistState, setInWatchlistState] = useState(isInWatchlist);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inCollectionState, setInCollectionState] = useState(isInCollection);
  const [quantity, setQuantity] = useState(collectionQuantity?.toString() || "1");
  const [grade, setGrade] = useState(collectionGrade || "");
  const [gradingCompany, setGradingCompany] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [acqCost, setAcqCost] = useState(collectionCost !== null && collectionCost !== undefined ? collectionCost.toString() : "");
  const [acqDate, setAcqDate] = useState("");
  const [notes, setNotes] = useState("");
  const [collectionLoading, setCollectionLoading] = useState(false);

  const handleWatchlistClick = async () => {
    if (!isAuthenticated) {
      router.push(`/sign-in?returnTo=/comics/${comicId}`);
      return;
    }

    setWatchlistLoading(true);
    const res = await toggleWatchlistAction(comicId);
    setInWatchlistState(res.inWatchlist);
    setWatchlistLoading(false);
  };

  const handleCollectionClick = () => {
    if (!isAuthenticated) {
      router.push(`/sign-in?returnTo=/comics/${comicId}`);
      return;
    }
    setIsModalOpen(true);
  };

  const handleSaveHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    setCollectionLoading(true);

    const formData = new FormData();
    formData.set("comicId", comicId);
    formData.set("quantity", quantity);
    formData.set("grade", grade);
    formData.set("gradingCompany", gradingCompany);
    formData.set("certificationNumber", certNumber);
    formData.set("acquisitionCost", acqCost);
    formData.set("acquisitionDate", acqDate);
    formData.set("notes", notes);

    const res = await addOrUpdateHoldingAction(formData);
    setCollectionLoading(false);

    if (res.success) {
      setInCollectionState(true);
      setIsModalOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {/* Add to Collection Button */}
        <Button
          onClick={handleCollectionClick}
          variant="outline"
          className={`flex items-center gap-2 border px-4 py-2 text-xs transition-colors ${
            inCollectionState
              ? "border-orange-500 bg-orange-950/40 text-orange-200 hover:bg-orange-950/60"
              : "border-orange-500/60 bg-[#121520] text-orange-300 hover:bg-[#1A1F30] hover:border-orange-400"
          }`}
        >
          {inCollectionState ? (
            <>
              <Check className="h-3.5 w-3.5 text-orange-400" />
              <span>In Collection (Qty: {quantity})</span>
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5 text-orange-400" />
              <span>Add to Collection</span>
            </>
          )}
        </Button>

        {/* Watchlist Toggle Button */}
        <Button
          onClick={handleWatchlistClick}
          disabled={watchlistLoading}
          variant="outline"
          className={`flex items-center gap-2 border px-4 py-2 text-xs transition-colors ${
            inWatchlistState
              ? "border-pink-500 bg-pink-950/40 text-pink-200 hover:bg-pink-950/60"
              : "border-slate-800 bg-[#121520] text-slate-300 hover:bg-[#1A1F30] hover:border-pink-500/60 hover:text-pink-300"
          }`}
        >
          {watchlistLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-pink-400" />
          ) : inWatchlistState ? (
            <>
              <Bookmark className="h-3.5 w-3.5 fill-pink-500 text-pink-500" />
              <span>Watching</span>
            </>
          ) : (
            <>
              <Bookmark className="h-3.5 w-3.5 text-pink-400" />
              <span>Add to Watchlist</span>
            </>
          )}
        </Button>
      </div>

      {/* Add / Edit Holding Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-lg border border-orange-500/50 bg-[#0E1017] p-6 shadow-2xl collection-rimlight-hover max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-base font-light text-slate-100 mb-1 flex items-center gap-2">
              <Layers className="h-4 w-4 text-orange-400" />
              {inCollectionState ? "Update Holding" : "Add to Collection"}
            </h2>
            <p className="text-xs text-slate-400 mb-4 truncate">
              {series} {issueNumber ? `#${issueNumber}` : ""}
            </p>

            <form onSubmit={handleSaveHolding} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className="border-slate-800 bg-[#12151F] text-slate-100 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Grade (e.g. 9.8, 9.4, Raw)</label>
                  <Input
                    type="text"
                    placeholder="9.8"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="border-slate-800 bg-[#12151F] text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Grading Company</label>
                  <Input
                    type="text"
                    placeholder="CGC, CBCS, Raw"
                    value={gradingCompany}
                    onChange={(e) => setGradingCompany(e.target.value)}
                    className="border-slate-800 bg-[#12151F] text-slate-100 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Cert Number</label>
                  <Input
                    type="text"
                    placeholder="Optional cert #"
                    value={certNumber}
                    onChange={(e) => setCertNumber(e.target.value)}
                    className="border-slate-800 bg-[#12151F] text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Acquisition Cost ($)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={acqCost}
                    onChange={(e) => setAcqCost(e.target.value)}
                    className="border-slate-800 bg-[#12151F] text-slate-100 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Acquisition Date</label>
                  <Input
                    type="date"
                    value={acqDate}
                    onChange={(e) => setAcqDate(e.target.value)}
                    className="border-slate-800 bg-[#12151F] text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Notes / Provenance</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes, signing info, white pages..."
                  className="w-full rounded border border-slate-800 bg-[#12151F] p-2 text-slate-100 text-xs focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={collectionLoading}
                  className="bg-orange-600 hover:bg-orange-500 text-white text-xs px-4 py-2"
                >
                  {collectionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save to Collection"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
