import { describe, expect, it } from "vitest";
import { extractLotBooks, lotBookQueries, priceLotBooks } from "../lib/sniper/lot-valuation";
import type { GoCollectPrice } from "../lib/sniper/gocollect-prices";

const price = (fmv: number | null, grade: string): GoCollectPrice => ({
  grader: "CGC", labelType: "Universal", grade, salesCount: 12,
  lastSoldDate: "2026-02-10", lastSoldPrice: fmv,
  fmv, avg1y: null, n1y: null, avg90d: null, n90d: null, avg30d: null, n30d: null
});

describe("Sniper multi-book valuation", () => {
  it("parses both Walking Dead issues and their separate CGC grades", () => {
    const books = extractLotBooks("The Walking Dead #117 CGC 9.8 and #161 CGC 9.6", "The Walking Dead");
    expect(books.map(b => [b.issue, b.grade, b.grader])).toEqual([
      ["117", 9.8, "CGC"], ["161", 9.6, "CGC"]
    ]);
    expect(lotBookQueries(books, "lot7").map(q => [q.key, q.issue, q.grade])).toEqual([
      ["lot7:0", "117", 9.8], ["lot7:1", "161", 9.6]
    ]);
  });
  it("recognizes the actual Skybound Walking Dead two-slab auction title", () => {
    const books = extractLotBooks("Skybound Walking Dead CGC Comic Lot Issues #117 @ 9.8 And #161 @ 9.6", "Walking Dead");
    expect(books.map(b => [b.series, b.issue, b.grade])).toEqual([
      ["Walking Dead", "117", 9.8], ["Walking Dead", "161", 9.6]
    ]);
  });
  it("parses one CGC prefix with positional @ grades", () => {
    const books = extractLotBooks("Walking Dead CGC issues #117 @ 9.8 and #161 @ 9.6", "The Walking Dead");
    expect(books.map(b => [b.issue, b.grade])).toEqual([["117", 9.8], ["161", 9.6]]);
  });
  it("keeps both distinct prices and supports their exact combined value", () => {
    const books = extractLotBooks("The Walking Dead #117 CGC 9.8 and #161 CGC 9.6", "The Walking Dead");
    const values = priceLotBooks(books, new Map([["lot7:0", price(140, "9.8")], ["lot7:1", price(65, "9.6")]]), "lot7");
    expect(values.map(b => b.fmv)).toEqual([140, 65]);
    expect(values.reduce((sum, b) => sum + (b.fmv ?? 0), 0)).toBe(205);
  });
  it("never fabricates missing component valuations", () => {
    const books = extractLotBooks("The Walking Dead #117 CGC 9.8 and #161 CGC 9.6", "The Walking Dead");
    const values = priceLotBooks(books, new Map([["lot7:0", price(140, "9.8")]]), "lot7");
    expect(values.map(b => b.fmv)).toEqual([140, null]);
    expect(values.every(b => b.fmv !== null)).toBe(false);
  });
  it("does not guess signature-label values", () => {
    const books = extractLotBooks("The Walking Dead #117 CGC 9.8 and #161 CGC 9.6 signed", "The Walking Dead");
    expect(lotBookQueries(books, "lot7")).toHaveLength(0);
  });
  it("does not misprice ambiguous lots missing one slab grade", () => {
    expect(extractLotBooks("The Walking Dead #117 CGC 9.8 and #161", "The Walking Dead")).toEqual([]);
  });
});
