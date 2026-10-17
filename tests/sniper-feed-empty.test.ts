import { expect, it, vi } from "vitest";
const store = vi.hoisted(() => ({ readLiveListings: vi.fn().mockResolvedValue({items:[],asOf:null}), runSnapshot:vi.fn() }));
vi.mock("@/lib/sniper/market-store", () => store);
import { GET } from "@/app/api/sniper/live-auctions/route";
it("returns an empty saved feed without scraping or starting a snapshot", async () => {
  const response = await GET(new Request("https://comicbookstockexchange.com/api/sniper/live-auctions?q=empty-regression"));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({success:true,count:0,auctions:[]});
  expect(store.readLiveListings).toHaveBeenCalledOnce();
  expect(store.runSnapshot).not.toHaveBeenCalled();
});

it("reports failed saved-feed reads as an error rather than an empty market", async () => {
  store.readLiveListings.mockRejectedValueOnce(new Error("The saved auction feed could not be read"));
  const response=await GET(new Request("https://comicbookstockexchange.com/api/sniper/live-auctions"));
  expect(response.status).toBe(500);
  expect(await response.json()).toMatchObject({success:false});
});
