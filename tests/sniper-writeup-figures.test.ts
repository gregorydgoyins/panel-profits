import {describe,it,expect} from 'vitest';
import {assertSourcedWriteupFigures} from '@/lib/sniper/writeup-figures';
const brief=(text:string,refs=[1])=>({edition:'An exact edition',synopsis:{intro:'The supplied story follows a documented conflict.',points:[{label:'Story',text:'The hero resolves the conflict described in the source.',refs:[0]}]},investment:{heading:'Market evidence',points:[{label:'Recorded price',text,refs}]}});
const evidence={amounts:[{currency:'USD',amount:1600},{currency:'USD',amount:106}],storyText:'The villain offers a $50,000 bounty.'};
describe('financial figures in research',()=>{
 it('allows verified amounts in several ordinary formats',()=>{for(const text of ['A completed 9.4 sale recorded $1,600.','The 9.4 guide is USD 106.','A recorded 9.4 sale was 1.6k dollars.'])expect(()=>assertSourcedWriteupFigures(brief(text),evidence)).not.toThrow();});
 it('rejects invented prices, returns and currency substitutions',()=>{for(const text of ['This will sell for $900.','The guide predicts 50% upside.','Its value is €106.','The comic is worth 1.6 million dollars.'])expect(()=>assertSourcedWriteupFigures(brief(text),evidence)).toThrow();});
 it('keeps story amounts separate from financial price evidence',()=>{
  expect(()=>assertSourcedWriteupFigures(brief('The villain offers a $50,000 bounty.',[0]),evidence)).not.toThrow();
  expect(()=>assertSourcedWriteupFigures(brief('This edition has a $50,000 market value.',[1]),evidence)).toThrow();
 });
 it('does not pass off a years-old transaction as recent demand',()=>{
  const dated={...evidence,asOf:'2026-10-17'};
  expect(()=>assertSourcedWriteupFigures(brief('A recent sale on 2023-07-24 recorded $1600.'),dated)).toThrow();
  expect(()=>assertSourcedWriteupFigures(brief('The most recent supplied sale was $1600 on 2023-07-24; it is historical.'),dated)).not.toThrow();
  expect(()=>assertSourcedWriteupFigures(brief('An older sale was $1600 on 2023-07-24. A recent sale on 2026-10-01 recorded $106.'),dated)).not.toThrow();
 });
 it('rejects invented literary reasons to discount established keys',()=>{
  expect(()=>assertSourcedWriteupFigures(brief('Unestablished key status because this debut does not prove an ongoing role.',[0]),evidence)).toThrow();
 });
});
