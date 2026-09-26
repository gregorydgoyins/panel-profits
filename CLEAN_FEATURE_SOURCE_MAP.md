# Clean Feature Source Map

Project: `vbcmjmakluyjnsmisoth`

This map records verified live contracts. A `pending` result is an intentional product state, not a fallback to Final.

| Component | Endpoint / function | Clean source | Stable key | Access | Result |
| --- | --- | --- | --- | --- | --- |
| Catalog list | `getComics` -> `/comics` | `public.comics` | `comics.id` | Server-side paginated read | Verified |
| Comic detail | `getComicById` -> `/comics/[id]` | `public.comics` | `comics.id` | Server read | Verified |
| Catalog covers | `getComicCoverEvidence` | `public.comics.cover_*` | `comics.id` | Server read | Verified |
| Catalog price dossier | `PricingDossier` | `public.comics` price fields plus verified pricing evidence when available | `comics.id` | Server read | Verified / field-level unavailable states |
| Census dossier | `getComicCensusDossier` | `graded_census_snapshots`, `graded_census_rows`, `graded_certifications`, `graded_sales_observations` | Exact `title_name` + `issue_number_raw`; no `gpa_comic_matches` exists | Authenticated read contract | Populated source tables; comic linkage pending |
| News ticker | `getNewsStories` / `/api/news` | `public.pp_news_stories` populated from configured RSS/Atom sources | `story_key` | Active stories are retained for three days; archived stories move to Research / Archive | Requires migration `20260923130000_news_wire.sql`; process-local RSS fallback keeps development visible until migration is applied |
| Equity rail | `getValuationRailComics` | No verified Clean equity relation | Pending stable key | No valid source | Visible pending state; no comic substitution |
| Assets rail | `getCleanAssetSurfaces` | No verified Clean asset-surface relation | Pending stable key | No valid source | Visible pending state; no comic substitution |
| Market / telemetry | `getPanelTelemetry` | `recovered_index_contracts` | `index_code` | Authenticated read contract | Recovered contracts available; live telemetry tables absent |
| Firms | `getFirms`, `getFirmDossier` | Firm-prefixed identity/population tables | Firm-prefixed IDs | Server read; per-table RLS/grants | Must remain firm-specific |
| Player onboarding | `complete_player_onboarding` | `profiles`, `auth.users` | Auth user/profile ID | Authenticated RPC and RLS | Migration applied; authenticated flow required |
| Player diary | `getDiaryEntries` | `player_diary_entries` | `player_diary_entries.id`, `user_id` | Authenticated owner RLS | Migration applied |

## Explicit Non-Contracts

The live app must not query or recreate these Final-era names without a separately proven Clean contract:

- `market_state`
- `equity_truth_layer`
- `rss_items`
- `learn_classes`
- `comic_price_history`
- `pf_cover_evidence`
- `pp_asset_registry`
- global `brokers`
- global `pp_clients`

## Current Blockers

1. Census rows are populated but no exact Clean comic linkage table is populated (`gpa_comic_matches` is empty).
2. Clean has no verified equity or asset-surface source for the old rails.
3. Live market telemetry tables are absent; recovered index contracts are descriptive, not live values.
4. Authenticated end-to-end tests remain required for onboarding, firm directory access, portfolio state, and permitted actions.
