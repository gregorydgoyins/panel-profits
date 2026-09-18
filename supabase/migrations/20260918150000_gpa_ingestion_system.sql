-- Migration: 20260918150000_gpa_ingestion_system.sql
-- Description: Production GPA Authenticated-Browser Ingestion and Matching Schema for Panel Profits

-- 1. GPA Titles Table (Stage 1 Discovery)
CREATE TABLE IF NOT EXISTS public.gpa_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gpa_title_id INTEGER NOT NULL UNIQUE,
  title_name TEXT NOT NULL,
  publisher TEXT,
  publication_year INTEGER,
  raw_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gpa_titles_name_idx ON public.gpa_titles (title_name);
CREATE INDEX IF NOT EXISTS gpa_titles_gpa_title_id_idx ON public.gpa_titles (gpa_title_id);

-- 2. GPA Issues Table
CREATE TABLE IF NOT EXISTS public.gpa_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gpa_title_id INTEGER NOT NULL REFERENCES public.gpa_titles(gpa_title_id) ON DELETE CASCADE,
  gpa_issue_id INTEGER NOT NULL,
  issue_number_raw TEXT NOT NULL,
  gpa_url TEXT NOT NULL,
  raw_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_gpa_issues_title_issue UNIQUE (gpa_title_id, gpa_issue_id)
);

CREATE INDEX IF NOT EXISTS gpa_issues_title_id_idx ON public.gpa_issues (gpa_title_id);
CREATE INDEX IF NOT EXISTS gpa_issues_gpa_url_idx ON public.gpa_issues (gpa_url);
CREATE INDEX IF NOT EXISTS gpa_issues_issue_number_idx ON public.gpa_issues (issue_number_raw);

-- 3. GPA Editions Table (Variants, Foreign, Reprints, Pedigrees)
CREATE TABLE IF NOT EXISTS public.gpa_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gpa_issue_id UUID NOT NULL REFERENCES public.gpa_issues(id) ON DELETE CASCADE,
  edition_name TEXT NOT NULL DEFAULT 'Regular',
  variant_name TEXT,
  is_regular_edition BOOLEAN NOT NULL DEFAULT true,
  raw_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_gpa_editions_issue_variant UNIQUE (gpa_issue_id, edition_name, variant_name)
);

CREATE INDEX IF NOT EXISTS gpa_editions_issue_id_idx ON public.gpa_editions (gpa_issue_id);

-- 4. GPA Grade Summaries Table (Top-level Grade Row: e.g. CGC UNI 7.0)
CREATE TABLE IF NOT EXISTS public.gpa_grade_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gpa_edition_id UUID NOT NULL REFERENCES public.gpa_editions(id) ON DELETE CASCADE,
  grader TEXT NOT NULL,
  grade TEXT NOT NULL,
  designation TEXT NOT NULL,
  serial TEXT,
  avg_2024 NUMERIC(12, 2),
  avg_2025 NUMERIC(12, 2),
  avg_12m NUMERIC(12, 2),
  avg_90d NUMERIC(12, 2),
  last_sale_price NUMERIC(12, 2),
  last_sale_date DATE,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_gpa_grade_summaries_edition_grade UNIQUE (gpa_edition_id, grader, grade, designation)
);

CREATE INDEX IF NOT EXISTS gpa_grade_summaries_edition_id_idx ON public.gpa_grade_summaries (gpa_edition_id);
CREATE INDEX IF NOT EXISTS gpa_grade_summaries_grade_idx ON public.gpa_grade_summaries (grade);
CREATE INDEX IF NOT EXISTS gpa_grade_summaries_grader_idx ON public.gpa_grade_summaries (grader);

-- 5. GPA Yearly Aggregates Table (Expanded Yearly Row: e.g. 2025 under UNI 7.0)
CREATE TABLE IF NOT EXISTS public.gpa_yearly_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gpa_grade_summary_id UUID NOT NULL REFERENCES public.gpa_grade_summaries(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  count_sold INTEGER NOT NULL DEFAULT 0,
  high_price NUMERIC(12, 2),
  low_price NUMERIC(12, 2),
  avg_price NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_gpa_yearly_aggregates_summary_year UNIQUE (gpa_grade_summary_id, year)
);

CREATE INDEX IF NOT EXISTS gpa_yearly_aggregates_summary_id_idx ON public.gpa_yearly_aggregates (gpa_grade_summary_id);
CREATE INDEX IF NOT EXISTS gpa_yearly_aggregates_year_idx ON public.gpa_yearly_aggregates (year);

-- 6. GPA Sales Observations Table (Append-only Individual Transactions)
CREATE TABLE IF NOT EXISTS public.gpa_sales_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_fingerprint TEXT NOT NULL UNIQUE,
  gpa_yearly_aggregate_id UUID REFERENCES public.gpa_yearly_aggregates(id) ON DELETE SET NULL,
  gpa_grade_summary_id UUID REFERENCES public.gpa_grade_summaries(id) ON DELETE SET NULL,
  gpa_edition_id UUID REFERENCES public.gpa_editions(id) ON DELETE SET NULL,
  gpa_issue_id UUID REFERENCES public.gpa_issues(id) ON DELETE SET NULL,
  gpa_title_id INTEGER,
  displayed_date_text TEXT NOT NULL,
  observed_year INTEGER NOT NULL,
  observed_month INTEGER,
  observed_day INTEGER,
  observed_date DATE,
  date_precision TEXT NOT NULL DEFAULT 'DAY',
  displayed_price_text TEXT NOT NULL,
  parsed_numeric_price NUMERIC(14, 2) NOT NULL,
  displayed_currency_symbol TEXT NOT NULL DEFAULT '$',
  normalized_currency TEXT,
  certification_number TEXT,
  grader TEXT NOT NULL,
  grade TEXT NOT NULL,
  designation TEXT NOT NULL,
  edition_variant TEXT,
  venue TEXT DEFAULT NULL,
  evidence_redirect_path TEXT,
  evidence_url_status TEXT NOT NULL DEFAULT 'UNRESOLVED_REDIRECT',
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gpa_sales_observations_fingerprint_idx ON public.gpa_sales_observations (observation_fingerprint);
CREATE INDEX IF NOT EXISTS gpa_sales_observations_issue_id_idx ON public.gpa_sales_observations (gpa_issue_id);
CREATE INDEX IF NOT EXISTS gpa_sales_observations_grade_idx ON public.gpa_sales_observations (grade);
CREATE INDEX IF NOT EXISTS gpa_sales_observations_observed_date_idx ON public.gpa_sales_observations (observed_date);
CREATE INDEX IF NOT EXISTS gpa_sales_observations_cert_idx ON public.gpa_sales_observations (certification_number);

-- 7. GPA Comic Matches Table (Stage 2 Matching & Staging)
CREATE TABLE IF NOT EXISTS public.gpa_comic_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gpa_issue_id UUID NOT NULL REFERENCES public.gpa_issues(id) ON DELETE CASCADE,
  gpa_edition_id UUID REFERENCES public.gpa_editions(id) ON DELETE CASCADE,
  proposed_comic_id TEXT NOT NULL REFERENCES public.comics(id) ON DELETE CASCADE,
  match_method TEXT NOT NULL,
  match_confidence NUMERIC(4, 3) NOT NULL,
  match_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (match_status IN ('AUTO_MATCHED', 'PENDING_REVIEW', 'CONFIRMED', 'REJECTED')),
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_gpa_comic_matches_issue_comic UNIQUE (gpa_issue_id, proposed_comic_id)
);

CREATE INDEX IF NOT EXISTS gpa_comic_matches_issue_id_idx ON public.gpa_comic_matches (gpa_issue_id);
CREATE INDEX IF NOT EXISTS gpa_comic_matches_comic_id_idx ON public.gpa_comic_matches (proposed_comic_id);
CREATE INDEX IF NOT EXISTS gpa_comic_matches_status_idx ON public.gpa_comic_matches (match_status);

-- Automatic Timestamp Triggers
DROP TRIGGER IF EXISTS set_gpa_titles_updated_at ON public.gpa_titles;
CREATE TRIGGER set_gpa_titles_updated_at
  BEFORE UPDATE ON public.gpa_titles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_gpa_issues_updated_at ON public.gpa_issues;
CREATE TRIGGER set_gpa_issues_updated_at
  BEFORE UPDATE ON public.gpa_issues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_gpa_editions_updated_at ON public.gpa_editions;
CREATE TRIGGER set_gpa_editions_updated_at
  BEFORE UPDATE ON public.gpa_editions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_gpa_grade_summaries_updated_at ON public.gpa_grade_summaries;
CREATE TRIGGER set_gpa_grade_summaries_updated_at
  BEFORE UPDATE ON public.gpa_grade_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_gpa_yearly_aggregates_updated_at ON public.gpa_yearly_aggregates;
CREATE TRIGGER set_gpa_yearly_aggregates_updated_at
  BEFORE UPDATE ON public.gpa_yearly_aggregates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_gpa_comic_matches_updated_at ON public.gpa_comic_matches;
CREATE TRIGGER set_gpa_comic_matches_updated_at
  BEFORE UPDATE ON public.gpa_comic_matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.gpa_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpa_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpa_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpa_grade_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpa_yearly_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpa_sales_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpa_comic_matches ENABLE ROW LEVEL SECURITY;

-- Read-only RLS policies for authenticated users
CREATE POLICY "Authenticated users can view gpa_titles" ON public.gpa_titles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view gpa_issues" ON public.gpa_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view gpa_editions" ON public.gpa_editions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view gpa_grade_summaries" ON public.gpa_grade_summaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view gpa_yearly_aggregates" ON public.gpa_yearly_aggregates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view gpa_sales_observations" ON public.gpa_sales_observations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view gpa_comic_matches" ON public.gpa_comic_matches FOR SELECT TO authenticated USING (true);

-- Permissions
GRANT SELECT ON public.gpa_titles TO authenticated;
GRANT SELECT ON public.gpa_issues TO authenticated;
GRANT SELECT ON public.gpa_editions TO authenticated;
GRANT SELECT ON public.gpa_grade_summaries TO authenticated;
GRANT SELECT ON public.gpa_yearly_aggregates TO authenticated;
GRANT SELECT ON public.gpa_sales_observations TO authenticated;
GRANT SELECT ON public.gpa_comic_matches TO authenticated;
