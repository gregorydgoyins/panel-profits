"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Collection, CollectionItem } from "@/lib/account/types";
import { createCollectionAction, renameCollectionAction, deleteCollectionAction } from "@/lib/account/actions";
import { HoldingCard } from "./holding-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2, Search, ArrowUpDown, ChevronRight, ChevronLeft, Layers, Loader2, BookOpen } from "lucide-react";
import Link from "next/link";

interface CollectionManagerProps {
  collections: Collection[];
  activeCollection: Collection;
  items: CollectionItem[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export function CollectionManager({
  collections,
  activeCollection,
  items,
  nextCursor,
  hasMore,
  totalCount,
}: CollectionManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isCreating, setIsCreating] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(activeCollection.name);
  const [renameDesc, setRenameDesc] = useState(activeCollection.description || "");
  const [renameLoading, setRenameLoading] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "recent");

  const handleSelectCollection = (id: string) => {
    router.push(`/collection?id=${id}`);
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    setCreateLoading(true);

    const formData = new FormData();
    formData.set("name", newColName.trim());
    if (newColDesc.trim()) formData.set("description", newColDesc.trim());

    const res = await createCollectionAction(formData);
    setCreateLoading(false);
    if (res.success && res.collection) {
      setIsCreating(false);
      setNewColName("");
      setNewColDesc("");
      router.push(`/collection?id=${res.collection.id}`);
    }
  };

  const handleRenameCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameValue.trim()) return;
    setRenameLoading(true);

    const res = await renameCollectionAction(activeCollection.id, renameValue, renameDesc);
    setRenameLoading(false);
    if (res.success) {
      setIsRenaming(false);
      router.refresh();
    }
  };

  const handleDeleteCollection = async () => {
    if (activeCollection.is_default) {
      alert("Cannot delete your default collection.");
      return;
    }
    if (!confirm(`Are you sure you want to delete collection "${activeCollection.name}" and all its holdings?`)) {
      return;
    }

    setDeleteLoading(true);
    const res = await deleteCollectionAction(activeCollection.id);
    setDeleteLoading(false);

    if (res.success) {
      const defaultCol = collections.find((c) => c.is_default) || collections[0];
      router.push(`/collection?id=${defaultCol.id}`);
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    } else {
      params.delete("q");
    }
    params.delete("cursor");
    router.push(`/collection?${params.toString()}`);
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", newSort);
    params.delete("cursor");
    router.push(`/collection?${params.toString()}`);
  };

  const handleNextPage = () => {
    if (!nextCursor) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("cursor", nextCursor);
    router.push(`/collection?${params.toString()}`);
  };

  const handlePrevPage = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    router.push(`/collection?${params.toString()}`);
  };

  // Client-side sorting for current page if desired
  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === "series") {
      return (a.comic?.series || "").localeCompare(b.comic?.series || "");
    }
    if (sortBy === "issue") {
      const issueA = parseFloat(a.comic?.issue_number || "0") || 0;
      const issueB = parseFloat(b.comic?.issue_number || "0") || 0;
      return issueA - issueB;
    }
    if (sortBy === "cost") {
      return (b.acquisition_cost || 0) - (a.acquisition_cost || 0);
    }
    if (sortBy === "date") {
      return (b.acquisition_date || "").localeCompare(a.acquisition_date || "");
    }
    // Default: recent
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div>
      {/* Collection Selector & Actions Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {collections.map((col) => (
            <button
              key={col.id}
              onClick={() => handleSelectCollection(col.id)}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs transition-colors border ${
                col.id === activeCollection.id
                  ? "border-orange-500 bg-orange-950/40 text-orange-200 shadow"
                  : "border-slate-800 bg-[#10131E] text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              <Layers className="h-3 w-3" />
              <span>{col.name}</span>
              {col.is_default && (
                <span className="rounded bg-orange-900/60 px-1 text-[9px] text-orange-300">
                  DEF
                </span>
              )}
            </button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreating(true)}
            className="h-7 text-xs border-dashed border-slate-700 bg-transparent text-slate-400 hover:text-slate-200 hover:border-orange-500/60 px-2.5"
          >
            <Plus className="h-3 w-3 mr-1" /> New Collection
          </Button>
        </div>

        {/* Collection Management Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsRenaming(true)}
            className="h-7 text-xs text-slate-400 hover:text-slate-200 px-2"
          >
            <Edit2 className="h-3 w-3 mr-1" /> Rename
          </Button>

          {!activeCollection.is_default && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteCollection}
              disabled={deleteLoading}
              className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 px-2"
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Create Collection Inline Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateCollection}
          className="mb-6 rounded-lg border border-orange-500/50 bg-[#0E1017] p-4 text-xs collection-rimlight-hover"
        >
          <h3 className="font-light text-slate-200 mb-2">Create New Custom Collection</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-slate-400 mb-1">Collection Name</label>
              <Input
                type="text"
                placeholder="e.g. Silver Age Grails, CGC 9.8 Keys"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                required
                className="border-slate-800 bg-[#12151F] text-slate-100 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Description (Optional)</label>
              <Input
                type="text"
                placeholder="Notes on scope or focus..."
                value={newColDesc}
                onChange={(e) => setNewColDesc(e.target.value)}
                className="border-slate-800 bg-[#12151F] text-slate-100 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreating(false)}
              className="text-xs text-slate-400"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createLoading}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs px-4"
            >
              {createLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create Collection"}
            </Button>
          </div>
        </form>
      )}

      {/* Rename Collection Inline Form */}
      {isRenaming && (
        <form
          onSubmit={handleRenameCollection}
          className="mb-6 rounded-lg border border-orange-500/50 bg-[#0E1017] p-4 text-xs collection-rimlight-hover"
        >
          <h3 className="font-light text-slate-200 mb-2">Rename Collection</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-slate-400 mb-1">Name</label>
              <Input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                required
                className="border-slate-800 bg-[#12151F] text-slate-100 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Description</label>
              <Input
                type="text"
                value={renameDesc}
                onChange={(e) => setRenameDesc(e.target.value)}
                className="border-slate-800 bg-[#12151F] text-slate-100 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsRenaming(false)}
              className="text-xs text-slate-400"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={renameLoading}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs px-4"
            >
              {renameLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>
        </form>
      )}

      {/* Search and Sorting Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#0A0C13] p-3 rounded-lg border border-slate-800/80">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <Input
            type="text"
            placeholder="Search within this collection..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 border-slate-800 bg-[#12151F] text-slate-100 text-xs h-8"
          />
        </form>

        <div className="flex items-center gap-2 text-xs">
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-500">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="rounded border border-slate-800 bg-[#12151F] px-2 py-1 text-xs text-slate-200 focus:border-orange-500 focus:outline-none"
          >
            <option value="recent">Recently Added</option>
            <option value="series">Series Title (A-Z)</option>
            <option value="issue">Issue Number</option>
            <option value="cost">Highest Cost Basis</option>
            <option value="date">Acquisition Date</option>
          </select>
        </div>
      </div>

      {/* Holdings Grid / Empty State */}
      {sortedItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-[#0C0E15] p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-600 mb-3" />
          <h3 className="text-base font-light text-slate-200 mb-1">
            {searchQuery ? "No holdings match your search" : "Your collection is empty"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            {searchQuery
              ? "Try searching for another series or publisher title."
              : "Browse over 3.48 million comic records in the catalog and add your issues to track their market values."}
          </p>
          <Link
            href="/comics"
            className="inline-flex items-center gap-1.5 rounded bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs text-white transition-colors"
          >
            Explore Catalog &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedItems.map((item) => (
            <HoldingCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Keyset Cursor Pagination Footer */}
      {(hasMore || searchParams.get("cursor")) && (
        <div className="mt-8 flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs text-slate-400">
          <div>
            Showing {sortedItems.length} of {totalCount} holdings
          </div>
          <div className="flex items-center gap-2">
            {searchParams.get("cursor") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                className="h-8 border-slate-800 bg-[#12151F] text-slate-300 hover:bg-[#1A1E2C] text-xs flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> First Page
              </Button>
            )}
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                className="h-8 border-slate-800 bg-[#12151F] text-slate-300 hover:bg-[#1A1E2C] text-xs flex items-center gap-1"
              >
                Next Page <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
