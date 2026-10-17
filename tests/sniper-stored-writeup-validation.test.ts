import {describe,it,expect} from 'vitest';
import {parseStoredWriteup} from '@/lib/sniper/writeup-schema';
const point={label:'Story evidence',text:'A concrete event gives this issue its collecting context.',refs:[0]};
const brief=()=>({edition:'Exact comic edition',synopsis:{intro:'An issue-specific summary grounded in its source.',points:[{...point}]},investment:{heading:'Evidence and reasons to pass',points:[{...point},{...point,refs:[1]},{...point,refs:[0,1]}]}});
describe('stored research validation',()=>{
 it('accepts complete sentences that fit and removes only excess trailing sentences',()=>{
  const value=brief();value.synopsis.intro='A sourced opening sentence. '+('The next sentence continues beyond the available presentation space '.repeat(12))+'.';
  expect(parseStoredWriteup(value).synopsis.intro).toBe('A sourced opening sentence.');
 });
 it('uses the actual listing title when an unverified edition name is null',()=>{
  const value={...brief(),edition:null};
  expect(parseStoredWriteup(value,'The exact seller listing').edition).toBe('The exact seller listing');
 });
 it('rejects an overlong sentence instead of cutting a factual claim in half',()=>{
  const value=brief();value.synopsis.intro='An unfinished assertion '.repeat(40);
  expect(()=>parseStoredWriteup(value)).toThrow();
 });
 it('continues rejecting nonexistent source references',()=>{
  const value=brief();value.investment.points[0]={...point,refs:[3]};
  expect(()=>parseStoredWriteup(value)).toThrow();
 });
});
