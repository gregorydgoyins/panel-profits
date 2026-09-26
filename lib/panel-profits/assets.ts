export interface AssetRegistryRecord {
  id: string;
  series: string;
  issue_number: string | null;
  publisher: string | null;
  index_value: number | null;
  source: string | null;
  cover: { image_url: string | null; storage_path: string | null } | null;
}

export interface EquityRegistryRecord {
  id: string;
  variant_id: string;
  anchor_grade: string | null;
  anchor_price_usd: number | null;
  anchor_sales_volume: number | null;
  anchor_confidence: string | null;
  sov_grade: string | null;
  sov_price_usd: number | null;
  asset_class: string | null;
  price_9_9_usd: number | null;
  price_10_0_usd: number | null;
  census_total_graded: number | null;
  census_9_8: number | null;
  census_9_9: number | null;
  census_10_0: number | null;
  scarcity_tier: string | null;
  supply_adjustment: number | null;
  computed_at: string | null;
  comic: null;
}

export async function getAssetRegistry(_limit = 48): Promise<AssetRegistryRecord[]> {
  return [];
}

export async function getEquityRegistry(_limit = 48): Promise<EquityRegistryRecord[]> {
  return [];
}

export async function getCleanEquityDetail(_variantId: string): Promise<null> {
  return null;
}
