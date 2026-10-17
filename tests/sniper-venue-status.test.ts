import {describe,it,expect} from 'vitest';
import {venueStatus} from '@/lib/sniper/venue-status';
const failed={key:'public-auction-catalog:v1:heritage',status:'blocked',fetched_at:'2026-10-17T06:16:48Z'};
describe('auction venue availability',()=>{
 it('keeps stored lots selectable when their refresh fails',()=>{
  expect(venueStatus('heritage',3,[failed])).toMatchObject({selectable:true,count:3,label:'3 lots · refresh failed'});
 });
 it('reports the actual failed import rather than an account connection',()=>{
  expect(venueStatus('heritage',0,[failed])).toMatchObject({selectable:true,label:'Import failed · 0 lots'});
 });
 it('does not invent a connected eBay regional feed',()=>{
  expect(venueStatus('ebay_fr',0)).toMatchObject({label:'No qualifying lots',count:0});
 });
 it('distinguishes an absent collector from an empty supported feed',()=>{
  expect(venueStatus('atomicavenue',0)).toMatchObject({selectable:false,label:'Feed not implemented'});
  expect(venueStatus('mycomicshop',0)).toMatchObject({selectable:true,label:'No qualifying lots'});
 });
});
