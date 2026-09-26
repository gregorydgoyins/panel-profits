import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarketClocks } from "@/components/shell/market-clocks";
import { SystemClock } from "@/components/shell/system-clock";

describe("clock hydration safety", () => {
  it("does not emit live time values during server rendering", () => {
    const marketMarkup = renderToString(<MarketClocks />);
    const systemMarkup = renderToString(<SystemClock />);

    expect(marketMarkup).toContain("MARKET CLOCKS");
    expect(marketMarkup).not.toMatch(/\d{2}:\d{2}:\d{2}/);
    expect(systemMarkup).toContain("UTC LIVE TIME");
    expect(systemMarkup).not.toMatch(/\d{2}:\d{2}:\d{2}/);
  });
});