import { z } from "zod";
const point = z.object({ label: z.string().min(2).max(80), text: z.string().min(20).max(700), refs: z.array(z.number().int().min(0)).max(6).optional() });
export const writeupSchema = z.object({
  edition: z.string().min(5).max(220),
  synopsis: z.object({ intro: z.string().min(20).max(500), points: z.array(point).min(1).max(4) }),
  investment: z.object({ heading: z.string().min(5).max(140), points: z.array(point).min(2).max(5) }),
});
export type ListingWriteup = z.infer<typeof writeupSchema> & { sources: Array<{ title: string; uri: string }>; model: string; writtenAt: string; usage?:{inputTokens:number;outputTokens:number};learning?: Array<{ term: string; url: string; definition: string }> };

