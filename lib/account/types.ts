import { ComicRecord } from "@/lib/comics/types";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface CollectionItem {
  id: string;
  collection_id: string;
  user_id: string;
  comic_id: string;
  quantity: number;
  grade: string | null;
  grading_company: string | null;
  certification_number: string | null;
  acquisition_date: string | null;
  acquisition_cost: number | null;
  notes: string | null;
  ownership_status: string;
  created_at: string;
  updated_at: string;
  comic?: ComicRecord | null;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  comic_id: string;
  created_at: string;
  comic?: ComicRecord | null;
}

export interface HoldingsSummary {
  totalOwnedQuantity: number;
  totalAcquisitionCost: number;
  totalBaselineValue: number;
  pricedHoldingsCount: number;
  unpricedHoldingsCount: number;
  dollarGainLoss: number | null;
  percentageGainLoss: number | null;
}
