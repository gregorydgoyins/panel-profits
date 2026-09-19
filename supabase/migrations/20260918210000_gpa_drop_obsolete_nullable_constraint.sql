-- Migration: 20260918210000_gpa_drop_obsolete_nullable_constraint.sql
-- Description: Drop the obsolete UNIQUE constraint on gpa_editions that treated
--              NULL variant_name as distinct (allowing duplicates), now that the
--              replacement partial index (uq_gpa_editions_issue_variant_nulls_idx)
--              is in place and enforces uniqueness correctly via COALESCE.

ALTER TABLE public.gpa_editions
  DROP CONSTRAINT IF EXISTS uq_gpa_editions_issue_variant;
