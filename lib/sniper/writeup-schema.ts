import { z } from "zod";
const point = z.object({ label: z.string().min(2).max(80), text: z.string().min(20).max(700), refs: z.array(z.number().int().min(0)).max(6).optional() });
export const writeupSchema = z.object({
  edition: z.string().min(5).max(220),
  synopsis: z.object({ intro: z.string().min(20).max(500), points: z.array(point).min(1).max(4) }).nullable(),
  investment: z.object({ heading: z.string().min(5).max(140), points: z.array(point).min(2).max(5) }),
});
// Generation constraints are stricter than the reader's backwards-compatible stored schema.
const prose=z.string();
const sourcedPoint=z.object({label:prose.min(2).max(60),text:prose.min(20).max(550),refs:z.array(z.number().int().min(0).max(1)).min(1).max(2)});
export const storedWriteupSchema=writeupSchema.extend({
  edition:prose.min(5).max(220),
  synopsis:z.object({intro:prose.min(20).max(500),points:z.array(sourcedPoint).min(1).max(3)}).nullable(),
  investment:z.object({heading:prose.min(5).max(140),points:z.array(sourcedPoint).length(3)}),
});
// Provider schemas enforce JSON types; presentation limits are normalized and validated below.
const generatedPoint=z.object({label:z.string(),text:z.string(),refs:z.array(z.number().int())});
export const generatedWriteupSchema=z.object({
  edition:z.string(),
  synopsis:z.object({intro:z.string(),points:z.array(generatedPoint)}).nullable(),
  investment:z.object({heading:z.string(),points:z.array(generatedPoint)}),
});
/** Keep complete sentences when a provider exceeds a presentation limit. Never cut a claim mid-sentence. */
export function parseStoredWriteup(input:unknown,listingTitle?:string) {
  const value=JSON.parse(JSON.stringify(input));
  if(value && value.edition==null && listingTitle)value.edition=listingTitle;
  const shorten=(text:unknown,max:number)=>{
    if(typeof text!=='string' || text.length<=max)return text;
    const ends=[...text.slice(0,max).matchAll(/[.!?](?=\s|$)/g)];
    const last=ends.at(-1);
    return last?text.slice(0,last.index!+1):text;
  };
  if(value?.synopsis){
    value.synopsis.intro=shorten(value.synopsis.intro,500);
    if(Array.isArray(value.synopsis.points))for(const point of value.synopsis.points)point.text=shorten(point.text,550);
  }
  if(Array.isArray(value?.investment?.points))for(const point of value.investment.points)point.text=shorten(point.text,550);
  return storedWriteupSchema.parse(value);
}
export type ListingWriteup = z.infer<typeof writeupSchema> & { sources: Array<{ title: string; uri: string }>; model: string; writtenAt: string; sourceEvidenceStatus?:"narrative"|"financial_only"|"needs_source"; usage?:{inputTokens:number;outputTokens:number};review?:{by:string;at:string};learning?: Array<{ term: string; url: string; definition: string }> };

