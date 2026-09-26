import { describe, expect, it } from "vitest";
import { isMissingTableError } from "@/lib/supabase/errors";

describe("missing table error detection", () => {
  it("detects PostgREST missing-table errors", () => {
    const error = {
      code: "PGRST205",
      message: "Could not find the table 'public.market_state' in the schema cache",
    };

    expect(isMissingTableError(error)).toBe(true);
  });

  it("ignores unrelated database errors", () => {
    const error = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
    };

    expect(isMissingTableError(error)).toBe(false);
  });
});
