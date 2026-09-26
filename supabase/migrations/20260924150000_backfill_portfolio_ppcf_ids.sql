set statement_timeout = 0;
set lock_timeout = 0;

update public.collection_items as item
set ppcf_id = ppcf.ppcf_id
from public.comics as comic
join public.ppcf_canonical_comics as ppcf
  on ppcf.gcd_issue_id::text = comic.gcd_source_id
where item.comic_id = comic.id
  and item.ppcf_id is null;

update public.watchlist_items as item
set ppcf_id = ppcf.ppcf_id
from public.comics as comic
join public.ppcf_canonical_comics as ppcf
  on ppcf.gcd_issue_id::text = comic.gcd_source_id
where item.comic_id = comic.id
  and item.ppcf_id is null;
