import {describe,it,expect} from 'vitest';
import {hasNarrativeText} from '@/lib/comics/narrative-text';
describe('actual story evidence',()=>{
 it('rejects source links and invitations to read another site',()=>{
  expect(hasNarrativeText('https://uncannyxmen.net/comics/issue/gambit-1st-series-1')).toBe(false);
  expect(hasNarrativeText('Read the full synopsis here: https://example.test/story')).toBe(false);
 });
 it('rejects unwritten-plot notices and unparsed template fields',()=>{
  expect(hasNarrativeText('The synopsis for this issue has not yet been written.')).toBe(false);
  expect(hasNarrativeText('| Synopsis2 = \n| Writer = A credited writer')).toBe(false);
 });
 it('accepts events described in prose, including prose with source links',()=>{
  expect(hasNarrativeText('Kitty warns the team about a future ruled by Sentinels.')).toBe(true);
  expect(hasNarrativeText('Kitty warns the team about the future. See https://example.test/story')).toBe(true);
  expect(hasNarrativeText('Kitty asks to be added to the team after their battle.')).toBe(true);
 });
});
