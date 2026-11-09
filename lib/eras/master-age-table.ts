/**
 * MASTER AGE TABLE — single source of truth for the 9 publication ages.
 * Age = when this issue was published (publication year).
 * Era = when the series/character originated. Era is NOT derived here.
 *
 * Independent begins 2002 with 30 Days of Night #1 (IDW, June 2002).
 */
export type MasterAge =
  | "platinum"
  | "golden"
  | "atomic"
  | "silver"
  | "bronze"
  | "copper"
  | "modern"
  | "independent"
  | "postmodern";

export const MASTER_AGE_TABLE: ReadonlyArray<{ age: MasterAge; label: string; start: number | null; end: number | null }> = [
  { age: "platinum", label: "Platinum", start: null, end: 1937 },
  { age: "golden", label: "Golden", start: 1938, end: 1945 },
  { age: "atomic", label: "Atomic", start: 1946, end: 1955 },
  { age: "silver", label: "Silver", start: 1956, end: 1969 },
  { age: "bronze", label: "Bronze", start: 1970, end: 1983 },
  { age: "copper", label: "Copper", start: 1984, end: 1991 },
  { age: "modern", label: "Modern", start: 1992, end: 2001 },
  { age: "independent", label: "Independent", start: 2002, end: 2016 },
  { age: "postmodern", label: "Postmodern", start: 2017, end: null },
];

export function masterAgeFromYear(year: number): MasterAge {
  for (const row of MASTER_AGE_TABLE) {
    if ((row.start == null || year >= row.start) && (row.end == null || year <= row.end)) return row.age;
  }
  return "postmodern";
}
