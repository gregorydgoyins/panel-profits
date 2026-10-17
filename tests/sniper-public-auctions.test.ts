import {describe,it,expect} from 'vitest';
import {auctionTimestamp,parsePublicCatalog,collectPublicCatalog,PUBLIC_CATALOGS} from '@/lib/sniper/public-auction-catalog';

// Transcribed public ComicLink catalog facts, with minimal DOM scaffolding for parser tests.
const lot=(id:string,title:string,grade:string,end='10/26/2026 8:05:35 PM ET')=>`<tr><td><a href="/auctions/item.asp?id=${id}&itemType=0">${title}</a><br>CGC ${grade} NM/MT<br>1988, 1st Appearance of Aliens in Comics</td><td>Starts: 10/16/2026 8:00:00 PM ET<br>Current Bid: - Update<br>Ends: ${end}<br>Starting Bid: $1<br>Bid Count: -</td></tr>`;
const html=`<html><table>${lot('1996488','ALIENS #1','9.8')}${lot('too-low','ALIENS #1','8.0')}</table><a href="/auctions/preview.asp?code=2026oct&pg=2">next</a></html>`;
const now=Date.parse('2026-10-16T20:00:00Z');
describe('public auction catalogs',()=>{
 it('preserves the exact ET closing time rather than restarting a relative countdown',()=>{
  const page=parsePublicCatalog(html,PUBLIC_CATALOGS.comiclink,'comiclink',now);
  expect(page.items).toHaveLength(1);expect(page.items[0]).toMatchObject({id:'comiclink-1996488',resolvedGrade:9.8,year:1988,currentBid:1,bidKind:'starting',shippingKnown:false,auctionEndsAt:'2026-10-27T00:05:35.000Z',auctionStartsAt:'2026-10-17T00:00:00.000Z'});
  expect(page.items[0].secondsRemaining).toBe((Date.parse('2026-10-27T00:05:35Z')-now)/1000);
  expect(page.nextUrl).toContain('pg=2');
 });
 it('handles daylight saving, explicit zones, and rejects unspecified or impossible times',()=>{
  expect(auctionTimestamp('11/09/2026 8:05:35 PM ET')).toBe('2026-11-10T01:05:35.000Z');
  expect(auctionTimestamp('10/26/2026 8:05:35 PM CT')).toBe('2026-10-27T01:05:35.000Z');
  expect(auctionTimestamp('10/26/2026 8:05:35 PM')).toBeNull();
  expect(auctionTimestamp('02/30/2026 8:05:35 PM ET')).toBeNull();
 });
 it('never imports security challenge HTML or silently calls it an empty auction',()=>{
  expect(()=>parsePublicCatalog('<script src="/_Incapsula_Resource"></script>',PUBLIC_CATALOGS.mycomicshop,'mycomicshop')).toThrow(/security challenge/);
  expect(()=>parsePublicCatalog('<h1>Temporarily unavailable</h1>',PUBLIC_CATALOGS.comiclink,'comiclink')).toThrow(/unrecognized/);
 });
 it('requires a per-lot closing deadline and does not substitute the auction session date',()=>{
  const p=parsePublicCatalog(`<table>${lot('1996488','ALIENS #1','9.8').replace(/Ends: [^<]+/,'Ends: October 26')}</table>`,PUBLIC_CATALOGS.comiclink,'comiclink',now);
  expect(p.items).toHaveLength(0);expect(p.missingDeadline).toBeGreaterThan(0);
 });
 it('follows published pagination and reports when a bounded sweep needs to continue',async()=>{
  const urls:string[]=[];const result=await collectPublicCatalog('comiclink',{maxPages:1,transport:async url=>{urls.push(url);return {html,observedAt:now};}});
  expect(result.complete).toBe(false);expect(result.pages).toBe(1);expect(result.nextUrl).toContain('pg=2');expect(urls).toHaveLength(1);
 });
 it('rejects cross-auction pagination',()=>{
  expect(()=>parsePublicCatalog(html.replace('code=2026oct&pg=2','code=other&pg=2'),PUBLIC_CATALOGS.comiclink,'comiclink',now)).toThrow(/left the requested auction/);
 });
 it('does not use an old starting price as the current bid after bidding opens',()=>{
  const page=parsePublicCatalog(html,PUBLIC_CATALOGS.comiclink,'comiclink',Date.parse('2026-10-18T00:00:00Z'));
  expect(page.items).toHaveLength(0);expect(page.missingPrice).toBeGreaterThan(0);
 });
});

it('reads Heritage descriptive grade text without silently discarding the lot',()=>{
 const html='<article><h3><a href="/horror-comics/weird-tales/a/47182-12345.s">Weird Tales #235 (Short Stories, 1947) CGC NM- 9.2 White pages.</a></h3><span>Current Bid: $100</span><time itemprop="endDate" datetime="2026-10-30T01:00:00Z"></time></article>';
 expect(parsePublicCatalog(html,PUBLIC_CATALOGS.heritage,'heritage',now).items[0]).toMatchObject({resolvedGrade:9.2,currentBid:100,year:1947});
});
