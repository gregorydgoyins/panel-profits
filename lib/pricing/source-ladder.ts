import type { ComicRecord } from "@/lib/comics/types";

export const GRADES = ["0.5", "1.0", "1.5", "1.8", "2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0", "9.2", "9.4", "9.6", "9.8", "9.9", "10.0"] as const;
export type Grade = (typeof GRADES)[number];

function positivePrice(input: unknown): number | null {
  if (typeof input !== "string" && typeof input !== "number") return null;
  const raw = typeof input === "string" ? input.trim().replace(/^\$/, "").replace(/,/g, "") : input;
  if (raw === "") return null;
  const number = Number(raw);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function panelProfitsGrades(comic: Partial<ComicRecord>): Partial<Record<Grade, number>> {
  const result: Partial<Record<Grade, number>> = {};
  for (const grade of GRADES) {
    const stored = positivePrice(comic.panel_profits_data?.[`PP - Grade ${grade} Market Price`]);
    if (stored !== null) result[grade] = stored;
  }
  const promoted = positivePrice(comic.pp_grade_9_8_price);
  if (promoted !== null) result["9.8"] = promoted;
  return result;
}

export function comicBaseReference(comic: Partial<ComicRecord>): number | null {
  return positivePrice(comic.comicbase_price);
}
