-- The primary comic key lookup was indexed; the publisher-source fallback was not.
-- Equality on all three columns now avoids scanning the saved story warehouse.
create index if not exists issue_story_year_issue_source_idx
  on public.issue_story_summaries(year,issue_number,source_url);
