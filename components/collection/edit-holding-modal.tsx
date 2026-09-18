"use client";

import { useState } from "react";
import { CollectionItem } from "@/lib/account/types";
import { addOrUpdateHoldingAction, removeHoldingAction } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Trash2, Loader2, AlertCircle } from "lucide-react";

interface EditHoldingModalProps {
  item: CollectionItem;
  isOpen: boolean;
  onClose: () => void;
}

export function EditHoldingModal({ item, isOpen, onClose }: EditHoldingModalProps) {
  const [quantity, setQuantity] = useState(item.quantity?.toString() || "1");
  const [grade, setGrade] = useState(item.grade || "");
  const [gradingCompany, setGradingCompany] = useState(item.grading_company || "");
  const [certificationNumber, setCertificationNumber] = useState(item.certification_number || "");
  const [acquisitionDate, setAcquisitionDate] = useState(item.acquisition_date || "");
  const [acquisitionCost, setAcquisitionCost] = useState(item.acquisition_cost !== null && item.acquisition_cost !== undefined ? item.acquisition_cost.toString() : "");
  const [notes, setNotes] = useState(item.notes || "");

  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.set("comicId", item.comic_id);
    formData.set("collectionId", item.collection_id);
    formData.set("quantity", quantity);
    formData.set("grade", grade);
    formData.set("gradingCompany", gradingCompany);
    formData.set("certificationNumber", certificationNumber);
    formData.set("acquisitionDate", acquisitionDate);
    formData.set("acquisitionCost", acquisitionCost);
    formData.set("notes", notes);

    const res = await addOrUpdateHoldingAction(formData);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove this holding from your collection?")) {
      return;
    }
    setError("");
    setDeleteLoading(true);

    const res = await removeHoldingAction(item.id, item.comic_id);
    setDeleteLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      onClose();
    }
  };

  const comic = item.comic;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-lg border border-orange-500/40 bg-[#0E1017] p-6 shadow-2xl collection-rimlight-hover max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-base font-light text-slate-100 mb-1">Edit Holding</h2>
        <p className="text-xs text-slate-400 mb-4 truncate">
          {comic ? `${comic.series || "Comic"} #${comic.issue_number || ""}` : "Collection Item"}
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded border border-rose-500/40 bg-rose-950/30 p-2.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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
                placeholder="CGC / CBCS / Raw"
                value={gradingCompany}
                onChange={(e) => setGradingCompany(e.target.value)}
                className="border-slate-800 bg-[#12151F] text-slate-100 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Cert Number</label>
              <Input
                type="text"
                placeholder="1234567890"
                value={certificationNumber}
                onChange={(e) => setCertificationNumber(e.target.value)}
                className="border-slate-800 bg-[#12151F] text-slate-100 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1">Acquisition Date</label>
              <Input
                type="date"
                value={acquisitionDate}
                onChange={(e) => setAcquisitionDate(e.target.value)}
                className="border-slate-800 bg-[#12151F] text-slate-100 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Acquisition Cost ($)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={acquisitionCost}
                onChange={(e) => setAcquisitionCost(e.target.value)}
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
              placeholder="Signed by creator, direct edition, white pages..."
              className="w-full rounded border border-slate-800 bg-[#12151F] p-2 text-slate-100 text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={deleteLoading || loading}
              className="border-rose-900/40 bg-rose-950/20 text-rose-300 hover:bg-rose-950/40 text-xs flex items-center gap-1.5"
            >
              {deleteLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Remove Holding
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || deleteLoading}
                className="bg-orange-600 hover:bg-orange-500 text-white text-xs px-4 py-2"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
