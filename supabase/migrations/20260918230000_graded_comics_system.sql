-- =============================================================================
-- Migration: 20260918230000_graded_comics_system.sql
-- Panel Profits Graded-Comics Intelligence System
-- Generalizes gpa_* tables in-place; creates new graded_* tables.
-- NEVER touches public.comics, PP prices, covers, accounts, collections.
-- =============================================================================

-- ─── 1. Providers Registry ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_providers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  base_url      TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.graded_providers (slug, name, base_url) VALUES
  ('gpa',          'GPAnalysis',    'https://comics.gpanalysis.com'),
  ('gocollect',    'GoCollect',     'https://gocollect.com'),
  ('cbcs',         'CBCS Comics',   'https://www.cbcscomics.com'),
  ('psa',          'PSA',           'https://www.psacard.com'),
  ('pricecharting','PriceCharting', 'https://www.pricecharting.com')
ON CONFLICT (slug) DO NOTHING;

-- ─── 2. Grading Companies Registry ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.grading_companies (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  full_name     TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.grading_companies (slug, name, full_name) VALUES
  ('cgc',  'CGC',  'Comics Guaranty Company'),
  ('cbcs', 'CBCS', 'Comic Book Certification Service'),
  ('psa',  'PSA',  'Professional Sports Authenticator'),
  ('pgx',  'PGX',  'Professional Grading eXperts'),
  ('raw',  'Raw',  'Raw / Ungraded')
ON CONFLICT (slug) DO NOTHING;

-- ─── 3. Grade Scales ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_grade_scales (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_company_id  UUID NOT NULL REFERENCES public.grading_companies(id),
  scale_name          TEXT NOT NULL,
  min_value           NUMERIC(5,1),
  max_value           NUMERIC(5,1),
  step                NUMERIC(5,2),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_grade_scale_company_name UNIQUE (grading_company_id, scale_name)
);

-- ─── 4. Designations Vocabulary ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_designations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_company_id  UUID NOT NULL REFERENCES public.grading_companies(id),
  native_code         TEXT NOT NULL,
  native_label        TEXT NOT NULL,
  canonical_category  TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_designation_company_code UNIQUE (grading_company_id, native_code)
);

-- ─── 5. Add provider columns to gpa_titles ───────────────────────────────────
ALTER TABLE public.gpa_titles
  ADD COLUMN IF NOT EXISTS provider_id         UUID REFERENCES public.graded_providers(id),
  ADD COLUMN IF NOT EXISTS provider_native_id  TEXT,
  ADD COLUMN IF NOT EXISTS series_name         TEXT,
  ADD COLUMN IF NOT EXISTS first_issue_year    INTEGER,
  ADD COLUMN IF NOT EXISTS is_active           BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS gpa_titles_provider_id_idx ON public.gpa_titles (provider_id);

-- ─── 6. Add provider columns to gpa_issues ───────────────────────────────────
ALTER TABLE public.gpa_issues
  ADD COLUMN IF NOT EXISTS provider_id              UUID REFERENCES public.graded_providers(id),
  ADD COLUMN IF NOT EXISTS provider_native_issue_id TEXT,
  ADD COLUMN IF NOT EXISTS volume_number            INTEGER,
  ADD COLUMN IF NOT EXISTS printing_number          INTEGER,
  ADD COLUMN IF NOT EXISTS publication_year         INTEGER,
  ADD COLUMN IF NOT EXISTS publication_month        INTEGER,
  ADD COLUMN IF NOT EXISTS cover_price_text         TEXT,
  ADD COLUMN IF NOT EXISTS page_count               INTEGER,
  ADD COLUMN IF NOT EXISTS is_key_issue             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS key_issue_description    TEXT;
CREATE INDEX IF NOT EXISTS gpa_issues_provider_id_idx ON public.gpa_issues (provider_id);

-- ─── 7. Add provider/grader columns to gpa_editions ──────────────────────────
ALTER TABLE public.gpa_editions
  ADD COLUMN IF NOT EXISTS provider_id          UUID REFERENCES public.graded_providers(id),
  ADD COLUMN IF NOT EXISTS grading_company_id   UUID REFERENCES public.grading_companies(id),
  ADD COLUMN IF NOT EXISTS provider_serial      TEXT,
  ADD COLUMN IF NOT EXISTS native_designation   TEXT,
  ADD COLUMN IF NOT EXISTS native_grade_text    TEXT,
  ADD COLUMN IF NOT EXISTS grade_numeric        NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS pedigree_name        TEXT,
  ADD COLUMN IF NOT EXISTS page_quality         TEXT,
  ADD COLUMN IF NOT EXISTS has_restoration      BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_conservation     BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_signature        BOOLEAN,
  ADD COLUMN IF NOT EXISTS census_total         INTEGER,
  ADD COLUMN IF NOT EXISTS census_higher        INTEGER,
  ADD COLUMN IF NOT EXISTS last_snapshot_at     TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS gpa_editions_provider_id_idx        ON public.gpa_editions (provider_id);
CREATE INDEX IF NOT EXISTS gpa_editions_grading_company_id_idx ON public.gpa_editions (grading_company_id);
CREATE INDEX IF NOT EXISTS gpa_editions_provider_serial_idx    ON public.gpa_editions (provider_serial);

-- ─── 8. Add provider/grader columns to gpa_grade_summaries ───────────────────
ALTER TABLE public.gpa_grade_summaries
  ADD COLUMN IF NOT EXISTS provider_id          UUID REFERENCES public.graded_providers(id),
  ADD COLUMN IF NOT EXISTS grading_company_id   UUID REFERENCES public.grading_companies(id),
  ADD COLUMN IF NOT EXISTS native_designation   TEXT,
  ADD COLUMN IF NOT EXISTS native_grade_text    TEXT,
  ADD COLUMN IF NOT EXISTS grade_numeric        NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS observation_type     TEXT NOT NULL DEFAULT 'market_summary',
  ADD COLUMN IF NOT EXISTS observed_at          TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS gpa_grade_summaries_provider_id_idx ON public.gpa_grade_summaries (provider_id);

-- ─── 9. Add provider/grader columns to gpa_yearly_aggregates ─────────────────
ALTER TABLE public.gpa_yearly_aggregates
  ADD COLUMN IF NOT EXISTS provider_id         UUID REFERENCES public.graded_providers(id),
  ADD COLUMN IF NOT EXISTS grading_company_id  UUID REFERENCES public.grading_companies(id),
  ADD COLUMN IF NOT EXISTS native_grade_text   TEXT,
  ADD COLUMN IF NOT EXISTS native_designation  TEXT,
  ADD COLUMN IF NOT EXISTS observed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS raw_evidence_id     UUID;
CREATE INDEX IF NOT EXISTS gpa_yearly_aggregates_provider_id_idx ON public.gpa_yearly_aggregates (provider_id);

-- ─── 10. Add provider/grader columns to gpa_sales_observations ───────────────
ALTER TABLE public.gpa_sales_observations
  ADD COLUMN IF NOT EXISTS provider_id         UUID REFERENCES public.graded_providers(id),
  ADD COLUMN IF NOT EXISTS grading_company_id  UUID REFERENCES public.grading_companies(id),
  ADD COLUMN IF NOT EXISTS native_grade_text   TEXT,
  ADD COLUMN IF NOT EXISTS native_designation  TEXT,
  ADD COLUMN IF NOT EXISTS origin              TEXT,
  ADD COLUMN IF NOT EXISTS sale_type           TEXT NOT NULL DEFAULT 'completed_sale',
  ADD COLUMN IF NOT EXISTS link_id             TEXT,
  ADD COLUMN IF NOT EXISTS provider_sale_id    TEXT,
  ADD COLUMN IF NOT EXISTS raw_evidence_id     UUID,
  ADD COLUMN IF NOT EXISTS observed_at         TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS gpa_sales_observations_provider_id_idx ON public.gpa_sales_observations (provider_id);

-- ─── 11. Add provider columns to gpa_comic_matches ───────────────────────────
ALTER TABLE public.gpa_comic_matches
  ADD COLUMN IF NOT EXISTS provider_id         UUID REFERENCES public.graded_providers(id),
  ADD COLUMN IF NOT EXISTS grading_company_id  UUID REFERENCES public.grading_companies(id),
  ADD COLUMN IF NOT EXISTS match_layer         TEXT NOT NULL DEFAULT 'provider';
CREATE INDEX IF NOT EXISTS gpa_comic_matches_provider_id_idx ON public.gpa_comic_matches (provider_id);

-- ─── 12. Raw Source Payloads ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_source_payloads (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id          UUID        NOT NULL REFERENCES public.graded_providers(id),
  grading_company_id   UUID        REFERENCES public.grading_companies(id),
  source_url           TEXT        NOT NULL,
  http_method          TEXT        NOT NULL DEFAULT 'GET',
  request_body_hash    TEXT,
  request_fingerprint  TEXT,
  response_hash        TEXT        NOT NULL,
  http_status          INTEGER     NOT NULL,
  content_type         TEXT,
  raw_json             JSONB,
  raw_text             TEXT,
  collection_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_as_of         TIMESTAMPTZ,
  extraction_version   TEXT        NOT NULL DEFAULT '1.0.0',
  completeness_status  TEXT        NOT NULL DEFAULT 'complete',
  transformation_warnings JSONB,
  parent_payload_id    UUID        REFERENCES public.graded_source_payloads(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS graded_source_payloads_provider_idx  ON public.graded_source_payloads (provider_id);
CREATE INDEX IF NOT EXISTS graded_source_payloads_hash_idx      ON public.graded_source_payloads (response_hash);
CREATE INDEX IF NOT EXISTS graded_source_payloads_url_idx       ON public.graded_source_payloads (source_url);

-- ─── 13. Ingestion Runs ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_ingestion_runs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id       UUID        NOT NULL REFERENCES public.graded_providers(id),
  grading_company_id UUID       REFERENCES public.grading_companies(id),
  run_type          TEXT        NOT NULL DEFAULT 'full',
  status            TEXT        NOT NULL DEFAULT 'running',
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  items_discovered  INTEGER     NOT NULL DEFAULT 0,
  items_extracted   INTEGER     NOT NULL DEFAULT 0,
  items_ingested    INTEGER     NOT NULL DEFAULT 0,
  items_errored     INTEGER     NOT NULL DEFAULT 0,
  items_skipped     INTEGER     NOT NULL DEFAULT 0,
  last_checkpoint   JSONB,
  error_summary     TEXT,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS graded_ingestion_runs_provider_idx ON public.graded_ingestion_runs (provider_id);
CREATE INDEX IF NOT EXISTS graded_ingestion_runs_status_idx   ON public.graded_ingestion_runs (status);

-- ─── 14. Ingestion Targets (durable queue) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_ingestion_targets (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID        REFERENCES public.graded_ingestion_runs(id),
  provider_id       UUID        NOT NULL REFERENCES public.graded_providers(id),
  target_type       TEXT        NOT NULL,
  target_url        TEXT,
  provider_native_id TEXT,
  parent_target_id  UUID        REFERENCES public.graded_ingestion_targets(id),
  status            TEXT        NOT NULL DEFAULT 'discovered',
  priority          INTEGER     NOT NULL DEFAULT 50,
  retry_count       INTEGER     NOT NULL DEFAULT 0,
  max_retries       INTEGER     NOT NULL DEFAULT 3,
  last_error        TEXT,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS graded_ingestion_targets_provider_idx ON public.graded_ingestion_targets (provider_id);
CREATE INDEX IF NOT EXISTS graded_ingestion_targets_status_idx   ON public.graded_ingestion_targets (status);
CREATE INDEX IF NOT EXISTS graded_ingestion_targets_run_idx      ON public.graded_ingestion_targets (run_id);

-- ─── 15. Ingestion Checkpoints ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_ingestion_checkpoints (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id       UUID        NOT NULL REFERENCES public.graded_providers(id),
  run_id            UUID        REFERENCES public.graded_ingestion_runs(id),
  checkpoint_level  TEXT        NOT NULL,
  checkpoint_key    TEXT        NOT NULL,
  checkpoint_data   JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_graded_checkpoint_provider_level_key UNIQUE (provider_id, checkpoint_level, checkpoint_key)
);
CREATE INDEX IF NOT EXISTS graded_ingestion_checkpoints_provider_idx ON public.graded_ingestion_checkpoints (provider_id);

-- ─── 16. Ingestion Errors ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_ingestion_errors (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id       UUID        NOT NULL REFERENCES public.graded_providers(id),
  run_id            UUID        REFERENCES public.graded_ingestion_runs(id),
  target_id         UUID        REFERENCES public.graded_ingestion_targets(id),
  error_code        TEXT,
  error_message     TEXT        NOT NULL,
  error_context     JSONB,
  is_retryable      BOOLEAN     NOT NULL DEFAULT true,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS graded_ingestion_errors_provider_idx ON public.graded_ingestion_errors (provider_id);
CREATE INDEX IF NOT EXISTS graded_ingestion_errors_run_idx      ON public.graded_ingestion_errors (run_id);

-- ─── 17. Census Snapshots (append-only) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_census_snapshots (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id          UUID        NOT NULL REFERENCES public.graded_providers(id),
  grading_company_id   UUID        NOT NULL REFERENCES public.grading_companies(id),
  provider_title_id    TEXT,
  provider_issue_id    TEXT,
  provider_edition_id  TEXT,
  title_name           TEXT,
  issue_number_raw     TEXT,
  edition_name         TEXT,
  variant_name         TEXT,
  snapshot_timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_graded         INTEGER,
  source_url           TEXT,
  raw_evidence_id      UUID        REFERENCES public.graded_source_payloads(id),
  metadata             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS graded_census_snapshots_provider_idx  ON public.graded_census_snapshots (provider_id);
CREATE INDEX IF NOT EXISTS graded_census_snapshots_grader_idx    ON public.graded_census_snapshots (grading_company_id);
CREATE INDEX IF NOT EXISTS graded_census_snapshots_timestamp_idx ON public.graded_census_snapshots (snapshot_timestamp);

-- ─── 18. Census Rows (grade-level counts, append-only) ───────────────────────
CREATE TABLE IF NOT EXISTS public.graded_census_rows (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id          UUID        NOT NULL REFERENCES public.graded_census_snapshots(id),
  provider_id          UUID        NOT NULL REFERENCES public.graded_providers(id),
  grading_company_id   UUID        NOT NULL REFERENCES public.grading_companies(id),
  native_grade_text    TEXT        NOT NULL,
  grade_numeric        NUMERIC(5,1),
  native_designation   TEXT,
  count_at_grade       INTEGER     NOT NULL DEFAULT 0,
  count_higher         INTEGER,
  page_quality         TEXT,
  has_restoration      BOOLEAN,
  has_conservation     BOOLEAN,
  has_signature        BOOLEAN,
  qualifier            TEXT,
  raw_evidence_id      UUID        REFERENCES public.graded_source_payloads(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS graded_census_rows_snapshot_idx ON public.graded_census_rows (snapshot_id);
CREATE INDEX IF NOT EXISTS graded_census_rows_provider_idx ON public.graded_census_rows (provider_id);
CREATE INDEX IF NOT EXISTS graded_census_rows_grade_idx    ON public.graded_census_rows (grade_numeric);

-- ─── 19. Market Summaries (for non-GPA providers) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_market_summaries (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id          UUID        NOT NULL REFERENCES public.graded_providers(id),
  grading_company_id   UUID        NOT NULL REFERENCES public.grading_companies(id),
  snapshot_id          UUID        REFERENCES public.graded_census_snapshots(id),
  provider_title_id    TEXT,
  provider_issue_id    TEXT,
  provider_edition_id  TEXT,
  title_name           TEXT,
  issue_number_raw     TEXT,
  edition_name         TEXT,
  native_grade_text    TEXT        NOT NULL,
  grade_numeric        NUMERIC(5,1),
  native_designation   TEXT,
  observation_type     TEXT        NOT NULL DEFAULT 'market_summary',
  period_label         TEXT,
  avg_price            NUMERIC(14,2),
  high_price           NUMERIC(14,2),
  low_price            NUMERIC(14,2),
  count_sales          INTEGER,
  currency             TEXT        NOT NULL DEFAULT 'USD',
  source_url           TEXT,
  raw_evidence_id      UUID        REFERENCES public.graded_source_payloads(id),
  observed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS graded_market_summaries_provider_idx ON public.graded_market_summaries (provider_id);
CREATE INDEX IF NOT EXISTS graded_market_summaries_grader_idx   ON public.graded_market_summaries (grading_company_id);
CREATE INDEX IF NOT EXISTS graded_market_summaries_grade_idx    ON public.graded_market_summaries (grade_numeric);

-- ─── 20. Yearly Aggregates (for non-GPA providers) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_yearly_aggregates (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id          UUID        NOT NULL REFERENCES public.graded_providers(id),
  grading_company_id   UUID        NOT NULL REFERENCES public.grading_companies(id),
  provider_title_id    TEXT,
  provider_issue_id    TEXT,
  provider_serial      TEXT,
  title_name           TEXT,
  issue_number_raw     TEXT,
  edition_name         TEXT,
  native_grade_text    TEXT        NOT NULL,
  grade_numeric        NUMERIC(5,1),
  native_designation   TEXT,
  year                 INTEGER     NOT NULL,
  count_sold           INTEGER     NOT NULL DEFAULT 0,
  high_price           NUMERIC(14,2),
  low_price            NUMERIC(14,2),
  avg_price            NUMERIC(14,2),
  currency             TEXT        NOT NULL DEFAULT 'USD',
  raw_evidence_id      UUID        REFERENCES public.graded_source_payloads(id),
  observed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS graded_yearly_aggregates_provider_idx ON public.graded_yearly_aggregates (provider_id);
CREATE INDEX IF NOT EXISTS graded_yearly_aggregates_year_idx     ON public.graded_yearly_aggregates (year);

-- ─── 21. Sales Observations (for non-GPA providers, append-only) ─────────────
CREATE TABLE IF NOT EXISTS public.graded_sales_observations (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_fingerprint TEXT     NOT NULL UNIQUE,
  provider_id          UUID        NOT NULL REFERENCES public.graded_providers(id),
  grading_company_id   UUID        NOT NULL REFERENCES public.grading_companies(id),
  provider_title_id    TEXT,
  provider_issue_id    TEXT,
  provider_serial      TEXT,
  provider_sale_id     TEXT,
  title_name           TEXT,
  issue_number_raw     TEXT,
  edition_name         TEXT,
  native_grade_text    TEXT        NOT NULL,
  grade_numeric        NUMERIC(5,1),
  native_designation   TEXT,
  sale_date_text       TEXT,
  sale_date            DATE,
  sale_year            INTEGER,
  sale_price           NUMERIC(14,2),
  currency             TEXT        NOT NULL DEFAULT 'USD',
  venue                TEXT,
  sale_type            TEXT        NOT NULL DEFAULT 'completed_sale',
  certification_number TEXT,
  evidence_path        TEXT,
  evidence_url_status  TEXT        NOT NULL DEFAULT 'UNRESOLVED_REDIRECT',
  page_quality         TEXT,
  has_restoration      BOOLEAN,
  has_signature        BOOLEAN,
  pedigree_name        TEXT,
  raw_evidence_id      UUID        REFERENCES public.graded_source_payloads(id),
  observed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS graded_sales_observations_provider_idx ON public.graded_sales_observations (provider_id);
CREATE INDEX IF NOT EXISTS graded_sales_observations_grade_idx    ON public.graded_sales_observations (grade_numeric);
CREATE INDEX IF NOT EXISTS graded_sales_observations_date_idx     ON public.graded_sales_observations (sale_date);
CREATE INDEX IF NOT EXISTS graded_sales_observations_cert_idx     ON public.graded_sales_observations (certification_number);
CREATE INDEX IF NOT EXISTS graded_sales_observations_fp_idx       ON public.graded_sales_observations (observation_fingerprint);

-- ─── 22. Certifications ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_certifications (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_company_id   UUID        NOT NULL REFERENCES public.grading_companies(id),
  provider_id          UUID        REFERENCES public.graded_providers(id),
  certification_number TEXT        NOT NULL,
  provider_title_id    TEXT,
  provider_issue_id    TEXT,
  title_name           TEXT,
  issue_number_raw     TEXT,
  edition_name         TEXT,
  variant_name         TEXT,
  native_grade_text    TEXT,
  grade_numeric        NUMERIC(5,1),
  native_designation   TEXT,
  page_quality         TEXT,
  has_restoration      BOOLEAN,
  restoration_detail   TEXT,
  has_conservation     BOOLEAN,
  conservation_detail  TEXT,
  has_signature        BOOLEAN,
  pedigree_name        TEXT,
  grader_notes         TEXT,
  asp_status           BOOLEAN,
  vsp_status           BOOLEAN,
  qualifier            TEXT,
  autograph_status     TEXT,
  provenance_notes     TEXT,
  cert_url             TEXT,
  raw_evidence_id      UUID        REFERENCES public.graded_source_payloads(id),
  first_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_certification_grader_number UNIQUE (grading_company_id, certification_number)
);
CREATE INDEX IF NOT EXISTS graded_certifications_grader_idx ON public.graded_certifications (grading_company_id);
CREATE INDEX IF NOT EXISTS graded_certifications_cert_idx   ON public.graded_certifications (certification_number);
CREATE INDEX IF NOT EXISTS graded_certifications_grade_idx  ON public.graded_certifications (grade_numeric);

-- ─── 23. Certification Signatures ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_certification_signatures (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id  UUID        NOT NULL REFERENCES public.graded_certifications(id),
  signer_name       TEXT        NOT NULL,
  signature_date    DATE,
  signature_type    TEXT,
  authentication    TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS graded_cert_signatures_cert_idx ON public.graded_certification_signatures (certification_id);

-- ─── 24. Source Disagreements ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_source_disagreements (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  disagreement_type     TEXT        NOT NULL,
  provider_a_id         UUID        NOT NULL REFERENCES public.graded_providers(id),
  provider_b_id         UUID        NOT NULL REFERENCES public.graded_providers(id),
  grading_company_id    UUID        REFERENCES public.grading_companies(id),
  title_name            TEXT,
  issue_number_raw      TEXT,
  native_grade_text     TEXT,
  value_a               TEXT        NOT NULL,
  value_b               TEXT        NOT NULL,
  difference_pct        NUMERIC(8,4),
  resolution_status     TEXT        NOT NULL DEFAULT 'open',
  resolution_notes      TEXT,
  raw_evidence_a_id     UUID        REFERENCES public.graded_source_payloads(id),
  raw_evidence_b_id     UUID        REFERENCES public.graded_source_payloads(id),
  detected_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS graded_disagreements_type_idx   ON public.graded_source_disagreements (disagreement_type);
CREATE INDEX IF NOT EXISTS graded_disagreements_status_idx ON public.graded_source_disagreements (resolution_status);

-- ─── 25. Index Definitions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_index_definitions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id       UUID        NOT NULL REFERENCES public.graded_providers(id),
  provider_index_id TEXT        NOT NULL,
  index_name        TEXT        NOT NULL,
  index_type        TEXT        NOT NULL DEFAULT 'cpi',
  description       TEXT,
  methodology       TEXT,
  currency          TEXT        NOT NULL DEFAULT 'USD',
  first_published   DATE,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_index_def_provider_id UNIQUE (provider_id, provider_index_id)
);

-- ─── 26. Index Constituents ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_index_constituents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  index_id          UUID        NOT NULL REFERENCES public.graded_index_definitions(id),
  provider_id       UUID        NOT NULL REFERENCES public.graded_providers(id),
  grading_company_id UUID       REFERENCES public.grading_companies(id),
  provider_title_id TEXT,
  provider_issue_id TEXT,
  title_name        TEXT,
  issue_number_raw  TEXT,
  native_grade_text TEXT,
  grade_numeric     NUMERIC(5,1),
  native_designation TEXT,
  weight            NUMERIC(10,6),
  methodology_notes TEXT,
  added_at          DATE,
  removed_at        DATE,
  raw_evidence_id   UUID        REFERENCES public.graded_source_payloads(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS graded_index_constituents_index_idx ON public.graded_index_constituents (index_id);

-- ─── 27. Index Observations (append-only) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.graded_index_observations (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  index_id               UUID        NOT NULL REFERENCES public.graded_index_definitions(id),
  provider_id            UUID        NOT NULL REFERENCES public.graded_providers(id),
  observation_date       DATE        NOT NULL,
  published_at           TIMESTAMPTZ,
  index_value            NUMERIC(14,4) NOT NULL,
  point_change           NUMERIC(14,4),
  pct_change             NUMERIC(8,4),
  time_horizon           TEXT,
  supersedes_id          UUID        REFERENCES public.graded_index_observations(id),
  is_revision            BOOLEAN     NOT NULL DEFAULT false,
  source_url             TEXT,
  raw_evidence_id        UUID        REFERENCES public.graded_source_payloads(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_index_observation_date_revision UNIQUE (index_id, observation_date, is_revision)
);
CREATE INDEX IF NOT EXISTS graded_index_observations_index_idx ON public.graded_index_observations (index_id);
CREATE INDEX IF NOT EXISTS graded_index_observations_date_idx  ON public.graded_index_observations (observation_date);

-- ─── 28. Backfill existing GPA rows with provider/grader IDs ─────────────────
UPDATE public.gpa_titles SET provider_id = (SELECT id FROM public.graded_providers WHERE slug = 'gpa') WHERE provider_id IS NULL;
UPDATE public.gpa_issues SET provider_id = (SELECT id FROM public.graded_providers WHERE slug = 'gpa') WHERE provider_id IS NULL;
UPDATE public.gpa_editions SET
  provider_id = (SELECT id FROM public.graded_providers WHERE slug = 'gpa'),
  grading_company_id = (SELECT id FROM public.grading_companies WHERE slug = 'cgc')
WHERE provider_id IS NULL;
UPDATE public.gpa_grade_summaries SET
  provider_id = (SELECT id FROM public.graded_providers WHERE slug = 'gpa'),
  grading_company_id = (SELECT id FROM public.grading_companies WHERE slug = 'cgc')
WHERE provider_id IS NULL;
UPDATE public.gpa_yearly_aggregates SET
  provider_id = (SELECT id FROM public.graded_providers WHERE slug = 'gpa'),
  grading_company_id = (SELECT id FROM public.grading_companies WHERE slug = 'cgc')
WHERE provider_id IS NULL;
UPDATE public.gpa_sales_observations SET
  provider_id = (SELECT id FROM public.graded_providers WHERE slug = 'gpa'),
  grading_company_id = (SELECT id FROM public.grading_companies WHERE slug = 'cgc')
WHERE provider_id IS NULL;
UPDATE public.gpa_comic_matches SET
  provider_id = (SELECT id FROM public.graded_providers WHERE slug = 'gpa'),
  grading_company_id = (SELECT id FROM public.grading_companies WHERE slug = 'cgc')
WHERE provider_id IS NULL;

-- ─── 29. RLS + Grants for new tables ─────────────────────────────────────────
ALTER TABLE public.graded_providers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_companies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_grade_scales           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_designations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_source_payloads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_ingestion_runs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_ingestion_targets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_ingestion_checkpoints  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_ingestion_errors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_census_snapshots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_census_rows            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_market_summaries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_yearly_aggregates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_sales_observations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_certifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_certification_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_source_disagreements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_index_definitions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_index_constituents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_index_observations     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_graded_providers"   ON public.graded_providers   FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_grading_companies"  ON public.grading_companies  FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_graded_source_payloads" ON public.graded_source_payloads FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_graded_ingestion_runs" ON public.graded_ingestion_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_graded_census_snapshots" ON public.graded_census_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_graded_census_rows" ON public.graded_census_rows FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_graded_market_summaries" ON public.graded_market_summaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_graded_yearly_aggregates" ON public.graded_yearly_aggregates FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_graded_sales_observations" ON public.graded_sales_observations FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_graded_certifications" ON public.graded_certifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_graded_source_disagreements" ON public.graded_source_disagreements FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_graded_index_definitions" ON public.graded_index_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_graded_index_observations" ON public.graded_index_observations FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.graded_providers TO authenticated;
GRANT SELECT ON public.grading_companies TO authenticated;
GRANT SELECT ON public.graded_census_snapshots TO authenticated;
GRANT SELECT ON public.graded_census_rows TO authenticated;
GRANT SELECT ON public.graded_market_summaries TO authenticated;
GRANT SELECT ON public.graded_yearly_aggregates TO authenticated;
GRANT SELECT ON public.graded_sales_observations TO authenticated;
GRANT SELECT ON public.graded_certifications TO authenticated;
GRANT SELECT ON public.graded_index_definitions TO authenticated;
GRANT SELECT ON public.graded_index_observations TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.graded_providers TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.grading_companies TO service_role;
GRANT SELECT, INSERT ON public.graded_source_payloads TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.graded_ingestion_runs TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.graded_ingestion_targets TO service_role;
GRANT SELECT, INSERT ON public.graded_ingestion_checkpoints TO service_role;
GRANT SELECT, INSERT ON public.graded_ingestion_errors TO service_role;
GRANT SELECT, INSERT ON public.graded_census_snapshots TO service_role;
GRANT SELECT, INSERT ON public.graded_census_rows TO service_role;
GRANT SELECT, INSERT ON public.graded_market_summaries TO service_role;
GRANT SELECT, INSERT ON public.graded_yearly_aggregates TO service_role;
GRANT SELECT, INSERT ON public.graded_sales_observations TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.graded_certifications TO service_role;
GRANT SELECT, INSERT ON public.graded_certification_signatures TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.graded_source_disagreements TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.graded_index_definitions TO service_role;
GRANT SELECT, INSERT ON public.graded_index_constituents TO service_role;
GRANT SELECT, INSERT ON public.graded_index_observations TO service_role;
