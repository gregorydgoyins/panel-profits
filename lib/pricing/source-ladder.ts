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

export interface ExecutionSpreads {
  buy: number | null;
  sell: number | null;
}

/**
 * Reads exact grade market values ONLY from authentic Panel Profits fields.
 * Never blends ComicBase, PriceCharting, or GoCollect fields into this function.
 */
export function panelProfitsGrades(comic: Partial<ComicRecord>): Partial<Record<Grade, number>> {
  const result: Partial<Record<Grade, number>> = {};
  if (!comic.panel_profits_data) return result;

  for (const grade of GRADES) {
    const gradeKey = grade.replace(".", "_");
    const candidateKeys = [
      `PP - Grade ${grade} Market Price`,
      `grade_${gradeKey}_value`,
      `pp_grade_${gradeKey}_price`,
      `${grade}_nm`
    ];

    for (const key of candidateKeys) {
      const stored = positivePrice(comic.panel_profits_data[key]);
      if (stored !== null) {
        result[grade] = stored;
        break;
      }
    }
  }

  const promoted = positivePrice(comic.pp_grade_9_8_price);
  if (promoted !== null) result["9.8"] = promoted;
  return result;
}

/**
 * Reads ComicBase 1.1M dataset pricing independently without polluting Panel Profits or CGC data.
 */
export function comicBaseGrades(comic: Partial<ComicRecord>): Partial<Record<Grade, number>> {
  const result: Partial<Record<Grade, number>> = {};
  if (!comic.comicbase_data) return result;

  for (const grade of GRADES) {
    const key = `ComicBase - Grade ${grade}`;
    const stored = positivePrice(comic.comicbase_data[key] || comic.comicbase_data[grade]);
    if (stored !== null) result[grade] = stored;
  }
  return result;
}

/**
 * Reads order-book execution spreads (_buy and _sell) for key anchor grades.
 */
export function panelProfitsSpreads(comic: Partial<ComicRecord>, grade: Grade): ExecutionSpreads {
  if (!comic.panel_profits_data) return { buy: null, sell: null };
  const gradeKey = grade.replace(".", "_");

  const buy = positivePrice(
    comic.panel_profits_data[`${grade}_buy`] ||
    comic.panel_profits_data[`grade_${gradeKey}_buy`]
  );

  const sell = positivePrice(
    comic.panel_profits_data[`${grade}_sell`] ||
    comic.panel_profits_data[`grade_${gradeKey}_sell`]
  );

  return { buy, sell };
}

export function comicBaseReference(comic: Partial<ComicRecord>): number | null {
  return positivePrice(comic.comicbase_price);
}
