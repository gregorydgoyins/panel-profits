import { it, expect } from "vitest";
import { parseMonthlyChart } from "../scripts/comichron-ingest";
it("parses", () => {
  const html = `<table><tr><th>Units</th><th>Dollar</th></tr>
  <tr><td>3</td><td>5</td><td>Silver Surfer Black</td><td>1</td><td>$3.99</td><td>06/12/19</td><td>Marvel</td><td>129,490</td></tr>
  <tr><td>4</td><td>n.a.</td><td>DCeased</td><td>4 (All)</td><td>$3.99</td><td>08/07/19</td><td>DC</td><td>119,786</td></tr>
  <tr><td>12</td><td>Spawn</td><td>9</td><td>$1.95</td><td>Image</td><td>310,000</td></tr></table>`;
  const r = parseMonthlyChart(html);
  expect(r[0]).toMatchObject({ title: "Silver Surfer Black", issue: "1", price_usd: 3.99, on_sale: "2019-06-12", publisher: "Marvel", est_units: 129490 });
  expect(r[1]).toMatchObject({ title: "DCeased", issue: "4", is_combined: true, est_units: 119786 });
  expect(r[2]).toMatchObject({ title: "Spawn", issue: "9", publisher: "Image", est_units: 310000 });
});
