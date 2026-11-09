import { masterAgeFromYear } from "@/lib/eras/master-age-table";
import type { SlabLabel } from "./label-reader";
import type { ComicEra } from "./types";

export function slabIssueYear(label: SlabLabel | null | undefined): number | undefined {
  const date = label?.issueDate?.trim();
  if (!date) return undefined;
  const full = date.match(/\b((?:18|19|20)\d{2})\b/);
  if (full) return Number(full[1]);
  const short = date.match(/(?:^|\/)(\d{2})$/);
  if (!short) return undefined;
  const year = Number(short[1]);
  return year <= new Date().getUTCFullYear() % 100 ? 2000 + year : 1900 + year;
}
export function issueEra(year: number): ComicEra {
  const age = masterAgeFromYear(year);
  return age === "independent" ? "indy" : age;
}
