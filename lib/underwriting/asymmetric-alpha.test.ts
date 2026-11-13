import { describe, it, expect } from "vitest";
import { VERIFIED_CPR_HURDLE_USD } from "./asymmetric-alpha";

describe("Sovereign Asymmetric Alpha Engine (AAE)", () => {
  it("derives the modern single-book hurdle from the CGC 2026 schedule", () => {
    // $30 Modern grading + $12 pressing + $5 invoice + $25 inbound + $25 insured return
    expect(VERIFIED_CPR_HURDLE_USD).toBe(97.00);
  });

  // Buy/sell verdicts no longer come from this module: the page's one rating is
  // lib/signals/comic-signal.ts (tested in comic-signal.test.ts).
});
