import { createCleanReadOnlyServerClient } from "@/lib/supabase/admin";

export interface CensusGradeRow {
  native_grade_text: string;
  grade_numeric: number | null;
  native_designation: string | null;
  count_at_grade: number;
  count_higher: number | null;
  page_quality: string | null;
  has_restoration: boolean | null;
  has_conservation: boolean | null;
  has_signature: boolean | null;
  qualifier: string | null;
  gradingCompany: string;
}

export interface CensusCertification {
  certification_number: string;
  native_grade_text: string | null;
  grade_numeric: number | null;
  native_designation: string | null;
  edition_name: string | null;
  variant_name: string | null;
  page_quality: string | null;
  has_restoration: boolean | null;
  has_conservation: boolean | null;
  has_signature: boolean | null;
  pedigree_name: string | null;
  last_verified_at: string;
  gradingCompany: string;
}

export interface CensusSale {
  sale_date: string | null;
  sale_price: number | null;
  currency: string;
  native_grade_text: string;
  grade_numeric: number | null;
  native_designation: string | null;
  venue: string | null;
  sale_type: string;
  gradingCompany: string;
}

export interface ComicCensusDossier {
  snapshot: {
    title_name: string | null;
    issue_number_raw: string | null;
    edition_name: string | null;
    variant_name: string | null;
    snapshot_timestamp: string;
    source_url: string | null;
    total_graded: number | null;
    gradingCompany: string;
    provider: string;
  };
  grades: CensusGradeRow[];
  certifications: CensusCertification[];
  sales: CensusSale[];
}

type RawCensusRow = Omit<CensusGradeRow, "gradingCompany"> & { grading_company_id: string };
type RawCertification = Omit<CensusCertification, "gradingCompany"> & { grading_company_id: string };
type RawSale = Omit<CensusSale, "gradingCompany"> & { grading_company_id: string };

export async function getComicCensusDossier(series: string, issueNumber: string): Promise<ComicCensusDossier | null> {
  const db = createCleanReadOnlyServerClient();
  const { data: snapshots, error: snapshotError } = await db
    .from("graded_census_snapshots")
    .select("id,title_name,issue_number_raw,edition_name,variant_name,snapshot_timestamp,source_url,total_graded,provider_id,grading_company_id")
    .ilike("title_name", series)
    .eq("issue_number_raw", issueNumber)
    .order("snapshot_timestamp", { ascending: false })
    .limit(1);

  if (snapshotError || !snapshots?.length) return null;
  const snapshot = snapshots[0];
  const [{ data: rows }, { data: certifications }, { data: sales }, { data: providers }] = await Promise.all([
    db.from("graded_census_rows").select("native_grade_text,grade_numeric,native_designation,count_at_grade,count_higher,page_quality,has_restoration,has_conservation,has_signature,qualifier,grading_company_id").eq("snapshot_id", snapshot.id).order("grade_numeric", { ascending: false }),
    db.from("graded_certifications").select("certification_number,native_grade_text,grade_numeric,native_designation,edition_name,variant_name,page_quality,has_restoration,has_conservation,has_signature,pedigree_name,last_verified_at,grading_company_id").eq("title_name", series).eq("issue_number_raw", issueNumber).order("last_verified_at", { ascending: false }).limit(80),
    db.from("graded_sales_observations").select("sale_date,sale_price,currency,native_grade_text,grade_numeric,native_designation,venue,sale_type,grading_company_id").eq("title_name", series).eq("issue_number_raw", issueNumber).order("sale_date", { ascending: false }).limit(80),
    db.from("graded_providers").select("id,name").in("id", [snapshot.provider_id]),
  ]);

  const censusRows = (rows || []) as RawCensusRow[];
  const certificationRows = (certifications || []) as RawCertification[];
  const saleRows = (sales || []) as RawSale[];
  const companyIds = [...new Set([snapshot.grading_company_id, ...censusRows.map((row) => row.grading_company_id), ...certificationRows.map((row) => row.grading_company_id), ...saleRows.map((row) => row.grading_company_id)])];
  const { data: companies } = await db.from("grading_companies").select("id,name").in("id", companyIds);

  const providerName = providers?.[0]?.name || "Unknown provider";
  const companyNames = new Map((companies || []).map((company) => [company.id, company.name]));

  return {
    snapshot: {
      title_name: snapshot.title_name,
      issue_number_raw: snapshot.issue_number_raw,
      edition_name: snapshot.edition_name,
      variant_name: snapshot.variant_name,
      snapshot_timestamp: snapshot.snapshot_timestamp,
      source_url: snapshot.source_url,
      total_graded: snapshot.total_graded,
      gradingCompany: companyNames.get(snapshot.grading_company_id) || "Unknown grader",
      provider: providerName,
    },
    grades: censusRows.map(({ grading_company_id, ...row }) => ({ ...row, gradingCompany: companyNames.get(grading_company_id) || "Unknown grader" })),
    certifications: certificationRows.map(({ grading_company_id, ...row }) => ({ ...row, gradingCompany: companyNames.get(grading_company_id) || "Unknown grader" })),
    sales: saleRows.map(({ grading_company_id, ...row }) => ({ ...row, gradingCompany: companyNames.get(grading_company_id) || "Unknown grader" })),
  };
}

export async function getPpcfCensusDossier(series: string | null, issueNumber: string | null, variantName: string | null): Promise<ComicCensusDossier | null> {
  if (!series || !issueNumber) return null;
  const db = createCleanReadOnlyServerClient();
  const { data: snapshots, error } = await db
    .from("graded_census_snapshots")
    .select("edition_name,variant_name")
    .ilike("title_name", series)
    .eq("issue_number_raw", issueNumber)
    .order("snapshot_timestamp", { ascending: false })
    .limit(12);

  if (error || !snapshots?.length) return null;
  const requestedVariant = variantName?.trim() || null;
  const exactEdition = snapshots.some((snapshot) => {
    const snapshotVariant = snapshot.variant_name?.trim() || null;
    const editionName = snapshot.edition_name?.trim() || null;
    const variantMatches = requestedVariant ? snapshotVariant === requestedVariant : snapshotVariant === null;
    const editionMatches = editionName === null || editionName.toLowerCase() === "regular";
    return variantMatches && editionMatches;
  });
  if (!exactEdition) return null;

  return getComicCensusDossier(series, issueNumber);
}
