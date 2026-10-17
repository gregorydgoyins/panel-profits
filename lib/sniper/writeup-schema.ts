import { z } from "zod";
const point = z.object({ label: z.string().min(2).max(80), text: z.string().min(20).max(700), refs: z.array(z.number().int().min(0)).max(6).optional() });
export const writeupSchema = z.object({
  edition: z.string().min(5).max(220),
  synopsis: z.object({ intro: z.string().min(20).max(500), points: z.array(point).min(1).max(4) }),
  investment: z.object({ heading: z.string().min(5).max(140), points: z.array(point).min(2).max(5) }),
});
// Generation constraints are stricter than the reader's backwards-compatible stored schema.
const prose=z.string().regex(/^[^$€£%]*$/, 'Keep monetary figures in the evidence table');
const sourcedPoint=z.object({label:prose.min(2).max(60),text:prose.min(20).max(550),refs:z.array(z.number().int().min(0).max(1)).min(1).max(2)});
export const storedWriteupSchema=writeupSchema.extend({
  edition:prose.min(5).max(220),
  synopsis:z.object({intro:prose.min(20).max(500),points:z.array(sourcedPoint).min(1).max(3)}),
  investment:z.object({heading:prose.min(5).max(140),points:z.array(sourcedPoint).length(3)}),
});
export type ListingWriteup = z.infer<typeof writeupSchema> & { sources: Array<{ title: string; uri: string }>; model: string; writtenAt: string; usage?:{inputTokens:number;outputTokens:number};learning?: Array<{ term: string; url: string; definition: string }> };

