import type { AuctionSource } from "./types";

const collectors = new Set<string>(["comicconnect", "metropolis", "hakes", "comiclink", "mycomicshop", "heritage", "ebay", "ebay_uk", "ebay_ca", "ebay_fr", "ebay_de", "ebay_au"]);
export interface VenueFetch { key:string; status:string; fetched_at:string }
export interface VenueStatus { selectable:boolean; label:string; detail:string; count:number }
/** Feed availability and collector health are separate: a blocked refresh can still have saved lots. */
export function venueStatus(source:AuctionSource, count:number, fetches:VenueFetch[] = []):VenueStatus {
  const latest=fetches.filter(row=>row.key===`public-auction-catalog:v1:${source}`).sort((a,b)=>b.fetched_at.localeCompare(a.fetched_at))[0];
  const failed=latest && ["blocked","failed"].includes(latest.status);
  if(count>0) return {selectable:true,count,label:`${count} lots${failed ? " · refresh failed" : ""}`,detail:failed ? "Saved qualifying lots remain available. The latest collector request failed; prices are from the displayed observation time." : "Qualifying saved lots in this radar response. This is not an auction-account login status."};
  if(!collectors.has(source)) return {selectable:false,count:0,label:"Feed not implemented",detail:"This venue has no collector in Sniper. Opening or signing into its website does not import its auctions."};
  if(failed) return {selectable:true,count:0,label:"Import failed · 0 lots",detail:"The latest catalog import failed or was blocked by the venue. No qualifying saved lots are available."};
  return {selectable:true,count:0,label:"No qualifying lots",detail:"A collector is configured, but no saved lots from this venue passed the current radar requirements. This does not mean your auction account is disconnected."};
}
