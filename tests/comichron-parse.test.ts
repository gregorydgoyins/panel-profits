import { it, expect } from "vitest";
import { parseMonthlyChart } from "../lib/jobs/comichron-ingest";

it("reads the Est. units column on modern charts", () => {
  const html = `<table><tr><th>Units</th><th>Dollar</th><th>Comic-book Title</th><th>Issue</th><th>Price</th><th>On sale</th><th>Publisher</th><th>Est. units</th></tr>
  <tr><td>3</td><td>5</td><td>Silver Surfer Black</td><td>1</td><td>$3.99</td><td>06/12/19</td><td>Marvel</td><td>129,490</td></tr>
  <tr><td>4</td><td>n.a.</td><td>DCeased</td><td>4 (All)</td><td>$3.99</td><td>08/07/19</td><td>DC</td><td>119,786</td></tr></table>`;
  const r = parseMonthlyChart(html);
  expect(r[0]).toMatchObject({ title: "Silver Surfer Black", issue: "1", price_usd: 3.99, on_sale: "2019-06-12", publisher: "Marvel", est_units: 129490 });
  expect(r[1]).toMatchObject({ title: "DCeased", issue: "4", is_combined: true, est_units: 119786 });
});

it("stores nothing from order-index-only charts", () => {
  const html = `<table><tr><th>Units</th><th>Dollars</th><th>Comic-book Title</th><th>Issue</th><th>Price</th><th>Publisher</th><th>Order Index</th></tr>
  <tr><td>9</td><td>16</td><td>Mighty Morphin Power Rangers</td><td>1</td><td>$1.95</td><td>Hamilton</td><td>123.5</td></tr></table>`;
  expect(parseMonthlyChart(html)).toEqual([]);
});

it("uses Overall DM Units (est.) when a chart has both index and units", () => {
  const html = `<table><tr><th>Units</th><th>Dollars</th><th>Comic-book Title</th><th>Issue</th><th>Price</th><th>Publisher</th><th>Order Index</th><th>Overall DM Units (est.)</th></tr>
  <tr><td>1</td><td>2</td><td>Adventures of Superman</td><td>500 Coll. Ed.</td><td>$2.95</td><td>DC</td><td>857.9</td><td>3,454,000</td></tr></table>`;
  expect(parseMonthlyChart(html)[0]).toMatchObject({ title: "Adventures of Superman", est_units: 3454000 });
});
