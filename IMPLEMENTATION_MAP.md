# Panel Profits Rebuild Implementation Map

Captured: 2026-09-23
Repository: `panel-profits`
Branch: `antigravity/graded-data-collectors`
Commit at inspection: `394fc60`
Production Clean project: `vbcmjmakluyjnsmisoth`

## Authority

Clean is the only operational production destination. The environment confirms `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` target Clean (`vbcmjmakluyjnsmisoth`). `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and the direct PostgreSQL URL target the historical project and are excluded from live application paths. Final may be inspected as historical reference only; it must not remain a live application dependency.

## Current Route Surfaces

- Public/catalog: `/`, `/comics`, `/comics/[id]`, `/news`, `/learn`
- Auth/player: `/sign-in`, `/sign-up`, `/onboarding`, `/game`, `/account`, `/diary`
- Market: `/market`, `/telemetry`, `/assets`, `/assets/[surfaceKey]`, `/equities`, `/equity/[id]`, `/analysis`
- Private operations: `/collection`, `/watchlist`, `/research`, `/firms`, `/people`

## Verified Gaps

- Shell rails currently depend on historical Final adapters.
- Catalog public reads use Clean but the live anon role lacks `public.comics` access in the current test environment.
- Clean currently exposes the 41,252-row `comics` catalog used by the working public route.
- Clean does not expose the historical `market_state`, `market_indices`, `pp_asset_registry`, `rss_items`, `learn_classes`, `equity_truth_layer`, `comic_price_history`, `pf_cover_evidence`, or firm-population relations queried by the old shell. These surfaces must remain unavailable or be rebuilt from a verified Clean migration/API contract.
- The earlier direct PostgreSQL schema snapshot was historical-project data and is not evidence of Clean production state.
- The current equity detail has a compact history surface but still depends on historical Final identity/price joins.
- Player settings and clock preferences are browser-local; no Clean persistence contract has been verified.
- `/diary` is user-scoped but the terminal rail only shows entries when authenticated and populated.
- The active branch has not yet been proven to be the deployed production branch.

## Implementation Order

1. Remove historical-project dependencies from live application paths; use Clean adapters and honest unavailable states where Clean lacks a verified contract.
2. Repair public/authenticated route guards and verify resumable onboarding.
3. Preserve the existing catalog while replacing stale small projections with indexed Clean queries.
4. Reconnect dashboard, market, asset, portfolio, and trading surfaces to Clean.
5. Expose firm completeness honestly from Clean capability audits; do not fabricate missing populations.
6. Reconnect credentials, learning, news, and intelligence only to verified Clean relations.
7. Validate desktop/mobile routes, auth boundaries, deep links, and permitted mutations.
8. Commit reproducible code/migrations/scripts and report remaining Clean data gaps.
