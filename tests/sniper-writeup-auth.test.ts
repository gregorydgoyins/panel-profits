import {afterEach,describe,it,expect,vi} from 'vitest';
const token=vi.hoisted(()=>vi.fn());
vi.mock('@vercel/oidc',()=>({getVercelOidcTokenSync:token}));
import {writeupGatewayAvailable,storedWriteupPrompt} from '@/lib/sniper/listing-writeup';
import {researchTitle} from '@/lib/sniper/research-title';
describe('saved research generation',()=>{
 it('preserves publisher words that belong to the series name',()=>{
  for(const title of ['Marvel Premiere','Marvel Spotlight','Marvel Tales','Marvel Feature','DC All In Special'])expect(researchTitle(title)).toBe(title);
 });
 afterEach(()=>{vi.unstubAllEnvs();vi.resetAllMocks();});
 it('accepts the request-scoped Vercel identity without an environment token',()=>{
  vi.stubEnv('AI_GATEWAY_API_KEY','');vi.stubEnv('VERCEL_OIDC_TOKEN','');token.mockReturnValue('request-context-test-identity');expect(writeupGatewayAvailable()).toBe(true);
 });
 it('does not mistake a deployed environment for working authentication',()=>{
  vi.stubEnv('AI_GATEWAY_API_KEY','');token.mockImplementation(()=>{throw new Error('No request identity');});expect(writeupGatewayAvailable()).toBe(false);
 });
 it('requires financial distinctions and issue-specific arguments rather than promotional filler',()=>{
  const prompt=storedWriteupPrompt({title:'Strange Tales #161 CGC 9.2 (1967)'},{text:'Nick Fury confronts a specific threat.',storyTitle:null,source:'Panel Profits issue record',sourceUrl:'https://marvel.fandom.com/wiki/Strange_Tales_Vol_1_161',license:null});
  expect(prompt).toContain('A guide is not a trade');expect(prompt).toContain('other-grade sales do not establish this grade');expect(prompt).toContain('concrete entry-price or resale risk for THIS lot');expect(prompt).toContain('Do not pad an ordinary issue into a key');
 });
 it('does not ask for an invented story when only market records are available',()=>{
  const prompt=storedWriteupPrompt({title:'Marvel Age #97 CGC 9.8'},null);
  expect(prompt).toContain('SYNOPSIS: return null');expect(prompt).toContain('no plot evidence');expect(prompt).toContain('do not invent plot, debuts, creators, family relationships');
 });
});
