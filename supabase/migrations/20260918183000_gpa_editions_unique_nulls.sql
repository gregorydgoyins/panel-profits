-- Migration: 20260918183000_gpa_editions_unique_nulls.sql
-- Description: Enforce uniqueness on gpa_editions for (gpa_issue_id, edition_name, variant_name) when variant_name is NULL.

CREATE UNIQUE INDEX IF NOT EXISTS uq_gpa_editions_issue_variant_nulls_idx 
ON public.gpa_editions (gpa_issue_id, edition_name, COALESCE(variant_name, ''));
