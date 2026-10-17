import {afterEach,describe,it,expect,vi} from 'vitest';
import {askGemini} from '@/lib/sniper/listing-writeup';
afterEach(()=>vi.unstubAllGlobals());
describe('Gemini research protocol',()=>{
 it('keeps stored-evidence JSON separate from search grounding and records usage',async()=>{
  const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"edition":"Exact issue"}'}]}}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:20}})});
  vi.stubGlobal('fetch',fetch);
  const result=await askGemini('Use saved evidence','unit-only-token',false);
  const body=JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.tools).toBeUndefined();expect(body.generationConfig.responseMimeType).toBe('application/json');
  expect(result.usage).toEqual({inputTokens:10,outputTokens:20});
  await askGemini('Use search grounding','unit-only-token',true);
  const grounded=JSON.parse(fetch.mock.calls[1][1].body);
  expect(grounded.tools).toEqual([{google_search:{}}]);expect(grounded.generationConfig.responseMimeType).toBeUndefined();
 });
 it('redacts a key even if an upstream error echoes it',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:403,text:async()=>'denied: unit-only-token'}));
  await expect(askGemini('Saved evidence','unit-only-token',false)).rejects.toThrow('gemini 403: denied: [redacted]');
 });
});
